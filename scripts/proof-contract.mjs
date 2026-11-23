import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { encodeDeployData, getAddress, keccak256, toBytes } from 'viem';
import { dianaReadClient } from '../lib/public-state.mjs';

const sourceName = 'contracts/ReleaseController.sol';
const artifactDirectory = new URL(`../artifacts/${sourceName}/`, import.meta.url);
const readJson = async url => JSON.parse(await fs.readFile(url, 'utf8'));

async function verify() {
  const [deployment, artifact, debug] = await Promise.all([
    readJson(new URL('../evidence/orbit-staging-controller.json', import.meta.url)),
    readJson(new URL('ReleaseController.json', artifactDirectory)),
    readJson(new URL('ReleaseController.dbg.json', artifactDirectory)),
  ]);
  const build = await readJson(new URL(debug.buildInfo, artifactDirectory));
  const { compiler } = deployment;
  const { optimizer, evmVersion } = build.input.settings;
  assert.equal(build.solcLongVersion.split('.Emscripten')[0], compiler.version, 'Compiler build changed');
  assert.equal(optimizer.enabled, compiler.optimizerEnabled, 'Compiler optimizer setting changed');
  assert.equal(optimizer.runs, compiler.optimizerRuns, 'Compiler optimizer runs changed');
  assert.equal(evmVersion, compiler.evmVersion, 'EVM target changed');
  assert.equal(keccak256(toBytes(build.input.sources[sourceName].content)), deployment.sourceHash, 'Compiled source differs from the audited source hash');
  assert.equal(artifact.bytecode, '0x' + build.output.contracts[sourceName].ReleaseController.evm.bytecode.object, 'Artifact differs from the compiler output');

  const creationInput = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [deployment.project, deployment.environment, deployment.nativeChain, deployment.reviewers, BigInt(deployment.threshold)],
  });
  const [chainId, transaction, receipt] = await Promise.all([
    dianaReadClient.getChainId(),
    dianaReadClient.getTransaction({ hash: deployment.transactionHash }),
    dianaReadClient.getTransactionReceipt({ hash: deployment.transactionHash }),
  ]);
  assert.equal(chainId, deployment.chainId, 'Unexpected RPC chain');
  assert.equal(transaction.to, null, 'Expected a contract creation transaction');
  assert.ok(transaction.input.toLowerCase() === creationInput.toLowerCase(), 'Diana creation input differs from the rebuilt bytecode and constructor arguments');
  assert.equal(receipt.status, 'success', 'Diana deployment failed');
  assert.ok(receipt.contractAddress && getAddress(receipt.contractAddress) === getAddress(deployment.address), 'Receipt created a different controller');
  assert.equal(receipt.blockNumber, BigInt(deployment.block), 'Unexpected deployment block');
  console.log(`Audited source revision: ${deployment.sourceRevision}`);
  console.log(`Compiled source Keccak-256: ${deployment.sourceHash}`);
  console.log(`Compiler: Solidity ${compiler.version}, optimizer ${compiler.optimizerRuns} runs, EVM ${compiler.evmVersion}`);
  console.log(`Rebuilt creation input matches Diana transaction ${deployment.transactionHash}`);
  console.log(`Successful receipt created ${deployment.address} at block ${deployment.block}`);
}

try {
  await verify();
} catch (error) {
  console.error(`Contract proof failed: ${error.shortMessage ?? error.message}`);
  process.exitCode = 1;
}
