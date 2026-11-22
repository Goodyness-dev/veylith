import fs from 'node:fs/promises';
import path from 'node:path';
import { getAddress, isHex, size } from 'viem';
import { applyRelease } from '../agent/core.mjs';
import { authorization, readJson } from '../lib/chain.mjs';
import { PROJECT } from '../lib/core.mjs';
import { archiveLimit } from '../lib/orbit-archive.mjs';

const [controller, environment, identity, directory, artifact, manifest] = process.argv.slice(2);
if (!manifest || !['north','south'].includes(identity) || !isHex(environment) || size(environment)!==32) {
  throw new Error('Use orbit/apply-release CONTROLLER ENVIRONMENT north|south STATE_DIR ARCHIVE MANIFEST');
}
const address = getAddress(controller);
const { abi } = await readJson(new URL('../artifacts/contracts/ReleaseController.sol/ReleaseController.json', import.meta.url));

async function readBounded(file, limit) {
  const handle = await fs.open(file, 'r');
  try {
    const { size } = await handle.stat();
    if (size > limit) throw new Error('Candidate file exceeds size limit');
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length <= limit) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > limit) throw new Error('Candidate file exceeds size limit');
    return buffer.subarray(0, length);
  } finally {
    await handle.close();
  }
}

try {
  const state = await applyRelease({
    directory, identity, project: PROJECT, environment,
    fetchArtifact: () => readBounded(artifact, archiveLimit),
    fetchManifest: () => readBounded(manifest, 64 * 1024),
    readAuthorization: () => authorization({ address, abi }),
    now: () => Math.floor(Date.now() / 1000),
  });
  console.log(JSON.stringify({ outcome: 'applied', controller: address, ...state }));
} catch (error) {
  console.error(JSON.stringify({ outcome: 'refused', controller: address, identity,
    reason: error.shortMessage ?? error.message, expected: error.expected, observed: error.observed }));
  process.exitCode = 1;
}
