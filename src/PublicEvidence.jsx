import React from 'react';
import StagingProof from './StagingProof.jsx';
import './evidence.css';

const records = import.meta.glob('../evidence/orbit-walkthrough.json', { eager: true, import: 'default' });
const orbit = records['../evidence/orbit-walkthrough.json'];
const explorer = 'https://dashboard.qorechain.io/explorer/tx/';

function Receipt({ tx, children }) {
  return <a href={explorer + tx.hash} target="_blank" rel="noreferrer">{children} · block {tx.block} ↗</a>;
}

export default function PublicEvidence({ data }) {
  const chain = data?.chain;
  const permission = !data ? 'Reading Diana…' : !chain ? 'Unavailable' : chain.sequence === '0' ? 'No release' : chain.revoked ? 'Revoked' : chain.policyEpoch !== chain.currentPolicyEpoch ? 'Policy changed' : Number(chain.deadline) <= Number(chain.chainTime) ? 'Expired' : 'Authorized';

  return <main className="judge-evidence">
    <header className="judge-header">
      <a className="wordmark" href="/">VEY<span>L</span>ITH<span className="symbol">✳</span></a>
      <nav className="judge-header-links" aria-label="Project resources">
        <a href="https://github.com/Goodyness-dev/veylith/blob/main/docs/AUDIT.md">QCAI audit ↗</a>
        <a href="https://github.com/Goodyness-dev/veylith">Source ↗</a>
      </nav>
    </header>
    <section className="judge-intro">
      <p className="eyebrow">RELEASE AUTHORIZATION · DIANA TESTNET</p>
      <h1>Is this exact release<br />still approved?</h1>
      <p>Veylith checks that two post-quantum reviewer keys approved the bytes a deployment agent received for its target environment. The agent checks that permission again before installing.</p>
    </section>
    <StagingProof />
    {orbit ? <section aria-labelledby="walkthrough-heading">
      <div className="judge-section-heading">
        <div><p className="eyebrow">RECORDED WALKTHROUGH · {orbit.checkedAt.slice(0, 10)} UTC</p><h2 id="walkthrough-heading">One release, three decisions</h2></div>
        <a href="/api/proof" download="veylith-evidence.json">Download evidence ↓</a>
      </div>
      <div className="judge-decisions">
        <article className="judge-decision accepted">
          <p className="eyebrow">01 · INSTALLED</p><h3>Approved artifact applied</h3>
          <p>Both agents applied sequence <strong>{orbit.approved.sequence}</strong>. Orbit Commerce switched collections and began serving <strong>{orbit.service.afterInstall.products[0]}</strong>.</p>
          <p className="judge-catalog">{orbit.service.before.title} <span>→</span> {orbit.service.afterInstall.title}</p>
          <Receipt tx={orbit.approved}>Authorization receipt</Receipt>
        </article>
        <article className="judge-decision held">
          <p className="eyebrow">02 · REFUSED</p><h3>Changed bytes held</h3>
          <p>{orbit.mismatch.reason}. The catalog and installed sequence stayed the same.</p>
          <dl className="judge-hashes"><dt>Approved</dt><dd>{orbit.mismatch.expected}</dd><dt>Received</dt><dd>{orbit.mismatch.observed}</dd></dl>
        </article>
        <article className="judge-decision held">
          <p className="eyebrow">03 · REFUSED</p><h3>Original bytes held after revocation</h3>
          <p>The restored download matched the approved fingerprint. South refused it because permission was revoked. Orbit kept serving the installed catalog.</p>
          <Receipt tx={orbit.revoked}>Revocation receipt</Receipt>
        </article>
      </div>
      <p className="judge-note">One operator held both demo reviewer keys. Refusals and catalog responses come from the recorded local run. Select <strong>Testnet</strong> in the QoreChain Dashboard to open the receipts.</p>
    </section> : <section aria-labelledby="walkthrough-heading">
      <div className="judge-section-heading">
        <h2 id="walkthrough-heading">Recorded agent walkthrough</h2>
        <a href="/api/proof" download="veylith-evidence.json">Download evidence ↓</a>
      </div>
      <p>The earlier Diana walkthrough is available in the evidence download. The standalone Orbit walkthrough is pending.</p>
    </section>}
    <section className="judge-live" aria-labelledby="live-heading">
      <div><p className="eyebrow">LIVE DIANA READ</p><h2 id="live-heading">{permission}</h2></div>
      <dl><dt>Controller</dt><dd>{data?.contract ?? orbit?.controller ?? '—'}</dd>
        <dt>Sequence</dt><dd>{chain?.sequence ?? '—'}</dd>
        <dt>Observed block</dt><dd>{chain?.block ?? '—'}</dd>
      </dl>
    </section>
  </main>;
}
