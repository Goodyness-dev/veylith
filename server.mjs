import http from 'node:http';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {fork} from 'node:child_process';import {randomUUID} from 'node:crypto';import {createServer as createViteServer} from 'vite';import {keccak256} from 'viem';
import {client,contract,accounts,authorization,window,close,evmWallet,signatures,local,readJson} from './lib/chain.mjs';import {bundle,manifestFor,encodeManifest,publicJson} from './lib/core.mjs';
const port=Number(process.env.PORT??5173);const vite=await createViteServer({server:{middlewareMode:true,fs:{strict:true,allow:[fileURLToPath(new URL('./',import.meta.url))],deny:['.env','.env.*','**/.git/**','**/.local/**','**/*.{crt,pem,key}']}},appType:'spa'});
await fs.mkdir(local,{recursive:true});const manifest=encodeManifest(manifestFor());let tampered=false,busy=false,lastError=null;
let proposal=null,progress={stage:'idle',message:'Ready for your review',reviewerCount:0};
function step(stage,message,extra={}){progress={...progress,stage,message,...extra};}
async function prepareRelease(){
 const c=await contract(),reviewers=await accounts(),state=await authorization(),block=await client.getBlock();
 const sequence=BigInt(await client.readContract({address:c.address,abi:c.abi,functionName:'sequence'}))+1n;
 if(proposal&&proposal.request.sequence===sequence&&proposal.request.policyEpoch===BigInt(state.currentPolicyEpoch)&&proposal.request.deadline>block.timestamp+60n)return {reviewer:reviewers[0].evm,digest:proposal.digest,sequence:String(sequence),approved:true,request:proposal.request,approval:proposal.first};
 const request={artifactHash:keccak256(bundle),manifestHash:keccak256(manifest),sequence,deadline:block.timestamp+7200n,policyEpoch:BigInt(state.currentPolicyEpoch),revoked:false};
 const digest=await client.readContract({address:c.address,abi:c.abi,functionName:'releaseDigest',args:[request]});
 proposal={request,digest,first:signatures(digest,[reviewers[0]])[0]};step('prepared','Release maintainer approved. Your review is next.',{reviewerCount:1,sequence:String(sequence)});
 return {reviewer:reviewers[0].evm,digest,sequence:String(sequence),approved:true,request,approval:proposal.first};
}
let transactions=[];try{transactions=await readJson(new URL('transactions.json',local));}catch(e){if(e.code!=='ENOENT')throw e;}
const reports={},agents=new Map(),pending=new Map();
for(const identity of ['north','south']){const worker=fork(new URL('./agent/worker.mjs',import.meta.url),[],{env:{...process.env,VEYLITH_AGENT_ID:identity,VEYLITH_PORT:String(port)},stdio:['ignore','inherit','inherit','ipc']});agents.set(identity,worker);worker.on('message',m=>{const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(new Error(m.error));else{reports[identity]=m.report;p.resolve(m.report);}});worker.on('exit',()=>{reports[identity]={identity,outcome:'offline',reason:'Agent process stopped'};});}
async function deploy(identity){step('downloading',`${identity} is downloading and verifying the exact app release`,{agent:identity});const worker=agents.get(identity);if(!worker?.connected)throw new Error('Agent unavailable');const result=await new Promise((resolve,reject)=>{const id=randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Agent response timed out'));},90000);pending.set(id,{resolve,reject,timer});worker.send({type:'deploy',id});});step(result.outcome==='applied'?'applied':'refused',result.outcome==='applied'?`${identity} verified and installed the release`:result.reason,{agent:identity});return result;}
function json(res,status,data){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(publicJson(data));}
async function writeRelease(revoked){const c=await contract(),reviewers=await accounts();const state=await authorization();if(revoked&&state.sequence==='0')throw new Error('No release to revoke');
const block=await client.getBlock();const request={artifactHash:revoked?state.artifactHash:keccak256(bundle),manifestHash:revoked?state.manifestHash:keccak256(manifest),sequence:BigInt(await client.readContract({address:c.address,abi:c.abi,functionName:'sequence'}))+1n,deadline:block.timestamp+7200n,policyEpoch:BigInt(state.currentPolicyEpoch),revoked};
let digest,approvals;
if(!revoked){await prepareRelease();Object.assign(request,proposal.request);digest=proposal.digest;step('signing','You are signing as the second local demo reviewer',{reviewerCount:1});approvals=[proposal.first,...signatures(digest,[reviewers[1]])].sort((a,b)=>a.reviewer.toLowerCase().localeCompare(b.reviewer.toLowerCase()));}
else {digest=await client.readContract({address:c.address,abi:c.abi,functionName:'releaseDigest',args:[request]});approvals=signatures(digest,reviewers);}
step('checking','Checking both post-quantum approvals against the contract',{reviewerCount:2});
await client.simulateContract({address:c.address,abi:c.abi,functionName:'authorize',args:[request,approvals],account:reviewers[0].evm});
step('window','Opening a scoped transaction window');await window(reviewers[0],c.address);
try{step('submitting','Sending the signed release to Diana');const hash=await evmWallet(reviewers[0]).writeContract({address:c.address,abi:c.abi,functionName:'authorize',args:[request,approvals],gas:3500000n,gasPrice:await client.getGasPrice()});step('confirming','Diana is confirming the transaction',{hash});const receipt=await client.waitForTransactionReceipt({hash,timeout:90000});if(receipt.status!=='success')throw new Error('Authorization reverted');const item={action:revoked?'revoked':'authorized',hash,digest,sequence:String(request.sequence),block:String(receipt.blockNumber),at:new Date().toISOString()};transactions.push(item);await fs.writeFile(new URL('transactions.json',local),publicJson(transactions));proposal=null;step('confirmed',revoked?'Permission revoked on-chain':'Both approvals verified. App release authorized.',{block:String(receipt.blockNumber)});return item;
}finally{await close(reviewers[0]);}}
async function state(){let deployment,chain,error;try{deployment=await contract();chain=await authorization();}catch(e){error=e.shortMessage??e.message;}
const applied={};for(const id of ['north','south'])try{applied[id]=await readJson(new URL(`agents/${id}/applied.json`,local));}catch(e){if(e.code!=='ENOENT')throw e;}
return {mode:'Live Diana · local demo signers',ready:!!chain,chain,error,lastError,busy,tampered,artifactHash:keccak256(bundle),observedHash:keccak256(tampered?Buffer.from('{"release":"9.9.9","banner":"Substituted bytes","accent":"#ef6b5c"}\n'):bundle),manifest:manifestFor(),manifestHash:keccak256(manifest),contract:deployment?.address,reviewers:deployment?.reviewers,threshold:deployment?.threshold,reports,applied,transactions};}
const server=http.createServer(async(req,res)=>{
const host=req.headers.host;const allowedHost=host===`127.0.0.1:${port}`||host===`localhost:${port}`;if(!allowedHost){res.writeHead(403);return res.end('Local host required');}
const url=new URL(req.url,`http://${host}`);
try{
if(url.pathname.startsWith('/artifacts/')){if(req.method!=='GET')return json(res,405,{error:'GET required'});res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json');if(url.pathname==='/artifacts/manifest.json')return res.end(manifest);if(url.pathname==='/artifacts/release.json')return res.end(tampered?'{"release":"9.9.9","banner":"Substituted bytes","accent":"#ef6b5c"}\n':bundle);return json(res,404,{error:'Artifact not found'});}
if(!url.pathname.startsWith('/api/'))return vite.middlewares(req,res);
if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,await state());
if(req.method==='GET'&&url.pathname==='/api/progress')return json(res,200,progress);
if(req.method==='GET'&&url.pathname==='/api/proof')return json(res,200,await state());
if(req.method!=='POST')return json(res,405,{error:'POST required'});
if(req.headers.origin!==`http://${host}`||req.headers['content-type']!=='application/json')return json(res,403,{error:'Same-origin JSON request required'});
if(busy)return json(res,409,{error:'An operation is already running'});
let size=0,parts=[];for await(const part of req){size+=part.length;if(size>4096)return json(res,413,{error:'Request too large'});parts.push(part);}const body=JSON.parse(Buffer.concat(parts).toString()||'{}');
busy=true;lastError=null;
try{let result;if(url.pathname==='/api/prepare')result=await prepareRelease();else if(url.pathname==='/api/authorize')result=await writeRelease(false);else if(url.pathname==='/api/revoke')result=await writeRelease(true);else if(url.pathname==='/api/tamper'){if(typeof body.enabled!=='boolean')throw new Error('Choose enabled boolean');tampered=body.enabled;result={tampered};}else if(url.pathname==='/api/deploy'){if(!['north','south'].includes(body.identity))throw new Error('Unknown deployment agent');result=await deploy(body.identity);}else return json(res,404,{error:'Unknown operation'});json(res,200,{result});}finally{busy=false;}
}catch(e){lastError=(e.shortMessage??e.message).slice(0,600);step('error',lastError);json(res,503,{error:lastError});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Veylith Local: http://127.0.0.1:${port}`));
async function stop(){for(const worker of agents.values())worker.kill();await vite.close();server.close();process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);
