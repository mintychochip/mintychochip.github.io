<script>
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
</script>
<button on:click={(e) => {
    dispatch('click',e);
}}><div class = "text">
    <slot/>
</div></button>

<style>
    button {
        width: 175px;
        height: 100px;
        color:black;
        border-style:beveled;
        border-color: rgb(223, 221, 221);
        background-color: #fff;
        border-radius: 5px;
    }
    .text {
        font-size: 3vw;
        font-family:'Courier New', Courier, monospace;
        color: black;
    }
    ::slotted(.text) {
        font-size: inherit;
        font-family:inherit;
        color: inherit;
    }
</style>