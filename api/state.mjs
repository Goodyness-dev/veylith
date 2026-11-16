import {publicState} from '../lib/public-state.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Public verifier is read-only'});}
 return res.status(200).json(await publicState());
}
