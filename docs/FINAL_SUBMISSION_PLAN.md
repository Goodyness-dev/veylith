# Veylith final submission plan

**Target:** A release engineer ships a real storefront build from GitHub Actions to public staging. Two separately held post-quantum reviewer keys approve the exact build for that environment on Diana. A second staging target later refuses the original archive after revocation, even though its fingerprint still matches.

**Schedule:** Working baseline as of 22 November 2026 WAT. Freeze the candidate by 30 November, submit by 1 December WAT, and reserve 2 December for repairs. The official cutoff is **3 December at 00:59 WAT** (2 December at 23:59 UTC). [Official rules](https://build.qorechain.io/rules)

The earlier [implementation plan](../IMPLEMENTATION_PLAN.md) records the work that got us here. Reuse the live ReleaseController, scoped relayer, separate-reviewer CLI, standalone storefront, public read API and Three.js scene. The current walkthrough applies bounded JSON and both reviewer keys were held by the operator. The work below adds the built archive, hosted staging and independent approval evidence. [Current walkthrough](../evidence/orbit-walkthrough.json) · [Audit record](AUDIT.md) · [Reviewer handoff](REVIEWERS.md)

## What to take from the field

Reviewed the public project page for each of the 36 entries listed in Post-Quantum dApp on 22 November, including Veylith and one placeholder. These are design observations from public descriptions, demos and evidence where available. Teams' test or deployment claims remain attributed to their entries. Links in the table open each source. [Category directory](https://build.qorechain.io/projects)

| Entry | Strongest transferable idea and Veylith decision |
| --- | --- |
| [BANZAI VEGAS](https://build.qorechain.io/p/banzai-vegas) | Make automation legible. Show when CI built the candidate and when staging last evaluated it. |
| [bulkhead](https://build.qorechain.io/p/bulkhead) | Separate credentials by blast radius. Give CI publishing access, reviewers approval keys, the relayer submission authority and the staging service installation access. |
| [Clainova](https://build.qorechain.io/p/clainova) | Start with a familiar entry point. Let a judge open the running site and evidence without onboarding. |
| [Conclave](https://build.qorechain.io/p/conclave) | Show what a vote authorizes. Put the commit, target, fingerprints, sequence and expiry in the reviewer view. |
| [Darwin](https://build.qorechain.io/p/darwin) | Give each security claim an evidence link and a way to rerun the check. Add a compact claims table beside the pipeline and Diana receipts. |
| [DeedLock Escrow](https://build.qorechain.io/p/deedlock-escrow) | Tie each completed step to its real receipt and distinguish live reads from simulation. Apply that to the release timeline. |
| [Haven Escrow](https://build.qorechain.io/p/haven-escrow) | Pin destinations across the workflow. Keep the target part of the signed request and staging configuration. |
| [Heirloom](https://build.qorechain.io/p/heirloom) | Make the passage of time affect visible status. Show the approval deadline and turn an expired candidate into a clear refusal. |
| [Jaydaad](https://build.qorechain.io/p/jaydaad) | Tell the story from the second signer's point of view. Show the second reviewer inspecting the request and the stage waiting for that approval. |
| [Keyfall](https://build.qorechain.io/p/keyfall) | State security claims in terms of capability and consequence. Publish a defensive table of who can publish, approve, submit, install and revoke, with expected denials on Veylith's own fixtures. |
| [Peal Tender](https://build.qorechain.io/p/peal-tender) | Make signed intent reproducible across tooling. Check that the reviewer CLI and Diana compute the same digest for the archive request. |
| [Perennial](https://build.qorechain.io/p/perennial) | Label the production assumption wherever it matters. Use explicit labels for a fixture, recorded deployment and live chain reading. |
| [Postmark](https://build.qorechain.io/p/postmark) | Attach the workflow to a real GitHub object. Deep-link the commit, build run and release asset. |
| [PQ Permit](https://build.qorechain.io/p/pq-permit) | Isolate the precise authorization gap. Show matching bytes and revoked permission together, with evidence for each. |
| [PQ Timelock Vault](https://build.qorechain.io/p/pq-timelock-vault) | Treat timing, cancellation and quorum as separate controls. Give each refusal a distinct reason. |
| [Q-Day Vault](https://build.qorechain.io/p/q-day-vault) | Separate the caller from the authorizer. Show the dedicated relayer address apart from the recorded reviewers. |
| [Qampus](https://build.qorechain.io/p/qampus) | Make a milestone a shareable record. Give the release evidence a stable public URL with direct links to build, deployment and receipts. |
| [QNS](https://build.qorechain.io/p/qns-qore-name-service) | Put a readable name on a sensitive action. Display Orbit Staging alongside the exact environment identifier. |
| [QoreFlow](https://build.qorechain.io/p/qoreflow) | Show time-sensitive status. Display the Diana block and time of the last successful read alongside the decision. |
| [QoreWitness](https://build.qorechain.io/p/qorewitness) | Put evidence verification in the visitor's browser. Let judges hash the actual archive and optionally select a local copy to compare. |
| [Qrow](https://build.qorechain.io/p/qrow) | Show what a user is about to authorize and provide a wallet-free history. Use a release review summary and public receipt links. |
| [Quantum Escrow](https://build.qorechain.io/p/quantum-escrow) | One completed transaction story beats a feature list. Tell the story of one released build from commit through refusal. |
| [Quantum Vault](https://build.qorechain.io/p/quantum-vault) | Explain each layer's actual job. Separate scoped transaction admission, contract permission and off-chain byte verification. |
| [QuantumScan](https://build.qorechain.io/p/quantumscan) | Make unverifiable state explicit. A failed live read produces “Diana unavailable” with its timestamp. |
| [Quax](https://build.qorechain.io/p/quax) | The public page is a placeholder. The lesson is to keep the entry linked to playable evidence throughout the sprint. |
| [QVault](https://build.qorechain.io/p/qvault) | Define what happens when one credential fails. Document the effect of compromised publishing, reviewer, relayer and staging credentials separately. |
| [Qwakk](https://build.qorechain.io/p/qwakk-dex-pond-vault) | Preflight before asking the user to sign. Check the candidate digest, current epoch and fresh sequence before asking for signatures and again before relay. |
| [Redzone](https://build.qorechain.io/p/redzone) | Let the visitor cause an outcome. Connect the current 3D scene to actual browser verification and keep fingerprints and decisions readable alongside it. |
| [REQO](https://build.qorechain.io/p/reqo) | Hide relayer setup from the participant. Give the reviewer a simple exchange flow; keep fee payment and window setup with the operator. |
| [Rewind](https://build.qorechain.io/p/rewind) | Put the boundary in plain language. Revocation stops future installs. Rolling a deployed site back is a separate operation. |
| [Rosca](https://build.qorechain.io/p/rosca) | Make who is missing from quorum obvious. Show two distinct role slots with progress from waiting to approved. |
| [Steal This Vault](https://build.qorechain.io/p/steal-this-vault) | Side-by-side outcomes make security tangible. Compare matching bytes before and after revocation using the same archive and link each observation. |
| [SWEEFT](https://build.qorechain.io/p/sweeft) | The visible description centers on broad commerce. Veylith should state one concrete outcome in its first line: shipping an authorized build. |
| [T-REX ID](https://build.qorechain.io/p/t-rex-id-quantum-safe-erc-3643-institutional-ide) | Make policy checks deterministic and explicit. Put the release requirements and their evidence next to the installation decision. |
| [The Record](https://build.qorechain.io/p/the-record) | Its two-party approval and exact-file verification overlap directly. Make current environment permission and the real runtime consequence the center of Veylith. |
| [Veylith](https://build.qorechain.io/p/veylith) | Preserve the strongest existing experiment. The restored original matches the approved hash and the agent still refuses it after revocation. Repeat it with a real CI-built app. |

## Build order and acceptance

### 22–24 November — build a versioned app and put it behind the gate

- Add a small static Orbit build to the repository with an obvious before/after release and a machine-readable build version. Keep it separate from the workbench bundle.
- Add a GitHub Actions workflow that builds from a known commit, packages the static output and creates a versioned manifest. Record commit, workflow run, project, environment, version and archive Keccak-256. Publish exact binary bytes with a stable public URL and preserve earlier releases. Use the same Keccak-256 convention as the controller and the agent. GitHub publishing only creates a candidate.
- Reuse the agent's verified-byte path and final Diana reread. Add an explicit archive payload version while retaining support for the demo JSON. Start with a bounded ZIP of static assets, using a maintained reader. Require a known entrypoint and version file. Reject unsafe names, symlinks, duplicate paths, invalid types and oversized expanded content. Stage into a dedicated release directory and atomically activate a local pointer after validation and a health check. The public server serves the active build and a read-only release metadata endpoint.
- Use two staging destinations for the same authorized environment. North gets the approved build. South starts with a clean install history for the revocation case. Host the site behind HTTPS with persistent storage and a private apply command. Verify the hosting option early. Vercel can keep serving the read-only verifier; the mutable target needs persistent state.
- **Done when** a GitHub-published candidate has no effect on staging by itself and a Diana-authorized deployment changes the public site to the exact CI build. A signed-out browser can follow the commit → build → artifact → active site links.

### 24–26 November — independent reviewers and the four decisions

- Ask a volunteer early to hold the second disposable Diana reviewer identity on their own device. Use public reviewer addresses to configure the policy. Use the new controller or a controlled policy rotation according to the existing repository workflow, preserving the drills and recording the final controller, addresses, deployment and policy evidence.
- Extend the existing propose, inspect, sign and check workflow to the archive format. Reviewers independently download the artifact and recompute both hashes. The approval binds chain, controller, project, environment, archive, manifest, sequence, expiry and epoch. The relayer receives only public approval files. Try QoreX after the handoff works. Verify its exact signed bytes against the controller before exposing wallet approval. [QoreX signing](https://build.qorechain.io/faq#signing-messages-with-qorex-ml-dsa-87)
- Capture all four outcomes for one GitHub build. Use distinct recorded attempts and include the observed block or timestamps. A comparison made in the verifier can still hash the archive when the deployment agent stops early on revoked permission.

  | Attempt | Required evidence |
  | --- | --- |
  | One reviewer | Proposal digest, one registered reviewer, live Diana simulation refusal, staging version unchanged. |
  | Two reviewers | Same proposal digest, distinct signers, committed Diana authorization receipt, North's installed archive hash and public build version. |
  | Altered archive | Same approval with deliberately different inert test bytes, expected and observed hashes, North's refusal and unchanged active version. |
  | Original archive after revocation | Committed revocation receipt, original hash still matching, clean South refusing with `Release revoked`, and North still serving the earlier installation. |
- **Done when** the record connects all four results to the same artifact, controller and staging environment and one approval comes from a key the builder never held. If no volunteer is available in time, ship with the proven two-key flow and disclose common custody on the entry.

### 26–28 November — make the proof playable

- Use the current public evidence view and Three.js scene. Add **Check approved build**, **Check altered build**, and **Check revoked build**. Each action fetches or reads real bytes and hashes them locally. The approved scenario reads the recorded approval at its historical block or labeled receipt, with a separate current permission check. The revoked scenario uses the same original archive and reads the latest available Diana block. An archived approval is never displayed as current permission.
- Put two plain-text results next to the animation: **Do the bytes match?** and **Is deployment currently permitted?** Show the target, fingerprints, sequence, block and receipt below. Use a visible loading state while the browser checks Diana and the artifact. Label live chain results, browser measurements and recorded staging outcomes at their source. Keep a readable view if WebGL or the live RPC fails.
- **Done when** a signed-out visitor on another device can run the three checks in under a minute, verify the public receipts and explain why the revoked archive still matches.

### 27–29 November — validate the installation boundary

- Keep CI publishing, reviewer signing, relaying and staging installation separate. Give the artifact host no apply route and the public staging process read-only access to active assets. Record what a staging host administrator could bypass and the timing gap between the last Diana read and local activation.
- Run named regression checks for outage or stale authorization, wrong target, expired approval, changed epoch, invalid archive, interrupted or failed installation, repeated sequence and concurrent calls. Verify the installed version remains readable on each failed attempt. Check the existing per-directory lock covers activation and stale lock recovery has a defined operator procedure. Exercise the real Diana policy and scoped relayer with fresh staging evidence.
- Confirm the final controller source, compiler, deployed bytecode reference and audit revision. Reuse the two-stage audit for byte-identical Solidity with a verified deployment mapping. If Solidity changes, rerun both stages for the new source and publish findings and receipts. Keep Hardhat results and the real precompile evidence easy to distinguish. [Category requirements](https://build.qorechain.io/prizes#post-quantum-dapp) · [Audit rules](https://build.qorechain.io/faq#qcai-audit-post-quantum-dapp-track)
- **Done when** tests, audit, current contract and deployment all point to the same release candidate, and the public page shows unavailable chain state clearly during a simulated outage.

### 30 November–1 December — record and submit

- Cut a video under three minutes. **0:00–0:20** open the public Orbit site and explain why a replaced download matters. **0:20–1:05** follow the commit to the archive, show one approval waiting, then get the second. **1:05–1:40** show the new live build and altered bytes being refused. **1:40–2:20** show revocation, matching bytes and South's refusal in the same view. **2:20–2:45** show where judges can repeat the check and open the receipts.
- Update the project description, video, cover, read-only demo URL, public MIT repository, relevant Diana addresses, kit selections, current test evidence and audit links. Use the README's first screen for the live staging link, three-check verifier and deployment/revocation receipts. Confirm the upload and links from a signed-out browser and update the live-chain evidence if addresses changed.
- **Done when** the submitted links show the same release as the final video and the official category requirements can each be traced to evidence. [Rules](https://build.qorechain.io/rules) · [Rubric and audit guidance](https://build.qorechain.io/faq) · [Current entry](https://build.qorechain.io/p/veylith)

The critical path is public build → verified install → repeatable refusal → submission proof. Start finding the reviewer and choosing the staging host in parallel. If the schedule slips, keep the CLI review, one archive format, one public staging site and the public evidence page. Defer wallet UX refinements, additional environments and new 3D scenes.
