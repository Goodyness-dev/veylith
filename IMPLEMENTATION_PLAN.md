# Veylith submission implementation plan

**Progress on 21 November 2026.** The standalone service passed 12 Diana walkthrough checks. The Vercel verifier serves those recorded results and reads live Diana state. The authorization and revocation receipts both resolved successfully on Diana. A live simulation rejected one approval and accepted two solo demo keys. The Stage 1 QCAI report and all six dispositions are in the [audit record](docs/AUDIT.md). Stage 2 is ready to run. The final submission closes **3 December at 00:59 WAT**. [Public verifier](https://veylith-gamma.vercel.app/) · [Official prize conditions](https://build.qorechain.io/prizes)

The public entry links to the updated verifier and the earlier demo video. Its description and kit selections still reflect the earlier version. Update the fields below from the signed-in builder dashboard. [Submitted project](https://build.qorechain.io/p/veylith)

## 1. Complete the required two-stage QCAI audit

The Post-Quantum dApp category requires a scoped EVM window, `pqcVerify`, the two-stage QCAI audit, and Foundry or Hardhat tests. Existing tests and live evidence support the other requirements. Stage 1 and its response are available in the audit record. The remaining audit steps are the Stage 2 export and the project-page link. [Prize conditions](https://build.qorechain.io/prizes)

1. Record the Solidity source, commit, compiler settings, Diana controller address and deployment transaction. Run Stage 1 on that source in the QCAI dashboard using its EVM/Solidity setting. Save the dated PDF in `docs/audit/`. Dashboard access may require the builder's signed-in session.
2. Create `docs/AUDIT.md`. For each Stage 1 finding, record its severity, affected code, disposition and supporting evidence. Use a linked fix, a named regression test, or a concrete explanation of why a change is unnecessary. Explain where `pqcVerify` and `pqcKeyStatus` enforce policy and which tests exercise each boundary.
3. Run Stage 2 after addressing every Stage 1 finding, using the same setting. Save its dated PDF and document any remaining findings. If Solidity changes, explicitly map the audited revision to its deployed version and rerun the affected live checks before publishing replacement deployment details.
4. Link the reports and response from the README and the project's **How it's made** field. Link the controller source and live receipt for the manually judged Solidity PQC features.

**Acceptance:** two readable official PDFs, a disposition for every Stage 1 finding, and a clear mapping among source revision, tests and deployed contract. An EVM quantum-readiness result of “Not scored” is expected under the documented audit setting. [Builder FAQ](https://build.qorechain.io/faq)

## 2. Deploy into one separately running application

**Current gap:** the agents verify and persist the configuration, and the workbench visualizes that state. A judge needs an application outside the workbench that actually uses the agent output.

1. Add a small standalone Orbit Commerce service with its own Node process and port. Give it one genuine runtime behavior to change, such as which collection appears at `/catalog`. Provide a defined initial state before any release is installed.
2. Reuse the artifact host, existing Diana controller and `agent/core.mjs`. Use a bounded JSON release with a validated catalog selection. Keep the payload format backward compatible or add an explicit new version and retain support for the existing fixture and evidence.
3. Configure the service to read only the agent's atomically written applied state as its release input. The artifact host and workbench must have no direct update route into the service. Expose a read-only `/release` endpoint with the applied sequence and digest so the judge can compare it with the agent and chain.
4. Add one documented local launch command and one reproducible walkthrough. Capture the service response before deployment, after a valid installation, and after a tampered download from the same URL. Record the observed and approved hashes before later agent reports replace them.

**Acceptance:** the standalone service responds independently of React. A valid release changes its actual catalog response and applied sequence. A substituted download is refused and leaves both unchanged. A revoked release stops future installation without rolling back the previously applied state. Save those results and the transaction references from a single run.

## 3. Explain why ordinary artifact signing is insufficient for this workflow

1. Put the use case at the top of the README and project page. The intended user is a release engineer who needs reviewer permission to remain valid when an agent applies a specific artifact to a specific environment.
2. Explain the distinction fairly. Cosign can verify signatures over exact artifacts and support attestations used in policy systems. Veylith's feature is the combination of an on-chain two-reviewer ML-DSA-87 quorum, environment binding, sequence, expiry and revocation checked at deployment. The claim is about the policy this prototype implements. [Cosign verification](https://docs.sigstore.dev/cosign/verifying/verify/)
3. Make the cleanest comparison in the walkthrough. After revocation, serve the exact original artifact. Show that its fingerprint still matches while the deployment agent refuses it because current permission has been withdrawn.

**Acceptance:** a judge can describe the difference in one sentence and see it in the evidence. Suggested wording: “Veylith lets a deployment agent check whether the exact bytes it received are still approved for this environment by two post-quantum reviewers.”

## 4. Make the evidence verifiable from the public demo

1. Add a prominent evidence view to the Vercel demo. Reuse the existing Diana read endpoint for current state. Display the live controller, current sequence, permission state and observed block. Handle RPC failure by labeling current state unavailable.
2. Publish the verified walkthrough as a separate dated record. Capture authorization and revocation hashes, expected and received artifact hashes, both agent outcomes, and the standalone application's observed behavior. Include proof from the same run and label each historical result with its sequence or observation time when available.
3. Put three outcomes on the first screen: **approved artifact applied**, **changed bytes refused**, and **original bytes refused after revocation**. Show the expected and observed hashes side by side for the substitution. Link the relevant chain transaction, and label local process reports as agent evidence. The refusal itself occurs locally.
4. Verify from a fresh browser session that the demo and video load, links work, the three outcomes are understandable, and the page remains readable during an RPC outage. Retain the raw JSON download for reviewers.

**Acceptance:** a judge can open the public link and understand the authorization, the mismatch and the service outcome in under a minute, without a wallet or the builder's laptop. The public endpoint remains read-only and contains public evidence. [Current public demo](https://veylith-gamma.vercel.app/)

## 5. Make reviewer independence verifiable

1. Correct wording now: one demo operator currently controls two distinct registered reviewer keys. The existing chain evidence proves a two-key quorum. Update the README, public evidence labels and submission copy consistently.
2. After the audit and service walkthrough, add a portable approval request with controller address, chain, project, environment, artifact and manifest digests, sequence, policy epoch and deadline. Each reviewer should independently inspect those values and check the digest against the controller before signing. Accept only signatures from distinct registered reviewers for that exact request.
3. Exercise the flow with two separately controlled **disposable testnet reviewer identities** if available. Prefer a bounded local file exchange as the first verifiable workflow. QoreX `signArbitrary` is a follow-on option once compatibility with the controller's exact signing bytes and capability detection is tested. Keep reviewer identities separate from the relayer, and leave the recorded drill deployment available as historical evidence. [QoreX signing guidance](https://build.qorechain.io/faq)

**Acceptance:** one valid approval cannot authorize a release. Two independently controlled identities can approve the same request and a separate relayer can submit it. The proof identifies the two public keys or addresses and shows both outcomes. If a second operator is unavailable, present the two-key demo accurately and leave independent custody marked open.

## Submission order and release checks

| Target, WAT | Deliverable |
|---|---|
| 21–24 November | Run Stage 1, address findings and run Stage 2. Export both reports and link the response. |
| 24–27 November | Run the standalone service and record the before, approved update, substitution and revocation outcomes. |
| 27–29 November | Publish the product explanation and public evidence view. |
| 29–30 November | Verify separate custody if available. Refresh the video if the existing recording omits the standalone service or the strongest proof. |
| 1 December | Open the submitted links from a fresh session and confirm the repo, audit, video, testnet addresses, and evidence match the final entry. |

- [ ] Audit artifacts are public and linked from the README and the project page.
- [x] A clean GitHub checkout built successfully and passed the walkthrough revision's tests. In a fresh signed-out browser, the public verifier showed all three outcomes and the live Diana state without a signer. A simulated RPC outage left the recorded outcomes readable on mobile.
- [x] The [standalone application walkthrough](evidence/orbit-walkthrough.json) records successful installation at sequence 20 and both refusals with matching evidence.
- [x] The demo labels current Diana state and dated local observations. The submitted heartbeat and self-run walkthrough have separate evidence files.
- [ ] Remove QoreSeal from the application dependency and submission kit claims if it remains unused. Keep its earlier research credited. The Solidity PQC features may remain Declared, as the organizer checks them manually. [Verification FAQ](https://build.qorechain.io/faq)
- [ ] Check the final recording is within three minutes and the entry points to the final public proof. [Prize conditions](https://build.qorechain.io/prizes)

If time runs short, finish the official audit and one real application walkthrough first, then publish the evidence. Accurate two-key demo wording is acceptable for the current prototype. Keep separate-custody claims tied to an actual run.

## Copy for the project page

### About

Veylith helps release engineers verify that the exact software bytes an agent received are still approved for the target environment. On Diana, two registered post-quantum reviewer keys authorize a specific artifact and manifest. The deployment agents check the fingerprints and current authorization before applying the release.

The standalone Orbit Commerce storefront switched from Everyday Essentials to Night Market when its agent installed the approved release. The agent refused substituted bytes and refused the restored original after on-chain revocation. Orbit kept serving its installed catalog in both cases. The public demo shows both fingerprints, the Diana receipts and the recorded storefront results.

### How it's made

The Solidity controller checks ML-DSA-87 signatures and registered keys using `pqcVerify` and `pqcKeyStatus`. Approvals bind the chain, controller, project, environment, artifact and manifest fingerprints, expiry, sequence and policy epoch. A separate relayer submits through a short, target-scoped EVM window opened with hybrid signing. Two Node agents verify and install bounded JSON configuration, and the standalone Orbit HTTP service reads North's installed release. One demo operator controls both distinct reviewer keys. The approval-file workflow also supports reviewing and signing on separate devices.

Hardhat tests exercise the contract boundaries, and the 12-check walkthrough exercises the Diana precompiles and the standalone storefront. For source, compiler settings and QCAI report status, see [the audit record](https://github.com/Goodyness-dev/veylith/blob/main/docs/AUDIT.md). For receipts and the public evidence download, see [the verifier](https://veylith-gamma.vercel.app/).

### Kit selection

Keep QoreChain SDK and QoreSign. Clear QoreSeal, which was evaluated during research and has been removed from the application's dependencies.

### Refreshed video

Open on the Orbit storefront at sequence 0. Show the release details and approval in the workbench, then install through North and refresh Orbit to show the new products and sequence. Show the refusal when the download changes. Restore the exact original, revoke permission and show South refuse it. Close on the public verifier so judges can independently revisit the receipts and both fingerprints. Retain the existing video link until a replacement under three minutes is uploaded and playable from a signed-out session.
