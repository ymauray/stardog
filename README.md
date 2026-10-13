# StarDog

A StarFox-style on-rails 3D shooter in a single `index.html` (Three.js from a CDN; music and sound effects are synthesized with WebAudio).
Pilot the Arfwing and drive the Cat Empire out of the galaxy across three missions:

1. **Barkeria** — city planet at sunset. Boss: Sergeant Whiskers' *Tabby Tank*.
2. **Kibble Belt** — asteroid field in deep space. Boss: Duchess Fluffington's *Hairball*.
3. **Planet Catnip** — lava world and fortress. Boss: *Emperor Meowdross*.

Finishing a mission unlocks the next one (press 1–3 on the title screen).

## Play

**Play online: https://ymauray.github.io/stardog/**

Or locally, serve the folder (needed for the radio voices) and open it:

```sh
python3 -m http.server 8765   # then open http://localhost:8765
```

URL options: `?level=2` starts at a mission, `?t=86` jumps ahead within it (e.g. `?level=2&t=86` for the Hairball).

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Fly | WASD / arrows | Left stick / D-pad |
| Fire (hold for auto-fire; release a full charge for a homing lock-on shot) | Space / J | A |
| Toggle aim assist (shots snap to enemies near the reticle) | T | Y |
| Smart bomb | B / K | B / X |
| Barrel roll (deflects enemy shots) | Q / E | LB / RB |
| Boost / brake | Shift / C | RT / LT |
| Pause, mute, invert Y | P, M, I | Start |
| Toggle radio voices | V | |

## Gameplay

- **Lasers**: single → twin → hyper with the green **L** pickups. Every hit you take costs one laser level, then you're safe from further losses for 5 seconds. Dying also costs one level.
- **Charged shot**: keep fire held for 2 seconds (reticle turns yellow), release to launch a homing blast with splash damage. A red diamond shows the locked target.
- **Aim assist** (T): a laser fired with the reticle within ~4° of an enemy's hull, up to 200 units away, is guided onto it. Guided shots turn at a limited rate, so sharp dodges can still escape them.
- **Barrel roll**: deflects enemy shots back as friendly fire.
- **Wave bonus**: destroy every enemy of a wave for 300 points per enemy. Consecutive cleared waves raise a chain multiplier (×1.5, ×2, … up to ×4) shown under the score; a wave where an enemy escapes or is rammed breaks the chain.
- **Pickups**: silver ring +30 shield, gold ring +50 shield (three gold rings = extra life), **B** = extra bomb.
- **Bosses**: invulnerable and silent while they fly in, then a 5-second countdown starts the fight. From then on, hits no longer cost laser levels (🔒 next to the laser level). Each boss has phases with different weak points.
- **Rank**: each mission rates your hits from C to S; a full campaign gets an overall rank.

## Tuning

The main knobs are constants at the top of the game script in `index.html`: `HP` (enemy hit points), `CHARGE_TIME`, `ASSIST_ANGLE` / `ASSIST_RANGE` / `LOCK_ANGLE`, `LASER_TURN` / `HOMING_TURN`, `BOOST_DRAIN` / `BOOST_REGEN`, `LASER_LOSS_GRACE`, `BOSS_COUNTDOWN`, `SHELL_HP` / `SHELL_WARNING`, `YARN_POP` / `YARN_SPEED`, and next to the wave code `WAVE_BONUS_PER_ENEMY` / `WAVE_CHAIN_STEP` / `WAVE_CHAIN_MAX`. Each mission's timeline is its `script` array in `LEVELS`.

## Radio voices

Every radio line lives in the `<script id="dialog">` block of `index.html` as `[speaker, subtitle, optional speech text]`; the optional third field is what the voice actually says, with emphasis and ElevenLabs pauses such as `<break time="0.5s" />`. The voice files in `voices/` are generated from it:

```sh
node tools/make-voices.mjs                       # only missing lines
node tools/make-voices.mjs --force               # regenerate everything (~2,400 ElevenLabs characters)
node tools/make-voices.mjs --only l1_intro,twin  # regenerate specific lines
node tools/make-voices.mjs --engine say --force  # offline, with macOS voices
```

With `ELEVENLABS_API_KEY` set (in the environment or in a git-ignored `.env` file) it uses ElevenLabs; otherwise macOS `say`. The voice of each character is the `ELEVEN_CAST` table at the top of `tools/make-voices.mjs` (an ElevenLabs voice id per character). The key only needs the text-to-speech permission.

The game plays them through a radio chain (high-pass + low-pass band, mid boost, light saturation, static hiss, squelch beeps) and ducks the music while someone talks. If a file is missing, or the page is opened via `file://`, it falls back to the browser's speech synthesis without the radio filter.

## Credits

Radio voices generated with [ElevenLabs](https://elevenlabs.io). 3D rendering by [Three.js](https://threejs.org).
