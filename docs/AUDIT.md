# ReleaseController audit record

**QCAI status:** Stage 1 report pending. Stage 2 follows disposition of all Stage 1 findings. The tests below document the security boundary exercised by the prototype.

## Deployment and audit input

- Contract [ReleaseController.sol](../contracts/ReleaseController.sol) at commit `d420449fafeeb49b2ea50ade39cb8ceadcd810ea`. The Solidity source last changed at `e02f1d4` before that commit.
- Compiler Solidity 0.8.30, optimizer enabled with 200 runs, EVM target Paris. See [the Hardhat configuration](../hardhat.config.cjs).
- Controller `0x9700232112bda62e79f20ceb862ed5e6182b9872` on Diana (chain ID `9800`). [Deployment transaction](https://dashboard.qorechain.io/explorer/tx/0xf1afd44694f743c2e87db1efcb42fe23c7e4bf292eeaed6eea0b00bcfc5d26e0)
- Deployment record stores the UTF-8 source's Keccak-256 hash `0xeb3f8be6a276c7849dc5d21056886e9d9661c60a340e07abd9d8325482480113`. The setup script checks this value before reusing a deployment. [Setup script](../scripts/setup-testnet.mjs)
- Audit setting **Ethereum (EVM/Solidity)** for both stages. QCAI currently reports EVM quantum readiness as “Not scored”. [Organizer FAQ](https://build.qorechain.io/faq)

## PQC design and tests

| Boundary | Runtime protection | Hardhat coverage |
| --- | --- | --- |
| `pqcKeyStatus` at `0x0A02` | `_key` requires a registered ML-DSA-87 key, possession proof and a 2,592-byte key. `_setPolicy` pins its Keccak-256 fingerprint and `_verify` rechecks the live key. | `fails closed on missing possession proof or changed registered key`, `fails closed when key registry is unavailable` |
| `pqcVerify` at `0x0A01` | `_verify` sends the registered key, fixed-length signature and chain-prefixed release digest. It requires distinct policy members and enforces the quorum. | `rejects a missing second reviewer`, `rejects duplicated reviewer signatures`, `fails closed on unavailable/short/false verification responses` |
| Request binding and freshness | `releaseDigest` binds chain, controller, project, environment, exact artifact and manifest hashes, sequence, deadline, epoch and revocation flag. Policy rotation uses its own domain and invalidates the prior authorization. | `rejects changed artifact and manifest bytes`, `rejects signatures from a different controller/environment`, `rejects replay and invalid epoch`, `rejects expired approvals`, `requires old quorum to rotate policy and invalidates existing release` |

Hardhat uses local precompile doubles. The [Diana walkthrough](../evidence/live-flow.json) exercises the real network precompiles and a separate scoped relayer. See [contract tests](../test/contracts/controller.cjs).

## QCAI reports and finding dispositions

After Stage 1, place the original dated PDF under `docs/audit/`. Record each report finding by ID and severity, cite the affected source, and link its fix, named regression test or rationale. Run Stage 2 only after every finding has a disposition. Save its dated PDF in the same directory and record any residual findings. If contract code changes, record the audited commit and the matching live deployment before changing the submission's controller details.

| Stage | Report | Source |
| --- | --- | --- |
| 1 | Pending | `d420449fafeeb49b2ea50ade39cb8ceadcd810ea` |
| 2 | Pending Stage 1 response | To be recorded |
