# mintychochip.dev

Personal site of Justin Lo ([mintychochip](https://github.com/mintychochip)). The live site is [mintychochip.dev](https://mintychochip.dev).

It is a Svelte 5 single-page app. The page has a night pond, GitHub activity, token usage, a blog post, projects, a resume, contact, and a Wordle.

## Deploy

Pushes to `master` run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow installs dependencies, runs the check and the tests, builds, and publishes `dist/` to GitHub Pages. It also runs every day at 00:00 UTC, and it can be started by hand.

## Public files

These are served from the site root:

- [robots.txt](https://mintychochip.dev/robots.txt)
- [llms.txt](https://mintychochip.dev/llms.txt)
- [llms-full.txt](https://mintychochip.dev/llms-full.txt) is the written copy of the public page
- [resume.pdf](https://mintychochip.dev/resume.pdf)

Token totals are JSON at `/v1/usage/models` and `/v1/usage/series`.
