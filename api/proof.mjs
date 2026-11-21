import {publicState,recordedProof} from '../lib/public-state.mjs';
import {readFileSync} from 'node:fs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Public verifier is read-only'});}
 res.setHeader('Content-Disposition','attachment; filename="veylith-evidence.json"');
 let orbitWalkthrough;
 try {orbitWalkthrough=JSON.parse(readFileSync(new URL('../evidence/orbit-walkthrough.json',import.meta.url),'utf8'));}
 catch(error){if(error.code!=='ENOENT')throw error;}
 return res.status(200).json({current:await publicState(),recordedProof,orbitWalkthrough});
}
