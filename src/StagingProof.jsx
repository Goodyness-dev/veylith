import React, { useState } from 'react';
import { keccak256 } from 'viem';
import ReleaseScene from './ReleaseScene.jsx';

const records = import.meta.glob('../evidence/orbit-staging-proof.json', { eager: true, import: 'default' });
const proof = records['../evidence/orbit-staging-proof.json'];
const explorer = 'https://dashboard.qorechain.io/explorer/tx/';
const modes = [
  ['approved', 'Check approved build'],
  ['altered', 'Check altered build'],
  ['revoked', 'Check revoked build'],
];

function currentPermission(chain, expected) {
  if (!chain) return 'Diana unavailable';
  if (chain.artifactHash !== expected) return 'Another candidate is current';
  if (chain.revoked) return 'Revoked';
  if (chain.policyEpoch !== chain.currentPolicyEpoch) return 'Policy changed';
  if (BigInt(chain.deadline) <= BigInt(chain.chainTime)) return 'Expired';
  return 'Authorized';
}

export default function StagingProof() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  if (!proof) return null;

  async function verify(mode) {
    setChecking(true);
    setResult(null);
    setError('');
    try {
      const options = { cache: 'no-store', signal: AbortSignal.timeout(30_000) };
      const [archive, state] = await Promise.all([
        fetch('/api/staging?file=archive', options),
        fetch('/api/staging', options).then(response => response.json()).catch(() => ({})),
      ]);
      if (!archive.ok) throw new Error('The public GitHub archive is unavailable. Try again shortly.');
      const bytes = new Uint8Array(await archive.arrayBuffer());
      if (mode === 'altered' && bytes.length) bytes[0] ^= 1;
      const expected = proof.approved.request.artifactHash;
      const observed = keccak256(bytes);
      const current = currentPermission(state.chain, expected);
      setResult({ mode, expected, observed, current, block: state.chain?.block, matches: observed === expected });
    } catch (failure) {
      setError(failure.message || 'Verification unavailable');
    } finally {
      setChecking(false);
    }
  }

  return <section className="judge-staging" aria-labelledby="staging-heading">
    <div className="judge-section-heading">
      <div><p className="eyebrow">PUBLIC STAGING · GITHUB ACTIONS + DIANA</p><h2 id="staging-heading">Try the release gate</h2></div>
      <a href={proof.stagingUrl}>Open installed storefront ↗</a>
    </div>
    <p>Build <strong>{proof.approved.build.version}</strong> was installed at sequence {proof.approved.request.sequence}. Diana later revoked permission for the same archive.</p>
    <div className="judge-checks">{modes.map(([mode, title]) =>
      <button key={mode} type="button" disabled={checking} onClick={() => verify(mode)}>{title}</button>
    )}</div>
    <div className="judge-verification" aria-live="polite">
      {checking && <p>Downloading the GitHub archive and reading Diana…</p>}
      {error && <p>{error}</p>}
      {result && <>
        <p><strong>{result.matches ? 'Fingerprint matches' : 'Fingerprint mismatch'}</strong> · {result.mode === 'approved' ? 'Authorization recorded at installation' : result.mode === 'altered' ? 'Changed bytes fail verification' : `Current permission ${result.current.toLowerCase()}`}</p>
        <dl className="judge-hashes"><dt>Approved archive</dt><dd>{result.expected}</dd><dt>Browser calculated</dt><dd>{result.observed}</dd>
          <dt>Live Diana permission{result.block && ` · block ${result.block}`}</dt><dd>{result.current}</dd></dl>
      </>}
    </div>
    <ReleaseScene working={checking} approved={result?.mode === 'approved' && result.matches}
      tampered={result?.mode === 'altered' || (result?.mode === 'revoked' && result.current === 'Revoked')}
      download={Boolean(result)} target={result?.mode === 'revoked' ? 'south' : 'north'} northInstalled />
    <nav className="judge-header-links" aria-label="Release evidence">
      <a href={proof.buildRun}>GitHub build ↗</a><a href={proof.deployRun}>Staging deploy ↗</a>
      <a href={explorer + proof.approved.hash}>Approval receipt ↗</a>
      <a href={explorer + proof.revoked.hash}>Revocation receipt ↗</a>
      <a href="/api/staging">Evidence JSON ↗</a>
    </nav>
    <p className="judge-note">The altered check changes one byte in your browser. Both testnet reviewer keys belonged to the same operator. The staging install and fresh-target refusal are recorded observations.</p>
  </section>;
}
