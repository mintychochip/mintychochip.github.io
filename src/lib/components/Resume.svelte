<script lang="ts">
  import { site } from '../site';
  import LanguageIcon from './LanguageIcon.svelte';

  const LANGUAGES = [
    { name: 'Rust', level: 'Systems, Tooling & Token Stores' },
    { name: 'Java', level: 'High-Throughput Plugins & Semantic Search' },
    { name: 'TypeScript', level: 'Full-Stack, Agents & Interactive Web' },
    { name: 'JavaScript', level: 'Browser APIs & Realtime Graphics' },
    { name: 'Python', level: 'ML Pipelines, Evaluation & Automation' },
    { name: 'Go', level: 'Distributed Services & Backend Microservices' },
    { name: 'Astro', level: 'Performant Content & Server Engines' },
    { name: 'Svelte', level: 'Reactive UI & State Primitives' },
    { name: 'C++', level: 'Performance-Critical Core Algorithms' },
    { name: 'Shell', level: 'POSIX Scripts, CI/CD & Dev Automation' },
  ];
</script>

<section id="resume" aria-labelledby="resume-title">
  <div class="resume-head">
    <div>
      <h2 id="resume-title">Resume & Stack</h2>
      <p class="lede">Core programming languages, systems, and credentials.</p>
    </div>
    <a class="btn px dl-btn" href={site.resumeUrl} download={site.resumeFile}>
      Download resume (PDF) ↗
    </a>
  </div>

  <div class="stack-section">
    <h3 class="stack-heading">Languages & Technologies</h3>
    <div class="languages-grid">
      {#each LANGUAGES as lang}
        <div class="lang-card px">
          <div class="lang-top">
            <LanguageIcon language={lang.name} size={20} />
            <span class="lang-name">{lang.name}</span>
          </div>
          <span class="lang-desc">{lang.level}</span>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .resume-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px 24px;
    margin-bottom: 24px;
  }

  h2 {
    margin: 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }

  .lede {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 16px;
  }

  .dl-btn {
    text-decoration: none;
    font-size: 15px;
    padding: 8px 16px;
    align-self: flex-start;
  }

  .dl-btn:hover {
    background: var(--accent);
    color: #080c18;
  }

  .stack-section {
    margin-top: 16px;
  }

  .stack-heading {
    margin: 0 0 14px;
    font-size: 18px;
    color: var(--fg);
    font-weight: 700;
  }

  .languages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
  }

  .lang-card {
    background: var(--field);
    border: 1px solid rgba(104, 113, 132, 0.35);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .lang-card:hover {
    border-color: rgba(139, 191, 115, 0.5);
    background: #172032;
  }

  .lang-top {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .lang-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--fg);
  }

  .lang-desc {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.35;
  }

  @media (max-width: 600px) {
    .languages-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .lang-card {
      padding: 12px 14px;
    }
  }
</style>
