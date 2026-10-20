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
  let baseScale = 1;
  let active = 0;
  let waveCenter = 0;
  let scanProgress = 0;
  let pinnedIndex = -1;
  let hoverIndex = -1;
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
    perRow: number;
    spacing: number;
  }

  function layoutFor(count: number): Layout {
    const perRow = Math.max(count, 1);
    return {
      perRow,
      spacing: Math.min(0.55, 10.4 / perRow),
    };
  }

  function positionFor(index: number, layout: Layout): { x: number; y: number } {
    return {
      x: (index - (layout.perRow - 1) / 2) * layout.spacing,
      y: 0,
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

    baseScale = Math.min(1.55, Math.max(1, 17 / Math.max(count, 1)));
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
      new T.PlaneGeometry(layout.spacing * layout.perRow + 1.2, 2.2),
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

    beam = new T.Mesh(
      new T.BoxGeometry(0.02, 1.9, 0.02),
      new T.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.86 }),
    );
    beam.position.z = 0.09;
    frameGroup.add(beam);

    beamLight = new T.PointLight(ACCENT, 2.2, 2.4);
    beamLight.position.set(0, 0, 0.55);
    frameGroup.add(beamLight);

    applyScale();
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

  function applyScale() {
    if (!T || !camera || !group || currentBytes.length === 0) return;
    const layout = layoutFor(currentBytes.length);
    const rowWidth = layout.spacing * currentBytes.length + 0.4;
    const viewWidth =
      2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    group.scale.setScalar(Math.min(baseScale, (viewWidth * 0.9) / rowWidth));
  }

  function resize() {
    if (!renderer || !camera || !host) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyScale();
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
    return Math.sqrt(bestDistance) <= 0.85 ? best : -1;
  }

  function onPointerMove(event: PointerEvent) {
    const next = pick(event);
    if (next !== hoverIndex) {
      hoverIndex = next;
      refreshActive();
    }
    if (renderer) {
      renderer.domElement.style.cursor = next >= 0 ? 'pointer' : 'default';
    }
  }

  function onClick(event: MouseEvent) {
    const next = hoverIndex >= 0 ? hoverIndex : pick(event as unknown as PointerEvent);
    if (next >= 0) {
      pinnedIndex = next;
      pinned = true;
      refreshActive();
    }
  }

  function onPointerLeave() {
    hoverIndex = -1;
    refreshActive();
    if (renderer) renderer.domElement.style.cursor = 'default';
  }

  function pinByte(index: number) {
    active = index;
    activeIndex = index;
    pinnedIndex = index;
    pinned = true;
    scanProgress = index / Math.max(bytes.length, 1);
    if (bits) refreshActive();
    else waveCenter = index;
  }

  function hoverByte(index: number) {
    if (!bits) return;
    hoverIndex = index;
    refreshActive();
  }

  function leaveByte() {
    if (!bits) return;
    hoverIndex = -1;
    refreshActive();
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
        camera.position.set(0, 2.7, 5.8);
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
        canvasEl.style.cursor = 'default';
        canvasEl.addEventListener('pointermove', onPointerMove);
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
        canvasEl.removeEventListener('pointermove', onPointerMove);
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
      <span class="word">byte</span>
      <span class="offset">0x{activeIndex.toString(16).padStart(2, '0')}</span>
      <span class="hex">0x{activeByte.toString(16).padStart(2, '0')}</span>
      <span class="word">bits</span>
      <span class="bits">{binary(activeByte)}</span>
      <span class="segment">{activeLabel}</span>
    </span>
  </div>

  <div class="bytes">
    <p class="explain">
      <strong>One frame, byte by byte.</strong> The strip is the actual wire frame. Below, each column
      is one byte and each cube is one bit; colors mark length, id, and payload.
    </p>
    <div class="byte-strip" role="group" aria-label="Frame bytes">
      {#each bytes as byte, index}
        <button
          type="button"
          class:length={index === 0}
          class:id={index === 1}
          class:payload={index > 1}
          class:active={index === activeIndex}
          aria-pressed={pinned && index === activeIndex}
          aria-label={`Byte ${index}: 0x${byte.toString(16).padStart(2, '0')}, ${index === 0 ? 'length' : index === 1 ? 'id' : 'payload'}`}
          title={`byte 0x${index.toString(16).padStart(2, '0')} = 0x${byte.toString(16).padStart(2, '0')}`}
          onclick={() => pinByte(index)}
          onmouseenter={() => hoverByte(index)}
          onmouseleave={leaveByte}
          onfocus={() => hoverByte(index)}
          onblur={leaveByte}
        >{byte.toString(16).padStart(2, '0')}</button>
      {/each}
    </div>
  </div>

  <div class="stage">
    <span class="view-label">bit view</span>
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
    </div>
  </div>
  <p class="hint">
    click a byte above or below to pin it ·
    <a href="https://threejs.org/" target="_blank" rel="noopener noreferrer">three.js</a>
  </p>
</div>

<style>
  .wire {
    position: relative;
    margin: 16px 0 30px;
    padding: 0 3px;
    background: transparent;
  }

  .bar {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 0 0 7px;
    color: var(--muted);
    font: 12px var(--font-body);
  }

  .frame-meta {
    color: var(--muted);
  }

  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    color: var(--fg);
  }

  .word {
    color: var(--dim);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
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

  .bytes {
    padding: 7px 0 0;
    background: transparent;
  }

  .explain {
    margin: 0 0 8px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .explain strong {
    color: var(--fg);
    font-weight: 700;
  }

  .byte-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .byte-strip button {
    padding: 2px 3px;
    border: 1px solid transparent;
    background: rgba(21, 28, 43, 0.72);
    color: var(--muted);
    font: 10px var(--font-body);
    line-height: 1.2;
  }

  @media (max-width: 640px) {
    .byte-strip button {
      padding: 4px 5px;
      font-size: 11px;
    }
  }

  .byte-strip button.length {
    color: var(--accent);
    border-color: rgba(139, 191, 115, 0.3);
  }

  .byte-strip button.id {
    color: var(--love);
    border-color: rgba(244, 140, 184, 0.3);
  }

  .byte-strip button.payload {
    color: #ded9c2;
  }

  .byte-strip button:hover,
  .byte-strip button:focus-visible {
    border-color: var(--accent);
    color: var(--fg);
  }

  .byte-strip button.active {
    border-color: var(--fg);
    background: var(--fg);
    color: var(--bg);
  }

  .stage {
    position: relative;
    margin-top: 4px;
  }

  .view-label {
    position: absolute;
    top: 8px;
    left: 0;
    z-index: 2;
    color: var(--dim);
    font: 10px var(--font);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    pointer-events: none;
  }

  .glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 45% 60%, rgba(139, 191, 115, 0.1), transparent 55%),
      radial-gradient(ellipse at 62% 52%, rgba(244, 140, 184, 0.07), transparent 48%);
  }

  .canvas {
    position: relative;
    height: 250px;
    width: 100%;
    filter: drop-shadow(0 22px 26px rgba(0, 0, 0, 0.45));
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
    padding: 4px 2px 4px 0;
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
    padding: 0;
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
      height: 210px;
    }

    .foot {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
