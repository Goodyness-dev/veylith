// Public deployment imports no wallet loader, local signer, or agent runtime.
import {readFileSync} from 'node:fs';
import {createPublicClient,http,defineChain,parseAbi} from 'viem';
import {bundle,manifestFor,encodeManifest} from './core.mjs';
import {keccak256} from 'viem';
export const recordedProof=JSON.parse(readFileSync(new URL('../evidence/live-flow.json',import.meta.url),'utf8'));
const chain=defineChain({id:9800,name:'Diana',nativeCurrency:{name:'QOR',symbol:'QOR',decimals:18},rpcUrls:{default:{http:['https://evm-testnet.qore.host']}}});
const client=createPublicClient({chain,transport:http('https://evm-testnet.qore.host',{timeout:15000,retryCount:1})});
const abi=parseAbi(['function getRelease() view returns ((bytes32 artifactHash, bytes32 manifestHash, uint256 sequence, uint256 deadline, uint256 policyEpoch, bool revoked))','function project() view returns (bytes32)','function environment() view returns (bytes32)','function policyEpoch() view returns (uint256)']);
export async function publicState(source=client){
 const state={mode:'Live Diana · public verifier',readOnly:true,ready:false,recordedAt:recordedProof.checkedAt,contract:recordedProof.controller,reviewers:recordedProof.final.reviewers,threshold:2,busy:false,tampered:false,artifactHash:keccak256(bundle),observedHash:keccak256(bundle),manifest:manifestFor(),manifestHash:keccak256(encodeManifest(manifestFor())),applied:{},reports:{},transactions:recordedProof.final.transactions,recordedChecks:recordedProof.checks};
 try{
  const [block,network]=await Promise.all([source.getBlock(),source.getChainId()]);
  if(network!==9800)throw new Error('Unexpected RPC network');
  if(Date.now()/1000-Number(block.timestamp)>90)throw new Error('Chain head is stale');
  const read=functionName=>source.readContract({address:state.contract,abi,functionName,blockNumber:block.number});
  const [r,project,environment,epoch]=await Promise.all([read('getRelease'),read('project'),read('environment'),read('policyEpoch')]);
  state.chain={project,environment,artifactHash:r.artifactHash,manifestHash:r.manifestHash,sequence:String(r.sequence),deadline:String(r.deadline),policyEpoch:String(r.policyEpoch),currentPolicyEpoch:String(epoch),revoked:r.revoked,block:String(block.number),chainTime:String(block.timestamp),contract:state.contract};state.ready=true;
 }catch(e){state.error=(e.shortMessage??e.message).slice(0,300);}
 return state;
}
