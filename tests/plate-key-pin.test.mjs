import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

// 4.1 (macOS edition) names the platform's ffmpeg binary in the plate key, so plates re-encode once on update.
// V4 changes plate-key inputs, including style alias normalization and the scene schema/timeline.
// Like 2.6, V4 re-encodes each existing project plate once. Pin the accepted V4 inputs below
// using SHA-256 of LF-normalized text; ffmpeg stays pinned through versions.lock.json.
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');

const PINNED = {
  'scripts/lib/edit-project.mjs': '6ed43c1c75e46f50a1298d2590384cf7c402d927c57a61bc26192173eac8717a',
  'scripts/lib/prepared-media.mjs': 'd098a94324822741a7dfaf082d39eea7faffc019518a1cdf0dfbdc9e3b0df02c',
  'engine/src/prepared-edit/timeline.ts': '633823190ef363bbfbf3aedf504b2817f1997c834cfc32f5ab157afe80e5f071',
};

test('the accepted V4 plate-key files and ffmpeg stay pinned', () => {
  for (const [file, hash] of Object.entries(PINNED)) assert.equal(sha(read(file)), hash, `${file} is a plate-key input: update the V4 plate contract deliberately`);
  const lock = JSON.parse(read('versions.lock.json'));
  assert.equal(lock.ffmpeg.sha256, '0fff188997a499b5382e0f66e845d4556c48c54f0113ebed4853d556dbdd7059');
});

test('the plate key still reads exactly these five files', () => {
  assert.ok(read('scripts/lib/edit-project.mjs').includes(
    "['scripts/lib/edit-project.mjs','scripts/lib/prepared-media.mjs','engine/src/prepared-edit/schema.ts','engine/src/prepared-edit/timeline.ts',`Tools/bin/${exe('ffmpeg')}`]"));
});
