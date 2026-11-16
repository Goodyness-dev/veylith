import React,{useEffect,useState} from 'react';
const pages=[
 ['Welcome, reviewer 02.','You are protecting an app release on its way to two destinations. I’ll explain each part. Next only explains—it never signs or submits anything.','.mission'],
 ['Meet the cargo.','The drone carries Orbit Commerce’s release. Its fingerprint identifies the exact bytes. Replace even a small part and that fingerprint changes.','.crossing'],
 ['One signature is waiting.','The maintainer signs the next exact proposal using a local demo identity. You operate reviewer 2. Look for “Signed this exact next release” before continuing.','.review-story'],
 ['Your turn to approve.','Use “Review & approve as reviewer 2”. Read the target and fingerprint in the signing panel, then approve explicitly. This is our local demo signer, not a wallet extension.','.review-story'],
 ['Watch the checkpoint.','The progress track follows real server stages: signing, checking both approvals, opening the scoped window, submitting, then waiting for Diana. It is a step counter, not a countdown.','.crossing'],
 ['Deliver the real app.','Click North or South in the 3D world, or use the delivery buttons. Each real local agent downloads bytes and checks current permission before applying the configuration.','.app-gallery'],
 ['Try a counterfeit.','Use “Swap the package”, then send it to an agent again. Expect “Artifact hash mismatch”. The existing installed app should remain unchanged.','.mission'],
 ['Close the route.','Restore the original package, revoke permission, then request another install. Expect “Release revoked”. Existing installations remain applied.','.mission'],
 ['Keep the evidence.','Open Evidence to inspect transactions, fingerprints and agent results. The world is a visual metaphor; the release checks are real. You’re ready to try the mission.','.evidence-rail']
];
export default function Tutorial(){
 const [open,setOpen]=useState(()=>{try{return localStorage.getItem('veylith-tutorial-v1')!=='done';}catch{return true;}}),[index,setIndex]=useState(0);
 useEffect(()=>{const hide=()=>setOpen(false);window.addEventListener('veylith-recording',hide);return()=>window.removeEventListener('veylith-recording',hide);},[]);
 const finish=()=>{setOpen(false);try{localStorage.setItem('veylith-tutorial-v1','done');}catch{}};
 useEffect(()=>{if(!open)return;const node=document.querySelector(pages[index][2]);node?.classList.add('tutorial-focus');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;node?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});return()=>node?.classList.remove('tutorial-focus');},[open,index]);
 return <><button className="tutorial-launch" onClick={()=>{setIndex(0);setOpen(true);}}>✦ Mission guide</button>{open&&<aside className="tutorial-chat" role="region" aria-label="Mission tutorial"><div className="tutorial-chat-top"><span className="guide-avatar">✳</span><div><strong>VEYLITH / MISSION CONTROL</strong><small>Guide {index+1} of {pages.length}</small></div><button onClick={finish} aria-label="Close tutorial">×</button></div><div className="guide-message" key={index}><strong>{pages[index][0]}</strong><p>{pages[index][1]}</p></div><div className="tutorial-dots" aria-hidden="true">{pages.map((_,i)=><i className={i===index?'active':''} key={i}/>)}</div><div className="guide-buttons"><button onClick={finish}>Skip guide</button><button disabled={index===0} onClick={()=>setIndex(i=>i-1)}>← Back</button><button className="guide-next" onClick={()=>index===pages.length-1?finish():setIndex(i=>i+1)}>{index===pages.length-1?'Start mission ↗':'Next →'}</button></div></aside>}</>;
}
