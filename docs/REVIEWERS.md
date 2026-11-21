# Exchange approvals without sharing keys

One person holds two separate registered reviewer identities in the solo testnet demo. Diana enforces a quorum of two keys. For separation of duties, put one identity on each reviewer's device and deploy a separate Diana controller with their registered public addresses. The existing drill controller uses the solo reviewer set.

## Run the workflow

Compile the ABI with `npm run test:contracts`. Exchange the release artifact, manifest, request and resulting approval files. Each reviewer supplies a private, local identity file with a `mnemonic` field for a disposable Diana identity. Keep identity files in ignored local directories. Each device keeps its own file.

1. The release owner creates a request for the known controller. The command reads network state, binds the artifact and manifest and creates an approval request with the next sequence and a two-hour deadline.

   ```sh
   node scripts/review-release.mjs propose CONTROLLER release.json manifest.json request.json
   ```

2. Independently confirm the expected controller, environment and catalog. Run `inspect` to check the request against Diana, recompute both fingerprints locally and see the exact decoded configuration. Run `sign` after approving those bytes.

   ```sh
   node scripts/review-release.mjs inspect request.json release.json manifest.json
   node scripts/review-release.mjs sign request.json release.json manifest.json .local/my-reviewer.json approval-1.json
   ```

   The other reviewer signs the same request on their device and returns `approval-2.json`. Each output contains the public reviewer address, request digest and ML-DSA-87 signature.

3. On the relayer machine, use `check` with one approval and then both. The one-approval simulation reverts with `InvalidSignature`. Two valid signatures from distinct current reviewers pass. The dedicated Diana relayer can then submit the exact request through a scoped EVM window.

   ```sh
   node scripts/review-release.mjs check request.json approval-1.json
   node scripts/review-release.mjs check request.json approval-1.json approval-2.json
   node scripts/review-release.mjs submit request.json approval-1.json approval-2.json
   ```

If the sequence advances, the policy changes or the deadline passes, create and review a new request. The approval CLI uses QoreSign with local identities.

## Verified on Diana

On 21 November 2026, the solo test verified that the deployed controller refused one approval and accepted two file-based approvals in live contract simulation. Both signatures covered digest `0x2c291a146318227edf4ed161d28f5ddc730ef3616b02c94934950a767331ae34` from the two reviewer addresses listed in the README, with the dedicated relayer as the caller.
