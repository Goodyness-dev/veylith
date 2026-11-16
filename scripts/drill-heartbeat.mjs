// Run during the official drill window; never substitutes for organizer submission.
import {accounts,authorization,native} from '../lib/chain.mjs';
const [account]=await accounts(),state=await authorization();
const result=await native(account,[{typeUrl:'/cosmos.bank.v1beta1.MsgSend',value:{fromAddress:account.cosmos,toAddress:account.cosmos,amount:[{denom:'uqor',amount:'1'}]}}]);
console.log(JSON.stringify({network:'qorechain-diana',drillAccount:account.cosmos,releaseSequence:state.sequence,transactionHash:result.transactionHash,code:result.code,note:'Hybrid native project liveness transaction. Submit the hash through the official drill form during its required window.'}));
