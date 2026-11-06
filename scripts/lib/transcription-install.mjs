import './project-tmp.mjs';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT } from './media.mjs';
import { sha256File, transcriptionCacheKey, assertTranscriptionOutputPath, writeTranscriptionJson } from './transcription.mjs';
import { downloadVerified, renameWithRetry } from './studio-download.mjs';
import { IS_MAC } from './platform.mjs';

export const DEFAULT_WHISPER_RELEASE = 'b4938';
export const WHISPER_RUNTIME_FILE = path.join(ROOT, 'Tools', 'whisper-runtime.json');
export const VAD_NAME = 'silero-v6.2.0';
const PINNED_SHA256 = 'c2a4b60edb11f7e11a9191ffb50929535527d4d91c9903dbe3e554583bbbc63d';
const MULTILINGUAL_MODELS = new Set(['tiny', 'base', 'small', 'medium', 'large-v1', 'large-v2', 'large-v3', 'large-v3-turbo']);

export function selectWindowsCpuAsset(release) {
  const asset = release.assets?.find(a => a.name === 'whisper-bin-x64.zip' && a.state === 'uploaded');
  if (!asset) throw new Error(`Release ${release.tag_name} has no uploaded Windows x64 CPU archive.`);
  if (!/^sha256:[a-f0-9]{64}$/i.test(asset.digest ?? '')) throw new Error('Official release has no SHA256 digest; refusing an unverified executable.');
  const expected = `https://github.com/ggml-org/whisper.cpp/releases/download/${release.tag_name}/whisper-bin-x64.zip`;
  if (asset.browser_download_url !== expected) throw new Error('Binary URL is not the official whisper.cpp release asset.');
  return asset;
}

export async function downloadVerifiedFile(url, file, expectedSha256) {
  assertTranscriptionOutputPath(file);
  if (!/^[a-f0-9]{64}$/i.test(expectedSha256 ?? '')) throw new Error('Download requires SHA256.');
  if (fs.existsSync(file) && await sha256File(file) === expectedSha256.toLowerCase()) return { cached: true, sha256: expectedSha256.toLowerCase() };
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status} from ${new URL(url).host}.`);
  const partial = assertTranscriptionOutputPath(`${file}.partial`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial));
  const actual = await sha256File(partial);
  if (actual !== expectedSha256.toLowerCase()) throw new Error(`SHA256 mismatch for ${path.basename(file)}: expected ${expectedSha256}, received ${actual}. Partial file retained for diagnosis.`);
  await fsp.rename(partial, file);
  return { cached: false, sha256: actual };
}

async function hfModel(repo, name, file) {

  const url = `https://huggingface.co/${repo}/resolve/main/${name}`;
  const metadata = await fetch(url, { method: 'HEAD', redirect: 'manual' });
  const digest = metadata.headers.get('x-linked-etag')?.replaceAll('"', '');
  if (!digest || !/^[a-f0-9]{64}$/i.test(digest)) throw new Error(`No LFS SHA256 for ${name} (HTTP ${metadata.status}).`);
  const result = await downloadVerifiedFile(url, file, digest);
  return { path: file, source: url, ...result };
}

export async function resolveWhisperModel(model, { download = false } = {}) {
  if (!MULTILINGUAL_MODELS.has(model)) throw new Error(`Unsupported multilingual model: ${model}. English-only models cannot preserve Arabic.`);
  const legacy = path.join(ROOT, 'Tools', 'whisper', `ggml-${model}.bin`);
  const modern = path.join(ROOT, 'Tools', 'whisper-models', `ggml-${model}.bin`);
  for (const file of [legacy, modern]) if (fs.existsSync(file)) return { path: file, sha256: await sha256File(file), reused: true };
  if (!download) throw new Error(`Model ${model} is not installed. Run node scripts/studio.mjs setup for the default medium model, or node engine/tools/install-whisper.mjs --model ${model}.`);
  return hfModel('ggerganov/whisper.cpp', `ggml-${model}.bin`, modern);
}

const allFiles = async dir => (await Promise.all((await fsp.readdir(dir, { withFileTypes: true })).map(async entry => entry.isDirectory() ? allFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))).flat();

async function hashWhisperRuntime(directory) {
  assertTranscriptionOutputPath(directory);
  const files = await allFiles(directory);
  // A macOS runtime is the CLI built on the Mac; anywhere else the runtime is the official Windows release layout.
  const cli = IS_MAC ? 'whisper-cli' : 'whisper-cli.exe';
  const executable = files.find(file => path.basename(file).toLowerCase() === cli);
  if (!executable) throw new Error(`No ${cli} found in the installed runtime.`);
  assertTranscriptionOutputPath(executable);
  const binaryFiles = {};
  const isBinary = !IS_MAC ? file => /\.(dll|exe)$/i.test(file) : file => file === executable || /\.(dylib|so|metallib)$/i.test(file);
  for (const file of files.filter(isBinary).sort()) {
    assertTranscriptionOutputPath(file);
    binaryFiles[path.relative(directory, file)] = await sha256File(file);
  }
  return { executable, binaryFiles };
}

// STATUS_DLL_NOT_FOUND (0xC0000135) as Windows reports it unsigned and as a signed 32-bit exit code: the loader found no Visual C++ runtime DLL.
const DLL_NOT_FOUND = [3221225781, -1073741515];
export const isMissingRuntimeDll = failure => DLL_NOT_FOUND.includes(failure?.status) || DLL_NOT_FOUND.includes(failure?.code);
const MISSING_VC_RUNTIME = 'whisper-cli.exe could not start because a required DLL is missing, most likely the Microsoft Visual C++ Redistributable (x64). Install it from https://aka.ms/vs/17/release/vc_redist.x64.exe, then run node scripts/studio.mjs setup again.';

export function probeWhisperRuntime({ executable, binaryFiles }, run = { execFileSync, spawnSync }) {
  const opts = { encoding: 'utf8', windowsHide: true, cwd: path.dirname(executable), stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 };
  let binaryVersion;
  try { binaryVersion = run.execFileSync(executable, ['--version'], opts).trim(); }
  catch (error) { throw isMissingRuntimeDll(error) ? new Error(MISSING_VC_RUNTIME) : error; }
  const helpResult = run.spawnSync(executable, ['--help'], opts);
  if (isMissingRuntimeDll(helpResult)) throw new Error(MISSING_VC_RUNTIME);
  if (helpResult.status !== 0) throw new Error(`whisper --help failed: ${helpResult.stderr}`);
  const help = helpResult.stdout + helpResult.stderr;
  if (!help.includes('--output-json-full') || !help.includes('--dtw')) throw new Error('Installed CLI lacks full JSON or DTW timing support.');
  return {
    executable, binaryVersion, binaryFiles,
    capabilities: { cpu: true, dtwFlag: true, vadFlag: help.includes('--vad-model'), openvinoStatus: 'not_verified', note: 'A CLI flag does not prove a compiled backend. CPU is selected explicitly; only runtime transcription is proof.' },
  };
}

function assertRuntimeHashes(actual, expected) {
  if (!expected || typeof expected !== 'object' || Array.isArray(expected) || transcriptionCacheKey(actual) !== transcriptionCacheKey(expected)) {
    throw new Error('Whisper binary/DLL hashes differ from the installation manifest or saved runtime. Reinstall or inspect before execution.');
  }
}

function unzipArchive(archive, destination) {
  const extraction = `$ErrorActionPreference = 'Stop'\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\n$transcriptZip = [System.IO.Compression.ZipFile]::OpenRead($env:WHISPER_ARCHIVE)\ntry { foreach ($entry in $transcriptZip.Entries) { if ([System.IO.Path]::IsPathRooted($entry.FullName) -or $entry.FullName -match '(^|[\\\\/])\\.\\.([\\\\/]|$)') { throw 'Unsafe archive entry' } } } finally { $transcriptZip.Dispose() }\n[System.IO.Compression.ZipFile]::ExtractToDirectory($env:WHISPER_ARCHIVE, $env:WHISPER_DESTINATION)`;
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', extraction], { windowsHide: true, stdio: 'pipe', env: { ...process.env, WHISPER_ARCHIVE: archive, WHISPER_DESTINATION: destination }, timeout: 120000 });
}

// Extract an official archive into a staging folder, probe it and write install.json there, then rename it to its Tools/whisper-<tag> folder:
// the final folder never exists without install.json, and a failed attempt removes its staging folder. A folder that already has one is kept.
export async function extractRuntime({ archive, directory, record }, { unzip = unzipArchive, probe = probeWhisperRuntime } = {}) {
  if (fs.existsSync(path.join(directory, 'install.json'))) return;
  await fsp.mkdir(path.dirname(directory), { recursive: true });
  const staging = await fsp.mkdtemp(`${directory}.install-`);
  try {
    await unzip(archive, staging);
    const inspected = probe(await hashWhisperRuntime(staging));
    if (fs.existsSync(directory)) throw new Error(`Incomplete install already exists at ${directory}; preserve it for inspection before retrying.`);
    await writeTranscriptionJson(path.join(staging, 'install.json'), { schema: 1, ...record, installedAt: new Date().toISOString(), ...inspected, executable: path.join(directory, path.relative(staging, inspected.executable)) });
    await renameWithRetry(staging, directory);
  } catch (error) {
    await fsp.rm(staging, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    throw error;
  }
}

export async function inspectWhisperRuntime(directory, options = {}) {
  assertTranscriptionOutputPath(directory);
  let saved;
  try { saved = JSON.parse(await fsp.readFile(path.join(directory, 'install.json'), 'utf8')); }
  catch { throw new Error('Whisper installation manifest is missing or invalid; refusing to execute an unverified installed runtime.'); }
  const actual = await hashWhisperRuntime(directory);
  assertRuntimeHashes(actual.binaryFiles, saved.binaryFiles);
  if (Object.hasOwn(options, 'expectedBinaryFiles')) assertRuntimeHashes(actual.binaryFiles, options.expectedBinaryFiles);
  return probeWhisperRuntime(actual);
}

export async function installWhisper({ releaseTag = DEFAULT_WHISPER_RELEASE, model = 'medium', withVad = false } = {}) {
  if (IS_MAC) throw new Error('On macOS the transcription runtime is built by node scripts/studio.mjs setup from the pinned whisper.cpp commit.');
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('This installer is scoped to the project Windows x64 host.');
  if (!/^(?:b\d+|v\d+\.\d+\.\d+)$/.test(releaseTag)) throw new Error('Use an explicit official release tag, for example b4938.');
  const response = await fetch(`https://api.github.com/repos/ggml-org/whisper.cpp/releases/tags/${releaseTag}`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`Release lookup failed: HTTP ${response.status}. No silent version fallback.`);
  const release = await response.json();
  const asset = selectWindowsCpuAsset(release);
  const digest = asset.digest.slice(7);
  if (releaseTag === DEFAULT_WHISPER_RELEASE && digest !== PINNED_SHA256) throw new Error('Pinned b4938 archive digest changed; inspect the official release before updating.');
  const archive = path.join(ROOT, 'state', 'cache', 'downloads', `whisper-${releaseTag}-x64.zip`);
  await downloadVerifiedFile(asset.browser_download_url, archive, digest);
  const directory = assertTranscriptionOutputPath(path.join(ROOT, 'Tools', `whisper-${releaseTag}`));
  await extractRuntime({ archive, directory, record: { releaseTag, releaseUrl: release.html_url, releaseCommit: release.target_commitish, archiveSha256: digest, archiveUrl: asset.browser_download_url } });
  const installed = await inspectWhisperRuntime(directory);
  const saved = JSON.parse(await fsp.readFile(path.join(directory, 'install.json'), 'utf8'));
  const modelInfo = await resolveWhisperModel(model, { download: true });
  let previousRuntime = null;
  try { previousRuntime = JSON.parse(await fsp.readFile(WHISPER_RUNTIME_FILE, 'utf8')); } catch {                     }
  let vad = previousRuntime?.vad ?? null;
  if (vad && (!fs.existsSync(vad.path) || await sha256File(vad.path) !== vad.sha256)) vad = null;
  if (withVad) {
    if (!installed.capabilities.vadFlag) throw new Error('Installed binary has no VAD flag.');
    vad = await hfModel('ggml-org/whisper-vad', `ggml-${VAD_NAME}.bin`, path.join(ROOT, 'Tools', 'whisper-models', `ggml-${VAD_NAME}.bin`));
  }
  const previousEvidence = previousRuntime && JSON.stringify(previousRuntime.binaryFiles) === JSON.stringify(installed.binaryFiles) ? previousRuntime.capabilities : {};
  const runtime = { ...saved, ...installed, capabilities: { ...installed.capabilities, ...previousEvidence }, directory, model: { name: model, ...modelInfo }, vad, legacyDirectory: path.join(ROOT, 'Tools', 'whisper') };
  await writeTranscriptionJson(WHISPER_RUNTIME_FILE, runtime);
  return runtime;
}

export function pinnedWhisperPaths({ runtime, model, vad }, root = ROOT) {
  const at = relative => path.join(root, ...relative.split('/'));
  return {
    archive: at(`state/cache/downloads/whisper-${runtime.release}-x64.zip`),
    directory: at(`Tools/whisper-${runtime.release}`),
    model: at(model.path),
    vad: at(vad.path),
    runtimeFile: at('Tools/whisper-runtime.json'),
  };
}

// Setup's transcription step: the runtime, model and VAD pinned in versions.lock.json, verified files reused.
export async function installPinnedWhisper(pins, { root = ROOT, download = downloadVerified, extract = extractRuntime, inspect = inspectWhisperRuntime, log = () => {}, mac = null } = {}) {
  const macPin = mac ?? (IS_MAC ? pins.macos ?? null : null);
  if (!macPin && (process.platform !== 'win32' || process.arch !== 'x64')) throw new Error('This installer supports macOS (Apple Silicon) and Windows x64.');
  const { runtime, model, vad } = pins;
  const paths = pinnedWhisperPaths(pins, root);
  if (macPin && !fs.existsSync(path.join(paths.directory, 'install.json'))) {
    const built = await buildWhisperForMac(macPin, { root, log });
    await extract({ archive: built.binDir, directory: paths.directory, record: { releaseTag: macPin.release, releaseUrl: `https://github.com/ggml-org/whisper.cpp/releases/tag/${macPin.release}`, releaseCommit: macPin.commit, archiveSha256: null, archiveUrl: macPin.repo, builtFromSource: true, backend: built.backend } }, { unzip: copyBuiltRuntime });
  } else if (!fs.existsSync(path.join(paths.directory, 'install.json'))) {
    log(`transcription: whisper.cpp ${runtime.release}`);
    await download({ url: runtime.url, sha256: runtime.sha256, bytes: runtime.bytes, target: paths.archive });
    await extract({ archive: paths.archive, directory: paths.directory, record: { releaseTag: runtime.release, releaseUrl: `https://github.com/ggml-org/whisper.cpp/releases/tag/${runtime.release}`, releaseCommit: null, archiveSha256: runtime.sha256, archiveUrl: runtime.url } });
  }
  const installed = await inspect(paths.directory);
  const saved = JSON.parse(await fsp.readFile(path.join(paths.directory, 'install.json'), 'utf8'));
  log(`transcription: ${model.name} model (${Math.round(model.bytes / 1e6)} MB) and VAD`);
  const modelResult = await download({ url: model.url, sha256: model.sha256, bytes: model.bytes, target: paths.model });
  const vadResult = await download({ url: vad.url, sha256: vad.sha256, bytes: vad.bytes, target: paths.vad });
  const previous = await fsp.readFile(paths.runtimeFile, 'utf8').then(JSON.parse).catch(() => null);
  const evidence = previous && JSON.stringify(previous.binaryFiles) === JSON.stringify(installed.binaryFiles) ? previous.capabilities : {};
  const record = {
    ...saved, ...installed, capabilities: { ...installed.capabilities, ...evidence }, directory: paths.directory,
    model: { name: model.name, path: paths.model, source: model.url, cached: modelResult.cached, sha256: model.sha256 },
    vad: { path: paths.vad, source: vad.url, cached: vadResult.cached, sha256: vad.sha256 },
    legacyDirectory: path.join(root, 'Tools', 'whisper'),
  };
  await writeTranscriptionJson(paths.runtimeFile, record);
  return record;
}

export async function verifyPinnedWhisper(pins, { root = ROOT, inspect = inspectWhisperRuntime } = {}) {
  const paths = pinnedWhisperPaths(pins, root);
  try {
    const runtime = JSON.parse(await fsp.readFile(paths.runtimeFile, 'utf8'));
    if (path.resolve(runtime.directory ?? '') !== paths.directory || path.resolve(runtime.model?.path ?? '') !== paths.model || path.resolve(runtime.vad?.path ?? '') !== paths.vad) return false;
    if (await sha256File(paths.model) !== pins.model.sha256 || await sha256File(paths.vad) !== pins.vad.sha256) return false;
    await inspect(paths.directory);
    return true;
  } catch { return false; }
}

// macOS: whisper.cpp publishes no Apple Silicon CLI, so the pinned commit is built here with Apple's own compiler
// (Command Line Tools) and Metal, the GPU path that makes transcription fast on a Mac. The git commit hash is the pin.
const BUILD_TIMEOUT_MS = 40 * 60 * 1000;
function runChecked(command, args, { cwd, log, label }) {
  log?.(`transcription: ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: BUILD_TIMEOUT_MS, env: process.env });
  if (result.error) throw result.error.code === 'ENOENT' ? new Error(`${command} is not installed. ${TOOLS_HINT}`) : result.error;
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status}): ${(result.stderr || result.stdout || '').trim().split('\n').slice(-6).join(' | ')}`);
  return result.stdout.trim();
}
const TOOLS_HINT = 'Install Apple Command Line Tools with: xcode-select --install (a macOS window asks you to confirm), then run node scripts/studio.mjs setup again.';

export function assertAppleBuildTools(run = spawnSync) {
  const selected = run('xcode-select', ['-p'], { encoding: 'utf8' });
  const clang = run('clang', ['--version'], { encoding: 'utf8' });
  if (selected.status !== 0 || clang.status !== 0) throw new Error(`Apple Command Line Tools are missing. ${TOOLS_HINT}`);
}

async function ensureCmake(pin, { root, log }) {
  const env = path.join(root, 'Tools', 'buildenv');
  const cmake = path.join(env, 'bin', 'cmake');
  const installed = fs.existsSync(cmake) ? spawnSync(cmake, ['--version'], { encoding: 'utf8' }).stdout ?? '' : '';
  if (installed.includes(`cmake version ${pin.cmake}`)) return cmake;
  runChecked('python3', ['-m', 'venv', env], { log, label: 'creating the local build environment' });
  runChecked(path.join(env, 'bin', 'pip'), ['install', '--disable-pip-version-check', '--no-input', `cmake==${pin.cmake}`], { log, label: `installing CMake ${pin.cmake} into Tools/buildenv` });
  return cmake;
}

export async function buildWhisperForMac(pin, { root = ROOT, log = () => {} } = {}) {
  assertAppleBuildTools();
  const cmake = await ensureCmake(pin, { root, log });
  const src = assertTranscriptionOutputPath(path.join(root, 'state', 'cache', `whisper-src-${pin.release}`));
  if (!fs.existsSync(path.join(src, '.git'))) {
    await fsp.rm(src, { recursive: true, force: true });
    runChecked('git', ['clone', '--depth', '1', '--branch', pin.release, pin.repo, src], { log, label: `downloading whisper.cpp ${pin.release}` });
  }
  const head = runChecked('git', ['rev-parse', 'HEAD'], { cwd: src, label: 'reading the whisper.cpp commit' });
  if (head !== pin.commit) throw new Error(`whisper.cpp ${pin.release} is at ${head}, expected the pinned commit ${pin.commit}. Delete ${path.relative(root, src)} and run setup again.`);
  const build = path.join(src, 'build');
  const common = ['-S', src, '-B', build, '-DCMAKE_BUILD_TYPE=Release', '-DBUILD_SHARED_LIBS=OFF', '-DWHISPER_BUILD_TESTS=OFF', '-DWHISPER_BUILD_EXAMPLES=ON', '-DWHISPER_SDL2=OFF'];
  const compile = (backend, flags) => {
    runChecked(cmake, [...common, ...flags], { log, label: `configuring the whisper.cpp build (${backend})` });
    runChecked(cmake, ['--build', build, '--config', 'Release', '--target', 'whisper-cli', '-j'], { log, label: 'compiling whisper.cpp (a few minutes)' });
  };
  // Metal (the Mac's GPU) first; the shader source is embedded, so Command Line Tools are enough. If this Mac's SDK
  // cannot build it, fall back to the CPU build, which still uses Apple's Accelerate framework.
  let backend = 'metal';
  try { compile('Metal', ['-DGGML_METAL=ON', '-DGGML_METAL_EMBED_LIBRARY=ON']); }
  catch (error) {
    log(`transcription: Metal build failed (${error.message.slice(0, 160)}); building for the CPU instead`);
    await fsp.rm(build, { recursive: true, force: true });
    backend = 'cpu';
    compile('CPU', ['-DGGML_METAL=OFF']);
  }
  const binDir = path.join(build, 'bin');
  if (!fs.existsSync(path.join(binDir, 'whisper-cli'))) throw new Error('The whisper.cpp build finished without build/bin/whisper-cli.');
  return { binDir, commit: head, backend };
}

// Plays the role of unzip for a source build: copy the compiled CLI into the staging folder.
export async function copyBuiltRuntime(binDir, staging) {
  const target = path.join(staging, 'whisper-cli');
  await fsp.copyFile(path.join(binDir, 'whisper-cli'), target);
  await fsp.chmod(target, 0o755);
}
