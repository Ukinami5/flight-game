import * as THREE from '../vendor/three.module.min.js';

export function createCockpit() {
  const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:'#182d30',roughness:.8}),trim=new THREE.MeshStandardMaterial({color:'#405456',metalness:.5,roughness:.42});
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=640;const g=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  function box(x,y,z,w,h,d,m=mat){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);group.add(b);return b;}
  // The camera is at eye height; the tilted panel fills the lower third of the view.
  box(0,.04,-1.32,2.85,.88,.15);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.72,1.13),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));panel.position.set(0,.18,-1.215);panel.rotation.x=-.08;group.add(panel);
  const hood=box(0,.76,-1.57,2.95,.11,.88);hood.rotation.x=-.055;
  box(0,-.45,-.9,3,.18,2.3);
  const barGeo=new THREE.CylinderGeometry(.035,.035,1,8);
  function bar(a,b,r=1){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const m=new THREE.Mesh(barGeo,trim);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());m.scale.set(r,delta.length(),r);group.add(m);}
  for(const sign of [-1,1]) {
    bar([sign*1.5,.55,-1.35],[sign*1.12,2.55,-1.85],1.7);
    bar([sign*1.12,2.55,-1.85],[sign*.9,2.8,.5],1.5);
    bar([sign*1.5,.55,-1.35],[sign*1.6,.62,1.5],1.5);
  }
  bar([-1.12,2.55,-1.85],[1.12,2.55,-1.85],1.4);
  const yokes=[];
  for(const x of [-.68,.68]){
    const yoke=new THREE.Group();yoke.position.set(x,-.02,-.71);group.add(yoke);
    const column=new THREE.Mesh(new THREE.CylinderGeometry(.033,.04,.46,8),trim);column.rotation.x=Math.PI/2;column.position.z=.18;yoke.add(column);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.19,.035,7,20,Math.PI*1.55),mat);handle.rotation.z=-Math.PI*.275;handle.scale.y=.7;yoke.add(handle);
    const hub=new THREE.Mesh(new THREE.BoxGeometry(.18,.09,.09),trim);yoke.add(hub);yokes.push(yoke);
  }
  const glowLight=new THREE.PointLight('#7fffd5',.55,4);glowLight.position.set(0,1,-.8);group.add(glowLight);
  function text(t,x,y,size=18,color='#b9d3c7',align='center'){g.font=`${size}px monospace`;g.fillStyle=color;g.textAlign=align;g.fillText(t,x,y);}
  function dial(cx,cy,r,label,value,lo,hi,unit,accent='#ebedd5'){
    g.save();g.translate(cx,cy);g.fillStyle='#0b1619';g.strokeStyle='#54625b';g.lineWidth=3;g.beginPath();g.arc(0,0,r+7,0,7);g.fill();g.stroke();
    for(let i=0;i<=20;i++){const a=-Math.PI*.77+i/20*Math.PI*1.54;g.save();g.rotate(a);g.strokeStyle=i>15?'#e7b36e':'#b4c5b1';g.lineWidth=i%5===0?3:1.5;g.beginPath();g.moveTo(0,-r+9);g.lineTo(0,-r+(i%5===0?24:17));g.stroke();if(i%5===0){g.rotate(-a);text(String(Math.round(lo+i/20*(hi-lo))),Math.sin(a)*(r-37),-Math.cos(a)*(r-37)+5,16);}g.restore();}
    text(label,0,-23,16,'#a6bbb1');text(Math.round(value).toString().padStart(3,'0'),0,29,34,accent);text(unit,0,52,13,'#7e9e95');
    g.rotate(-Math.PI*.77+Math.max(0,Math.min(1,(value-lo)/(hi-lo)))*Math.PI*1.54);g.strokeStyle='#f8d191';g.lineWidth=3;g.beginPath();g.moveTo(0,12);g.lineTo(0,-r+28);g.stroke();g.fillStyle='#d0c5a7';g.beginPath();g.arc(0,0,6,0,7);g.fill();g.restore();
  }
  let last=-1;
  return {group,canvas,update(s,time,force=false){
    if(!force&&Math.floor(time*15)===last)return;last=Math.floor(time*15);
    g.fillStyle='#1b2a2b';g.fillRect(0,0,1536,640);
    g.strokeStyle='#40534c';g.lineWidth=2;g.strokeRect(12,12,1512,616);
    text('SKYWARD  /  CANYON SPECIAL',40,46,20,'#d0c4a5','left');text('N-026   ·   VFR',1490,46,18,'#9dbeb1','right');
    dial(225,247,128,'AIRSPEED',s.speed*1.94384,0,180,'KNOTS');
    dial(1020,247,128,'ALTITUDE',s.position.y*3.28084,0,5000,'FEET');
    dial(1305,247,105,'VERT SPEED',s.vy*196.85,-2000,2000,'FT / MIN');
    // A clipped, banked and pitched artificial horizon, drawn from actual attitude.
    g.save();g.translate(621,247);g.beginPath();g.arc(0,0,131,0,7);g.clip();g.rotate(-s.bank);const shift=s.pitch*260;
    g.fillStyle='#3e8aa3';g.fillRect(-230,-250+shift,460,250);g.fillStyle='#a57848';g.fillRect(-230,shift,460,250);g.fillStyle='#e1e5ce';g.fillRect(-220,shift-1,440,3);
    for(let i=-3;i<=3;i++){if(!i)continue;g.fillStyle='#c4d9cb';g.fillRect(-22,shift+i*28,44,2);text(String(Math.abs(i)*10),36,shift+i*28+5,13,'#d7e1cd');}g.restore();
    g.strokeStyle='#6f8174';g.lineWidth=6;g.beginPath();g.arc(621,247,133,0,7);g.stroke();g.strokeStyle='#ffca77';g.lineWidth=4;g.beginPath();g.moveTo(550,247);g.lineTo(590,247);g.lineTo(605,260);g.moveTo(637,260);g.lineTo(652,247);g.lineTo(692,247);g.stroke();text('ATTITUDE',621,344,14,'#e9e2c3');
    g.fillStyle='#0c1c1f';g.fillRect(405,405,432,65);g.strokeStyle='#638679';g.strokeRect(405,405,432,65);
    const heading=((-s.yaw*180/Math.PI)%360+360)%360;
    text('HDG',442,447,17,'#a4baab');text(String(Math.round(heading)).padStart(3,'0')+'°',622,452,34,'#9ff4d1');text('MAG',795,447,17,'#a4baab');
    text('FUEL',105,461,17);g.fillStyle='#8cd6b5';g.fillRect(151,446,155,9);text('L  92%   R  94%',225,486,14,'#9bb7a8');
    g.fillStyle='#0c1c1f';g.fillRect(922,415,493,70);text('COM  122.800',949,443,21,'#8af0ce','left');text('NAV  CANYON',949,471,18,'#c1cdb5','left');
    for(let i=0;i<11;i++){const x=71+i*138;g.fillStyle=i%3===0?'#d1c7a9':'#6b8175';g.beginPath();g.arc(x,564,12,0,7);g.fill();g.fillStyle='#263a36';g.fillRect(x-1,553,2,10);}
    text('MASTER',71,608,12);text('LIGHTS',209,608,12);text('PITOT',347,608,12);text('MIXTURE',1313,608,12);
    for(const [x,y] of [[27,27],[1509,27],[27,613],[1509,613]]){g.fillStyle='#87928a';g.beginPath();g.arc(x,y,5,0,7);g.fill();g.fillStyle='#283734';g.fillRect(x-4,y-1,8,2);}
    texture.needsUpdate=true;
    for(const y of yokes){y.rotation.z=s.bank*.5;y.rotation.x=-s.pitch*.4;}
  }};
}
