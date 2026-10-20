<script lang="ts">
  import { onMount } from 'svelte';
  import Footer from '../lib/components/Footer.svelte';
  import { getBytemill, type Bytemill, type TargetCompat } from './wasm';
  import { CHAT_SCHEMA } from './schemas';
  import VarintLab from './VarintLab.svelte';
  import Playground from './Playground.svelte';
  import FrameLab from './FrameLab.svelte';
  import StagesLab from './StagesLab.svelte';
  import WireScene from './WireScene.svelte';
  import CompatMatrix from './CompatMatrix.svelte';

  let engine = $state<Bytemill | null>(null);
  let engineError = $state('');
  let schemaSource = $state(CHAT_SCHEMA);
  let targets = $state<TargetCompat[]>([]);

  const schemaExample = `encoding position = {
    raw: u64be
    x = sign_extend(raw >> 38, 26)
    y = sign_extend(raw % 4096, 12)
    z = sign_extend((raw >> 12) % 67108864, 26)
}

packet metadata {
    entity_id: varint
    kind: varint
    value: match kind {
        0 => boolean
        1 => varint
        2 => string(64)
        _ => { raw: varint }
    }
}

protocol demo @ v1 {
    frame default {
        length: varint
        id: varint
        payload: rest
    }
    route play.clientbound 0x01 => player_chat
}`;

  onMount(() => {
    let alive = true;
    getBytemill()
      .then((loaded) => {
        if (!alive) return;
        engine = loaded;
        targets = loaded.targets();
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        engineError = cause instanceof Error ? cause.message : String(cause);
      });
    return () => {
      alive = false;
    };
  });
</script>

<svelte:head>
  <title>Bytemill — a schema language for binary wire formats</title>
  <meta
    name="description"
    content="Interactive article: Bytemill, a schema language and compiler for binary wire formats. Edit BML schemas, decode packets, and encode VarInts with the real Rust compiler in WebAssembly."
  />
  <link rel="canonical" href="https://mintychochip.dev/blog/bytemill/" />
  <meta property="og:title" content="Bytemill — a schema language for binary wire formats" />
  <meta
    property="og:description"
    content="Interactive article: BML schemas, packet decoding, and code generation, with the real Bytemill Rust compiler running in this tab."
  />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://mintychochip.dev/blog/bytemill/" />
</svelte:head>

<div class="page">
  <nav class="mast" aria-label="Article navigation">
    <a class="brand" href="/">mintychochip</a>
    <div class="links">
      <a href="/#blog">blog</a>
      <a href="https://github.com/mintychochip/bytemill" target="_blank" rel="noopener noreferrer">source ↗</a>
      <a href="https://github.com/mintychochip/bytemill#readme" target="_blank" rel="noopener noreferrer">docs ↗</a>
    </div>
  </nav>

  <main class="article">
    <header class="hero">
      <h1>Bytemill</h1>
      <p class="subtitle">
        A schema language for binary wire formats, running live in this tab.
      </p>
      <div class="byline">
        <span>Justin Lo</span>
        <span class="sep">·</span>
        <span>October 2026</span>
        <span class="sep">·</span>
        <span>interactive article</span>
      </div>
      <p class="engine-line" aria-live="polite">
        <span class="dot" class:ready={engine}></span>
        {#if engine}
          bytemill {engine.version} · Rust → Wasm · no server
        {:else if engineError}
          engine unavailable
        {:else}
          loading compiler…
        {/if}
      </p>
    </header>

    <WireScene />

    {#if engineError}
      <div class="engine-error" role="alert">
        The WebAssembly engine did not load ({engineError}). The interactive labs need it; the rest of
        the article still reads.
      </div>
    {/if}

    <section id="try" class="try" aria-labelledby="try-title">
      <h2 id="try-title">Try it</h2>
      <p class="lab-lead">
        A VarInt carries seven payload bits per byte; the high bit says another byte follows. Type a
        value and the compiler encodes it.
      </p>
      <VarintLab {engine} />

      <p class="lab-lead">
        Now change a schema. The playground checks it, updates its route table, and decodes or
        encodes packets with the same engine.
      </p>
      <Playground {engine} bind:source={schemaSource} />
    </section>

    <h2 id="why">Why this exists</h2>

    <p>
      <a href="https://protobuf.dev/" target="_blank" rel="noopener noreferrer">Protobuf</a> assumes
      fields have fixed shapes and one canonical encoding. Binary
      <a
        href="https://minecraft.wiki/w/Java_Edition_protocol"
        target="_blank"
        rel="noopener noreferrer">game protocols</a
      >
      do not. A coordinate is packed into 64 bits. A tag decides whether the next value is a boolean,
      a VarInt, or a string. A packet id only means something inside a connection state.
    </p>

    <p>
      That forces hand-written decoders, and hand-written decoders drift from their specs.
      <a href="https://github.com/mintychochip/bytemill" target="_blank" rel="noopener noreferrer"
        >Bytemill</a
      >
      makes the wire format executable: one
      <a
        href="https://github.com/mintychochip/bytemill#the-dsl"
        target="_blank"
        rel="noopener noreferrer">BML schema</a
      >
      is the decoder, the encoder, and the source for generated code.
    </p>

    <ul class="reasons">
      <li>
        <strong>Layout follows data.</strong> Conditional bytes, repeats, computed fields, and
        <code>match</code> arms are schema constructs.
      </li>
      <li>
        <strong>Routing is schema.</strong> <code>state.direction id =&gt; packet</code> is checked
        data, not stringly typed glue.
      </li>
      <li>
        <strong>One spec, one matrix.</strong>
        <a href="#targets"
          >{targets.length > 0 ? `${targets.length} typed printers` : 'Every typed printer'}</a
        >, each with the standards the compiler accepts for it.
      </li>
    </ul>

    <details class="schema-details">
      <summary>See the three layers in one file</summary>
      <pre class="code"><code>{schemaExample}</code></pre>
    </details>

    <h2 id="frames">The frame is part of the protocol</h2>

    <p>
      Payloads arrive inside a framing layer: a length, an id, then a route lookup. This lab decodes
      the whole frame, not just the packet body.
    </p>

    <FrameLab {engine} />

    <h2 id="compiler">Under the hood</h2>

    <p>
      The browser loads {engine ? `a ${Math.round(engine.bytes / 1024)} KB` : 'a'}
      <a href="https://webassembly.org/" target="_blank" rel="noopener noreferrer">WebAssembly</a>
      build of the bytemill crate. The bridge only moves memory and JSON; every answer comes from the
      same lexer, parser, resolver, analyzer, and interpreter as the
      <a href="https://github.com/mintychochip/bytemill#readme" target="_blank" rel="noopener noreferrer"
        ><code>bml</code> CLI</a
      >.
    </p>

    <StagesLab {engine} source={schemaSource} />

    <p>
      The typed program feeds {targets.length > 0 ? `${targets.length} printers` : 'the printers'};
      generated decoders are tested byte-for-byte against the interpreter, so the two paths cannot
      quietly disagree.
    </p>

    <h2 id="targets">Compatibility matrix</h2>

    <p>
      Every typed printer and the standards the compiler accepts for it, read from the compiler’s
      <code>compat</code> table instead of a copy in the article.
    </p>

    <CompatMatrix {targets} loading={!engine && !engineError} />

    <h2 id="limits">Limits</h2>

    <p>
      Self-contained schemas only; the browser cannot read imports. Code emission writes
      directories, so it stays in the CLI. Everything on this page is the real compiler.
    </p>

    <p>
      Compression is a CLI feature too: <code>bml decode/encode --compression zlib[:threshold]</code>
      handles Minecraft’s frame envelope, while this page works on the logical frame.
    </p>

    <p class="closing">
      Source and CLI:
      <a href="https://github.com/mintychochip/bytemill" target="_blank" rel="noopener noreferrer"
        >github.com/mintychochip/bytemill</a
      >.
    </p>
  </main>

  <Footer />
</div>

<style>
  .page {
    width: min(var(--width), calc(100% - 32px));
    margin: 0 auto;
    padding: 16px 0 40px;
  }

  .mast {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px 28px;
    padding-bottom: 12px;
    margin-bottom: 34px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.28);
  }

  .brand {
    color: var(--fg);
    font: 700 22px/1 var(--font);
    text-decoration: none;
  }

  .brand:hover {
    color: var(--accent);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 15px;
  }

  .links a {
    color: var(--muted);
    text-decoration: none;
  }

  .links a:hover {
    color: var(--accent);
  }

  .article {
    width: min(860px, 100%);
    margin: 0 auto;
    font-size: 17px;
    line-height: 1.65;
    color: #ded9c2;
  }

  .hero {
    margin-bottom: 26px;
  }

  h1 {
    margin: 0;
    font-size: clamp(48px, 8vw, 68px);
    line-height: 0.95;
    letter-spacing: -0.02em;
  }

  .subtitle {
    max-width: 640px;
    margin: 16px 0 12px;
    color: var(--fg);
    font-size: clamp(19px, 3vw, 22px);
    line-height: 1.45;
  }

  .byline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    color: var(--muted);
    font-size: 14px;
  }

  .sep {
    color: var(--dim);
  }

  .engine-line {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 12px 0 0;
    color: var(--dim);
    font-size: 12px;
  }

  .dot {
    width: 7px;
    height: 7px;
    background: var(--dim);
    flex-shrink: 0;
  }

  .dot.ready {
    background: var(--accent);
  }

  .engine-error {
    margin: 18px 0;
    padding: 10px 12px;
    border: 1px solid rgba(232, 151, 124, 0.5);
    background: rgba(232, 151, 124, 0.08);
    color: var(--error);
    font-size: 14px;
  }

  h2 {
    margin: 54px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
    font-size: clamp(24px, 4vw, 30px);
    line-height: 1.2;
  }

  .try h2 {
    margin-top: 34px;
  }

  .lab-lead {
    max-width: 70ch;
    margin: 12px 0 8px;
    color: var(--muted);
    font-size: 15px;
  }

  p {
    margin: 15px 0;
  }

  a {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  code {
    padding: 1px 4px;
    background: #151c2b;
    color: var(--fg);
    font-family: var(--font-body);
    font-size: 0.88em;
  }

  .reasons {
    margin: 18px 0;
    padding-left: 22px;
  }

  .reasons li {
    margin: 8px 0;
  }

  .reasons strong {
    color: var(--fg);
  }

  .schema-details {
    margin: 20px 0 24px;
    border: 1px solid rgba(104, 113, 132, 0.35);
    background: var(--field);
  }

  .schema-details summary {
    padding: 9px 12px;
    color: var(--fg);
    font-family: var(--font);
    font-size: 15px;
    cursor: var(--cursor-pointer);
  }

  .schema-details summary:hover {
    color: var(--accent);
  }

  .schema-details[open] summary {
    border-bottom: 1px solid rgba(104, 113, 132, 0.3);
  }

  .schema-details .code {
    margin: 0;
    border: 0;
  }

  .code {
    margin: 20px 0 24px;
    padding: 14px 16px;
    overflow-x: auto;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.35);
    color: #ded9c2;
    font: 13px/1.6 var(--font-body);
    tab-size: 4;
  }

  .code code {
    padding: 0;
    background: none;
    font-size: inherit;
  }

  .closing {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid rgba(104, 113, 132, 0.3);
    color: var(--muted);
    font-size: 14px;
  }

  @media (max-width: 640px) {
    .page {
      width: min(var(--width), calc(100% - 24px));
    }

    .article {
      font-size: 16px;
    }

    .byline {
      font-size: 13px;
    }

    h2 {
      margin-top: 40px;
    }

    .try h2 {
      margin-top: 28px;
    }

    .code {
      padding: 12px;
      font-size: 12px;
    }
  }
</style>
