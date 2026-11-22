import fs from 'node:fs/promises';
import { encodeDeployData, keccak256, toBytes } from 'viem';
import { accounts, client, close, evmWallet, nativeChain, readJson, window } from '../lib/chain.mjs';
import { PROJECT, ORBIT_STAGING } from '../lib/core.mjs';
import { relayAccount } from '../lib/relay.mjs';

const output = new URL('../evidence/orbit-staging-controller.json', import.meta.url);
try {
  await fs.access(output);
  throw new Error('Orbit staging controller is already recorded');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const { abi, bytecode } = await readJson(new URL('../artifacts/contracts/ReleaseController.sol/ReleaseController.json', import.meta.url));
const source = await fs.readFile(new URL('../contracts/ReleaseController.sol', import.meta.url), 'utf8');
const reviewers = (await accounts()).map(account => account.evm).sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
const relayer = await relayAccount();
const args = [PROJECT, ORBIT_STAGING, nativeChain, reviewers, 2n];
const gasPrice = await client.getGasPrice();
if (await client.getChainId() !== 9800) throw new Error('Expected Diana testnet');
const estimate = await client.estimateGas({ account: relayer.evm, data: encodeDeployData({ abi, bytecode, args }) });
const gas = estimate * 125n / 100n;
const nativeFeeReserve = 200_000_000_000_000_000n;
if (await client.getBalance({ address: relayer.evm }) < gas * gasPrice + nativeFeeReserve) {
  throw new Error('Diana relayer needs test QOR for deployment and native window fees');
}
await window(relayer);
try {
  const hash = await evmWallet(relayer).deployContract({ abi, bytecode, args, gas, gasPrice });
  console.log(JSON.stringify({ deploymentTransaction: hash }));
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 90_000 });
  if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('Staging controller deployment failed');
  const data = {
    address: receipt.contractAddress, transactionHash: hash, block: String(receipt.blockNumber),
    chainId: 9800, sourceHash: keccak256(toBytes(source)), project: PROJECT, environment: ORBIT_STAGING,
    reviewers, threshold: 2, custody: 'Both testnet reviewer keys held by the demo operator',
  };
  await fs.writeFile(output, JSON.stringify(data,null,2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(data));
} finally {
  await close(relayer);
}
