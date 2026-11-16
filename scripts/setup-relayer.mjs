import fs from 'node:fs/promises';import {generateMnemonic,deriveUnifiedAccount,fetchEvmWindow} from '@qorechain/sdk';
import {local,readJson,accounts,native,register,close,REST} from '../lib/chain.mjs';
await fs.mkdir(local,{recursive:true});const path=new URL('relayer.json',local);
let stored;try{stored=await readJson(path);}catch(e){if(e.code!=='ENOENT')throw e;stored={mnemonic:generateMnemonic()};await fs.writeFile(path,JSON.stringify(stored),{flag:'wx',mode:0o600});}
const relayer=await deriveUnifiedAccount(stored.mnemonic),[drill]=await accounts();
if(relayer.cosmos===drill.cosmos)throw new Error('Relayer must differ from drill account');
const window=await fetchEvmWindow({rest:REST,address:drill.cosmos});if(window.live)await close(drill);
const response=await fetch(`${REST}/cosmos/bank/v1beta1/balances/${relayer.cosmos}`,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('Relay balance unavailable');const balances=await response.json();
if(BigInt(balances.balances.find(c=>c.denom==='uqor')?.amount??0)<500000n)await native(drill,[{typeUrl:'/cosmos.bank.v1beta1.MsgSend',value:{fromAddress:drill.cosmos,toAddress:relayer.cosmos,amount:[{denom:'uqor',amount:'2000000'}]}}]);
await register(relayer);
const result={network:'qorechain-diana',native:relayer.cosmos,evm:relayer.evm,role:'Fee-paying relayer only; no reviewer authority',funding:'2 test QOR bootstrap from drill account if required'};
await fs.writeFile(new URL('relayer-public.json',local),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
