import fs from 'node:fs/promises';
import path from 'node:path';
import {keccak256} from 'viem';
import {configurationOf} from '../lib/core.mjs';
import {archiveFormat,readOrbitArchive} from '../lib/orbit-archive.mjs';

export async function applyRelease({directory,identity,project,environment,fetchArtifact,fetchManifest,readAuthorization,now}){
 await fs.mkdir(directory,{recursive:true});const lock=path.join(directory,'.applying');
 try{await fs.mkdir(lock);}catch(e){if(e.code==='EEXIST')throw new Error('Another deployment is in progress');throw e;}
 let staged;
 let activated=false;
 try{
  const observed=await readAuthorization();
  const validate=a=>{if(a.project!==project||a.environment!==environment)throw new Error('Wrong project or environment');if(BigInt(a.sequence)===0n)throw new Error('No authorized release');if(a.revoked)throw new Error('Release revoked');if(BigInt(a.deadline)<=BigInt(now()))throw new Error('Approval expired');if(a.policyEpoch!==a.currentPolicyEpoch)throw new Error('Policy changed');};
  validate(observed);
  const manifestBytes=await fetchManifest();
  if(keccak256(manifestBytes)!==observed.manifestHash)throw new Error('Manifest hash mismatch');
  const manifest=JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
  if(!['veylith-release-v1',archiveFormat].includes(manifest.format)||manifest.project!==project||manifest.environment!==environment||manifest.artifactHash!==observed.artifactHash)throw new Error('Manifest target mismatch');
  const bytes=await fetchArtifact();const actual=keccak256(bytes);
  if(actual!==observed.artifactHash)throw Object.assign(new Error('Artifact hash mismatch'),{expected:observed.artifactHash,observed:actual});
  const statePath=path.join(directory,'applied.json');
  let prior;try{prior=JSON.parse(await fs.readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(prior&&BigInt(prior.sequence)>=BigInt(observed.sequence))throw new Error('Sequence already applied');
  let installed;
  if(manifest.format===archiveFormat){
   const {files,build}=await readOrbitArchive(bytes,manifest);
   const versions=path.join(directory,'versions');
   await fs.mkdir(versions,{recursive:true});
   staged=await fs.mkdtemp(path.join(versions,'orbit-'));
   for(const [name,data] of files)await fs.writeFile(path.join(staged,name),data,{flag:'wx'});
   await fs.access(path.join(staged,'index.html'));
   installed={build,releaseDirectory:path.basename(staged)};
  }else{
   const config=configurationOf(bytes);
   if(config.release!==manifest.version)throw new Error('Manifest version mismatch');
   installed={config};
  }
  const fresh=await readAuthorization();validate(fresh);
  for(const field of ['artifactHash','manifestHash','sequence','policyEpoch'])if(fresh[field]!==observed[field])throw new Error('Authorization changed during verification');
  const state={identity,sequence:fresh.sequence,artifactHash:actual,manifestHash:fresh.manifestHash,block:fresh.block,...installed,appliedAt:new Date().toISOString()};
  // The exact validated bytes are interpreted once; no second artifact download.
  const temporary=path.join(directory,'applied.tmp');await fs.writeFile(temporary,JSON.stringify(state));await fs.rename(temporary,statePath);
  activated=true;
  return state;
 }finally{
  try{if(staged&&!activated)await fs.rm(staged,{recursive:true,force:true});}
  finally{await fs.rmdir(lock);}
 }
}
