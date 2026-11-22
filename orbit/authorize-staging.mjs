import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { keccak256 } from 'viem';
import { accounts, authorization, client, readJson, signatures } from '../lib/chain.mjs';
import { ORBIT_STAGING, PROJECT, publicJson } from '../lib/core.mjs';
import { archiveFormat, readOrbitArchive } from '../lib/orbit-archive.mjs';
import { relayAccount, relayRelease } from '../lib/relay.mjs';

const [action, artifactPath, manifestPath, output] = process.argv.slice(2);
if (!output || !['authorize','revoke'].includes(action)) {
  throw new Error('Use authorize-staging authorize|revoke ARCHIVE MANIFEST OUTPUT_JSON');
}
const { address, environment, project } = await readJson(new URL('../evidence/orbit-staging-controller.json', import.meta.url));
const { abi } = await readJson(new URL('../artifacts/contracts/ReleaseController.sol/ReleaseController.json', import.meta.url));
const controller = { address, abi };
const state = await authorization(controller);
assert.equal(state.project, PROJECT);
assert.equal(state.project, project);
assert.equal(state.environment, ORBIT_STAGING);
assert.equal(state.environment, environment);
const [artifact, manifestBytes] = await Promise.all([fs.readFile(artifactPath), fs.readFile(manifestPath)]);
const manifest = JSON.parse(manifestBytes);
const artifactHash = keccak256(artifact);
const manifestHash = keccak256(manifestBytes);
assert.equal(manifest.format, archiveFormat);
assert.equal(manifest.project, project);
assert.equal(manifest.environment, environment);
assert.equal(manifest.artifactHash, artifactHash);
const { build } = await readOrbitArchive(artifact, manifest);
const revoked = action === 'revoke';
if (revoked) {
  assert.equal(state.revoked, false);
  assert.equal(state.artifactHash, artifactHash);
  assert.equal(state.manifestHash, manifestHash);
}
const request = {
  artifactHash, manifestHash, sequence: BigInt(state.sequence) + 1n,
  deadline: BigInt(state.chainTime) + 7200n, policyEpoch: BigInt(state.currentPolicyEpoch), revoked,
};
const digest = await client.readContract({ address, abi, functionName: 'releaseDigest', args: [request], blockNumber: BigInt(state.block) });
const approvals = signatures(digest, await accounts());
const relayer = await relayAccount();
let oneReviewer;
if (!revoked) {
  await assert.rejects(client.simulateContract({ address, abi, functionName: 'authorize', args: [request, approvals.slice(0,1)], account: relayer.evm }), error => {
    const revert = error.walk?.(cause => cause.data?.errorName === 'InvalidSignature');
    if (revert?.data?.errorName !== 'InvalidSignature') return false;
    oneReviewer = { outcome: 'refused', reason: 'InvalidSignature', reviewer: approvals[0].reviewer, digest, block: state.block };
    return true;
  });
}
const result = await relayRelease({ controller, request, approvals });
const report = { action, controller: address, hash: result.hash, block: result.receipt.blockNumber, build,
  request, digest, reviewers: approvals.map(approval => approval.reviewer),
  custody: 'Both keys held by the demo operator', relayer: result.relayer, window: result.bounds, oneReviewer };
await fs.writeFile(output, publicJson(report) + '\n', { flag: 'wx' });
console.log(publicJson(report));
