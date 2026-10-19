# mintychochip.dev

My site is [mintychochip.dev](https://mintychochip.dev). I publish as [mintychochip](https://github.com/mintychochip).

It's a Svelte 5 page. I have a night pond, my GitHub activity, token usage, a blog post, projects, my resume, contact, and a Wordle. There is also an interactive article at [mintychochip.dev/bytemill](https://mintychochip.dev/bytemill): it runs the real Bytemill Rust compiler in WebAssembly so you can check schemas and decode/encode packets in the page.

## Deploy

When I push to `master`, [the Pages workflow](.github/workflows/deploy.yml) installs dependencies, runs the check and the tests, builds, and publishes `dist/` to GitHub Pages. It also runs every day at 00:00 UTC, and I can start it by hand.

## Bytemill article

`/bytemill` is a second Vite entry (`bytemill/index.html`). Its engine is the
committed `public/bytemill/bytemill.wasm` built from `crates/bytemill-wasm` in
[bytemill](https://github.com/mintychochip/bytemill). Three.js is loaded
dynamically for the sample-frame bitfield, so the main site bundle does not
carry it. To rebuild it after a
compiler change:

```bash
BYTEMILL_DIR=../protoc scripts/build-bytemill-wasm.sh
```

## Public files

I serve these from the site root:

- [robots.txt](https://mintychochip.dev/robots.txt)
- [llms.txt](https://mintychochip.dev/llms.txt)
- [llms-full.txt](https://mintychochip.dev/llms-full.txt) is the written copy of the public page
- [resume.pdf](https://mintychochip.dev/resume.pdf)

Token totals are JSON at `/v1/usage/models` and `/v1/usage/series`.
