// macOS (Apple Silicon) FFmpeg and FFprobe.
// Primary: the static arm64 builds published with the ffmpeg-static project on GitHub, pinned by SHA-256 in
// versions.lock.json (both the download and the extracted binary). Fallback, only when that download fails: the static
// release from Martin Riedl's FFmpeg build server, checked against the SHA-256 file published beside each zip.
// Either way the tool must carry the audio filters and options the mix and render pipeline uses.
import './lib/project-tmp.mjs';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ROOT, run, writeJson } from './lib/media.mjs';
import { assertProjectOutput } from './lib/project-paths.mjs';
import { downloadVerified } from './lib/studio-download.mjs';

const lock = JSON.parse(await fs.readFile(path.join(ROOT, 'versions.lock.json'), 'utf8'));
const pin = lock.macos?.ffmpeg;
if (process.platform !== 'darwin' || !pin) throw new Error('install-ffmpeg-mac.mjs runs on macOS with a macos.ffmpeg pin in versions.lock.json.');
const REQUIRED_FILTERS = ['ebur128', 'loudnorm', 'sidechaincompress', 'xfade'];
const dir = assertProjectOutput(path.join(ROOT, 'Tools/bin'));
const cache = assertProjectOutput(path.join(ROOT, 'state/cache/downloads'));
await fs.mkdir(dir, { recursive: true });
await fs.mkdir(cache, { recursive: true });

async function digest(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function installPinned(name) {
  const entry = pin[name];
  const archive = path.join(cache, `${name}-${pin.version}-darwin-arm64.gz`);
  await downloadVerified({ url: entry.url, sha256: entry.sha256, bytes: entry.bytes, target: archive });
  const binary = path.join(dir, name), partial = `${binary}.partial`;
  await pipeline(createReadStream(archive), createGunzip(), createWriteStream(partial));
  const actual = await digest(partial);
  if (actual !== entry.binarySha256) { await fs.rm(partial, { force: true }); throw new Error(`${name} binary failed its SHA-256 check (expected ${entry.binarySha256}, got ${actual}).`); }
  await fs.chmod(partial, 0o755);
  await fs.rename(partial, binary);
  await fs.rm(archive, { force: true });
  return { binary, url: entry.url, archiveSha256: entry.sha256, binarySha256: actual };
}

// The .sha256 file holds the hex digest, optionally followed by the file name.
function parseChecksum(text) {
  const match = /\b([a-f0-9]{64})\b/i.exec(String(text));
  if (!match) throw new Error('The published checksum file has no SHA-256 value.');
  return match[1].toLowerCase();
}

async function installFallback(name) {
  const fallback = pin.fallback, url = fallback[name];
  const published = await fetch(`${url}${fallback.checksumSuffix}`);
  if (!published.ok) throw new Error(`Checksum download failed for ${name} (HTTP ${published.status}).`);
  const expected = parseChecksum(await published.text());
  const archive = path.join(cache, `${name}-${fallback.version}-macos-arm64.zip`);
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed for ${name}: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(`${archive}.partial`));
  const actual = await digest(`${archive}.partial`);
  if (actual !== expected) { await fs.rm(`${archive}.partial`, { force: true }); throw new Error(`${name} archive failed its SHA-256 check (expected ${expected}, got ${actual}).`); }
  await fs.rename(`${archive}.partial`, archive);
  // Extract into a scratch folder and take the binary wherever the zip keeps it.
  const unpack = await fs.mkdtemp(path.join(cache, `${name}-unpack-`));
  try {
    await run('/usr/bin/unzip', ['-o', '-q', archive, '-d', unpack]);
    const found = (await fs.readdir(unpack, { recursive: true })).find(file => path.basename(file) === name);
    if (!found) throw new Error(`The ${name} zip has no ${name} binary.`);
    const binary = path.join(dir, name);
    await fs.copyFile(path.join(unpack, found), binary);
    await fs.chmod(binary, 0o755);
    return { binary, url, archiveSha256: expected, binarySha256: await digest(binary) };
  } finally {
    await fs.rm(unpack, { recursive: true, force: true });
    await fs.rm(archive, { force: true });
  }
}

let source = 'pinned', tools;
try {
  tools = { ffmpeg: await installPinned('ffmpeg'), ffprobe: await installPinned('ffprobe') };
} catch (error) {
  console.error(`Pinned FFmpeg download failed (${error.message}); using the fallback build.`);
  source = 'fallback';
  tools = { ffmpeg: await installFallback('ffmpeg'), ffprobe: await installFallback('ffprobe') };
}
const version = source === 'pinned' ? pin.version : pin.fallback.version;
const ver = await run(tools.ffmpeg.binary, ['-version']);
if (!/^ffmpeg version \S+/.test(ver.stdout)) throw new Error(`Unexpected FFmpeg output: ${ver.stdout.split('\n')[0]}`);
const major = Number(/^ffmpeg version n?(\d+)/.exec(ver.stdout)?.[1]);
if (!(major >= 6)) throw new Error(`FFmpeg 6 or newer is required (the pipeline uses -fps_mode and xfade); found: ${ver.stdout.split('\n')[0]}`);
const filters = await run(tools.ffmpeg.binary, ['-hide_banner', '-filters']);
for (const filter of REQUIRED_FILTERS) {
  if (!(filters.stdout + filters.stderr).includes(filter)) throw new Error(`Missing required filter: ${filter}`);
}
const encoders = await run(tools.ffmpeg.binary, ['-hide_banner', '-encoders']);
if (!encoders.stdout.includes('libx264')) throw new Error('This FFmpeg build has no libx264 encoder.');
const report = {
  ok: true, platform: 'macos-arm64', source, version, build: source === 'pinned' ? pin.build : pin.fallback.build,
  verification: source === 'pinned' ? 'pinned-sha256' : 'publisher-sha256', versionLine: ver.stdout.split('\n')[0],
  url: tools.ffmpeg.url, archiveSha256: tools.ffmpeg.archiveSha256, ffprobeUrl: tools.ffprobe.url, ffprobeArchiveSha256: tools.ffprobe.archiveSha256,
  ffmpeg: tools.ffmpeg.binary, ffprobe: tools.ffprobe.binary, binarySha256: { ffmpeg: tools.ffmpeg.binarySha256, ffprobe: tools.ffprobe.binarySha256 },
  filters: REQUIRED_FILTERS,
};
await writeJson(path.join(dir, 'ffmpeg-install.json'), report);
console.log(JSON.stringify(report, null, 2));
