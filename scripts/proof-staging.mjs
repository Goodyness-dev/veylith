import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decodeFunctionData, getAddress, keccak256, parseAbi, parseEventLogs, size } from 'viem';
import { applyRelease } from '../agent/core.mjs';
import { archiveFormat, archiveLimit, readOrbitArchive } from '../lib/orbit-archive.mjs';
import { dianaReadClient, readPublicAuthorization } from '../lib/public-state.mjs';

const [proof, deployment] = await Promise.all(
  ['orbit-staging-proof.json', 'orbit-staging-controller.json'].map(async file =>
    JSON.parse(await fs.readFile(new URL(`../evidence/${file}`, import.meta.url), 'utf8')),
  ),
);
const controller = getAddress(deployment.address);
const storefront = new URL(proof.stagingUrl);
const abi = parseAbi([
  'struct Release { bytes32 artifactHash; bytes32 manifestHash; uint256 sequence; uint256 deadline; uint256 policyEpoch; bool revoked; }',
  'struct Approval { address reviewer; bytes signature; }',
  'function authorize(Release release, Approval[] approvals)',
  'event ReleaseChanged(bytes32 indexed digest, bytes32 artifactHash, bytes32 manifestHash, uint256 sequence, uint256 deadline, uint256 policyEpoch, bool revoked)',
]);

async function download(url, limit) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  } catch (error) {
    throw new Error(`Unable to download ${url}: ${error.cause?.message ?? error.message}`, { cause: error });
  }
  assert.ok(response.ok, `HTTP ${response.status} for ${url}`);
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    assert.ok(length <= limit, `Response exceeds ${limit} bytes for ${url}`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function verifyReceipt(record, expected) {
  const [receipt, transaction] = await Promise.all([
    dianaReadClient.getTransactionReceipt({ hash: record.hash }),
    dianaReadClient.getTransaction({ hash: record.hash }),
  ]);
  assert.equal(receipt.status, 'success', 'Diana transaction failed');
  assert.ok(receipt.to && getAddress(receipt.to) === controller, 'Unexpected receipt contract');
  assert.equal(String(receipt.blockNumber), record.block, 'Unexpected receipt block');
  const logs = parseEventLogs({
    abi,
    eventName: 'ReleaseChanged',
    logs: receipt.logs.filter(log => getAddress(log.address) === controller),
  });
  assert.equal(logs.length, 1, 'Expected one ReleaseChanged event from the staging controller');

  const { functionName, args: [request, approvals] } = decodeFunctionData({ abi, data: transaction.input });
  assert.equal(functionName, 'authorize');
  const event = logs[0].args;
  assert.equal(event.digest, record.digest, 'Unexpected release digest');
  for (const [field, value] of Object.entries(expected)) {
    assert.equal(event[field], value, `Receipt ${field} differs from the expected release`);
    assert.equal(request[field], value, `Transaction ${field} differs from the expected release`);
  }
  assert.equal(approvals.length, 2, 'Expected two approval signatures');
  const reviewers = approvals.map(approval => getAddress(approval.reviewer)).sort();
  assert.equal(new Set(reviewers).size, 2, 'Approvals must use distinct keys');
  assert.deepEqual(reviewers, deployment.reviewers.map(address => getAddress(address)).sort(), 'Unexpected reviewers');
  assert.ok(approvals.every(approval => size(approval.signature) === 4627), 'Unexpected ML-DSA-87 signature size');
}

async function run() {
  assert.match(proof.candidate, /^orbit-\d+-\d+$/);
  const candidate = `https://github.com/Goodyness-dev/veylith/releases/download/${proof.candidate}`;
  const [archive, manifestBytes, live] = await Promise.all([
    download(`${candidate}/orbit.zip`, archiveLimit),
    download(`${candidate}/manifest.json`, 64 * 1024),
    readPublicAuthorization(controller),
  ]);
  const manifest = JSON.parse(manifestBytes);
  const artifactHash = keccak256(archive);
  const manifestHash = keccak256(manifestBytes);
  assert.equal(manifest.artifactHash, artifactHash, 'Archive fingerprint differs from the manifest');
  assert.equal(manifest.format, archiveFormat);
  assert.equal(manifest.project, deployment.project, 'Unexpected manifest project');
  assert.equal(manifest.environment, deployment.environment, 'Unexpected manifest environment');
  const { files, build } = await readOrbitArchive(archive, manifest);

  await Promise.all([
    verifyReceipt(proof.approved, { artifactHash, manifestHash, sequence: 1n, revoked: false }),
    verifyReceipt(proof.revoked, { artifactHash, manifestHash, sequence: 2n, revoked: true }),
  ]);
  console.log(`Archive and manifest match both Diana receipts. Archive Keccak-256: ${artifactHash}`);
  console.log(`Sequence 1 authorized by two distinct ML-DSA-87 keys: ${proof.approved.hash}`);
  console.log(`Sequence 2 revoked the same archive: ${proof.revoked.hash}`);
  console.log(`Live Diana block ${live.block}, sequence ${live.sequence}, revoked=${live.revoked}, archive=${live.artifactHash}`);
  assert.equal(live.project, deployment.project, 'Unexpected live project');
  assert.equal(live.environment, deployment.environment, 'Unexpected live environment');
  assert.ok(live.revoked && live.sequence === '2' && live.artifactHash === artifactHash &&
    live.manifestHash === manifestHash, 'Live Diana state no longer matches the recorded revoked release');

  const temporaryRoot = await fs.realpath(tmpdir());
  const directory = await fs.mkdtemp(path.join(temporaryRoot, 'veylith-proof-'));
  try {
    await assert.rejects(applyRelease({
      directory,
      identity: 'south',
      project: deployment.project,
      environment: deployment.environment,
      fetchArtifact: async () => archive,
      fetchManifest: async () => manifestBytes,
      readAuthorization: () => readPublicAuthorization(controller),
      now: () => Math.floor(Date.now() / 1000),
    }), { message: 'Release revoked' }, 'Expected the staging installer to refuse the release as revoked');
    assert.deepEqual(await fs.readdir(directory), [], 'The refused install left files in the fresh target');
    console.log('Fresh install refused by the staging installer: Release revoked. The target is empty.');
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), temporaryRoot);
    assert.match(path.basename(directory), /^veylith-proof-[\da-z]+$/i);
    await fs.rm(directory, { recursive: true, force: true });
  }

  const installed = JSON.parse(await download(new URL('release.json', storefront), 64 * 1024));
  assert.equal(getAddress(installed.controller), controller, 'Storefront reports a different controller');
  assert.equal(installed.sequence, '1', 'Storefront no longer reports sequence 1');
  assert.equal(installed.artifactHash, artifactHash, 'Storefront reports a different archive');
  assert.equal(installed.manifestHash, manifestHash, 'Storefront reports a different manifest');
  assert.deepEqual(installed.build, build, 'Storefront reports a different build');
  await Promise.all([...files].map(async ([name, bytes]) => {
    const url = name === 'index.html' ? storefront : new URL(name, storefront);
    assert.ok((await download(url, bytes.length)).equals(bytes), `Hosted ${name} differs from the archive`);
  }));
  console.log(`Storefront still serves sequence 1 (build ${build.version}). All ${files.size} archived files match byte for byte.`);
}

try {
  await run();
} catch (error) {
  console.error(`Staging proof failed: ${error.shortMessage ?? error.message}`);
  process.exitCode = 1;
}
