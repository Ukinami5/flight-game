// Runs the shipped offline bundle with a recording renderer and canvas API stubs.
// Validates state transitions and camera composition; does not claim to rasterize.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('game/src/offline.js','utf8').replace('new THREE.WebGLRenderer(', 'new window.RecordingRenderer(').replace(/\}\)\(\);\s*$/, 'window.test={plane,flight,world,camera,cockpit,fixedStep,start,pause,handleInput,checkRing};\n})();');
function boot(search=''){
 const elements=new Map(),events={},frames=[];
 const drawing=new Proxy({},{get:(o,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
 function element(id){if(!elements.has(id))elements.set(id,{id,hidden:false,style:{},textContent:'',events:{},addEventListener(n,fn){this.events[n]=fn;},getContext:()=>drawing,setAttribute(){}});return elements.get(id);}
 const win={devicePixelRatio:1,addEventListener:(n,fn)=>events[n]=fn,RecordingRenderer:class{constructor(){this.domElement=element('canvas');}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}}};
 const ctx=vm.createContext({window:win,document:{createElement:()=>element('canvas-'+elements.size),getElementById:element,body:{prepend(){}}},location:{search},URLSearchParams,innerWidth:1280,innerHeight:800,requestAnimationFrame:fn=>frames.push(fn),console});
 vm.runInContext(source,ctx,{timeout:10000});
 const key=code=>{events.keydown({code,repeat:false,preventDefault(){}});win.test.handleInput();events.keyup({code});};
 return {win,elements,frames,key,test:win.test};
}
const normal=boot();const {test,win,key,elements}=normal;
assert.equal(win.__flightGame.state,'title');elements.get('start').events.click();assert.equal(win.__flightGame.state,'flying');assert.equal(test.camera.parent,test.plane.root);
key('KeyC');assert.equal(test.camera.parent,test.world.scene);key('KeyC');assert.equal(test.camera.parent,test.plane.root);
key('KeyP');assert.equal(win.__flightGame.state,'paused');key('Escape');assert.equal(win.__flightGame.state,'flying');
// Simulate crossing a gate out of order, followed by all eight valid gates.
function cross(index){const r=test.world.rings[index].group.position,s=test.plane.state;Object.assign(s,{onGround:false,airborne:true,speed:50,vy:0,bank:0,yaw:0,pitch:.055});s.position.set(r.x,r.y,r.z+.2);test.fixedStep(1/60);}
cross(2);assert.equal(test.flight.next,0);
for(let i=0;i<8;i++){cross(i);assert.equal(test.flight.next,i+1);}
assert.equal(win.__flightGame.state,'landing');
let s=test.plane.state;Object.assign(s,{onGround:false,speed:40,vy:-2,pitch:0,bank:0});s.position.set(0,22.805,2600);test.fixedStep(1/60);assert.equal(win.__flightGame.state,'success');assert(test.flight.score>=3000);
key('KeyR');assert.equal(win.__flightGame.state,'flying');
s=test.plane.state;Object.assign(s,{onGround:false,speed:40,vy:-5});s.position.set(150,15,0);test.fixedStep(1/60);assert.equal(win.__flightGame.state,'crashed');key('KeyR');assert.equal(win.__flightGame.state,'flying');
test.flight.timeLeft=.001;test.fixedStep(1/60);assert.equal(win.__flightGame.state,'crashed');
console.log('PASS: shipped offline boot; title → flying; camera toggle; pause / resume; ordered rings → landing → success; crash / timeout / restart');
for(const name of ['cover','cockpit','rings','chase','title']){
 const b=boot('?shot='+name+'&seed=1');for(const frame of b.frames)frame(16);assert.equal(b.win.__shotReady,true);assert.equal(b.win.__flightGame.shotSteps,90);
 const t=b.test,THREEVector=t.plane.root.position.constructor;
 const sample=name==='cockpit'?new THREEVector(0,21,2600):t.plane.state.position.clone();sample.project(t.camera);
 assert(Math.abs(sample.x)<1&&Math.abs(sample.y)<1,'composition target outside '+name+' view');
 console.log('PASS: '+name+' / SHOT-READY / target NDC '+sample.x.toFixed(3)+', '+sample.y.toFixed(3));
}
