import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../game/vendor/three.module.min.js';
const context=new Proxy({}, {get:(target,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
globalThis.location={search:'?shot=cover&seed=1'};
const {buildWorld,FIELD_Y}=await import('../game/src/world.js');
const {createAircraft,stepFlight}=await import('../game/src/aircraft.js');
const {createCockpit}=await import('../game/src/cockpit.js');
const {readShot,setupShot,composeShot}=await import('../game/src/shots.js');
const world=buildWorld(1),same=buildWorld(1),other=buildWorld(2),plane=createAircraft();
function digest(w){const g=w.scene.children.find(o=>o.geometry?.attributes.position.count===48841).geometry;return createHash('sha256').update(Buffer.from(g.attributes.position.array.buffer)).update(Buffer.from(g.attributes.color.array.buffer)).digest('hex');}
assert.equal(digest(world),digest(same));assert.notEqual(digest(world),digest(other));
assert.equal(world.rings.length,8);assert.equal(readShot().name,'cover');assert.equal(readShot().seed,1);
const neutral={pitch:0,roll:0,rudder:0,throttle:0,brake:false};
// Real fixed-step ground roll and rotation using the exact gameplay flight model.
plane.reset();let takeoff=false;
for(let i=0;i<1800;i++){
 const pull=plane.state.speed>36&&plane.state.position.y<110?1:plane.state.position.y>200?-1:0;
 const outcome=stepFlight(plane,{...neutral,throttle:1,pitch:pull},world,1/60);
 assert(!outcome||outcome==='landed','unexpected takeoff failure: '+outcome);
 if(plane.state.position.y>FIELD_Y+20)takeoff=true;
}
assert(takeoff,'plane must rotate and leave the runway');
console.log('PASS: seeded terrain; 8 rings; actual throttle / ground roll / rotation / flight');
function touchdown(speed,vy,x=0,z=2600,bank=0){plane.reset();const s=plane.state;Object.assign(s,{speed,vy,bank,onGround:false,airborne:true,pitch:.02});s.position.set(x,FIELD_Y+1.805,z);return stepFlight(plane,neutral,world,1/60);}
assert.equal(touchdown(40,-2),'landed');assert.equal(touchdown(55,-2),'TOUCHDOWN TOO FAST');assert.equal(touchdown(40,-8),'HARD LANDING');assert.equal(touchdown(40,-2,0,2600,.5),'WING STRIKE');
plane.reset();plane.state.onGround=false;plane.state.position.set(0,300,0);plane.state.speed=20;stepFlight(plane,neutral,world,1/60);assert(plane.state.stall);
console.log('PASS: safe landing; too-fast / hard landing / wing strike; low-speed stall');
const cockpit=createCockpit();
for(const name of ['cover','cockpit','rings','chase','title']){
 plane.reset();const flight={};setupShot(name,plane,flight,world);
 for(let i=0;i<90;i++){stepFlight(plane,neutral,world,1/60);plane.sync((i+1)/60);world.update((i+1)/60,flight.next);}
 const camera=new THREE.PerspectiveCamera(65,1.6,.035,26000);
 if(name==='cockpit'){plane.root.add(camera);camera.position.set(0,1.25,.8);camera.rotation.set(-.14,0,0);}
 else composeShot(name,camera,plane,1.5);
 world.scene.add(plane.root);world.scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);cockpit.update(plane.state,1.5,true);
 assert(Number.isFinite(plane.state.position.y));assert(plane.state.position.y>50);
 const dir=new THREE.Vector3();camera.getWorldDirection(dir);assert(dir.length()>.99);
 console.log('PASS: '+name+' / 90 fixed steps / camera and lit-gauge draw calls / y='+plane.state.position.y.toFixed(2));
}
console.log('These are simulation and scene-graph checks, not a GPU rasterization test.');
