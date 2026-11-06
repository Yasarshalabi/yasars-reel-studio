import {styleAliasNotice, getStyleMeta} from '../../engine/src/styles/registry.ts';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promises as fs} from 'node:fs';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {normalizeProfile, ProfileError} from './branding.mjs';
import {defaultPreferences, PREFERENCE_VALUES, STYLE_LABELS, WRITING_GUIDES} from '../../engine/src/core/preference-options.ts';
import {readSetupState, describeSetup, workerAlive, STEP_LABELS} from './studio-state.mjs';
import {browserHomeProblem} from './studio-setup.mjs';
import {acquireProfileSaveLock} from './profile-save-lock.mjs';
import {previewFaces} from './settings-fonts.mjs';
import {DEFAULT_LANGUAGE, LANGUAGES} from '../../engine/src/core/languages.ts';

const UI_ROOT = fileURLToPath(new URL('../settings-ui/', import.meta.url));
const MAX_BODY = 64 * 1024;
const exec = promisify(execFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
class HttpError extends Error {constructor(status, message, en = message) {super(message); this.status = status; this.en = en;}}
const inside = (root, file) => {const rel = path.relative(root, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);};

export const emptyProfile = () => ({schemaVersion: 3, name: '', handle: null, language: DEFAULT_LANGUAGE,
  ending: {followCard: false, ctaDefault: null, signOff: null},
  brand: {primary: '#E2456B', accent: '#C6D16A', background: null, text: null},
  platforms: ['instagram', 'tiktok'], preferences: defaultPreferences()});

async function bodyJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new HttpError(415, 'أرسل الإعدادات بصيغة JSON.', 'Send the settings as JSON.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'حجم الإعدادات أكبر من المسموح.', 'The settings are larger than allowed.');
    chunks.push(chunk);
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {throw new HttpError(400, 'الإعدادات المرسلة غير سليمة.', 'The settings sent are not valid.');}
}

export async function createSettingsServer({root, port = 0} = {}) {
  root = await fs.realpath(root);
  const token = randomBytes(32).toString('hex');
  const profileFile = path.join(root, 'PROFILE.json');
  const lock = await fs.readFile(path.join(root, 'versions.lock.json'), 'utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT') return {edition: null, fonts: []}; throw error;
  });
  let origin;
  let saving = false;
  let starting = false;

  async function writable(file) {

    let cursor = file;
    while (inside(root, cursor) && cursor !== root) {
      const stat = await fs.lstat(cursor).catch(error => {if (error.code === 'ENOENT') return null; throw error;});
      if (stat?.isSymbolicLink() || (stat?.isFile() && stat.nlink > 1)) throw new HttpError(400, 'مكان الإعدادات مربوط بمجلد أو ملف آخر. افتح نسخة الاستوديو الأصلية.', 'The settings file is linked to another folder or file. Open the original studio folder.');
      cursor = path.dirname(cursor);
    }
    if (!inside(root, file)) throw new HttpError(400, 'مكان الإعدادات خارج مجلد الاستوديو.', 'The settings file is outside the studio folder.');
  }
  async function snapshot() {
    await writable(profileFile);
    const bytes = await fs.readFile(profileFile).catch(error => {if (error.code === 'ENOENT') return null; throw error;});
    if (bytes === null) return {ok: true, profile: null, etag: null};
    let value;
    try {value = JSON.parse(bytes.toString('utf8').replace(/^\ufeff/, ''));}
    catch {throw new HttpError(400, 'في ملف PROFILE.json مشكلة. اطلب من المساعد مراجعته؛ إعداداتك ما زالت محفوظة.', 'PROFILE.json has a problem. Ask the assistant to check it; your settings are still saved.');}
    return {ok: true, profile: normalizeProfile(value), notices: [styleAliasNotice(value.preferences?.style?.value, 'ar')].filter(Boolean), etag: hash(bytes), bytes};
  }
  async function save(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(key => !['profile', 'etag'].includes(key)) || !Object.hasOwn(payload, 'etag')) {
      throw new HttpError(400, 'الإعدادات المرسلة ناقصة. افتح الشاشة من جديد.', 'The settings sent are incomplete. Open the screen again.');
    }
    const profile = normalizeProfile(payload.profile);
    if (saving) throw new HttpError(409, 'هناك حفظ جارٍ. حاول بعد لحظة.', 'A save is already running. Try again in a moment.');
    saving = true;
    const temporary = path.join(root, `PROFILE.json.${randomUUID()}.tmp`);
    let release;
    try {
      release = await acquireProfileSaveLock(root);
      const current = await snapshot();
      if (current.etag !== payload.etag) throw new HttpError(409, 'تغيّرت إعداداتك في شاشة أخرى. أعد تحميل الصفحة قبل الحفظ.', 'Your settings changed in another screen. Reload before saving.');
      if (current.bytes) {
        const directory = path.join(root, 'state', 'profile-backups');
        await writable(directory);
        await fs.mkdir(directory, {recursive: true});
        await fs.writeFile(path.join(directory, `${Date.now()}-${randomUUID()}.json`), current.bytes, {flag: 'wx'});
      }
      const bytes = `${JSON.stringify(profile, null, 2)}\n`;
      await fs.writeFile(temporary, bytes, {encoding: 'utf8', flag: 'wx'});
      await writable(profileFile);
      if ((await snapshot()).etag !== current.etag) throw new HttpError(409, 'تغيّرت إعداداتك أثناء الحفظ. أعد تحميل الصفحة قبل الحفظ.', 'Your settings changed while saving. Reload before saving.');
      await fs.rename(temporary, profileFile);
      return {ok: true, profile, etag: hash(bytes)};
    } finally {
      await fs.unlink(temporary).catch(() => {});
      if (release) await release();
      saving = false;
    }
  }
  async function status() {
    const state = await readSetupState(root);
    const setup = describeSetup(state, {alive: workerAlive(state)}).json;
    return {ok: true, setup, labels: STEP_LABELS};
  }
  async function startSetup() {
    if (!(await snapshot()).profile) throw new HttpError(400, 'احفظ إعداداتك أولًا لنبدأ التجهيز.', 'Save your settings first so setup can start.');
    const current = await readSetupState(root);
    if (workerAlive(current) || describeSetup(current, {alive: false}).json.status === 'done') return status();
    const locationProblem = browserHomeProblem(root);
    if (locationProblem) throw new HttpError(400, locationProblem);
    if (starting) throw new HttpError(409, 'التجهيز يبدأ الآن. انتظر لحظة.', 'Setup is starting. Wait a moment.');
    starting = true;
    try {
      await exec(process.execPath, [path.join(root, 'scripts', 'studio.mjs'), 'setup'], {cwd: root, windowsHide: true, timeout: 60_000, maxBuffer: 128 * 1024});
      return status();
    } catch {throw new HttpError(500, 'لم يبدأ التجهيز. اطلب من المساعد «أكمل تجهيز الاستوديو» ليراجع السبب.', 'Setup did not start. Ask the assistant to "continue studio setup" so it can check why.');}
    finally {starting = false;}
  }
  const previews = previewFaces(lock.fonts ?? []);
  const fontSpecs = [...new Map(previews.map(({face}) => [face.file, face])).values()];
  async function fontBytes(face) {
    const file = path.join(root, 'engine', 'public', 'fonts', face.file);
    const real = await fs.realpath(file);
    if (!inside(root, real)) throw new Error('Font path leaves the edition.');
    const bytes = await fs.readFile(real);
    if (hash(bytes) !== face.sha256) throw new Error('Font hash differs from the setup lock.');
    return bytes;
  }
  async function fontCss() {
    const faces = [];
    for (const {alias, face, css} of previews) {
      if (!await fontBytes(face).catch(() => null)) continue;
      faces.push(`@font-face{font-family:"${alias}";src:url("/fonts/${encodeURIComponent(face.file)}?token=${token}") format("woff2");font-weight:${css};font-style:normal;font-display:swap;unicode-range:${face.unicodeRange};}`);
    }
    return faces.join('\n');
  }

  const sendJson = (res, value, code = 200) => {res.writeHead(code, {'content-type': 'application/json; charset=utf-8'}); res.end(JSON.stringify(value));};
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) throw new HttpError(403, 'هذا الرابط مخصص لإعدادات الاستوديو على جهازك.', 'This link is only for the studio settings on your computer.');
      const url = new URL(req.url, origin);
      const supplied = req.headers['x-reel-studio-token'] ?? (req.method === 'GET' ? url.searchParams.get('token') : null);
      if (supplied !== token) throw new HttpError(403, 'افتح رابط الإعدادات الذي فتحه لك المساعد.', 'Open the settings link the assistant opened for you.');
      if (url.pathname === '/api/profile' && req.method === 'GET') {
        const {bytes: _, ...value} = await snapshot(); return sendJson(res, value);
      }
      if (url.pathname === '/api/profile' && req.method === 'PUT') return sendJson(res, await save(await bodyJson(req)));
      if (url.pathname === '/api/catalog' && req.method === 'GET') {
        const ready = new Set((await Promise.all(fontSpecs.map(async face => await fontBytes(face).catch(() => null) ? face.file : null))).filter(Boolean));
        const readyFonts = [...new Set(previews.map(item => item.alias))].filter(alias => previews.filter(item => item.alias === alias).every(item => ready.has(item.face.file)));
        return sendJson(res, {ok: true, edition: lock.edition, defaults: emptyProfile(), choices: PREFERENCE_VALUES, styles: STYLE_LABELS, stylesEn: Object.fromEntries(Object.keys(STYLE_LABELS).map(id => {const meta = getStyleMeta(id); return [id, {label: meta.label.en ?? STYLE_LABELS[id].label, description: meta.description.en ?? STYLE_LABELS[id].description}];})), writingGuides: WRITING_GUIDES, languages: LANGUAGES, readyFonts});
      }
      if (url.pathname === '/api/status' && req.method === 'GET') return sendJson(res, await status());
      if (url.pathname === '/api/setup' && req.method === 'POST') {await bodyJson(req); return sendJson(res, await startSetup());}
      if (req.method !== 'GET') throw new HttpError(405, 'هذا الطلب غير متاح.', 'This request is not available.');
      if (url.pathname === '/fonts.css') {res.writeHead(200, {'content-type': 'text/css; charset=utf-8'}); return res.end(await fontCss());}
      if (url.pathname.startsWith('/fonts/')) {
        const face = fontSpecs.find(item => url.pathname === `/fonts/${item.file}`);
        if (!face) throw new HttpError(404, 'الخط غير موجود.', 'Font not found.');
        const bytes = await fontBytes(face).catch(() => null);
        if (!bytes) throw new HttpError(404, 'لم يُنزَّل الخط بعد.', 'The font is not downloaded yet.');
        res.writeHead(200, {'content-type': 'font/woff2'}); return res.end(bytes);
      }
      const staticFiles = {'/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/app.css': ['app.css', 'text/css']};
      const file = staticFiles[url.pathname];
      if (!file) throw new HttpError(404, 'الصفحة غير موجودة.', 'Page not found.');
      const body = (await fs.readFile(path.join(UI_ROOT, file[0]), 'utf8')).replaceAll('__TOKEN__', token);
      res.writeHead(200, {'content-type': `${file[1]}; charset=utf-8`}); res.end(body);
    } catch (error) {
      const english = req.headers['x-reel-studio-ui'] === 'en';
      sendJson(res, {ok: false, error: error instanceof ProfileError ? (english ? error.en : error.ar) : error.status ? (english ? error.en ?? error.message : error.message) : english ? 'Something went wrong. Ask the assistant to check the settings.' : 'حدثت مشكلة. اطلب من المساعد مراجعة الإعدادات.'}, error.status ?? (error instanceof ProfileError ? 400 : 500));
    }
  });
  server.requestTimeout = 15_000;
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(port, '127.0.0.1', resolve);});
  origin = `http://127.0.0.1:${server.address().port}`;
  return {origin, token, url: `${origin}/?token=${token}`, close: () => new Promise((resolve, reject) => {server.closeIdleConnections(); server.close(error => error ? reject(error) : resolve());})};
}
