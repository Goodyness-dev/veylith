// uqor uses 6 decimals; EVM wei uses 18. Round fee exposure upward.
export function relayBounds(gas,gasPrice){
 if(typeof gas!=='bigint'||typeof gasPrice!=='bigint'||gas<=0n||gasPrice<=0n)throw new Error('Positive bigint gas and gas price required');
 const maxValue=(gas*gasPrice+999999999999n)/1000000000000n;
 if(maxValue>1000000n)throw new Error('Relay fee exposure exceeds 1 test QOR; refusing to open a window');
 return {blocks:20,maxTxs:1,maxValue:String(maxValue)};
}
