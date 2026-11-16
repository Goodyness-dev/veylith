import React from 'react';
export const stages=[['signing','Sign'],['checking','Check approvals'],['window','Open window'],['submitting','Submit'],['confirming','Confirm'],['confirmed','Confirmed']];
export default function OperationTrack({progress,working}){
 const index=stages.findIndex(([id])=>id===progress.stage),done=progress.stage==='confirmed'?6:Math.max(0,index);
 if(index<0&&!working)return null;
 return <div className="world-progress" role="status"><div className="world-progress-title"><span>{progress.stage==='error'?'OPERATION HELD':progress.message??'Preparing operation…'}</span><small>{index>=0?`${done} / 6 stages complete`:'Awaiting verified result'}</small></div><div className="world-progress-steps" aria-label="Authorization stages">{stages.map(([id,label],i)=><div key={id} className={i<done?'done':i===index?'active':''}><i/ ><span>{label}</span></div>)}</div><p>Stage completion, not elapsed time. Chain confirmation may take longer.</p></div>;
}
