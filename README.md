# Veylith

**The release you approved. The bytes they receive.**

Veylith is an exact-release authorization prototype for QoreChain's Build Before Q-Day fest. Two reviewers approve a fingerprint of an artifact and its manifest using ML-DSA-87. A Solidity controller verifies the approvals on Diana. Two independent local deployment-agent processes fetch the hosted bytes, check current chain authorization and apply only the approved configuration.

**Status:** functional testnet/local prototype; unaudited. Category: Post-Quantum dApp. The visuals explain real operations, while the application and reviewer identities are intentionally small demo fixtures.

## What works

- A live two-reviewer controller uses QoreChain `pqcVerify` and `pqcKeyStatus`, requiring registered keys with proof of possession.
- Approvals bind chain, controller, project, environment, artifact, manifest, sequence, expiry and policy epoch. Policy rotation requires the old quorum and invalidates the previous release.
- SDK hybrid native transactions open bounded EVM windows for the deployed target, then explicitly close them.
- Two separate Node processes download a bounded JSON configuration and manifest from the local HTTP artifact host, verify authorization and bytes, persist anti-replay state and apply atomically.
- An interactive React workbench shows actual local application state, agent refusals and public transaction evidence. Agent success reports use Ed25519 signatures; these are not PQ receipts or remote attestation.
- 13 Hardhat contract tests and 10 agent tests pass. The live end-to-end walkthrough passed 9 checks; see [public evidence](evidence/live-flow.json).

## What is still unfinished

QoreX browser-based arbitrary-message PQ signing; authenticated QoreSeal reviewer packets in the application; hosted public demo; the event-required two-stage QCAI audit; independent review of security claims; final cover/video and project-page completion. The installed QoreSeal package is not evidence of completed app integration. Contract tests use mock precompiles locally; the live proof separately exercises real Diana precompiles.

## Public testnet deployment

Network: `qorechain-diana` (EVM chain ID 9800).

| Item | Identifier |
|---|---|
| Release controller | `0x9700232112bda62e79f20ceb862ed5e6182b9872` |
| Maintainer native address | `qor1p2nf2u4kpp2smxuuruqr959z3eeapmlkncxlkr` |
| Maintainer EVM twin | `0x0Aa69572B608550D9b9C1f0032D0A28e73D0eFF6` |
| Security-reviewer native address | `qor16ym4tg4wq837unfa3rlkwv2u29szduvjwlrnuq` |
| Deploy transaction | `0xf1afd44694f743c2e87db1efcb42fe23c7e4bf292eeaed6eea0b00bcfc5d26e0` |
| Proven release authorization | `0x7135333fce5bb89f066ecd6bd1c3af04bc6f523bb4ec766ff0d6c3ba9cccc434` |
| Proven revocation | `0xe3c6a5bdc92da3b0c20d1c0d35ec6951f850c62a18e543d63af8e9f50020e512` |

The proof ends with the release revoked. Already applied demo configurations remain applied. This is expected behavior, not rollback.

## Run locally

Node.js 24 and npm were used for verification. Install and run the public checks:

```sh
npm ci --ignore-scripts
npm test
npm run build
```

The application runs with:

```sh
npm run dev
```

Open `http://127.0.0.1:5173`. Without local test identities/deployment state, the UI holds deployments and reports that live setup is unavailable. The public repository contains no signing secrets.

### Testnet identities and deployment

For the original workspace, `npm run setup:testnet` reads the already generated disposable account from the neighboring research workspace, prepares a second local demo reviewer, registers both PQ keys, and deploys the controller. It intentionally refuses to overwrite a deployment if its source hash changes.

For a standalone clone, generate two disposable funded Diana identities on your own machine and place only their mnemonic fields in ignored `.local/reviewers.json` as a JSON array of two objects. Run setup after compiling with `npm run test:contracts`; the helper reuses these local identities. Never commit that file. Registration/deployment consumes test QOR only. The local demo server signs on behalf of these two identities when an action is requested; this is a demonstration convenience, not a production custody design.

The server binds to loopback, restricts write requests to same-origin JSON and denies HTTP access to local signing files. Do not expose this signer server through a public tunnel. A public demo needs an independent wallet/signing design.

With the local server running, `npm run proof:testnet` submits testnet authorization and revocation transactions and runs both agents. It overwrites the public walkthrough evidence with the new result. Do not use a pre-drill proof as the transaction required during the actual drill window.

## Architecture

`contracts/ReleaseController.sol` is the authority boundary. `lib/chain.mjs` contains SDK/QoreSign/native-window integration. `agent/core.mjs` implements verification and atomic application. `agent/worker.mjs` runs each independent agent. `server.mjs` hosts demo artifacts, manages the processes and local signer actions. `src/` is the visual workbench. `evidence/` contains public results only.

The test doubles under `contracts/test/` exist solely for Hardhat error-path testing; none is deployed to Diana. The live key-status interface decodes possession proof explicitly because the pinned EVM package's ABI has only three outputs.

## Threat model and limits

The demo assumes a classical publishing/relayer key or artifact host can be compromised while the required PQ reviewer quorum remains uncompromised. Approvals authenticate permission for bytes; they do not prove the software is safe. A compromised reviewer quorum can authorize malicious content. An agent must actually enforce the checks; another pipeline can ignore them. The controlled payload changes a JSON configuration, not a container image or arbitrary program.

Agents check fresh observed chain state and recheck before application. There remains a race between the final chain observation and the local write; this prototype does not provide atomic transactions across a blockchain and filesystem, remote attestation or a formal finality guarantee. A crashed agent may leave a lock requiring operator inspection. Revocation stops future applications observed after revocation; it cannot undo prior deployment or erase previously decrypted data.

The official Q-Day Drill is external testing. Enrollment and survival have not been established by the local proof. The disposable classical key is submitted only through the official drill form; neither mnemonic nor PQ secret belongs there.

## Credits and original work

Built with QoreChain SDK/EVM 0.14.0 and QoreSign 0.2.0, viem, React, Vite, Solidity/solc, Hardhat and ethers. Fonts are locally bundled from Fontsource: DM Sans, Playfair Display and IBM Plex Mono; their upstream font licences are included in the installed packages. QoreSeal 0.1.0 was evaluated separately; app integration remains pending.

Research inspiration: [Sthylé](https://dorahacks.io/build/23836) for artifact lineage and [ShadowPool](https://dorahacks.io/build/38991) for exact request-to-execution binding. No code from those projects was copied. Related QoreChain entries include The Record, QoreWitness, Sealed Disclosure, LatticeWard, Fenestella and Q-Day Readiness Audit. Our intended distinction is the enforced release-to-deployment workflow; worldwide novelty is not claimed.

See [AI_USAGE.md](AI_USAGE.md) for the AI-assisted workflow. Original project source is released under the [MIT licence](LICENSE).
