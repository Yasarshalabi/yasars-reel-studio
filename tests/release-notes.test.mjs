import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanPublicationFile, readWorkingTreePublicationFiles} from '../scripts/lib/publication-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const lock = () => JSON.parse(read('versions.lock.json'));
const parts = version => version.split('.').map(Number);
const atLeast = (version, floor) => {
  const a = parts(version), b = parts(floor);
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] > b[index];
  return true;
};

// Egyptian-dialect markers that must not appear in White Arabic release text (whole words, diacritics ignored).
const DIALECT = ['ده', 'دي', 'دا', 'دول', 'إزاي', 'ازاي', 'عايز', 'عاوز', 'عشان', 'كده', 'كدا', 'اللي', 'مش', 'قول', 'بتاع', 'بتاعك', 'دلوقتي', 'دلوقت', 'إيه', 'ايه', 'ليه', 'فين', 'أوي', 'خليه', 'خلي', 'هتلاقي'];
const strip = text => text.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
const dialectIn = text => {
  const clean = strip(text);
  return DIALECT.filter(word => new RegExp(`(?<![\\u0621-\\u064A])${word}(?![\\u0621-\\u064A])`).test(clean));
};

const topEntry = () => read('CHANGELOG.md').split(/\n(?=## )/)[1];
const currentSection = () => {
  const text = read('README.md'), start = text.indexOf('<a id="whats-new"></a>');
  assert.ok(start >= 0, 'README has a whats-new anchor');
  return text.slice(start, text.indexOf('<a id="', start + 10));
};
const gridGlideCard = () => {
  const text = read('README.md'), at = text.indexOf('docs/images/style-grid-glide.jpg');
  assert.ok(at >= 0, 'README shows the Grid Glide card');
  return text.slice(text.lastIndexOf('<td', at), text.indexOf('</td>', at));
};

test('the release lock is at least 3.0.0 with engine 1.4.0 and every version file agrees', () => {
  const {edition, engine} = lock();
  assert.ok(atLeast(edition, '3.0.0'), `edition ${edition}`);
  assert.ok(atLeast(engine, '1.4.0'), `engine ${engine}`);
  assert.equal(JSON.parse(read('engine/package.json')).version, engine);
  const packageLock = JSON.parse(read('engine/package-lock.json'));
  assert.equal(packageLock.version, engine);
  assert.equal(packageLock.packages[''].version, engine);
});

test('the top changelog entry is the locked edition and a minor release ends with the update line', () => {
  const entry = topEntry(), first = entry.split('\n')[0];
  const heading = /^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})$/.exec(first);
  assert.ok(heading, `heading "${first}"`);
  assert.equal(heading[1], lock().edition);
  if (heading[1].endsWith('.0')) assert.match(entry, /^- \*\*التحديث:\*\*/m, 'minor releases end with the update line');
});

test('release text is White Arabic: no Egyptian-dialect markers in the new entry, section or card', () => {
  assert.deepEqual(dialectIn(topEntry()), [], 'CHANGELOG entry');
  assert.deepEqual(dialectIn(currentSection()), [], 'README what is new');
  assert.deepEqual(dialectIn(gridGlideCard()), [], 'README style card');
});

test('README header, navigation and new-section heading follow the locked edition', () => {
  const [major, minor] = parts(lock().edition), readme = read('README.md');
  assert.ok(readme.includes(`>Yasar's Reel Studio ${major}.${minor} `), 'header');
  assert.ok(readme.includes(`<a href="#whats-new">الجديد في ${major}.${minor}</a>`), 'navigation');
  assert.ok(readme.includes(`## الجديد في ${major}.${minor}:`), 'section heading');
  assert.equal((readme.match(/<a id="whats-new"><\/a>/g) ?? []).length, 1, 'one current anchor');
});

// Reads the version printed in each place, so a stale header cannot hide behind a correct mention elsewhere.
test('the README header, navigation link and current heading all carry the locked major.minor', () => {
  const [major, minor] = parts(lock().edition), expected = `${major}.${minor}`, readme = read('README.md');
  const header = /<h1 align="center">Yasar's Reel Studio (\d+\.\d+) 🎬<\/h1>/.exec(readme)?.[1];
  const navigation = /<a href="#whats-new">الجديد في (\d+\.\d+)<\/a>/.exec(readme)?.[1];
  const heading = /^## الجديد في (\d+\.\d+)(?::|$)/m.exec(currentSection())?.[1];
  assert.equal(header, expected, `header says ${header}`);
  assert.equal(navigation, expected, `navigation says ${navigation}`);
  assert.equal(heading, expected, `current heading says ${heading}`);
});

test('the public wording rule asks for White Arabic', () => {
  const claude = read('CLAUDE.md');
  assert.ok(claude.includes('simple White Arabic'));
  assert.equal(/simple Egyptian Arabic/.test(claude), false);
});

test('NOTICE lists the Inter font', () => {
  assert.match(read('NOTICE.md'), /\bInter\b/);
});

test('the Sound-Kits README counts and recipe table match the catalog', () => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight'];
  const catalog = JSON.parse(read('Sound-Kits/catalog.json')), text = read('Sound-Kits/README.md');
  assert.match(text, new RegExp(`${words[catalog.sounds.length]} deterministic sounds`));
  // Synthesized recipes are listed here; the recorded cc0-* recipes are listed on Sound-Kits/cc0/README.md, without the prefix.
  const recorded = catalog.recipes.filter((recipe) => recipe.id.startsWith('cc0-')), synthesized = catalog.recipes.filter((recipe) => !recipe.id.startsWith('cc0-'));
  assert.match(text, new RegExp(`${words[synthesized.length]} reusable (?:multi-hit )?recipes`));
  assert.match(text, new RegExp(`${words[recorded.length]} recorded CC0 recipes`));
  for (const recipe of synthesized) assert.ok(text.includes(`\`${recipe.id}\``), `${recipe.id} is listed`);
  const cc0 = read('Sound-Kits/cc0/README.md');
  for (const recipe of recorded) assert.ok(cc0.includes(`\`${recipe.id.slice(4)}\``), `${recipe.id} is listed on the CC0 page`);
});

test('publication working-tree reads skip deleted tracked paths and include new files', () => {
  const folder = mkdtempSync(path.join(root, 'state', 'publication-test-'));
  try {
    writeFileSync(path.join(folder, 'retained.txt'), 'retained');
    writeFileSync(path.join(folder, 'new file.txt'), 'new');
    writeFileSync(path.join(folder, 'removed-parent'), 'no longer a directory');
    const files = readWorkingTreePublicationFiles(folder, ['deleted-style/theme.ts', 'retained.txt', 'new file.txt', 'retained.txt', 'removed-parent/child.ts']);
    assert.deepEqual(files.map(file => [file.path, file.data.toString()]), [['retained.txt','retained'],['new file.txt','new']]);
  } finally {rmSync(folder, {recursive:true, force:true});}
});

test('the release files pass the publication policy', () => {
  for (const file of ['CHANGELOG.md', 'README.md', 'CLAUDE.md', 'NOTICE.md', 'versions.lock.json', 'engine/package.json']) {
    assert.deepEqual(scanPublicationFile(file, Buffer.from(read(file))), [], file);
  }
});

// Yasar's Reel Studio: no maker telemetry, no paid-session links, and the ready line closes first-run setup.
test('first-run setup ends with the ready line and carries no maker telemetry notice', () => {
  const setup = read('instructions/SETUP.md');
  assert.ok(setup.includes('8. End with the ready line'), 'SETUP.md ends first run with the ready line');
  assert.equal(/store\.pyraai\.cloud/.test(setup), false);
});

test('the settings screen and README carry no paid-session or store links', () => {
  for (const file of ['scripts/settings-ui/index.html', 'scripts/settings-ui/app.js', 'README.md']) assert.equal(/store\.pyraai\.cloud/.test(read(file)), false, file);
});

test('README says the studio sends no usage signals, in White Arabic', () => {
  const readme = read('README.md'), at = readme.indexOf('الاستوديو لا يرسل أي إشارة استخدام');
  assert.ok(at > 0, 'README states there is no usage signal');
  const paragraph = readme.slice(readme.lastIndexOf('\n\n', at), readme.indexOf('\n\n', at));
  assert.deepEqual(dialectIn(paragraph), []);
});
