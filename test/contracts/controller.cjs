const {ethers,network}=require('hardhat');const assert=require('node:assert/strict');
describe('ReleaseController authorization boundaries',function(){
 let gate,keys,verify,reviewers,relayer,r;
 const sorted=a=>[...a].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
 beforeEach(async function(){
  await network.provider.send('hardhat_reset');const people=await ethers.getSigners();reviewers=sorted(people.slice(0,2).map(p=>p.address));relayer=people[4];
  for(const [name,address]of [['MockKeyStatus','0x0000000000000000000000000000000000000A02'],['MockVerify','0x0000000000000000000000000000000000000A01']]){
   const artifact=await hre.artifacts.readArtifact(name);await network.provider.send('hardhat_setCode',[address,artifact.deployedBytecode]);
  }
  keys=await ethers.getContractAt('MockKeyStatus','0x0000000000000000000000000000000000000A02');await keys.configure(false,true,0);
  verify=await ethers.getContractAt('MockVerify','0x0000000000000000000000000000000000000A01');
  gate=await(await ethers.getContractFactory('ReleaseController')).deploy(ethers.id('veylith'),ethers.id('production'),'qorechain-diana',reviewers,2);
  const block=await ethers.provider.getBlock('latest');r={artifactHash:ethers.id('artifact'),manifestHash:ethers.id('manifest'),sequence:1n,deadline:BigInt(block.timestamp+3600),policyEpoch:1n,revoked:false};
 });
 async function signatures(digest,list=reviewers){const out=[];for(const reviewer of list){const status=await keys.pqcKeyStatus(reviewer);const msg=ethers.concat([ethers.toUtf8Bytes('qorechain-msg-v1|qorechain-diana|'),digest]);const tag=ethers.keccak256(ethers.concat([status[2],msg]));out.push({reviewer,signature:ethers.concat([tag,new Uint8Array(4627-32)])});}return out;}
 const approvals=()=>gate.releaseDigest(r).then(signatures);
 it('allows an unrelated relayer with two valid distinct approvals',async()=>{await gate.connect(relayer).authorize(r,await approvals());assert.equal((await gate.getRelease()).artifactHash,r.artifactHash);});
 it('rejects a classical-only call',async()=>assert.rejects(gate.authorize(r,[]),/InvalidSignature/));
 it('rejects a missing second reviewer',async()=>assert.rejects(gate.authorize(r,(await approvals()).slice(0,1)),/InvalidSignature/));
 it('rejects duplicated reviewer signatures',async()=>{const a=await approvals();await assert.rejects(gate.authorize(r,[a[0],a[0]]),/InvalidReviewer/);});
 it('rejects changed artifact and manifest bytes',async()=>{const a=await approvals();for(const field of ['artifactHash','manifestHash'])await assert.rejects(gate.authorize({...r,[field]:ethers.id('changed')},a),/InvalidSignature/);});
 it('rejects signatures from a different controller/environment',async()=>{const a=await approvals();const other=await(await ethers.getContractFactory('ReleaseController')).deploy(ethers.id('veylith'),ethers.id('staging'),'qorechain-diana',reviewers,2);await assert.rejects(other.authorize(r,a),/InvalidSignature/);});
 it('rejects replay and invalid epoch',async()=>{const a=await approvals();await gate.authorize(r,a);await assert.rejects(gate.authorize(r,a),/InvalidSequence/);await assert.rejects(gate.authorize({...r,sequence:2n,policyEpoch:2n},a),/InvalidEpoch/);});
 it('rejects expired approvals',async()=>{await network.provider.send('evm_setNextBlockTimestamp',[Number(r.deadline)+1]);await network.provider.send('evm_mine');await assert.rejects(gate.authorize(r,await approvals()),/Expired/);});
 it('fails closed on missing possession proof or changed registered key',async()=>{const a=await approvals();await keys.configure(false,false,0);await assert.rejects(gate.authorize(r,a),/InvalidKey/);await keys.configure(false,true,1);await assert.rejects(gate.authorize(r,a),/InvalidKey/);});
 it('fails closed on unavailable/short/false verification responses',async()=>{const a=await approvals();for(const mode of [1,2,3]){await verify.configure(mode);await assert.rejects(gate.authorize(r,a),/InvalidSignature/);}});
 it('fails closed when key registry is unavailable',async()=>{const a=await approvals();await keys.configure(true,true,0);await assert.rejects(gate.authorize(r,a),/InvalidKey/);});
 it('revokes only the current artifact with fresh approvals',async()=>{await gate.authorize(r,await approvals());r={...r,sequence:2n,revoked:true};await gate.authorize(r,await approvals());assert.equal((await gate.getRelease()).revoked,true);});
 it('requires old quorum to rotate policy and invalidates existing release',async()=>{await gate.authorize(r,await approvals());const digest=await gate.policyDigest(reviewers,1,2,r.deadline);await gate.rotatePolicy(reviewers,1,2,r.deadline,await signatures(digest));assert.equal(await gate.policyEpoch(),2n);assert.equal((await gate.getRelease()).revoked,true);await assert.rejects(gate.authorize({...r,sequence:3n},await approvals()),/InvalidEpoch/);});
});
