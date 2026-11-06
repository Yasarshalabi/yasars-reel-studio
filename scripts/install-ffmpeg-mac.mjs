// macOS (Apple Silicon) FFmpeg: the static release build from Martin Riedl's FFmpeg build server, one zip per tool.
// Each zip is checked against the SHA-256 file the build server publishes beside it before anything is extracted,
// then the tool must report the pinned version and carry the audio filters the mix pipeline needs.
import './lib/project-tmp.mjs';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ROOT, run, writeJson } from './lib/media.mjs';
import { assertProjectOutput } from './lib/project-paths.mjs';

const lock = JSON.parse(await fs.readFile(path.join(ROOT, 'versions.lock.json'), 'utf8'));
const pin = lock.macos?.ffmpeg;
if (process.platform !== 'darwin' || !pin) throw new Error('install-ffmpeg-mac.mjs runs on macOS with a macos.ffmpeg pin in versions.lock.json.');
const REQUIRED_FILTERS = ['ebur128', 'loudnorm', 'sidechaincompress'];
const dir = assertProjectOutput(path.join(ROOT, 'Tools/bin'));
const cache = assertProjectOutput(path.join(ROOT, 'state/cache/downloads'));
await fs.mkdir(dir, { recursive: true });
await fs.mkdir(cache, { recursive: true });

async function digest(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

// The .sha256 file holds the hex digest, optionally followed by the file name.
function parseChecksum(text) {
  const match = /\b([a-f0-9]{64})\b/i.exec(String(text));
  if (!match) throw new Error('The published checksum file has no SHA-256 value.');
  return match[1].toLowerCase();
}

async function fetchTool(name) {
  const url = pin[name];
  const published = await fetch(`${url}${pin.checksumSuffix}`);
  if (!published.ok) throw new Error(`Checksum download failed for ${name} (HTTP ${published.status}).`);
  const expected = parseChecksum(await published.text());
  const archive = path.join(cache, `${name}-${pin.version}-macos-arm64.zip`);
  const cached = await fs.stat(archive).then(() => digest(archive)).catch(() => null);
  if (cached !== expected) {
    console.error(`Downloading FFmpeg ${pin.version} (${name}) for Apple Silicon`);
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`Download failed for ${name}: HTTP ${response.status}`);
    const partial = `${archive}.partial`;
    await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
    const actual = await digest(partial);
    if (actual !== expected) { await fs.rm(partial, { force: true }); throw new Error(`${name} archive failed its SHA-256 check (expected ${expected}, got ${actual}).`); }
    await fs.rename(partial, archive);
  }
  await run('/usr/bin/unzip', ['-o', '-q', archive, name, '-d', dir]);
  const binary = path.join(dir, name);
  await fs.chmod(binary, 0o755);
  await fs.rm(archive, { force: true });
  return { binary, archiveSha256: expected, url };
}

const ffmpeg = await fetchTool('ffmpeg');
const ffprobe = await fetchTool('ffprobe');
const ver = await run(ffmpeg.binary, ['-version']);
if (!ver.stdout.startsWith(`ffmpeg version ${pin.version}`)) throw new Error(`Unexpected FFmpeg version: ${ver.stdout.split('\n')[0]}`);
const filters = await run(ffmpeg.binary, ['-hide_banner', '-filters']);
for (const filter of REQUIRED_FILTERS) {
  if (!(filters.stdout + filters.stderr).includes(filter)) throw new Error(`Missing required filter: ${filter}`);
}
const report = {
  ok: true, platform: 'macos-arm64', version: pin.version, build: pin.build, verification: 'publisher-sha256',
  url: ffmpeg.url, archiveSha256: ffmpeg.archiveSha256, ffprobeUrl: ffprobe.url, ffprobeArchiveSha256: ffprobe.archiveSha256,
  ffmpeg: ffmpeg.binary, ffprobe: ffprobe.binary, binarySha256: { ffmpeg: await digest(ffmpeg.binary), ffprobe: await digest(ffprobe.binary) },
  filters: REQUIRED_FILTERS,
};
await writeJson(path.join(dir, 'ffmpeg-install.json'), report);
console.log(JSON.stringify(report, null, 2));
