#!/usr/bin/env node
// Generates voices/<id>.m4a for every radio line in index.html.
// Usage: node tools/make-voices.mjs [--engine elevenlabs|say] [--force] [--only id1,id2] [--stability 0.35] [--style 0.45]
//   elevenlabs (default when ELEVENLABS_API_KEY is set, in the environment or in .env) — natural voices
//   say        — macOS built-in voices, offline
// The game applies the radio filter at playback time, so these files are clean recordings.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'voices');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const force = args.includes('--force');
const only = opt('--only')?.split(',');

// .env support (KEY=value lines), without overriding the real environment
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const apiKey = process.env.ELEVENLABS_API_KEY;
const engine = opt('--engine') || (apiKey ? 'elevenlabs' : 'say');

const html = readFileSync(join(root, 'index.html'), 'utf8');
const block = html.match(/<script type="application\/json" id="dialog">([\s\S]*?)<\/script>/);
if (!block) throw new Error('dialog block not found in index.html');
const dialog = JSON.parse(block[1]);

// Help the synthesizers with made-up names
const SPEECH_FIXES = [[/StarDog/g, 'Star Dog'], [/Meowdross/g, 'Meow-dross'], [/MROWWW/g, 'Mrrrowww'], [/Arfwing/g, 'Arf-wing']];

// ---------- ElevenLabs ----------
// Stock voices (voice ids). Swap any id for one from your ElevenLabs voice library.
const ELEVEN_CAST = {
  biscuit: 'TX3LPaxmHKxFdv7VOQHJ', // Liam: young, energetic
  pepper: '2EiwWnXFnvU5JabPnv8n', // Clyde: war veteran
  noodle: 'SOYHLrjzK2X1ezoPC6cr', // Harry: anxious
  whiskers: 'VR6AewLTigWG4xSOukaG', // Arnold: crisp, gruff
  duchess: 'z9fAnlkpzviPz146aGWa', // Glinda: witchy, theatrical
  meow: 'onwK4e9ZLuTAKqWW03F9', // Daniel: deep British
};
const ELEVEN_MODEL = 'eleven_multilingual_v2';
// Lower stability/higher style = more expressive but more prone to glitches on short lines
const STABILITY = Number(opt('--stability') ?? 0.35), STYLE = Number(opt('--style') ?? 0.45);
async function elevenlabs(who, text, out) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_CAST[who]}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text, model_id: ELEVEN_MODEL,
      voice_settings: { stability: STABILITY, similarity_boost: 0.8, style: STYLE, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  // keep a single format for the game: convert the MP3 to AAC/m4a with macOS afconvert
  const mp3 = join(tmpdir(), `stardog-${process.pid}.mp3`);
  writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', mp3, out]);
  rmSync(mp3);
}

// ---------- macOS say ----------
// Character -> [voice name prefix, preferred locale, words per minute]
const SAY_CAST = {
  biscuit: ['Rocko', 'en_US', 195],
  pepper: ['Grandpa', 'en_US', 175],
  noodle: ['Flo', 'en_US', 205],
  whiskers: ['Ralph', 'en_US', 185],
  duchess: ['Shelley', 'en_GB', 180],
  meow: ['Daniel', 'en_GB', 160],
};
let installed;
function resolveVoice(prefix, locale) {
  // voice names are localized (e.g. "Rocko (Anglais (É.-U.))"), so resolve them from `say -v ?`
  installed ??= execFileSync('say', ['-v', '?'], { encoding: 'utf8' }).split('\n')
    .map((line) => line.match(/^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#/))
    .filter(Boolean)
    .map(([, name, loc]) => ({ name: name.trim(), locale: loc }));
  const matches = installed.filter((v) => v.name === prefix || v.name.startsWith(prefix + ' '));
  const v = matches.find((m) => m.locale === locale) || matches[0];
  if (!v) throw new Error(`voice "${prefix}" is not installed (System Settings > Accessibility > Spoken Content)`);
  return v.name;
}
function say(who, text, out) {
  const [prefix, locale, wpm] = SAY_CAST[who];
  execFileSync('say', ['-v', resolveVoice(prefix, locale), '-r', String(wpm), '-o', out, '--file-format=m4af', '--data-format=aac', text]);
}

// ---------- main ----------
if (engine === 'elevenlabs' && !apiKey) throw new Error('ELEVENLABS_API_KEY is not set (environment or .env)');
mkdirSync(outDir, { recursive: true });
let made = 0, chars = 0;
for (const [id, [who, text, speech]] of Object.entries(dialog)) {
  if (only && !only.includes(id)) continue;
  const out = join(outDir, `${id}.m4a`);
  if (!force && !only && existsSync(out)) continue;
  // optional 3rd field: what the voice should actually say (e.g. ElevenLabs <break time="0.5s" /> pauses)
  const spoken = SPEECH_FIXES.reduce((s, [re, rep]) => s.replace(re, rep), speech ?? text);
  if (engine === 'elevenlabs') await elevenlabs(who, spoken, out);
  else say(who, spoken.replace(/<break time="([\d.]+)s" \/>/g, (_, t) => `[[slnc ${Math.round(t * 1000)}]]`), out);
  made++;
  chars += spoken.length;
  console.log(`${id.padEnd(12)} ${who.padEnd(9)} ${text}`);
}
console.log(`${made} file(s) generated in voices/ with ${engine}${engine === 'elevenlabs' ? ` (~${chars} characters billed)` : ''}`);
