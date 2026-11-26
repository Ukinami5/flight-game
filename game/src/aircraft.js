import * as THREE from '../vendor/three.module.min.js';
import { clamp } from './random.js';
import { FIELD_Y } from './world.js';

export function createAircraft() {
  const root=new THREE.Group(), exterior=new THREE.Group();root.add(exterior);
  const cream=new THREE.MeshStandardMaterial({color:'#f4e8cd',metalness:.15,roughness:.38});
  const orange=new THREE.MeshStandardMaterial({color:'#cb4930',metalness:.2,roughness:.36});
  const dark=new THREE.MeshStandardMaterial({color:'#26393d',metalness:.4,roughness:.35});
  const glass=new THREE.MeshStandardMaterial({color:'#7bc8da',metalness:.55,roughness:.15,transparent:true,opacity:.72});
  const rubber=new THREE.MeshStandardMaterial({color:'#172424',roughness:.9});
  function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);exterior.add(m);return m;}
  const fuselage=mesh(new THREE.SphereGeometry(1,16,10),cream,0,0,.1);fuselage.scale.set(.92,.93,4.6);
  const cowl=mesh(new THREE.CylinderGeometry(.78,.9,1.5,16),orange,0,0,-3.35);cowl.rotation.x=Math.PI/2;
  const spinner=mesh(new THREE.ConeGeometry(.53,1,16),cream,0,0,-4.55);spinner.rotation.x=-Math.PI/2;
  function foil(points,depth,mat,y,z){const shape=new THREE.Shape();shape.moveTo(...points[0]);for(let i=1;i<points.length;i++)shape.lineTo(...points[i]);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.06,bevelSize:.08,bevelSegments:1,steps:1});g.rotateX(Math.PI/2);return mesh(g,mat,0,y,z);}
  foil([[-7.6,0],[-7.1,-1.25],[-1,-1.8],[1,-1.8],[7.1,-1.25],[7.6,0],[6.8,.8],[-6.8,.8]],.19,cream,-.15,-.55);
  for(const x of [-6.6,6.6]){const stripe=mesh(new THREE.BoxGeometry(1.05,.215,1.9),orange,x,-.22,-.8);stripe.rotation.y=x<0?-.05:.05;}
  foil([[-3,0],[-2.75,-.7],[0,-1],[2.75,-.7],[3,0],[2.3,.55],[-2.3,.55]],.12,orange,.28,3.25);
  const fin=mesh(new THREE.BoxGeometry(.15,1.8,1.7),cream,0,1.1,3.3);fin.rotation.x=-.3;
  mesh(new THREE.BoxGeometry(.18,.58,1.42),orange,0,1.75,3.48);
  const canopy=mesh(new THREE.SphereGeometry(1,16,10),glass,0,.9,-.35);canopy.scale.set(.86,.83,1.67);
  for(const z of [-1.25,.65]) {const frame=mesh(new THREE.TorusGeometry(.82,.045,5,18,Math.PI),dark,0,.92,z);frame.rotation.z=0;frame.scale.y=.86;}
  const prop=new THREE.Group();prop.position.z=-4.14;exterior.add(prop);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.17,4.1,.07),dark);prop.add(blade);
  const blur=new THREE.Mesh(new THREE.CircleGeometry(2.1,40),new THREE.MeshBasicMaterial({color:'#f7e0b5',transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));blur.position.z=-.03;prop.add(blur);
  const strutGeo=new THREE.CylinderGeometry(.055,.055,1,6),wheelGeo=new THREE.CylinderGeometry(.4,.4,.28,12);
  for(const x of [-1.25,1.25]){const s=mesh(strutGeo,dark,x,-.85,-.25);s.scale.y=1.5;s.rotation.z=x<0?-.35:.35;const w=mesh(wheelGeo,rubber,x*1.15,-1.5,-.25);w.rotation.z=Math.PI/2;}
  const tailWheel=mesh(new THREE.SphereGeometry(.22,8,6),rubber,0,-.75,3.55);
  const lights=[];
  for(const [x,y,z,c] of [[-7.5,-.13,-.6,'#ff3d28'],[7.5,-.13,-.6,'#61ffb5'],[0,.4,4.4,'#fff7d7']]){const l=mesh(new THREE.SphereGeometry(.11,8,6),new THREE.MeshBasicMaterial({color:c}),x,y,z);lights.push(l);}
  const beacon=mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:'#ff4826'}),0,2.05,3.35);
  const state={position:root.position,speed:0,vy:0,yaw:0,pitch:0,bank:0,throttle:.8,onGround:true,airborne:false,stall:false,prevX:0,prevY:0,prevZ:3020,sink:0};
  root.position.set(0,FIELD_Y+1.8,3020);
  return {root,exterior,state,prop,blur,beacon,reset(){Object.assign(state,{speed:0,vy:0,yaw:0,pitch:0,bank:0,throttle:.8,onGround:true,airborne:false,stall:false,sink:0});root.position.set(0,FIELD_Y+1.8,3020);this.sync(0);},sync(time){root.rotation.set(state.pitch,state.yaw,state.bank,'YXZ');prop.rotation.z=time*(25+state.throttle*100);blur.material.opacity=.035+state.throttle*.09;beacon.visible=Math.sin(time*7)>.4;}};
}
export function stepFlight(aircraft,input,world,dt) {
  const s=aircraft.state,p=s.position;
  s.prevX=p.x;s.prevY=p.y;s.prevZ=p.z;
  s.throttle=clamp(s.throttle+input.throttle*dt*.28,0,1);
  s.pitch=clamp(s.pitch+input.pitch*dt*.36, -.38,.43);
  if(!input.pitch)s.pitch+=(.055-s.pitch)*dt*.48;
  s.bank=clamp(s.bank+input.roll*dt*1.1,-1.15,1.15);
  if(!input.roll)s.bank*=Math.max(0,1-dt*.52);
  s.yaw+=(Math.sin(s.bank)*.38*clamp(s.speed/42,0,1.6)+input.rudder*.24)*dt;
  const drag=.55+.00165*s.speed*s.speed+Math.abs(s.bank)*.4;
  s.speed=clamp(s.speed+(s.throttle*6.3-drag-Math.sin(s.pitch)*5-(s.onGround&&input.brake?10:0))*dt,0,91);
  const lift=9.81*(s.speed/35)**2*clamp(.25+s.pitch*3.8,.03,1.8);
  s.stall=!s.onGround&&s.speed<28.3;
  if(s.stall){s.pitch-=dt*.13;s.vy-=dt*2.5;}
  s.vy+=(lift*Math.cos(s.bank)-9.81-s.vy*.26)*dt;
  s.vy=clamp(s.vy,-42,28);
  p.x-=Math.sin(s.yaw)*s.speed*dt;p.z-=Math.cos(s.yaw)*s.speed*dt;p.y+=s.vy*dt;
  const inStrip=Math.abs(p.x)<22.5&&p.z>2150&&p.z<3050;
  const ground=inStrip?FIELD_Y:Math.abs(p.x-world.riverX(p.z))<40?20:world.terrainHeight(p.x,p.z);
  if(s.onGround){s.bank*=1-dt*5;if(p.y<=ground+1.8){p.y=ground+1.8;s.vy=Math.max(0,s.vy);}if(s.vy>.6&&s.speed>31){s.onGround=false;s.airborne=true;}if(!inStrip&&s.speed>15)return 'RUNWAY EXCURSION';}
  else if(p.y<=ground+1.8){
    s.sink=s.vy;
    if(!inStrip)return Math.abs(p.x-world.riverX(p.z))<40?'WATER IMPACT':'TERRAIN IMPACT';
    if(s.speed*1.94384>=95)return 'TOUCHDOWN TOO FAST';
    if(s.vy< -6.5)return 'HARD LANDING';
    if(Math.abs(s.bank)>.22)return 'WING STRIKE';
    p.y=FIELD_Y+1.8;s.onGround=true;s.vy=0;s.pitch=0;
    return 'landed';
  }
  if(Math.abs(p.x)>6700||Math.abs(p.z)>6700)return 'OUTSIDE FLIGHT AREA';
  return null;
}
