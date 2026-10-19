<script lang="ts">
  import { onMount } from 'svelte';
  import type * as Three from 'three';
  import { binary, parseBytes } from './wire';
  import { WIRE_SAMPLES } from './wire-frames';

  let host: HTMLDivElement;
  let sampleIndex = $state(0);
  let activeIndex = $state(0);
  let pinned = $state(false);
  let failed = $state(false);
  let ready = $state(false);

  const sample = $derived(WIRE_SAMPLES[sampleIndex]);
  const bytes = $derived(parseBytes(sample.hex));
  const activeByte = $derived(bytes[activeIndex] ?? 0);
  const activeLabel = $derived(
    activeIndex === 0 ? 'length' : activeIndex === 1 ? 'id' : 'payload',
  );

  let T: typeof import('three') | null = null;
  let renderer: Three.WebGLRenderer | null = null;
  let scene: Three.Scene | null = null;
  let camera: Three.PerspectiveCamera | null = null;
  let group: Three.Group | null = null;
  let frameGroup: Three.Group | null = null;
  let bits: Three.InstancedMesh | null = null;
  let hitPlane: Three.Mesh | null = null;
  let beam: Three.Mesh | null = null;
  let highlight: Three.Mesh | null = null;
  let beamLight: Three.PointLight | null = null;
  let raycaster: Three.Raycaster | null = null;
  let pointer = { x: 0, y: 0 };

  let currentBytes: number[] = [];
  let active = 0;
  let waveCenter = 0;
  let scanProgress = 0;
  let pinnedIndex = -1;
  let hoverIndex = -1;
  let targetYaw = 0;
  let targetPitch = 0;
  let dragging = false;
  let moved = 0;
  let pointerStart = { x: 0, y: 0 };
  let pointerLast = { x: 0, y: 0 };
  let raf = 0;
  let lastTime = 0;
  let visible = true;
  let reduceMotion = false;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let canvasEl: HTMLCanvasElement | null = null;

  const ACCENT = 0x8ce07a;
  const LOVE = 0xff8bc1;
  const PAYLOAD = 0xded9c2;
  const OFF = 0x0b1019;

  function baseColor(column: number): number {
    if (column === 0) return ACCENT;
    if (column === 1) return LOVE;
    return PAYLOAD;
  }

  function colorAt(column: number, bit: number, value: number, temp: Three.Color, white: Three.Color, off: Three.Color): Three.Color {
    temp.setHex(baseColor(column));
    if ((value >> bit) & 1) {
      temp.multiplyScalar(0.78 + bit * 0.025);
    } else {
      temp.copy(off).lerp(new T!.Color(baseColor(column)), 0.06);
    }
    if (column === active) temp.lerp(white, 0.62);
    return temp;
  }

  function paint() {
    if (!T || !bits) return;
    const temp = new T.Color();
    const white = new T.Color(0xffffff);
    const off = new T.Color(OFF);
    for (let column = 0; column < currentBytes.length; column += 1) {
      for (let bit = 0; bit < 8; bit += 1) {
        bits.setColorAt(
          column * 8 + bit,
          colorAt(column, bit, currentBytes[column], temp, white, off),
        );
      }
    }
    if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
  }

  interface Layout {
    rows: number;
    perRow: number;
    spacing: number;
    rowGap: number;
  }

  function layoutFor(count: number): Layout {
    const rows = count > 17 ? 2 : 1;
    const perRow = Math.ceil(Math.max(count, 1) / rows);
    return {
      rows,
      perRow,
      spacing: Math.min(0.55, 10.4 / perRow),
      rowGap: rows === 2 ? 1.85 : 0,
    };
  }

  function positionFor(index: number, layout: Layout): { x: number; y: number } {
    const row = Math.min(layout.rows - 1, Math.max(0, Math.floor(index / layout.perRow)));
    const slot = index % layout.perRow;
    const displaySlot = row === 1 ? layout.perRow - 1 - slot : slot;
    return {
      x: (displaySlot - (layout.perRow - 1) / 2) * layout.spacing,
      y: layout.rows === 1 ? 0 : row === 0 ? layout.rowGap / 2 : -layout.rowGap / 2,
    };
  }

  function beamPosition(center: number, layout: Layout): { x: number; y: number } {
    const low = Math.floor(center);
    const high = Math.min(currentBytes.length - 1, low + 1);
    const t = center - low;
    const a = positionFor(low, layout);
    const b = positionFor(high, layout);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function layoutBits(now: number) {
    if (!T || !bits) return;
    const count = currentBytes.length;
    const layout = layoutFor(count);
    const matrix = new T.Matrix4();
    for (let column = 0; column < count; column += 1) {
      const spot = positionFor(column, layout);
      const distance = column - waveCenter;
      const lift = reduceMotion ? 0 : Math.exp(-(distance * distance) / 7) * 0.24;
      for (let bit = 0; bit < 8; bit += 1) {
        const bob = reduceMotion ? 0 : Math.sin(now * 0.0016 + column * 0.35 + bit * 0.12) * 0.012;
        matrix.makeTranslation(spot.x, spot.y + (bit - 3.5) * 0.23 + lift + bob, 0);
        bits.setMatrixAt(column * 8 + bit, matrix);
      }
    }
    bits.instanceMatrix.needsUpdate = true;
  }

  function refreshActive() {
    if (!bits) return;
    const scanColumn = Math.min(
      currentBytes.length - 1,
      Math.floor(scanProgress * currentBytes.length),
    );
    const next =
      pinnedIndex >= 0
        ? pinnedIndex
        : hoverIndex >= 0
          ? hoverIndex
          : Math.max(0, scanColumn);
    if (next !== active) {
      active = next;
      activeIndex = next;
      paint();
    }
    layoutBits(performance.now());
    const layout = layoutFor(currentBytes.length);
    const spot = beamPosition(waveCenter, layout);
    if (highlight) highlight.position.set(spot.x, spot.y, -0.12);
    if (beam) beam.position.set(spot.x, spot.y, 0.09);
    if (beamLight) beamLight.position.set(spot.x, spot.y, 0.55);
  }

  function buildFrame(index: number) {
    if (!T || !group) return;
    if (frameGroup) {
      group.remove(frameGroup);
      dismountGroup(frameGroup);
    }

    const sampleData = WIRE_SAMPLES[index];
    currentBytes = parseBytes(sampleData.hex);
    active = 0;
    waveCenter = 0;
    activeIndex = 0;
    pinnedIndex = -1;
    pinned = false;
    hoverIndex = -1;
    scanProgress = 0;

    const count = currentBytes.length;
    const layout = layoutFor(count);
    const cube = 0.15;

    group.scale.setScalar(
      layout.rows === 1 ? Math.min(1.55, Math.max(1, 17 / Math.max(count, 1))) : 1,
    );
    frameGroup = new T.Group();
    group.add(frameGroup);

    highlight = new T.Mesh(
      new T.PlaneGeometry(Math.min(layout.spacing * 0.72, 0.3), 1.9),
      new T.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.11,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    highlight.position.z = -0.12;
    frameGroup.add(highlight);

    hitPlane = new T.Mesh(
      new T.PlaneGeometry(
        layout.spacing * layout.perRow + 1.2,
        layout.rows === 2 ? layout.rowGap + 2.2 : 2.2,
      ),
      new T.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    hitPlane.position.z = -0.2;
    frameGroup.add(hitPlane);

    bits = new T.InstancedMesh(
      new T.BoxGeometry(cube, cube, cube),
      new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.18 }),
      count * 8,
    );
    bits.instanceMatrix.setUsage(T.DynamicDrawUsage);
    bits.frustumCulled = false;

    bits.instanceMatrix.needsUpdate = true;
    bits.computeBoundingSphere();
    frameGroup.add(bits);
    paint();
    layoutBits(performance.now());

    for (let row = 0; row < layout.rows; row += 1) {
      const rail = new T.Mesh(
        new T.BoxGeometry(layout.spacing * layout.perRow + 0.36, 0.012, 0.012),
        new T.MeshBasicMaterial({ color: 0x2a3448 }),
      );
      rail.position.y =
        (layout.rows === 1 ? 0 : row === 0 ? layout.rowGap / 2 : -layout.rowGap / 2) -
        0.98;
      frameGroup.add(rail);
    }
    if (layout.rows === 2) {
      const connector = new T.Mesh(
        new T.BoxGeometry(0.012, layout.rowGap, 0.012),
        new T.MeshBasicMaterial({ color: 0x34445c }),
      );
      connector.position.set(((layout.perRow - 1) / 2) * layout.spacing, 0, -0.08);
      frameGroup.add(connector);
    }

    beam = new T.Mesh(
      new T.BoxGeometry(0.02, 1.9, 0.02),
      new T.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.86 }),
    );
    beam.position.z = 0.09;
    frameGroup.add(beam);

    beamLight = new T.PointLight(ACCENT, 2.2, 2.4);
    beamLight.position.set(0, 0, 0.55);
    frameGroup.add(beamLight);

    refreshActive();
  }

  function dismountGroup(value: Three.Object3D) {
    value.traverse((object) => {
      if (object instanceof T!.Mesh || object instanceof T!.InstancedMesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      }
    });
  }

  function animate(now: number) {
    if (!T || !renderer || !scene || !camera || !group) return;
    const elapsed = lastTime ? Math.min(48, now - lastTime) : 16;
    lastTime = now;

    if (!reduceMotion && pinnedIndex < 0 && hoverIndex < 0) {
      scanProgress += elapsed / 9000;
      if (scanProgress >= 1) scanProgress = 0;
      refreshActive();
    }

    group.rotation.y += (targetYaw - group.rotation.y) * 0.055;
    group.rotation.x += (targetPitch - group.rotation.x) * 0.055;
    if (!reduceMotion) waveCenter += (active - waveCenter) * 0.09;
    layoutBits(now);
    const layout = layoutFor(currentBytes.length);
    const spot = beamPosition(waveCenter, layout);
    if (highlight) highlight.position.set(spot.x, spot.y, -0.12);
    if (beam) beam.position.set(spot.x, spot.y, 0.09);
    if (beamLight) beamLight.position.set(spot.x, spot.y, 0.55);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }

  function start() {
    if (!visible || document.hidden || raf) return;
    lastTime = 0;
    raf = requestAnimationFrame(animate);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function resize() {
    if (!renderer || !camera || !host) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function pick(event: PointerEvent): number {
    if (!T || !renderer || !camera || !bits) return -1;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
    if (!raycaster) raycaster = new T.Raycaster();
    raycaster.setFromCamera(new T.Vector2(pointer.x, pointer.y), camera);
    const hit = raycaster.intersectObject(bits, false)[0];
    if (hit && hit.instanceId !== undefined) return Math.floor(hit.instanceId / 8);
    if (!hitPlane) return -1;

    const planeHit = raycaster.intersectObject(hitPlane, false)[0];
    if (!planeHit) return -1;
    const local = hitPlane.worldToLocal(planeHit.point.clone());
    const layout = layoutFor(currentBytes.length);
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < currentBytes.length; index += 1) {
      const spot = positionFor(index, layout);
      const distance = (spot.x - local.x) ** 2 + (spot.y - local.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    return Math.sqrt(bestDistance) <= (layout.rows === 2 ? 1.05 : 0.85) ? best : -1;
  }

  function onPointerDown(event: PointerEvent) {
    dragging = true;
    moved = 0;
    pointerStart = { x: event.clientX, y: event.clientY };
    pointerLast = { x: event.clientX, y: event.clientY };
    renderer?.domElement.setPointerCapture(event.pointerId);
    if (renderer) renderer.domElement.style.cursor = 'grabbing';
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging) {
      const dx = event.clientX - pointerLast.x;
      const dy = event.clientY - pointerLast.y;
      moved += Math.abs(dx) + Math.abs(dy);
      pointerLast = { x: event.clientX, y: event.clientY };
      targetYaw = Math.max(-0.62, Math.min(0.62, targetYaw + dx * 0.005));
      targetPitch = Math.max(-0.28, Math.min(0.28, targetPitch + dy * 0.0035));
      return;
    }
    const next = pick(event);
    if (next !== hoverIndex) {
      hoverIndex = next;
      refreshActive();
    }
    if (renderer) {
      renderer.domElement.style.cursor = next >= 0 ? 'pointer' : 'grab';
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (renderer?.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    const distance = Math.abs(event.clientX - pointerStart.x) + Math.abs(event.clientY - pointerStart.y);
    if (distance < 6) {
      const next = hoverIndex >= 0 ? hoverIndex : pick(event);
      if (next >= 0) {
        pinnedIndex = next;
        pinned = true;
        refreshActive();
      }
    }
    dragging = false;
    if (renderer) renderer.domElement.style.cursor = hoverIndex >= 0 ? 'pointer' : 'grab';
  }

  function onClick(event: MouseEvent) {
    if (moved >= 6) return;
    const next = hoverIndex >= 0 ? hoverIndex : pick(event as unknown as PointerEvent);
    if (next >= 0) {
      pinnedIndex = next;
      pinned = true;
      refreshActive();
    }
  }

  function onPointerLeave() {
    if (dragging) return;
    hoverIndex = -1;
    refreshActive();
    if (renderer) renderer.domElement.style.cursor = 'grab';
  }

  function nextSample() {
    sampleIndex = (sampleIndex + 1) % WIRE_SAMPLES.length;
    if (ready) buildFrame(sampleIndex);
  }

  function scan() {
    pinnedIndex = -1;
    pinned = false;
    hoverIndex = -1;
    scanProgress = 0;
    refreshActive();
  }

  function resetView() {
    targetYaw = 0;
    targetPitch = 0;
    if (group) {
      group.rotation.set(0, 0, 0);
    }
  }

  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  onMount(() => {
    let disposed = false;
    reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    void (async () => {
      try {
        T = await import('three');
        if (disposed || !host) return;

        renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.appendChild(renderer.domElement);

        scene = new T.Scene();
        camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 2.9, 6.2);
        camera.lookAt(0, 0, 0);

        scene.add(new T.AmbientLight(0xffffff, 0.65));
        const key = new T.DirectionalLight(0xffffff, 3.6);
        key.position.set(5, 8, 6);
        scene.add(key);
        const fill = new T.PointLight(LOVE, 2.0, 8);
        fill.position.set(-4.5, 2.5, 4);
        scene.add(fill);

        group = new T.Group();
        group.position.y = -0.15;
        scene.add(group);

        const grid = new T.GridHelper(14, 28, 0x2a3448, 0x151c2b);
        grid.position.y = -1.2;
        const gridMaterial = grid.material as Three.Material;
        gridMaterial.transparent = true;
        gridMaterial.opacity = 0.4;
        scene.add(grid);

        buildFrame(sampleIndex);
        ready = true;
        resize();

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            visible = entries[0]?.isIntersecting ?? true;
            if (visible) start();
            else stop();
          },
          { threshold: 0.05 },
        );
        intersectionObserver.observe(host);
        document.addEventListener('visibilitychange', onVisibility);
        start();

        canvasEl = renderer.domElement;
        canvasEl.style.touchAction = 'pan-y';
        canvasEl.style.cursor = 'grab';
        canvasEl.addEventListener('pointerdown', onPointerDown);
        canvasEl.addEventListener('pointermove', onPointerMove);
        canvasEl.addEventListener('pointerup', onPointerUp);
        canvasEl.addEventListener('pointercancel', onPointerUp);
        canvasEl.addEventListener('pointerleave', onPointerLeave);
        canvasEl.addEventListener('click', onClick);
      } catch {
        failed = true;
      }
    })();

    return () => {
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (canvasEl) {
        canvasEl.removeEventListener('pointerdown', onPointerDown);
        canvasEl.removeEventListener('pointermove', onPointerMove);
        canvasEl.removeEventListener('pointerup', onPointerUp);
        canvasEl.removeEventListener('pointercancel', onPointerUp);
        canvasEl.removeEventListener('pointerleave', onPointerLeave);
        canvasEl.removeEventListener('click', onClick);
        canvasEl.remove();
        canvasEl = null;
      }
      if (frameGroup) dismountGroup(frameGroup);
      renderer?.dispose();
      frameGroup = null;
      bits = null;
      hitPlane = null;
      beam = null;
      highlight = null;
      beamLight = null;
      renderer = null;
    };
  });
</script>

<div class="wire" data-pinned={pinned}>
  <div class="bar">
    <span class="frame-meta" aria-hidden="true">
      sample frame · {bytes.length} bytes · play.clientbound · 0x{sample.id.toString(16).padStart(2, '0')} → {sample.packet}
    </span>
    <span class="readout" aria-label="Selected byte">
      <span class="offset">0x{activeIndex.toString(16).padStart(2, '0')}</span>
      <span class="hex">0x{activeByte.toString(16).padStart(2, '0')}</span>
      <span class="bits">{binary(activeByte)}</span>
      <span class="segment">{activeLabel}</span>
    </span>
  </div>

  <div class="stage">
    <div class="glow" aria-hidden="true"></div>
    <div class="canvas" bind:this={host} role="img" aria-label="A three-dimensional bitfield of a sample packet frame. Drag to rotate; click a byte to inspect it.">
      {#if failed}
        <p class="fallback">WebGL is unavailable; the byte readout above still works.</p>
      {:else if !ready}
        <p class="loading">building the bitfield…</p>
      {/if}
    </div>
  </div>

  <div class="foot">
    <div class="legend" aria-hidden="true">
      <span class="length"><i></i>length {sample.length}</span>
      <span class="id"><i></i>id {sample.id}</span>
      <span class="payload"><i></i>payload {sample.payloadBytes} B</span>
    </div>
    <div class="controls">
      <button type="button" class="px" onclick={nextSample}>next packet</button>
      <button type="button" class="px" onclick={scan}>scan</button>
      <button type="button" class="px" onclick={resetView}>reset view</button>
    </div>
  </div>
  <p class="hint">
    drag to rotate · click a byte to pin it ·
    <a href="https://threejs.org/" target="_blank" rel="noopener noreferrer">three.js</a>
  </p>
</div>

<style>
  .wire {
    position: relative;
    margin: 6px 0 28px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.35);
    overflow: hidden;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 14px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
    background: #0d1320;
    color: var(--muted);
    font: 12px var(--font-body);
  }

  .frame-meta {
    color: var(--muted);
  }

  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    color: var(--fg);
  }

  .offset {
    color: var(--dim);
  }

  .hex {
    color: var(--accent);
  }

  .bits {
    color: #ded9c2;
    letter-spacing: 0.08em;
  }

  .segment {
    color: var(--love);
  }

  .stage {
    position: relative;
  }

  .glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 38% 56%, rgba(139, 191, 115, 0.13), transparent 46%),
      radial-gradient(ellipse at 68% 48%, rgba(244, 140, 184, 0.09), transparent 44%);
  }

  .canvas {
    position: relative;
    height: 320px;
    width: 100%;
  }

  .canvas :global(canvas) {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .loading,
  .fallback {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: grid;
    place-items: center;
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    pointer-events: none;
  }

  .loading {
    color: var(--dim);
    font-size: 13px;
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 14px;
    padding: 8px 12px;
    border-top: 1px solid rgba(104, 113, 132, 0.25);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    color: var(--muted);
    font-size: 11px;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .legend i {
    width: 8px;
    height: 8px;
    display: inline-block;
  }

  .legend .length i {
    background: var(--accent);
  }

  .legend .id i {
    background: var(--love);
  }

  .legend .payload i {
    background: #ded9c2;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .controls button {
    padding: 3px 8px;
    border: 1px solid rgba(104, 113, 132, 0.45);
    background: #151c2b;
    color: var(--muted);
    font: 11px var(--font-body);
  }

  .controls button:hover {
    border-color: var(--accent);
    color: var(--fg);
  }

  .hint {
    margin: 0;
    padding: 0 12px 8px;
    color: var(--dim);
    font-size: 11px;
  }

  .hint a {
    color: var(--muted);
    text-underline-offset: 2px;
  }

  .hint a:hover {
    color: var(--accent);
  }

  @media (max-width: 640px) {
    .canvas {
      height: 240px;
    }

    .foot {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
