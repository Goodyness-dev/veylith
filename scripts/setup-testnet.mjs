import fs from 'node:fs/promises';import {generateMnemonic,deriveUnifiedAccount} from '@qorechain/sdk';import {keccak256,toBytes} from 'viem';
import {local,readJson,accounts,register,native,window,close,evmWallet,client,nativeChain} from '../lib/chain.mjs';import {PROJECT,ENVIRONMENT} from '../lib/core.mjs';
await fs.mkdir(local,{recursive:true});
const keysFile=new URL('reviewers.json',local);
try{await fs.access(keysFile);}catch(e){if(e.code!=='ENOENT')throw e;const original=await readJson(new URL('../../research/release-spike/.local/testnet-wallet.json',import.meta.url));if(original.cosmos!=='qor1p2nf2u4kpp2smxuuruqr959z3eeapmlkncxlkr')throw new Error('Expected disposable test account');await fs.writeFile(keysFile,JSON.stringify([{mnemonic:original.mnemonic},{mnemonic:generateMnemonic()}]),{flag:'wx',mode:0o600});}
const reviewers=await accounts();
for(const a of reviewers){
 const res=await fetch(`https://api-testnet.qore.host/cosmos/bank/v1beta1/balances/${a.cosmos}`,{signal:AbortSignal.timeout(25000)});if(!res.ok)throw new Error('Balance query failed');const balance=await res.json();const amount=BigInt(balance.balances.find(c=>c.denom==='uqor')?.amount??0);
 if(amount<500000n&&a.cosmos!==reviewers[0].cosmos){await native(reviewers[0],[{typeUrl:'/cosmos.bank.v1beta1.MsgSend',value:{fromAddress:reviewers[0].cosmos,toAddress:a.cosmos,amount:[{denom:'uqor',amount:'2000000'}]}}]);}
 await register(a);console.log(JSON.stringify({reviewer:a.cosmos,registered:true}));
}
const artifact=await readJson(new URL('../artifacts/contracts/ReleaseController.sol/ReleaseController.json',import.meta.url));
const source=await fs.readFile(new URL('../contracts/ReleaseController.sol',import.meta.url),'utf8');const sourceHash=keccak256(toBytes(source));
let existing;try{existing=await readJson(new URL('deployment.json',local));}catch(e){if(e.code!=='ENOENT')throw e;}
if(existing){if(existing.sourceHash!==sourceHash)throw new Error('Source changed: explicitly select a new deployment file before replacing the live controller');console.log(JSON.stringify({reuse:existing.address}));}
else{
 await window(reviewers[0]);
 try{const tx=await evmWallet(reviewers[0]).deployContract({abi:artifact.abi,bytecode:artifact.bytecode,args:[PROJECT,ENVIRONMENT,nativeChain,reviewers.map(a=>a.evm).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase())),2n],gas:4500000n,gasPrice:await client.getGasPrice()});const receipt=await client.waitForTransactionReceipt({hash:tx,timeout:90000});if(receipt.status!=='success')throw new Error('Deployment reverted');
 const publicData={address:receipt.contractAddress,transactionHash:tx,sourceHash,chainId:9800,reviewers:reviewers.map((a,i)=>({name:i?'Security reviewer':'Release maintainer',native:a.cosmos,evm:a.evm})),threshold:2};await fs.writeFile(new URL('deployment.json',local),JSON.stringify(publicData,null,2));console.log(JSON.stringify(publicData));
 }finally{await close(reviewers[0]);}
}
