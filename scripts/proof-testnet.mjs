import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { verify, createPublicKey } from 'node:crypto';
import { keccak256 } from 'viem';

const base = 'http://127.0.0.1:' + (process.env.PORT ?? 5173);
const orbit = 'http://127.0.0.1:' + (process.env.VEYLITH_ORBIT_PORT ?? 5180);
const checks = [];

async function read(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180_000), ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}

async function call(action, body = {}) {
  const data = await read(`${base}/api/${action}`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data.result;
}

function check(name, pass) {
  assert.equal(pass, true, name);
  checks.push({ name, pass });
  console.log(name);
}

async function catalog() {
  const storefront = await read(`${orbit}/catalog`);
  const install = await read(`${orbit}/release`);
  assert.equal(storefront.sequence, install.sequence);
  assert.equal(storefront.artifactHash, install.artifactHash);
  return storefront;
}

const start = await read(`${base}/api/state`);
assert.equal(start.ready, true, start.error ?? 'Live controller must be ready');
assert.equal(start.orbitPort, new URL(orbit).port, 'Start the walkthrough with npm run demo');
const before = await catalog();
assert.equal(before.sequence, '0', 'Restart npm run demo to begin with a fresh installation');
await call('tamper', { enabled: false });

const approved = await call('authorize');
check('Two reviewer keys authorize the release on Diana', /^0x[0-9a-f]{64}$/i.test(approved.hash));
const applied = {};
for (const identity of ['north', 'south']) {
  const report = await call('deploy', { identity });
  check(`${identity} agent applies the authorized item`, report.outcome === 'applied' && report.sequence === approved.sequence && report.artifactHash === start.artifactHash);
  const { signature, publicKey, signatureAlgorithm, note, ...payload } = report;
  check(`${identity} installation report signature verifies`, verify(null, Buffer.from(JSON.stringify(payload)), createPublicKey(publicKey), Buffer.from(signature, 'base64')));
  applied[identity] = report;
}
const afterInstall = await catalog();
check('Standalone Orbit serves new catalog products', afterInstall.catalog !== before.catalog && afterInstall.products[0] !== before.products[0] && afterInstall.sequence === approved.sequence && afterInstall.artifactHash === start.artifactHash);

let mismatch;
try {
  await call('tamper', { enabled: true });
  mismatch = await call('deploy', { identity: 'north' });
  check('Substituted artifact is refused with both fingerprints recorded', mismatch.outcome === 'refused' && mismatch.reason === 'Artifact hash mismatch' && mismatch.expected === start.artifactHash && /^0x[0-9a-f]{64}$/i.test(mismatch.observed) && mismatch.observed !== mismatch.expected);
} finally {
  await call('tamper', { enabled: false });
}
const afterSubstitution = await catalog();
assert.deepEqual(afterSubstitution, afterInstall);
check('Substituted download leaves the standalone catalog and installation unchanged', true);

const replay = await call('deploy', { identity: 'north' });
check('The same sequence cannot install twice', replay.outcome === 'refused' && replay.reason === 'Sequence already applied');
const revoked = await call('revoke');
const original = await fetch(`${base}/artifacts/release.json`, { signal: AbortSignal.timeout(15_000) });
assert.equal(original.ok, true, 'Restored artifact must remain available');
const restoredHash = keccak256(new Uint8Array(await original.arrayBuffer()));
const refusal = await call('deploy', { identity: 'south' });
check('Original bytes still match after revocation and the agent refuses installation', restoredHash === start.artifactHash && refusal.outcome === 'refused' && refusal.reason === 'Release revoked');
const afterRevocation = await catalog();
assert.deepEqual(afterRevocation, afterInstall);
check('Revocation leaves the installed catalog unchanged', true);

const final = await read(`${base}/api/state`);
check('Live Diana agrees with the revocation receipt', final.chain?.revoked === true && final.chain.sequence === revoked.sequence && final.chain.artifactHash === restoredHash);
const record = {
  checkedAt: new Date().toISOString(),
  controller: final.contract,
  reviewers: final.reviewers,
  approved, revoked, checks, applied, mismatch, replay, refusal, restoredHash,
  service: { before, afterInstall, afterSubstitution, afterRevocation },
};
const destination = new URL('../evidence/orbit-walkthrough.json', import.meta.url);
const temporary = new URL('../evidence/orbit-walkthrough.tmp', import.meta.url);
await fs.writeFile(temporary, JSON.stringify(record, null, 2) + '\n');
await fs.rename(temporary, destination);
console.log(`Saved ${checks.length} verified results to evidence/orbit-walkthrough.json`);
