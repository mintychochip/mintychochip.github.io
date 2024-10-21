<script>
    import { goto } from '$app/navigation'
    import Button from '$lib/Button.svelte'
    import { typewriter } from '$lib/typewriter.js'
</script>

<div class = "container">
    <div class = "sub-container">
        <div>
            <span class = "text" in:typewriter>Hello World!</span>
            <span class = "text blinking">_</span>
        </div>
        <Button on:click={() => {
            goto('/')
        }}>Ok</Button>
    </div>
</div>

<style>    
    .text {
        font-size: 72px;
    }

    @keyframes blink {
        50% {opacity: 0}
    }

    .blinking {
        animation: blink 0.7s step-end infinite;
        display: inline;
    }
</style>