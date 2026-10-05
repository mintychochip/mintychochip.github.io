<script lang="ts">
  import gmail from '../icons/gmail.svg';
  import github from '../icons/github.svg';
  import linkedin from '../icons/linkedin.svg';

  let {
    name,
    size = 22,
  }: {
    name: 'github' | 'gmail' | 'linkedin';
    size?: number;
  } = $props();

  const SRC = { github, gmail, linkedin } as const;
</script>

<img src={SRC[name]} alt="" style:height="{size}px" style:width="auto" />
