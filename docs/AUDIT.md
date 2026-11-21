# ReleaseController audit record

**QCAI status.** Both runs were exported on 21 November 2026 in the Ethereum EVM/Solidity setting. Each scored the contract 65/100, rated it High, and listed six findings. The Stage 1 dispositions and Stage 2 follow-up are below.

**Critical finding checked on Diana.** At block `10493964`, the deployed controller required two approvals for policy rotation. An unrelated relayer simulated the same proposed policy at the next sequence. Zero and one valid approvals each reverted with `InvalidSignature`. Two distinct ML-DSA-87 approvals succeeded in simulation. Both keys were held by the solo demo operator. The calls were pinned to the same block and no transaction was broadcast.

## Deployment and audit input

- Contract [ReleaseController.sol](../contracts/ReleaseController.sol) at commit `d420449fafeeb49b2ea50ade39cb8ceadcd810ea`. The Solidity source last changed at `e02f1d4` before that commit.
- Compiler Solidity 0.8.30, optimizer enabled with 200 runs, EVM target Paris. See [the Hardhat configuration](../hardhat.config.cjs).
- Controller `0x9700232112bda62e79f20ceb862ed5e6182b9872` on Diana (chain ID `9800`). [Deployment transaction](https://dashboard.qorechain.io/explorer/tx/0xf1afd44694f743c2e87db1efcb42fe23c7e4bf292eeaed6eea0b00bcfc5d26e0)
- Deployment record stores the UTF-8 source's Keccak-256 hash `0xeb3f8be6a276c7849dc5d21056886e9d9661c60a340e07abd9d8325482480113`. The setup script checks this value before reusing a deployment. [Setup script](../scripts/setup-testnet.mjs)
- On 21 November 2026, the current source matched the recorded hash. The locally compiled creation bytecode plus the ABI-encoded constructor arguments matched the full successful Diana deployment transaction input at block `10189663`. The walkthrough's authorization and revocation receipts also emitted the recorded digest, sequence, artifact fingerprint and revocation flag.
- Audit setting **Ethereum (EVM/Solidity)** for both stages. QCAI currently reports EVM quantum readiness as “Not scored”. [Organizer FAQ](https://build.qorechain.io/faq)

## PQC design and tests

| Boundary | Runtime protection | Hardhat coverage |
| --- | --- | --- |
| `pqcKeyStatus` at `0x0A02` | `_key` requires a registered ML-DSA-87 key, possession proof and a 2,592-byte key. `_setPolicy` pins its Keccak-256 fingerprint and `_verify` rechecks the live key. | `fails closed on missing possession proof or changed registered key`, `fails closed when key registry is unavailable` |
| `pqcVerify` at `0x0A01` | `_verify` sends the registered key, fixed-length signature and chain-prefixed release digest. It requires distinct policy members and enforces the quorum. | `rejects a missing second reviewer`, `rejects duplicated reviewer signatures`, `fails closed on unavailable/short/false verification responses` |
| Request binding and freshness | `releaseDigest` binds chain, controller, project, environment, exact artifact and manifest hashes, sequence, deadline, epoch and revocation flag. Policy rotation uses its own domain and invalidates the prior authorization. | `rejects changed artifact and manifest bytes`, `rejects signatures from a different controller/environment`, `rejects replay and invalid epoch`, `rejects expired approvals`, `requires old quorum to rotate policy and invalidates existing release` |

Hardhat uses local precompile doubles. The [Diana walkthrough](../evidence/live-flow.json) exercises the real network precompiles and a separate scoped relayer. See [contract tests](../test/contracts/controller.cjs).

## QCAI reports and finding dispositions

| Stage | Report | Source |
| --- | --- | --- |
| 1 | [21 November 2026, original QCAI export](audit/2026-11-21-stage-1-qcai.pdf) | `ReleaseController.sol` from `d420449fafeeb49b2ea50ade39cb8ceadcd810ea` |
| 2 | [21 November 2026, original QCAI export](audit/2026-11-21-stage-2-qcai.pdf) | Same Solidity file, audit setting and Diana deployment |

Both PDFs identify the Ethereum audit setting and the contract through their findings. The exports omit the source hash. The deployment verification above ties the designated input revision to the live controller.

| Stage 1 finding | Disposition and verification |
| --- | --- |
| 1. **Critical** · Missing Access Control on Policy Change | Access is enforced by the existing post-quantum quorum. `rotatePolicy` calls `_verify(policyDigest(...), approvals)` before changing policy. That digest binds the proposed reviewer set, quorum, next sequence, deadline, current epoch and controller. Any relayer may submit the exact approved request. The regression `requires current policy approvals for the exact rotation even from a reviewer address` checks insufficient, wrong-purpose and changed-policy approvals and unchanged state after rejection. |
| 2. **High** · Potential Overflow in Threshold Calculation | `_setPolicy` validates `1 <= quorum <= next.length <= 5` before assigning the supplied quorum. The assignment does no arithmetic on it. The regression `rejects out-of-range quorum and reviewer counts even with authentic rotation approvals` checks zero, a quorum above the reviewer count, the maximum unsigned integer and a six-member list. |
| 3. **High** · Unchecked Return Values from External Calls | Both precompile calls check the success flag and return size before decoding. `_key` checks registration, algorithm, proof of possession and public-key length. `_verify` requires a decoded true value and compares the registered key with the pinned fingerprint. Invalid ABI data reverts during decoding. Existing regressions cover failed calls, a short verification response, a false verification result, missing proof and a changed registered key. The real precompiles are trusted chain components and were exercised by the live Diana walkthrough. |
| 4. **Medium** · Potential Front-Running Vulnerability | The deadline is an expiry cutoff. The request requires the next sequence, and the signatures bind the entire action. A different relayer can submit only the same signed intent, with no sender benefit in the controller. The regression `lets a different relayer execute the exact signed intent only once` confirms the signed artifact and manifest are preserved and the duplicate is rejected. This design permits relayer competition and does not give a guarantee against censorship or ordering between separately authorized requests. |
| 5. **Medium** · Unbounded Loop in Reviewer Validation | A policy allows at most five reviewers. `_verify` rejects approvals beyond that policy size before the loop, and each address must be strictly greater than the previous address. The tests `rejects approvals beyond the configured reviewer count`, `rejects duplicated reviewer signatures`, and the policy-bounds regression above cover the relevant limits. |
| 6. **Low** · No ERC Compliance Indication | The controller is an application-specific release authorization contract. It implements no ERC token or interface standard and makes no ERC compliance claim. This is now documented in the README. |

## Stage 2 follow-up

The response added regression coverage and documentation while keeping the deployed Solidity byte-for-byte unchanged. Stage 2 retained the same severity distribution and overall score. It reframed two findings, addressed here. [Organizer FAQ](https://build.qorechain.io/faq)

| Stage 2 finding | Follow-up |
| --- | --- |
| Critical · Missing Access Control on Policy Change | Stage 1 finding 1 applies. The existing reviewer quorum authorizes rotation. Tests cover rejection with missing or changed approvals. |
| High · Potential Overflow in Sequence Management | This run flags the sequence counter where Stage 1 flagged the threshold. Solidity 0.8.30 checks `sequence + 1` and `policyEpoch++`. Neither expression is in an `unchecked` block, so overflow reverts. The next sequence must be exactly one greater than current state. Reaching the maximum would prevent further increments. |
| High · Unchecked Delegatecall Results | The flagged paths use `staticcall` to the two fixed Diana precompile addresses. Stage 1 finding 3 describes the return checks and failure-path tests. There is no `delegatecall` in ReleaseController. |
| Medium · Potential Front-Running Vulnerability | Stage 1 finding 4 applies. Submitting the same signed intent from another account cannot change its contents or execute it twice. The documented ordering and censorship limits still apply. |
| Medium · Unbounded Loop in Reviewer Validation | Stage 1 finding 5 applies. Policy size and approvals per transaction are both bounded by the controller. |
| Low · Missing ERC Standards Compliance | Stage 1 finding 6 applies. ReleaseController implements a project-specific authorization protocol and claims no ERC compliance. |

The QCAI High rating remains in both original reports. These exports record the organizer's automated review.
