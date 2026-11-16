import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {createPublicClient,createWalletClient,http,defineChain,toBytes,toHex} from 'viem';import {privateKeyToAccount} from 'viem/accounts';
import {deriveUnifiedAccount,EthNativeSigner,openEvmWindowMsg,closeEvmWindowMsg,fetchPqcStatus,buildRegisterPqcKeyMsg,signProofOfPossession,clearPqcStatusCache} from '@qorechain/sdk';import {StargateClient} from '@cosmjs/stargate';
import {signMessage,classicalKeyFromPrivate} from '@qorechain/qoresign';
export const REST='https://api-testnet.qore.host',RPC='https://rpc-testnet.qore.host',EVM='https://evm-testnet.qore.host',nativeChain='qorechain-diana';
export const root=new URL('../',import.meta.url),local=new URL('../.local/',import.meta.url);
export const chain=defineChain({id:9800,name:'QoreChain Diana',nativeCurrency:{name:'QOR',symbol:'QOR',decimals:18},rpcUrls:{default:{http:[EVM]}}});
export const client=createPublicClient({chain,transport:http(EVM,{timeout:25000,retryCount:1})});
export async function readJson(url){return JSON.parse(await fs.readFile(url,'utf8'));}
async function readFetch(url,options={}){let last;for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});if(response.status>=500)throw new Error(`Read endpoint HTTP ${response.status}`);return response;}catch(e){last=e;}}throw last;}
export async function accounts(){const data=await readJson(new URL('reviewers.json',local));return Promise.all(data.map(w=>deriveUnifiedAccount(w.mnemonic)));}
export async function contract(){const [deployment,artifact]=await Promise.all([readJson(new URL('deployment.json',local)),readJson(new URL('../artifacts/contracts/ReleaseController.sol/ReleaseController.json',import.meta.url))]);return {...deployment,abi:artifact.abi};}
export async function native(account,messages,classical=false){
 const transport=await StargateClient.connect(RPC);
 try{const response=await readFetch(`${REST}/cosmos/auth/v1beta1/accounts/${account.cosmos}`);if(!response.ok)throw new Error('Account query unavailable');const info=await response.json(),base=info.account?.base_account??info.account;
 return await new EthNativeSigner(account,{signMode:classical?'classical':'hybrid',rest:REST,fetch:readFetch}).signAndBroadcast(transport,{chainId:nativeChain,accountNumber:Number(base.account_number),sequence:Number(base.sequence),messages,fee:{amount:[{denom:'uqor',amount:'100000'}],gas:'1000000'},memo:'Veylith release authorization'});
 }finally{transport.disconnect();}
}
export async function register(account){clearPqcStatusCache();const status=await fetchPqcStatus({rest:REST,address:account.cosmos});if(status.registered){if(status.pubkey!==Buffer.from(account.pqc.publicKey).toString('base64')||!status.possessionProven)throw new Error('Reviewer registered key mismatch');return;}
 await native(account,[buildRegisterPqcKeyMsg(account.cosmos,{pqcKeypair:account.pqc,ecdsaPubkey:toBytes(account.publicKey),proofOfPossession:signProofOfPossession({chainId:nativeChain,account:account.cosmos,keypair:account.pqc})})],true);
}
export async function window(account,target,count=1){return native(account,[openEvmWindowMsg({sender:account.cosmos,blocks:90,maxTxs:count,maxValue:'3000000',allowedTargets:target?[target]:[]})]);}
export async function close(account){return native(account,[closeEvmWindowMsg(account.cosmos)]);}
export function evmWallet(account){return createWalletClient({chain,account:privateKeyToAccount(account.privateKey),transport:http(EVM,{timeout:25000,retryCount:0})});}
export function signatures(digest,reviewers){return [...reviewers].sort((a,b)=>a.evm.toLowerCase().localeCompare(b.evm.toLowerCase())).map(a=>{const envelope=signMessage({chainId:nativeChain,signer:a.cosmos,data:toBytes(digest),classicalKey:classicalKeyFromPrivate(toBytes(a.privateKey),'eth_secp256k1'),pqKey:a.pqc});return {reviewer:a.evm,signature:toHex(Buffer.from(envelope.pq.signature,'base64'))};});}
export async function authorization(){
 const c=await contract();const block=await client.getBlock();if(Date.now()/1000-Number(block.timestamp)>90)throw new Error('Chain head is stale');
 const read=functionName=>client.readContract({address:c.address,abi:c.abi,functionName,blockNumber:block.number});
 const [r,project,environment,epoch]=await Promise.all([read('getRelease'),read('project'),read('environment'),read('policyEpoch')]);
 return {project,environment,artifactHash:r.artifactHash,manifestHash:r.manifestHash,sequence:String(r.sequence),deadline:String(r.deadline),policyEpoch:String(r.policyEpoch),currentPolicyEpoch:String(epoch),revoked:r.revoked,block:String(block.number),chainTime:String(block.timestamp),contract:c.address};
}
export const localPath=name=>fileURLToPath(new URL(name,local));
