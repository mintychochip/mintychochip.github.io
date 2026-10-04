<script lang="ts">
  import { site } from '../site';
</script>

<section id="resume" aria-labelledby="resume-title">
  <h2 id="resume-title">Resume</h2>
  <p>One page, PDF.</p>
  <a class="btn px" href={site.resumeUrl} download={site.resumeFile}>Download resume</a>
</section>

<style>
  h2 {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
  }
  p {
    margin: 12px 0 20px;
    color: var(--muted);
  }
</style>
