import * as THREE from '../vendor/three.module.min.js';
import { buildWorld, FIELD_Y } from './world.js';
import { createAircraft, stepFlight } from './aircraft.js';
import { createCockpit } from './cockpit.js';
import { createHUD } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { readShot, setupShot, composeShot } from './shots.js';

const shot=readShot();
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.domElement.setAttribute('aria-label','SKYWARD CANYON flight simulator');document.body.prepend(renderer.domElement);
const world=buildWorld(shot.seed),plane=createAircraft(),cockpit=createCockpit();
world.scene.add(plane.root);plane.root.add(cockpit.group);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.035,26000);
const hud=createHUD(),sound=createAudio(),input=createInput(()=>sound.start());
const flight={next:0,score:0,bonus:0,timeLeft:300,elapsed:0};
let mode='title',resumeMode='flying',chase=false,simTime=0,accumulator=0,previous=0,frozen=false,landingNotice=false;
const cameraDesired=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),forward=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
const silentInput={pitch:0,roll:0,rudder:0,throttle:0,brake:false};
function setCamera(isChase){
  chase=isChase;plane.exterior.visible=isChase;cockpit.group.visible=!isChase;hud.view(isChase);
  if(!isChase){plane.root.add(camera);camera.position.set(0,1.25,.8);camera.rotation.set(-.14,0,0);camera.fov=70;}
  else{world.scene.add(camera);camera.up.copy(up);camera.fov=59;cameraDesired.set(0,6.5,23).applyQuaternion(plane.root.quaternion).add(plane.state.position);camera.position.copy(cameraDesired);camera.lookAt(plane.state.position);}
  camera.updateProjectionMatrix();
}
function show(state){mode=state;hud.screen(state);}
function start(){
  if(shot.name)return;
  sound.start();plane.reset();simTime=0;accumulator=0;landingNotice=false;
  Object.assign(flight,{next:0,score:0,bonus:0,timeLeft:300,elapsed:0});
  for(let i=0;i<8;i++){const r=world.rings[i],color=i%2?'#6ee6ee':'#ffb550';r.passed=false;r.mat.color.set(color);r.mat.emissive.set(color);r.glowMat.color.set(color);}
  setCamera(false);show('flying');hud.flash('FULL POWER · ROTATE AT 70 KT',0,7);input.clear();
}
function pause(){if(mode==='flying'||mode==='landing'){resumeMode=mode;show('paused');sound.update(0,false);}else if(mode==='paused'){show(resumeMode);}}
function end(state,reason=''){
  if(state==='success'){const finishBonus=Math.max(0,Math.round(flight.timeLeft)*2);flight.bonus+=finishBonus;flight.score+=1000+finishBonus;sound.success();}
  else sound.crash();
  mode=state;hud.screen(state,{reason,score:flight.score,rings:flight.next,bonus:flight.bonus});sound.update(0,false);
}
document.getElementById('start').addEventListener('click',start);
document.getElementById('restart').addEventListener('click',start);
document.getElementById('resume').addEventListener('click',pause);
function handleInput(){
  if(input.take('KeyM'))hud.muted(sound.toggle());
  if(input.take('Enter')){if(mode==='title')start();else if(mode==='paused')pause();}
  if(input.take('KeyR')&&mode!=='title')start();
  const p=input.take('KeyP'),esc=input.take('Escape'),blur=input.take('Blur');
  if(p||esc||(blur&&(mode==='flying'||mode==='landing')))pause();
  if(input.take('KeyC')&&(mode==='flying'||mode==='landing'||mode==='paused'))setCamera(!chase);
}
function checkRing(){
  if(flight.next>=8)return;
  const s=plane.state,r=world.rings[flight.next],rp=r.group.position,dz=s.position.z-s.prevZ;
  if(Math.abs(dz)<.00001)return;
  const t=(rp.z-s.prevZ)/dz;
  if(t<0||t>1)return;
  const dx=s.prevX+(s.position.x-s.prevX)*t-rp.x,dy=s.prevY+(s.position.y-s.prevY)*t-rp.y;
  if(dx*dx+dy*dy<r.radius*r.radius){
    r.passed=true;r.mat.color.set('#6bf0af');r.mat.emissive.set('#4ee7a3');r.glowMat.color.set('#4ee7a3');
    const bonus=Math.max(0,Math.floor(flight.timeLeft/12));flight.bonus+=bonus;flight.score+=250+bonus;flight.timeLeft+=16;flight.next++;sound.ring();hud.flash('GATE '+String(flight.next).padStart(2,'0')+' · +250  /  +16 SEC',simTime,3);
    if(flight.next===8){show('landing');hud.flash('COURSE COMPLETE · TURN BACK TO THE STRIP',simTime,8);}
  }else hud.flash('GATE MISSED · CIRCLE BACK',simTime,4);
}
function fixedStep(dt){
  simTime+=dt;
  if(mode==='flying'||mode==='landing'){
    flight.timeLeft-=dt;flight.elapsed+=dt;
    const outcome=stepFlight(plane,input.sample(),world,dt);
    if(outcome==='landed'){if(flight.next===8)end('success');else hud.flash('NICE LANDING · THE GATES ARE STILL WAITING',simTime,4);}
    else if(outcome)end('crashed',outcome);
    if(flight.timeLeft<=0&&(mode==='flying'||mode==='landing'))end('crashed','FLIGHT WINDOW EXPIRED');
    if(mode==='flying'||mode==='landing')checkRing();
    if(mode==='landing'&&!landingNotice&&Math.hypot(plane.state.position.x,plane.state.position.z-2600)<1500){landingNotice=true;hud.flash('FINAL · LAND BELOW 95 KT · GENTLE DESCENT',simTime,7);}
  }
  plane.sync(simTime);world.update(simTime,flight.next);
}
function updateCamera(dt){
  if(mode==='title'){
    plane.exterior.visible=true;cockpit.group.visible=false;
    camera.position.set(630+Math.sin(simTime*.045)*220,345+Math.sin(simTime*.07)*35,3410+Math.cos(simTime*.045)*160);
    cameraTarget.set(-70,185,950);camera.lookAt(cameraTarget);return;
  }
  if(chase){
    cameraDesired.set(0,6.5,23).applyQuaternion(plane.root.quaternion).add(plane.state.position);
    camera.position.lerp(cameraDesired,1-Math.exp(-dt*4));forward.set(0,0,-1).applyQuaternion(plane.root.quaternion);cameraTarget.copy(plane.state.position).addScaledVector(forward,17);cameraTarget.y+=1.4;camera.lookAt(cameraTarget);
  }
}
function draw(force=false){cockpit.update(plane.state,simTime,force);hud.update(plane.state,flight,world,simTime,force);renderer.render(world.scene,camera);}
function animate(now){
  requestAnimationFrame(animate);
  if(frozen){renderer.render(world.scene,camera);return;}
  const dt=Math.min((now-previous)/1000||0,.1);previous=now;handleInput();
  if(mode==='title'){simTime+=dt;plane.sync(simTime);world.update(simTime,0);}
  else if(mode==='flying'||mode==='landing'){accumulator+=dt;while(accumulator>=1/60){fixedStep(1/60);accumulator-=1/60;if(mode==='crashed'||mode==='success')break;}}
  updateCamera(dt);sound.update(plane.state.throttle,mode==='flying'||mode==='landing');draw();
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(frozen)draw(true);});
// Read-only diagnostics also support local smoke checks without changing gameplay.
window.__flightGame={get state(){return mode;},get rings(){return flight.next;},get speed(){return plane.state.speed;},get position(){return {x:plane.state.position.x,y:plane.state.position.y,z:plane.state.position.z};},get shotSteps(){return shot.name?90:0;}};
if(shot.name){
  setupShot(shot.name,plane,flight,world);mode=shot.name==='title'?'title':flight.next===8?'landing':'flying';
  plane.sync(0);setCamera(shot.name!=='cockpit');hud.screen(mode);
  // Exactly ninety deterministic fixed steps. Rendering time never enters shot state.
  for(let i=0;i<90;i++){simTime=(i+1)/60;stepFlight(plane,silentInput,world,1/60);plane.sync(simTime);world.update(simTime,flight.next);}
  composeShot(shot.name,camera,plane,simTime);cockpit.group.visible=shot.name==='cockpit';plane.exterior.visible=shot.name!=='cockpit';
  if(shot.name==='cockpit')hud.flash('FINAL · RUNWAY 18 · CLEARED TO LAND',simTime,100);
  frozen=true;draw(true);
  // Wait for the completed GPU frame before advertising readiness to capture tools.
  requestAnimationFrame(()=>{draw(true);window.__shotReady=true;document.title='SHOT-READY';});
}else{
  world.scene.add(camera);plane.reset();plane.state.position.set(0,160,2680);plane.state.bank=.18;plane.state.pitch=.04;plane.sync(0);show('title');requestAnimationFrame(animate);
}
