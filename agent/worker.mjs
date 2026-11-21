import fs from 'node:fs/promises';import path from 'node:path';import {generateKeyPairSync,sign,createPrivateKey,createPublicKey} from 'node:crypto';
import {applyRelease} from './core.mjs';import {authorization} from '../lib/chain.mjs';import {PROJECT,ENVIRONMENT,publicJson} from '../lib/core.mjs';import {agentDirectory} from '../lib/agent-state.mjs';
const identity=process.env.VEYLITH_AGENT_ID;if(!['north','south'].includes(identity))throw new Error('Unknown agent');
const directory=agentDirectory(identity);await fs.mkdir(directory,{recursive:true});
const keyPath=path.join(directory,'report-key.pem');let privateKey;
try{privateKey=createPrivateKey(await fs.readFile(keyPath));}catch(e){if(e.code!=='ENOENT')throw e;const pair=generateKeyPairSync('ed25519');privateKey=pair.privateKey;await fs.writeFile(keyPath,privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});}
const publicKey=createPublicKey(privateKey).export({type:'spki',format:'pem'});
async function limitedFetch(suffix){const res=await fetch(`http://127.0.0.1:${process.env.VEYLITH_PORT}/artifacts/${suffix}`,{signal:AbortSignal.timeout(15000)});if(!res.ok)throw new Error('Artifact host unavailable');let size=0;const chunks=[];for await(const chunk of res.body){size+=chunk.length;if(size>65536)throw new Error('Artifact too large');chunks.push(chunk);}return Buffer.concat(chunks);}
let busy=false;
process.on('message',async message=>{if(message.type!=='deploy')return;if(busy){process.send({id:message.id,error:'Agent busy'});return;}busy=true;
try{const state=await applyRelease({directory,identity,project:PROJECT,environment:ENVIRONMENT,fetchArtifact:()=>limitedFetch('release.json'),fetchManifest:()=>limitedFetch('manifest.json'),readAuthorization:authorization,now:()=>Math.floor(Date.now()/1000)});const payload=publicJson({identity,outcome:'applied',...state});const report={...JSON.parse(payload),signature:sign(null,Buffer.from(payload),privateKey).toString('base64'),publicKey,signatureAlgorithm:'Ed25519',note:'Signed agent report, not remote attestation'};process.send({id:message.id,report});}
catch(e){process.send({id:message.id,report:{identity,outcome:'refused',reason:e.message,expected:e.expected,observed:e.observed,at:new Date().toISOString()}});}finally{busy=false;}});
