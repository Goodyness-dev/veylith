import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {fetchEvmWindow} from '@qorechain/sdk';import {keccak256} from 'viem';
import {client,contract,accounts,authorization,signatures,evmWallet,REST} from '../lib/chain.mjs';import {relayAccount,relayRelease} from '../lib/relay.mjs';import {bundle,manifestFor,encodeManifest} from '../lib/core.mjs';
const [drill,second]=await accounts(),relayer=await relayAccount(),c=await contract();
assert.notEqual(relayer.evm.toLowerCase(),drill.evm.toLowerCase());
const reviewers=await client.readContract({address:c.address,abi:c.abi,functionName:'getReviewers'});assert.equal(reviewers.some(a=>a.toLowerCase()===relayer.evm.toLowerCase()),false);
const readWindow=address=>fetchEvmWindow({rest:REST,address});
const before=await readWindow(drill.cosmos);assert.equal(before.live,false,'Drill window must be closed');
let rejected=false;
try{const hash=await evmWallet(drill).sendTransaction({to:drill.evm,value:0n,gas:21000n,gasPrice:await client.getGasPrice()});throw new Error('Unexpected classical-only transaction accepted: '+hash);}catch(e){if(!/no open EVM authorisation window/i.test(e.details??e.message))throw e;rejected=true;}
const state=await authorization(),block=await client.getBlock();const request={artifactHash:keccak256(bundle),manifestHash:keccak256(encodeManifest(manifestFor())),sequence:BigInt(await client.readContract({address:c.address,abi:c.abi,functionName:'sequence'}))+1n,deadline:block.timestamp+7200n,policyEpoch:BigInt(state.currentPolicyEpoch),revoked:false};
const digest=await client.readContract({address:c.address,abi:c.abi,functionName:'releaseDigest',args:[request]});
const result=await relayRelease({controller:c,request,approvals:signatures(digest,[drill,second]),step:(stage,message)=>console.log(JSON.stringify({stage,message}))});
const [after,relayAfter]=await Promise.all([readWindow(drill.cosmos),readWindow(relayer.cosmos)]);assert.equal(after.live,false);assert.equal(relayAfter.live,false);assert.equal((await authorization()).sequence,String(request.sequence));
const report={checkedAt:new Date().toISOString(),controller:c.address,relayer:result.relayer,sequence:String(request.sequence),hash:result.hash,bounds:result.bounds,checks:{relayerHasNoReviewerRole:true,classicalOnlyDrillTransactionRejected:rejected,validTwoReviewerReleaseAccepted:true,drillWindowClosedBefore:true,drillWindowClosedAfter:true,relayWindowClosedAfter:true},scope:'Self-rehearsal, not the official Q-Day Drill. Windows were sampled before and after; runtime never opens the drill account window.'};
await fs.mkdir(new URL('../evidence/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidence/relayer-proof.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
