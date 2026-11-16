// Read-only chain simulation: prepares a local approval but broadcasts no transaction.
import assert from 'node:assert/strict';
import {client,contract,accounts,signatures} from '../lib/chain.mjs';
const response=await fetch('http://127.0.0.1:5173/api/prepare',{method:'POST',headers:{origin:'http://127.0.0.1:5173','content-type':'application/json'},body:'{}'});
const body=await response.json();assert.equal(response.status,200,body.error);const p=body.result;
const request={...p.request};for(const field of ['sequence','deadline','policyEpoch'])request[field]=BigInt(request[field]);
const c=await contract(),reviewers=await accounts();
assert.equal(await client.readContract({address:c.address,abi:c.abi,functionName:'releaseDigest',args:[request]}),p.digest);
const approvals=[p.approval,...signatures(p.digest,[reviewers[1]])].sort((a,b)=>a.reviewer.toLowerCase().localeCompare(b.reviewer.toLowerCase()));
await client.simulateContract({address:c.address,abi:c.abi,functionName:'authorize',args:[request,approvals],account:reviewers[0].evm});
await assert.rejects(client.simulateContract({address:c.address,abi:c.abi,functionName:'authorize',args:[request,[p.approval]],account:reviewers[0].evm}),/InvalidSignature/);
console.log(JSON.stringify({preparedSequence:p.sequence,exactDigest:true,twoApprovalsAccepted:true,firstReviewerAloneRejected:true,broadcastTransactions:0}));
