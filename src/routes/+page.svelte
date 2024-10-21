<script lang="ts">
    import { base } from '$app/paths'
    import { goto } from '$app/navigation'
    import Button from '$lib/Button.svelte'
</script>
<div class = "container">
    <div class = "sub-container">
        <Button on:click={() => {
            goto('/hello')
        }}>Hello</Button>
    </div>
</div>

<style>
    .sub-container {
        width: 200px;
        height: 100px;
    }
</style>
