import {deriveUnifiedAccount} from '@qorechain/sdk';
import {openEvmWindowMsg} from '@qorechain/sdk';
import {local,readJson,client,native,close,evmWallet} from './chain.mjs';
import {relayBounds} from './relay-policy.mjs';
export async function relayAccount(){
 let stored;try{stored=await readJson(new URL('relayer.json',local));}catch(e){if(e.code==='ENOENT')throw new Error('Dedicated relay is not configured. Run node scripts/setup-relayer.mjs');throw e;}
 return deriveUnifiedAccount(stored.mnemonic);
}
export async function relayRelease({controller,request,approvals,step=()=>{}}){
 const relayer=await relayAccount(),gas=3500000n;
 const gasPrice=(await client.getGasPrice())*125n/100n;
 const bounds=relayBounds(gas,gasPrice);
 await client.simulateContract({address:controller.address,abi:controller.abi,functionName:'authorize',args:[request,approvals],account:relayer.evm});
 step('window','Opening a short, fee-bounded window on the dedicated relayer');
 // Deliberately no fallback to a reviewer/drill account.
 try{
  await native(relayer,[openEvmWindowMsg({sender:relayer.cosmos,...bounds,allowedTargets:[controller.address]})]);
  step('submitting','Dedicated relayer is submitting the PQ-approved release');
  const hash=await evmWallet(relayer).writeContract({address:controller.address,abi:controller.abi,functionName:'authorize',args:[request,approvals],gas,gasPrice});
  step('confirming','Waiting for Diana confirmation',{hash});
  const receipt=await client.waitForTransactionReceipt({hash,timeout:90000});
  if(receipt.status!=='success')throw new Error('Relay transaction reverted');
  return {hash,receipt,relayer:{native:relayer.cosmos,evm:relayer.evm},bounds};
 }finally{await close(relayer);}
}
