import fs from 'node:fs/promises';
import path from 'node:path';
import {keccak256} from 'viem';
import {configurationOf} from '../lib/core.mjs';

export async function applyRelease({directory,identity,project,environment,fetchArtifact,fetchManifest,readAuthorization,now}){
 await fs.mkdir(directory,{recursive:true});const lock=path.join(directory,'.applying');
 try{await fs.mkdir(lock);}catch(e){if(e.code==='EEXIST')throw new Error('Another deployment is in progress');throw e;}
 try{
  const observed=await readAuthorization();
  const validate=a=>{if(a.project!==project||a.environment!==environment)throw new Error('Wrong project or environment');if(a.revoked)throw new Error('Release revoked');if(BigInt(a.deadline)<=BigInt(now()))throw new Error('Approval expired');if(a.policyEpoch!==a.currentPolicyEpoch)throw new Error('Policy changed');};
  validate(observed);
  const manifestBytes=await fetchManifest();
  if(keccak256(manifestBytes)!==observed.manifestHash)throw new Error('Manifest hash mismatch');
  const manifest=JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
  if(manifest.format!=='veylith-release-v1'||manifest.project!==project||manifest.environment!==environment||manifest.artifactHash!==observed.artifactHash)throw new Error('Manifest target mismatch');
  const bytes=await fetchArtifact();const actual=keccak256(bytes);
  if(actual!==observed.artifactHash)throw Object.assign(new Error('Artifact hash mismatch'),{expected:observed.artifactHash,observed:actual});
  const config=configurationOf(bytes);const statePath=path.join(directory,'applied.json');
  if(config.release!==manifest.version)throw new Error('Manifest version mismatch');
  let prior;try{prior=JSON.parse(await fs.readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(prior&&BigInt(prior.sequence)>=BigInt(observed.sequence))throw new Error('Sequence already applied');
  const fresh=await readAuthorization();validate(fresh);
  for(const field of ['artifactHash','manifestHash','sequence','policyEpoch'])if(fresh[field]!==observed[field])throw new Error('Authorization changed during verification');
  const state={identity,sequence:fresh.sequence,artifactHash:actual,manifestHash:fresh.manifestHash,block:fresh.block,config,appliedAt:new Date().toISOString()};
  // The exact validated bytes are interpreted once; no second artifact download.
  const temporary=path.join(directory,'applied.tmp');await fs.writeFile(temporary,JSON.stringify(state));await fs.rename(temporary,statePath);return state;
 }finally{await fs.rmdir(lock);}
}
