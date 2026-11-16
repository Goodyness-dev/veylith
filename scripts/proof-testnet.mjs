import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {verify,createPublicKey} from 'node:crypto';
const base='http://127.0.0.1:5173',checks=[];
async function call(action,body={}){const r=await fetch(`${base}/api/${action}`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});const data=await r.json();if(!r.ok)throw new Error(data.error);return data.result;}
const check=(name,pass)=>{assert.equal(pass,true,name);checks.push({name,pass});console.log(JSON.stringify({name,pass}));};
const start=await fetch(`${base}/api/state`).then(r=>r.json());assert.equal(start.ready,true,'Live controller must be ready');
const approved=await call('authorize');check('Two-reviewer PQ release confirmed on Diana',/^0x[0-9a-f]{64}$/i.test(approved.hash));
for(const identity of ['north','south']){const report=await call('deploy',{identity});check(`${identity} process fetches and applies authorized bytes`,report.outcome==='applied');const {signature,publicKey,signatureAlgorithm,note,...payload}=report;check(`${identity} report signature verifies`,verify(null,Buffer.from(JSON.stringify(payload)),createPublicKey(publicKey),Buffer.from(signature,'base64')));}
await call('tamper',{enabled:true});const mismatch=await call('deploy',{identity:'north'});check('Replaced hosted bytes refused by independent agent',mismatch.outcome==='refused'&&mismatch.reason==='Artifact hash mismatch');
await call('tamper',{enabled:false});const replay=await call('deploy',{identity:'north'});check('Persistent sequence rejects repeated application',replay.outcome==='refused'&&replay.reason==='Sequence already applied');
const revoked=await call('revoke');const refusal=await call('deploy',{identity:'south'});check('PQ revocation stops further delivery',refusal.outcome==='refused'&&refusal.reason==='Release revoked');
const final=await fetch(`${base}/api/proof`).then(r=>r.json());check('Already applied configurations remain after revocation',final.applied.north.config.release==='1.0.0'&&final.applied.south.config.release==='1.0.0');
await fs.mkdir(new URL('../evidence/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidence/live-flow.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),controller:final.contract,checks,approved,revoked,final},null,2));
console.log(JSON.stringify({status:'passed',checks:checks.length,controller:final.contract}));
