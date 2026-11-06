// Yasar's Reel Studio 4.1: macOS paths, the macOS pins and the creator's language.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exe, hostLabel, remotionBrowserPlatform, browserExecutableRelative, engineBrowserSegments} from '../scripts/lib/platform.mjs';
import {validateLock} from '../scripts/lib/studio-lock.mjs';
import {normalizeProfile} from '../scripts/lib/branding.mjs';
import {LANGUAGES, LANGUAGE_CODES, DEFAULT_LANGUAGE, languageInfo} from '../engine/src/core/languages.ts';
import {profileTranscriptionLanguage, normalizeTranscriptionOptions, whisperArguments} from '../scripts/lib/transcription-run.mjs';
import {createSettingsServer} from '../scripts/lib/settings-server.mjs';
import {dialectIn} from './helpers/dialect.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(path.join(ROOT, file), 'utf8');
const example = JSON.parse(await read('PROFILE.example.json'));

test('executables and the render browser are named per platform', () => {
  assert.equal(exe('ffmpeg', 'win32'), 'ffmpeg.exe');
  assert.equal(exe('ffmpeg', 'darwin'), 'ffmpeg');
  assert.equal(hostLabel('darwin', 'arm64'), 'macOS (Apple Silicon)');
  assert.equal(remotionBrowserPlatform('darwin', 'arm64'), 'mac-arm64');
  assert.equal(browserExecutableRelative('darwin', 'arm64'), 'chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  assert.equal(browserExecutableRelative('win32', 'x64'), 'chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
  assert.deepEqual(engineBrowserSegments('win32', 'x64').slice(0, 3), ['engine', 'node_modules', '.remotion']);
});

test('the Windows browser pin and the platform helper agree', async () => {
  const lock = JSON.parse(await read('versions.lock.json'));
  assert.equal(browserExecutableRelative('win32', 'x64'), lock.browser.exe);
});

test('the lock carries valid macOS pins and rejects a broken one', async () => {
  const lock = JSON.parse(await read('versions.lock.json'));
  assert.equal(validateLock(lock).macos.arch, 'arm64');
  assert.match(lock.macos.whisper.commit, /^[a-f0-9]{40}$/);
  assert.equal(lock.macos.whisper.release, lock.transcription.runtime.release, 'both hosts transcribe with the same whisper.cpp build');
  assert.match(lock.macos.node.url, /darwin-arm64\.tar\.gz$/);
  assert.equal(lock.macos.node.version, lock.node.version, 'both hosts pin the same Node release');
  const broken = structuredClone(lock); broken.macos.whisper.commit = 'main';
  assert.throws(() => validateLock(broken), /macos\.whisper/);
});

test('every language is offered once, Jordanian and Palestinian stand on their own, and the default is Jordanian', () => {
  assert.deepEqual(LANGUAGE_CODES, ['ar-JO', 'ar-PS', 'ar-LB', 'ar-EG', 'ar-SA', 'ar-MA', 'ar', 'en']);
  assert.equal(DEFAULT_LANGUAGE, 'ar-JO');
  for (const item of LANGUAGES) {
    assert.ok(item.sample && item.label && item.labelEn && item.voice, item.code);
    assert.equal(item.whisper, item.code === 'en' ? 'en' : 'ar');
    assert.equal(item.dir, item.code === 'en' ? 'ltr' : 'rtl');
  }
  assert.equal(languageInfo('xx').code, 'ar-EG', 'an unknown code reads as the legacy Egyptian profile');
});

test('profiles keep their language; an unknown one is refused', () => {
  for (const code of LANGUAGE_CODES) assert.equal(normalizeProfile({...example, language: code}).language, code);
  assert.equal(normalizeProfile({...example, language: 'ar-EG'}).language, 'ar-EG', 'older profiles stay Egyptian');
  assert.throws(() => normalizeProfile({...example, language: 'fr'}), /language must be one of/);
});

test('transcription listens for the profile language unless --lang says otherwise', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reel-lang-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  assert.equal(profileTranscriptionLanguage(root), 'ar', 'no profile: Arabic');
  await writeFile(path.join(root, 'PROFILE.json'), JSON.stringify({...example, language: 'en'}));
  assert.equal(profileTranscriptionLanguage(root), 'en');
  await writeFile(path.join(root, 'PROFILE.json'), JSON.stringify({...example, language: 'ar-MA'}));
  assert.equal(profileTranscriptionLanguage(root), 'ar');
  assert.equal(normalizeTranscriptionOptions({media: 'x.mp4', lang: 'en'}).language, 'en');
});

test('the CPU backend keeps --no-gpu; Metal leaves it out', () => {
  const base = {runtime: {vad: {path: 'v'}}, model: {path: 'm'}, wav: 'a.wav', outputPrefix: 'o'};
  const cpu = whisperArguments({...base, options: {language: 'ar', threads: 4, timing: 'token', vad: false, backend: 'cpu', model: 'medium'}});
  const metal = whisperArguments({...base, options: {language: 'ar', threads: 4, timing: 'token', vad: false, backend: 'metal', model: 'medium'}});
  assert.ok(cpu.includes('--no-gpu'));
  assert.equal(metal.includes('--no-gpu'), false);
  if (process.platform !== 'darwin') assert.throws(() => normalizeTranscriptionOptions({media: 'x.mp4', backend: 'metal'}), /metal on macOS/);
});

test('the settings catalog lists the languages and English style names, and new profiles start in Levantine', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reel-settings-lang-'));
  const server = await createSettingsServer({root});
  t.after(async () => { await server.close(); await rm(root, {recursive: true, force: true}); });
  const catalog = await (await fetch(`${server.origin}/api/catalog`, {headers: {'x-reel-studio-token': server.token}})).json();
  assert.deepEqual(catalog.languages.map(item => item.code), LANGUAGE_CODES);
  assert.equal(catalog.defaults.language, 'ar-JO');
  for (const id of Object.keys(catalog.styles)) assert.ok(catalog.stylesEn[id]?.label, `${id} has an English label`);
  const saved = await fetch(`${server.origin}/api/profile`, {method: 'PUT', headers: {'x-reel-studio-token': server.token, 'content-type': 'application/json'},
    body: JSON.stringify({profile: {...example, name: 'Yasar', language: 'en'}, etag: null})});
  assert.equal(saved.status, 200);
  assert.equal(JSON.parse(await readFile(path.join(root, 'PROFILE.json'), 'utf8')).language, 'en');
});

test('the settings screen offers both interface languages and its Arabic text is White Arabic', async () => {
  const app = await read('scripts/settings-ui/app.js');
  const block = app.slice(app.indexOf('  ar: {'), app.indexOf('  en: {'));
  const strings = [...block.matchAll(/'([^'\n]*\p{Script=Arabic}[^'\n]*)'/gu)].map(match => match[1]);
  assert.ok(strings.length > 80, `${strings.length} Arabic interface strings`);
  for (const text of strings) assert.deepEqual(dialectIn(text), [], text);
  assert.ok(app.includes("function languagePage()"), 'the first step is the language');
  assert.ok(app.includes("document.documentElement.dir = info.ui === 'en' ? 'ltr' : 'rtl'"), 'the page turns left to right for English');
});

test('the assistant guide names every language and the macOS install path', async () => {
  const agents = await read('AGENTS.md'), setup = await read('instructions/SETUP.md');
  for (const code of LANGUAGE_CODES) assert.ok(agents.includes(`\`${code}\``), code);
  assert.ok(setup.includes('bash scripts/install-node.sh'));
  assert.ok(setup.includes('xcode-select --install'));
  assert.ok(setup.includes('https://github.com/Yasarshalabi/yasars-reel-studio.git'));
});

test('usage statistics are off unless the owner names an endpoint', async () => {
  const stats = await read('scripts/lib/studio-stats.mjs');
  assert.equal(/https:\/\/store\./.test(stats), false);
  assert.ok(stats.includes('REEL_STUDIO_STATS_ENDPOINT'));
});

test('the dialect guide covers every language, and Jordanian and Palestinian keep their own words', async () => {
  const guide = await read('instructions/DIALECTS.md');
  for (const code of LANGUAGE_CODES) assert.ok(guide.includes(`\`${code}\``), code);
  const section = code => guide.slice(guide.indexOf(`\`${code}\``), guide.indexOf('\n## ', guide.indexOf(`\`${code}\``)));
  assert.ok(section('ar-JO').includes('هسّا') && section('ar-PS').includes('هلأ'));
  assert.notEqual(languageInfo('ar-JO').sample, languageInfo('ar-PS').sample);
});

test('the editor speaks English through its dictionary, keeping the values inside templates', async () => {
  const {buildTranslator} = await import('../engine/src/review-editor/i18n/translate.ts');
  const entries = JSON.parse(await read('engine/src/review-editor/i18n/en.json'));
  const {translate, size} = buildTranslator(entries);
  assert.ok(size > 1200, `${size} interface strings`);
  assert.equal(translate('تراجع'), 'Undo');
  assert.equal(translate('  حفظ (Ctrl+S) '), '  Save (Ctrl+S) ');
  assert.equal(translate('تعذّر تحميل المشروع: timeout'), 'Could not load the project: timeout');
  assert.equal(translate('كلمة «يسار»'), 'Word «يسار»', 'a creator word inside a template stays as said');
  assert.equal(translate('بكرا منحكي'), null, 'creator speech that is not an interface string is left alone');
  for (const [arabic, english] of Object.entries(entries)) {
    assert.deepEqual([...english.matchAll(/\{\d+\}/g)].map(m => m[0]).sort(), [...arabic.matchAll(/\{\d+\}/g)].map(m => m[0]).sort(), arabic);
  }
});

test('the editor page carries the interface language and keeps the preview untranslated', async () => {
  const {indexHtml} = await import('../scripts/lib/review-editor-build.mjs');
  assert.match(indexHtml({ui: 'en'}), /<html lang="en" dir="ltr" data-ui="en">/);
  assert.match(indexHtml(), /<html lang="ar" dir="rtl" data-ui="ar">/);
  assert.ok((await read('engine/src/review-editor/PreviewPlayer.tsx')).includes('data-no-translate'));
  assert.ok((await read('engine/src/review-editor/Timeline.tsx')).includes('data-no-translate={lane.id === "captions"'));
});

test('sweeping transitions follow the reading direction of the reviewed words', async () => {
  const {readingDirection, DIRECTIONAL} = await import('../engine/src/prepared-edit/reading-direction.ts');
  assert.equal(readingDirection([{text: 'Your'}, {text: 'idea'}, {text: 'deserves'}]), 'ltr');
  assert.equal(readingDirection([{text: 'فكرتك'}, {text: 'بتستاهل'}, {text: 'AI'}]), 'rtl');
  assert.equal(readingDirection([]), 'rtl', 'a silent graphics video keeps the Arabic default');
  assert.deepEqual([...DIRECTIONAL].sort(), ['clip-wipe', 'light-scan', 'whip-pan']);
});
