import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { keccak256, getAddress, toBytes } from 'viem';
import { deriveUnifiedAccount } from '@qorechain/sdk';
import { client, nativeChain, readJson, signatures } from '../lib/chain.mjs';
import { configurationOf, publicJson } from '../lib/core.mjs';
import { relayAccount, relayRelease } from '../lib/relay.mjs';

const [command, input, ...args] = process.argv.slice(2);
const format = 'veylith-approval-request-v1';
const hashPattern = /^0x[0-9a-f]{64}$/i;
const abi = (await contractArtifact()).abi;

async function contractArtifact() {
  return readJson(new URL('../artifacts/contracts/ReleaseController.sol/ReleaseController.json', import.meta.url));
}

const read = (address, functionName, blockNumber, args) =>
  client.readContract({ address, abi, functionName, blockNumber, args });

async function readTarget(address) {
  assert.equal(await client.getChainId(), 9800, 'Expected Diana testnet');
  const block = await client.getBlock();
  assert.ok(Math.abs(Date.now() / 1000 - Number(block.timestamp)) <= 90, 'Diana block is stale');
  const fields = ['project', 'environment', 'policyEpoch', 'sequence', 'getReviewers', 'threshold', 'nativeChainHash'];
  const [project, environment, epoch, sequence, reviewers, threshold, nativeHash] =
    await Promise.all(fields.map(field => read(address, field, block.number)));
  assert.equal(nativeHash, keccak256(toBytes(nativeChain)), 'Controller uses a different signing domain');
  return { address, block, project, environment, epoch, sequence, reviewers, threshold };
}

function requestFields(target, request) {
  return {
    format,
    chainId: 9800,
    nativeChain,
    controller: target.address,
    project: target.project,
    environment: target.environment,
    request,
  };
}

async function inspect(packet) {
  assert.equal(packet.format, format);
  assert.equal(packet.chainId, 9800);
  assert.equal(packet.nativeChain, nativeChain);
  const target = await readTarget(getAddress(packet.controller));
  const r = packet.request;
  assert.equal(packet.project, target.project, 'Project differs from the controller');
  assert.equal(packet.environment, target.environment, 'Environment differs from the controller');
  assert.ok(hashPattern.test(r.artifactHash) && hashPattern.test(r.manifestHash));
  assert.equal(r.revoked, false, 'This exchange signs release approvals');
  for (const key of ['sequence', 'deadline', 'policyEpoch']) assert.match(r[key], /^[1-9]\d{0,77}$/);
  assert.equal(BigInt(r.sequence), target.sequence + 1n, 'Request is no longer the next sequence');
  assert.equal(BigInt(r.policyEpoch), target.epoch, 'Request policy epoch is stale');
  assert.ok(BigInt(r.deadline) > target.block.timestamp, 'Request expired');
  const digest = await read(target.address, 'releaseDigest', target.block.number, [r]);
  assert.equal(packet.digest, digest, 'Digest differs from the controller');
  return target;
}

async function checkBytes(packet, artifactPath, manifestPath) {
  const [artifact, manifest] = await Promise.all([artifactPath, manifestPath].map(file => fs.readFile(file)));
  const configuration = configurationOf(artifact);
  assert.ok(manifest.length <= 65_536, 'Manifest exceeds 64 KiB');
  assert.equal(keccak256(artifact), packet.request.artifactHash, 'Artifact bytes do not match');
  assert.equal(keccak256(manifest), packet.request.manifestHash, 'Manifest bytes do not match');
  const m = JSON.parse(manifest);
  assert.equal(m.format, 'veylith-release-v1');
  assert.equal(m.project, packet.project);
  assert.equal(m.environment, packet.environment);
  assert.equal(m.artifactHash, packet.request.artifactHash);
  assert.equal(m.version, configuration.release);
  return configuration;
}

function write(file, content) {
  return fs.writeFile(file, publicJson(content) + '\n', { flag: 'wx' });
}

if (command === 'propose' && input && args.length === 3) {
  const [artifact, manifest, output] = args;
  const target = await readTarget(getAddress(input));
  const request = {
    artifactHash: keccak256(await fs.readFile(artifact)),
    manifestHash: keccak256(await fs.readFile(manifest)),
    sequence: String(target.sequence + 1n),
    deadline: String(target.block.timestamp + 7200n),
    policyEpoch: String(target.epoch),
    revoked: false,
  };
  const packet = { ...requestFields(target, request), digest: await read(target.address, 'releaseDigest', target.block.number, [request]) };
  await checkBytes(packet, artifact, manifest);
  await write(output, packet);
  console.log(publicJson(packet));
} else if ((command === 'inspect' && args.length === 2 || command === 'sign' && args.length === 4) && input) {
  const [artifact, manifest, identityFile, output] = args;
  const packet = await readJson(input);
  const target = await inspect(packet);
  const configuration = await checkBytes(packet, artifact, manifest);
  if (command === 'inspect') {
    console.log(publicJson({ ...packet, configuration, deadlineUtc: new Date(Number(packet.request.deadline) * 1000).toISOString(), reviewers: target.reviewers }));
  } else {
    const identity = await deriveUnifiedAccount((await readJson(identityFile)).mnemonic);
    assert.ok(target.reviewers.some(reviewer => getAddress(reviewer) === getAddress(identity.evm)), 'This identity is outside the current reviewer set');
    const [approval] = signatures(packet.digest, [identity]);
    await write(output, { format: 'veylith-approval-v1', digest: packet.digest, ...approval });
    console.log(publicJson({ digest: packet.digest, reviewer: approval.reviewer }));
  }
} else if (['check', 'submit'].includes(command) && input && args.length) {
  const packet = await readJson(input);
  const target = await inspect(packet);
  const approvals = (await Promise.all(args.map(readJson))).map(item => {
    assert.equal(item.format, 'veylith-approval-v1');
    assert.equal(item.digest, packet.digest, 'Approval is for a different request');
    assert.match(item.signature, /^0x[0-9a-f]{9254}$/i);
    const reviewer = getAddress(item.reviewer);
    assert.ok(target.reviewers.some(member => getAddress(member) === reviewer), 'Reviewer is outside current policy');
    return { reviewer, signature: item.signature };
  }).sort((a, b) => a.reviewer.toLowerCase().localeCompare(b.reviewer.toLowerCase()));
  assert.equal(new Set(approvals.map(item => item.reviewer)).size, approvals.length, 'Approvals must come from distinct reviewers');
  const relayer = await relayAccount();
  assert.ok(!target.reviewers.some(reviewer => getAddress(reviewer) === getAddress(relayer.evm)), 'Use a relayer outside the reviewer set');
  await client.simulateContract({ address: target.address, abi, functionName: 'authorize', args: [packet.request, approvals], account: relayer.evm });
  if (command === 'submit') {
    const result = await relayRelease({ controller: { address: target.address, abi }, request: packet.request, approvals });
    console.log(publicJson({ hash: result.hash, block: result.receipt.blockNumber, reviewers: approvals.map(a => a.reviewer), relayer: result.relayer.evm }));
  } else console.log(publicJson({ digest: packet.digest, valid: true, reviewers: approvals.map(a => a.reviewer) }));
} else {
  throw new Error('Use propose CONTROLLER ARTIFACT MANIFEST REQUEST, inspect REQUEST ARTIFACT MANIFEST, sign REQUEST ARTIFACT MANIFEST LOCAL_IDENTITY APPROVAL, or check/submit REQUEST APPROVAL...');
}
