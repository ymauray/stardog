# Contributing to StarDog

Thanks for your interest in StarDog! This page sums up how to propose a change.

## Before you start

For a new feature or a significant change, open an issue or start a [discussion](https://github.com/ymauray/stardog/discussions) first to talk it over with the maintainer.

## Development setup

Requirements: a modern browser, Python 3 (or any static file server) and Node.js 22+ for the checks.

```sh
python3 -m http.server 8765   # play at http://localhost:8765 (?level=2&t=86 jumps to a boss)
node tools/check.mjs          # the checks run by CI
```

The whole game lives in `index.html`; tuning constants are at the top of its script. See `AGENTS.md` for the architecture.

### Radio lines

Radio lines live in the `<script id="dialog">` block of `index.html`. If you add or change one, regenerate its voice file with `node tools/make-voices.mjs --only <id>` (needs an `ELEVENLABS_API_KEY` in a git-ignored `.env`, or falls back to macOS `say`) and commit the `.m4a`. CI fails if a line has no voice file. Never commit `.env`.

## Proposing a change

1. Create a branch from `main` (e.g. `fix/...`, `feature/...`).
2. Make focused commits with clear messages.
3. Run `node tools/check.mjs` and play the affected mission or boss.
4. Open a pull request to `main` and fill in the template. Pull requests are squash-merged once CI passes.
