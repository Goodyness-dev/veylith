import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';

export default function ReleaseScene({approved,tampered,working,phase,download}){
 const host=useRef(),state=useRef({});state.current={approved,tampered,working,phase,download};
 useEffect(()=>{
  let renderer;const element=host.current;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{element.dataset.fallback='true';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x071318,0);renderer.outputColorSpace=THREE.SRGBColorSpace;element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(0,3.6,14);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xd8f7ef,0x152332,3));const key=new THREE.DirectionalLight(0xffdab0,6);key.position.set(-3,7,6);scene.add(key);const rim=new THREE.PointLight(0x5debd0,45,20);rim.position.set(3,1,3);scene.add(rim);
  const bronze=new THREE.MeshStandardMaterial({color:0xd5ad7c,metalness:.85,roughness:.25});const dark=new THREE.MeshStandardMaterial({color:0x152e37,metalness:.5,roughness:.3});const mint=new THREE.MeshStandardMaterial({color:0x8df4cc,emissive:0x2ab98a,emissiveIntensity:.6,metalness:.3,roughness:.25});
  const gate=new THREE.Group();scene.add(gate);
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.8-i*.32,.055+i*.012,12,100),i===2?mint:bronze);ring.rotation.y=.4+i*.22;gate.add(ring);}
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.7,.12,80),dark);platform.position.y=-2;scene.add(platform);
  const parcel=new THREE.Group();parcel.position.set(-4.1,0,0);scene.add(parcel);
  const coverMat=new THREE.MeshPhysicalMaterial({color:0xe8bf8d,metalness:.3,roughness:.18,transparent:true,opacity:.55,clearcoat:1});
  for(let i=0;i<5;i++){const sheet=new THREE.Mesh(new THREE.BoxGeometry(1.55,1.9,.055),i===4?coverMat:dark);sheet.position.set(i*.08,i*.04,i*.13);parcel.add(sheet);}
  const emblem=new THREE.Mesh(new THREE.OctahedronGeometry(.36),mint);emblem.position.set(.16,.2,.72);parcel.add(emblem);
  const destinations=[];for(let i=0;i<2;i++){const group=new THREE.Group();group.position.set(4.25,i?-.95:1.15,0);group.rotation.y=-.3;const screen=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.15,.13),dark);group.add(screen);const face=new THREE.Mesh(new THREE.PlaneGeometry(1.59,.93),new THREE.MeshStandardMaterial({color:0x23414b,emissive:0x163b37,emissiveIntensity:.4}));face.position.z=.075;group.add(face);destinations.push(face);scene.add(group);}
  const particles=[];for(let i=0;i<32;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.065,.065,.13),mint);scene.add(mesh);particles.push(mesh);}
  const floor=new THREE.GridHelper(28,40,0x28534e,0x142d32);floor.position.y=-2.1;scene.add(floor);
  let frame;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const start=performance.now();
  function render(){const t=(performance.now()-start)/1000,s=state.current;parcel.rotation.y=reduced?-.3:Math.sin(t*.45)*.17-.3;parcel.rotation.z=-.07;parcel.position.y=reduced?0:Math.sin(t*.8)*.12;
   coverMat.color.set(s.tampered?0xef6b5c:0xe8bf8d);mint.emissiveIntensity=s.working?1.2:.5;
   gate.children.forEach((r,i)=>{r.rotation.z=reduced?0:t*(s.working?.6:.06)*(i%2?-1:1);});
   particles.forEach((p,i)=>{const n=(t*(s.download?.38:.12)+i/32)%1;const target=i%2?-.95:1.15;p.visible=!!(s.approved||s.working||s.download);p.position.set(-3.5+n*7.7,n>.5?(n-.5)*2*target:0,.3);p.material=s.tampered?bronze:mint;if(s.tampered&&p.position.x>-.5)p.visible=false;});
   destinations.forEach(m=>{m.material.emissiveIntensity=s.download?1.4:.3;});renderer.render(scene,camera);frame=requestAnimationFrame(render);
  }
  const observer=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(element);render();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="three-stage" aria-label="3D release package crossing an authorization gate toward two applications"><span className="scene-fallback">Release package → reviewer authorization → verified app delivery</span></div>;
}
