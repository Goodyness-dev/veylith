import {publicState,recordedProof} from '../lib/public-state.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Public verifier is read-only'});}
 res.setHeader('Content-Disposition','attachment; filename="veylith-evidence.json"');
 return res.status(200).json({current:await publicState(),recordedProof});
}
