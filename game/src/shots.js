import * as THREE from '../vendor/three.module.min.js';
export function readShot() {
  const p=new URLSearchParams(location.search),name=p.get('shot');
  return {name:['cover','chase','cockpit','rings','title'].includes(name)?name:null,seed:Number(p.get('seed')||261126)>>>0};
}
export function setupShot(name,aircraft,flight,world) {
  const s=aircraft.state;
  s.onGround=false;s.airborne=true;s.throttle=.72;s.speed=49;s.vy=0;s.pitch=.057;s.bank=0;s.yaw=0;
  Object.assign(flight,{timeLeft:224,score:500,next:2});
  if(name==='cover'){s.position.set(20,285,3320);s.bank=.30;s.yaw=.015;flight.next=0;flight.score=0;}
  if(name==='cockpit'){s.position.set(0,123.9,1020);s.yaw=Math.PI;s.speed=39;s.pitch=.02;flight.next=8;flight.score=2380;}
  if(name==='rings'){s.position.set(-179,366,-830);s.speed=44;s.pitch=.08;s.bank=-.07;flight.next=3;flight.score=870;}
  if(name==='chase'){s.position.set(-175,300,700);s.bank=-.2;}
  if(name==='title'){s.position.set(0,165,2650);s.bank=.18;}
  for(let i=0;i<flight.next;i++){world.rings[i].passed=true;world.rings[i].mat.color.set('#6bf0af');world.rings[i].mat.emissive.set('#4ee7a3');world.rings[i].glowMat.color.set('#4ee7a3');}
}
const offset=new THREE.Vector3(),target=new THREE.Vector3();
export function composeShot(name,camera,aircraft,time) {
  const s=aircraft.state,p=s.position;
  if(name==='cockpit')return;
  if(name==='cover'){offset.set(22,13,34);target.set(p.x,170,p.z-1420);}
  else if(name==='rings'){offset.set(7,5.8,26);target.set(-115,365,-1450);}
  else if(name==='chase'){offset.set(24,9,-27);target.copy(p);target.y+=.7;}
  else {camera.position.set(780,390,3420);target.set(-100,220,700);camera.lookAt(target);return;}
  camera.position.copy(p).add(offset);camera.lookAt(target);
}
