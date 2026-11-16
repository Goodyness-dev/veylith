import React,{useRef,useState} from 'react';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function direct(detail){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Demo operation timed out. Check chain state before retrying.')),180000);window.dispatchEvent(new CustomEvent('veylith-director',{detail:{...detail,resolve:value=>{clearTimeout(timer);resolve(value);}}}));});}
export default function DemoRecorder({data,working}){
 const [running,setRunning]=useState(false),[caption,setCaption]=useState(''),[error,setError]=useState(''),[video,setVideo]=useState(null),[metadata,setMetadata]=useState(null),[setup,setSetup]=useState(false);
 const capture=useRef(null),stopped=useRef(false),recording=useRef(false);
 async function start(){
  setError('');setVideo(null);setMetadata(null);let stream,recorder,chunks=[],interrupted=false;const results=[];let seconds=0,started=0;
  try{
   if(!navigator.mediaDevices?.getDisplayMedia||!window.MediaRecorder)throw new Error('This browser does not support tab recording. Use Chrome or Edge.');
   if(!data?.ready||data.readOnly||working)throw new Error('Wait for an idle local workbench with a live Diana connection.');
   // Browser consent is always supplied by the person selecting the capture source.
   stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser',frameRate:24},audio:false,preferCurrentTab:true});
   const track=stream.getVideoTracks()[0],surface=track.getSettings().displaySurface;
   if(surface&&surface!=='browser')throw new Error('Choose the localhost browser TAB, not an entire screen or window.');
   const live=await fetch('/api/state').then(r=>r.json());if(!live.ready||live.readOnly||live.busy)throw new Error('Wait for an idle local workbench with a live Diana connection.');
   const mime=['video/mp4;codecs=avc1.424028','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
   if(!mime)throw new Error('No supported recording format found.');
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});capture.current=recorder;stopped.current=false;recording.current=true;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   const done=new Promise(resolve=>{recorder.onstop=()=>{recording.current=false;const extension=mime.includes('mp4')?'mp4':'webm';setVideo({url:URL.createObjectURL(new Blob(chunks,{type:mime})),extension});resolve();};});
   track.onended=()=>{if(recording.current){interrupted=true;stopped.current=true;if(recorder.state!=='inactive')recorder.stop();}};
   setRunning(true);setSetup(false);document.body.classList.add('recording-demo');window.dispatchEvent(new Event('veylith-recording'));await direct({view:'close'});
   recorder.start(1000);started=performance.now();
   function pause(){if(recorder.state==='recording'){seconds+=(performance.now()-started)/1000;recorder.pause();}}
   function resume(){if(recorder.state==='paused'){recorder.resume();started=performance.now();}}
   async function explain(text,hold=5000){if(stopped.current)throw new Error('Recording stopped by operator.');setCaption(text);await wait(hold);}
   async function operation(action,body={},verify){
    if(stopped.current)throw new Error('Recording stopped by operator.');
    const pauseTimer=setTimeout(pause,6500);let result;
    try{result=await direct({action,body});}finally{clearTimeout(pauseTimer);resume();}
    if(!result?.ok)throw new Error(result?.error??'Operation did not finish');
    if(verify&&!verify(result.result))throw new Error(`Expected ${action} result was not observed. Recording stopped rather than showing a false success.`);
    results.push({action,result:result.result});await wait(250);
   }
   await explain('Veylith · the release you approved, the bytes they receive.',6000);
   await direct({view:'inspect'});await explain('An attacker can replace a software download. We authorize the fingerprint of these exact release bytes.',6500);await direct({view:'close'});
   await operation('tamper',{enabled:false});
   await operation('prepare',{},r=>r.approved===true);
   await direct({view:'signer'});await explain('The first local demo reviewer has signed. The second identity now approves the same release.',6500);
   await explain('Two real post-quantum signatures. One exact permission. Diana verifies the authorization.',2500);
   await operation('authorize',{},r=>!!r.hash);await explain('Authorization confirmed on QoreChain. The release can now be delivered.',5000);await direct({view:'close'});
   await explain('North downloads the actual bytes and checks the manifest, current permission and sequence.',2500);await operation('deploy',{identity:'north'},r=>r.outcome==='applied');await explain('North verified and installed the configuration. Its applied sequence is recorded.',5000);
   await explain('South is a separate process with its own deployment state.',2500);await operation('deploy',{identity:'south'},r=>r.outcome==='applied');await explain('Both agents accepted the exact approved release.',5000);
   await operation('tamper',{enabled:true});await explain('Now the same download address serves replaced bytes. The approved fingerprint has not changed.',5000);await operation('deploy',{identity:'north'},r=>r.outcome==='refused'&&r.reason==='Artifact hash mismatch');await explain('Counterfeit refused: artifact hash mismatch. The existing installation stays intact.',6000);
   await operation('tamper',{enabled:false});await operation('deploy',{identity:'north'},r=>r.outcome==='refused'&&r.reason==='Sequence already applied');await explain('Original bytes restored. Reusing the same deployment sequence is also refused.',5000);
   await explain('Finally, the reviewers withdraw permission for future installs.',2500);await operation('revoke',{},r=>!!r.hash);await operation('deploy',{identity:'south'},r=>r.outcome==='refused'&&r.reason==='Release revoked');await explain('Revoked release refused. Revocation stops future application; it does not uninstall prior deployments.',6500);
   await direct({view:'proof'});await explain('Public transactions and local agent reports make the journey inspectable.',6500);await direct({view:'close'});
   await explain('A real testnet prototype. Local demo signers. Configuration releases. Exact permission, verifiable delivery.',6500);
   seconds+=(performance.now()-started)/1000;recording.current=false;if(recorder.state!=='inactive')recorder.stop();await done;
   setMetadata({status:'completed',recordedAt:new Date().toISOString(),estimatedCapturedSeconds:Math.round(seconds),networkWaitsShortened:true,results});
  }catch(e){setError(e.message);if(recorder&&recorder.state!=='inactive'){interrupted=true;recording.current=false;recorder.stop();}setMetadata({status:'incomplete',error:e.message,results});}
  finally{recording.current=false;stream?.getTracks().forEach(t=>t.stop());document.body.classList.remove('recording-demo');setRunning(false);capture.current=null;if(interrupted)setCaption('Recording incomplete — inspect the error before using this take.');}
 }
 return <><button className="record-launch" disabled={!!working||!data?.ready||data?.readOnly||running} onClick={()=>setSetup(v=>!v)}>● Record guided demo</button>{setup&&!running&&<aside className="recorder-setup"><strong>Let Veylith run the walkthrough.</strong><p>Choose this localhost tab in the browser’s sharing dialog. Keep the tab visible and avoid clicking during the take. The recording is silent and submits real testnet actions. Long network waits are shortened and labeled.</p><button onClick={start}>Choose tab & start recording ↗</button><button onClick={()=>setSetup(false)}>Cancel</button></aside>}{running&&<div className="record-caption"><span>AUTOMATED LOCAL DEMO · REAL DIANA ACTIONS</span><strong>{caption}</strong><small>Silent recording · long network waits shortened · game visuals illustrate configuration delivery</small><button onClick={()=>{stopped.current=true;}}>Stop after current operation</button></div>}{!running&&(video||error)&&<aside className="recording-result"><strong>{metadata?.status==='completed'?'Your silent demo is ready.':'Recording needs attention.'}</strong>{error&&<p>{error}</p>}{video&&<a href={video.url} download={`veylith-demo-${metadata?.status==='completed'?'complete':'incomplete'}.${video.extension}`}>Download {video.extension.toUpperCase()} recording ↓</a>}{metadata&&<a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(metadata,null,2))}`} download="veylith-recording-results.json">Download operation results ↓</a>}<p>{metadata?.estimatedCapturedSeconds?`About ${metadata.estimatedCapturedSeconds} seconds captured. `:''}Watch the entire recording before submitting. Add narration in your video editor; export MP4 there if your browser recorded WebM.</p><button onClick={()=>{setVideo(null);setError('');setMetadata(null);}}>Close</button></aside>}</>;
}
