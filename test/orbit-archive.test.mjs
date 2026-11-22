import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ZipFile } from 'yazl';
import { keccak256 } from 'viem';
import { applyRelease } from '../agent/core.mjs';
import { archiveFormat, readOrbitArchive } from '../lib/orbit-archive.mjs';
import { PROJECT, ENVIRONMENT } from '../lib/core.mjs';

const commit = 'ab'.repeat(20);
const build = { version: commit.slice(0, 12), commit, runId: '42' };

async function archive(extra) {
  const zip = new ZipFile();
  zip.addBuffer(Buffer.from('<h1>Night Market</h1>'), 'index.html');
  zip.addBuffer(Buffer.from(JSON.stringify(build)), 'build.json');
  if (extra) zip.addBuffer(Buffer.from('extra'), extra);
  zip.end();
  const chunks = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test('archive install keeps the active build through refusal and RPC failure', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'veylith-orbit-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const bytes = await archive();
  const manifest = { format: archiveFormat, project: PROJECT, environment: ENVIRONMENT, ...build, artifactHash: keccak256(bytes) };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const auth = { project: PROJECT, environment: ENVIRONMENT, artifactHash: manifest.artifactHash,
    manifestHash: keccak256(manifestBytes), sequence: '1', deadline: '2000', policyEpoch: '1',
    currentPolicyEpoch: '1', revoked: false, block: '100' };
  const options = { directory, identity: 'north', project: PROJECT, environment: ENVIRONMENT,
    fetchArtifact: async () => bytes, fetchManifest: async () => manifestBytes,
    readAuthorization: async () => auth, now: () => 1000 };
  const applied = await applyRelease(options);
  const statePath = path.join(directory, 'applied.json');
  const state = await fs.readFile(statePath, 'utf8');
  assert.deepEqual(applied.build, build);
  assert.equal(await fs.readFile(path.join(directory,'versions',applied.releaseDirectory,'index.html'), 'utf8'), '<h1>Night Market</h1>');
  await assert.rejects(applyRelease({ ...options, fetchArtifact: async () => Buffer.from('different') }), /hash mismatch/);
  let reads = 0;
  await assert.rejects(applyRelease({ ...options, readAuthorization: async () => {
    if (++reads === 2) throw new Error('RPC unavailable');
    return { ...auth, sequence: '2' };
  } }), /RPC unavailable/);
  assert.deepEqual(await fs.readdir(path.join(directory,'versions')), [applied.releaseDirectory]);
  await assert.rejects(applyRelease({ ...options, readAuthorization: async () => ({ ...auth, revoked: true }) }), /revoked/);
  await fs.mkdir(path.join(directory,'.applying'));
  await assert.rejects(applyRelease(options), /Another deployment/);
  assert.equal(await fs.readFile(statePath, 'utf8'), state);
});

test('archive reader rejects duplicate paths and mismatched commit metadata', async () => {
  await assert.rejects(readOrbitArchive(await archive('index.html'), build), /Invalid Orbit archive entry/);
  await assert.rejects(readOrbitArchive(await archive(), { ...build, commit: 'bc'.repeat(20) }), /metadata differs/);
});
