import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export default function ReleaseScene(props){
 const host=useRef(),live=useRef(props);live.current=props;
 useEffect(()=>{
  const element=host.current;let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{element.dataset.fallback='true';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x050d19,1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;element.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x050d19,.025);
  const camera=new THREE.PerspectiveCamera(44,1,.1,100);camera.position.set(10,10,15);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=10;controls.maxDistance=27;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.25;
  scene.add(new THREE.HemisphereLight(0xbde7ff,0x1a1239,3));const sun=new THREE.DirectionalLight(0xdde8ff,5);sun.position.set(2,9,5);scene.add(sun);
  const mat=(color,glow=false)=>new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.35,emissive:glow?color:0x000000,emissiveIntensity:glow?.7:0});
  const metal=mat(0x253851),black=mat(0x101c30),gold=mat(0xffce7a,true),cyan=mat(0x65efee,true),green=mat(0xc6fa71,true),red=mat(0xff617c,true),white=mat(0xd8e8f5);
  const hits=[],disposeTextures=[];
  function box(parent,w,h,d,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}
  function label(text,x,y,z,color='#bdfafa'){
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;const ctx=canvas.getContext('2d');ctx.font='500 31px monospace';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,384,60);const texture=new THREE.CanvasTexture(canvas);disposeTextures.push(texture);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(4.8,.6,1);scene.add(sprite);return sprite;
  }
  function station(x,z,title,action,color){const group=new THREE.Group();group.position.set(x,-.65,z);scene.add(group);
   const base=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.55,.45,6),metal);group.add(base);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(1.25,.035,8,6),color);rim.rotation.x=Math.PI/2;rim.position.y=.25;group.add(rim);
   const beacon=box(group,1.4,.16,1,color,0,.35,0);beacon.userData.action=action;hits.push(beacon);label(title,x,2.8,z);return group;
  }
  station(-6,0,'01 / RELEASE HANGAR','inspect',gold);station(0,0,'02 / QORECHAIN CHECKPOINT','review',cyan);
  const north=station(5,-3,'03 / NORTH APP','north',green),south=station(5,3,'04 / SOUTH APP','south',green);
  const targets=[];
  for(const [group,id] of [[north,'north'],[south,'south']]){box(group,1.45,.95,.17,black,0,1.25,0);const screen=box(group,1.26,.73,.03,metal,0,1.25,.1);box(group,.16,.45,.15,metal,0,.65,0);screen.userData.action=id;hits.push(screen);targets.push(screen);}
  const gate=new THREE.Group();gate.position.y=1;scene.add(gate);
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.55-i*.28,.07,12,i===0?6:64),i===1?gold:cyan);ring.rotation.y=.3+i*.1;gate.add(ring);}
  const shield=new THREE.Mesh(new THREE.CircleGeometry(1.35,64),new THREE.MeshBasicMaterial({color:0xff617c,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));shield.position.set(0,1,0);shield.userData.action='review';scene.add(shield);hits.push(shield);
  const ship=new THREE.Group();ship.position.set(-6,1,0);scene.add(ship);box(ship,1.1,.58,.95,gold);box(ship,.8,.12,.7,black,0,.35,0);box(ship,1.8,.1,.35,white,0,-.1,0);
  const jets=[];for(const x of [-.7,.7]){const jet=new THREE.Mesh(new THREE.ConeGeometry(.14,.65,12),cyan);jet.rotation.x=Math.PI;jet.position.set(x,-.45,0);ship.add(jet);jets.push(jet);}
  const cargoHit=box(ship,1.15,.6,.96,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));cargoHit.userData.action='inspect';hits.push(cargoHit);
  for(const z of [-3,3]){const points=[new THREE.Vector3(-6,-.32,0),new THREE.Vector3(0,-.32,0),new THREE.Vector3(5,-.32,z)];scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x4ebdc3,transparent:true,opacity:.35})));}
  const floor=new THREE.GridHelper(60,60,0x284e72,0x10213a);floor.position.y=-1;scene.add(floor);
  const stars=new Float32Array(360*3);for(let i=0;i<360;i++){stars[i*3]=Math.sin(i*7.12)*32;stars[i*3+1]=4+(i%17);stars[i*3+2]=Math.cos(i*3.79)*30;}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x9dbbe5,size:.035})));
  for(let i=0;i<18;i++){const tower=box(scene,.2+(i%3)*.3,1+(i%5)*.6,.4,black,-12+i*1.5,-.1,-9-(i%3));box(tower,.08,.12,.43,cyan,0,.6,0);}
  const particles=[];for(let i=0;i<40;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.055),cyan);scene.add(m);particles.push(m);}
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
  function pointerdown(e){down={x:e.clientX,y:e.clientY};}
  function pointerup(e){if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits)[0];if(hit)live.current.onAction?.(hit.object.userData.action);}
  renderer.domElement.addEventListener('pointerdown',pointerdown);renderer.domElement.addEventListener('pointerup',pointerup);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let frame;const clock=new THREE.Clock();
  function draw(){const t=reduced?0:clock.getElapsedTime(),s=live.current;
   gate.children.forEach((r,i)=>{r.rotation.z=t*(s.working?.45:.08)*(i%2?1:-1);});shield.visible=!s.approved||s.tampered;shield.material.color.set(s.tampered?0xff617c:0x65efee);shield.material.opacity=s.working?.22:.1;
   ship.position.y=1+Math.sin(t*1.7)*.12;ship.rotation.y=Math.sin(t*.5)*.12;
   const flight=s.download&&s.approved&&!s.tampered?(t*.25)%1:0;ship.position.x=-6+flight*11;ship.position.z=flight>.55?(flight-.55)*2.2*(s.target==='south'?3:-3):0;
   jets.forEach(j=>{j.scale.y=s.download?1.4+Math.sin(t*18)*.4:.5;});
   particles.forEach((p,i)=>{const n=(t*.25+i/40)%1;p.visible=!!(s.download||s.working);p.position.set(-6+n*11,.3+Math.sin(i)*.12,n>.55?(n-.55)*2.2*(i%2?3:-3):0);p.material=s.tampered?red:cyan;if((!s.approved||s.tampered)&&p.position.x>-.4)p.visible=false;});
   targets.forEach((screen,i)=>{screen.material=(i?s.southInstalled:s.northInstalled)?green:metal;});controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(draw);
  }
  const resize=new ResizeObserver(()=>{renderer.setSize(element.clientWidth,element.clientHeight);camera.aspect=element.clientWidth/element.clientHeight;camera.updateProjectionMatrix();});resize.observe(element);draw();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerdown);renderer.domElement.removeEventListener('pointerup',pointerup);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());disposeTextures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="three-stage" ref={host} aria-label="Interactive 3D delivery mission. Drag to orbit, scroll to zoom; click a station to inspect or deliver."><span className="scene-fallback">3D unavailable. Use the mission action buttons below.</span></div>;
}
