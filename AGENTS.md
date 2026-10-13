# AGENTS.md

StarDog is a StarFox-style on-rails 3D shooter that runs in the browser: a dog pilot against the Cat Empire, three missions, three bosses. Everything ships as static files served by GitHub Pages.

## Commands

```sh
python3 -m http.server 8765        # play at http://localhost:8765 (http is required for the voice files)
node tools/check.mjs               # the checks CI runs (Node 22+)
node tools/make-voices.mjs --only <id>[,<id>]   # regenerate radio voice files
```

There is no build step and no dependency to install. Three.js is loaded from a CDN through the import map in `index.html`.

Debug URLs: `?level=N` starts at mission N (1–3), `?t=S` jumps S seconds into it. Bosses: `?level=1&t=97`, `?level=2&t=86`, `?level=3&t=89`.

## Architecture

- `index.html` holds the whole game:
  - CSS and HUD markup;
  - a `<script type="application/json" id="dialog">` block with every radio line as `id: [speaker, subtitle, optional speech text]` (the third field is what the voice says, e.g. ElevenLabs `<break time="0.5s" />` pauses);
  - one ES module script, organised in sections: config constants, renderer/scene, environments (`ENVS`), models, player, input, audio (synthesized SFX, step-sequencer music, radio voice chain), HUD/comms, effects, weapons, enemies, bosses (`BOSSES`: build/place/update per boss), pickups, scenery, levels (`LEVELS`, each with a timed `script`), player life cycle, screens and flow, main update loop.
- `voices/<id>.m4a`: one generated voice file per dialog line.
- `tools/make-voices.mjs`: generates the voice files with ElevenLabs (`ELEVENLABS_API_KEY` in the environment or a git-ignored `.env`) or macOS `say`; the voice per character is the `ELEVEN_CAST` table.
- `tools/check.mjs`: static checks used by CI.

## Conventions

- Gameplay tuning goes through the named constants at the top of the game script (`HP`, `CHARGE_TIME`, `ASSIST_*`, `BOOST_*`, `WAVE_*`...), not magic numbers in the logic. Document new mechanics and constants in the README.
- Match the existing style: 2-space indentation, single quotes, small focused functions per section.
- Positions are in world space; the player flies toward −Z. Anything that must keep pace with the player should only track `P.z`, never the player's x/y (or it becomes impossible to dodge).
- A new or changed radio line needs its regenerated `.m4a` committed; CI fails otherwise.
- Never commit `.env` or any API key.
- User-facing text in the game and docs is in English.

## Workflow

- Work on a branch and open a pull request to `main`; pull requests are squash-merged once the `check` CI job passes. Pushing directly to `main` is blocked.
- Every merge to `main` redeploys https://ymauray.github.io/stardog/ through GitHub Pages.
- Releases: push a `vX.Y.Z` tag; `.github/workflows/release.yml` publishes the GitHub release.
