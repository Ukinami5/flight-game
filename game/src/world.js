import * as THREE from '../vendor/three.module.min.js';
import { mulberry32, clamp } from './random.js';

export const FIELD_Y = 21;
export const RUNWAY = { x: 0, z: 2600, length: 900, width: 45, y: FIELD_Y };
export function riverX(z) { return -290 + Math.sin(z * .00087) * 105 + Math.sin(z * .0019) * 35; }
export function buildWorld(seed) {
  const rng = mulberry32(seed), scene = new THREE.Scene();
  scene.background = new THREE.Color('#a5bec1');
  scene.fog = new THREE.FogExp2('#b9c2b2', .000105);
  scene.add(new THREE.HemisphereLight('#c8e7ff', '#6a5537', 2.0));
  const sun = new THREE.DirectionalLight('#ffcf85', 3.1);
  sun.position.set(-3200, 2700, -4400); scene.add(sun);
  const skyGeo = new THREE.SphereGeometry(19000, 40, 20);
  const sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#226080') }, horizon: { value: new THREE.Color('#f3d4a2') } },
    vertexShader: 'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){float h=clamp(normalize(vP).y,0.,1.);gl_FragColor=vec4(mix(horizon,top,pow(h,.48)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
  }));
  scene.add(sky);
  function glowTexture() {
    const c = document.createElement('canvas'); c.width=c.height=128;
    const a=c.getContext('2d'), g=a.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,255,255,.65)');g.addColorStop(.4,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');
    a.fillStyle=g;a.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
  }
  const glow=glowTexture();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:'#ffe7b4',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  sunSprite.position.set(-6100,3900,-10500);sunSprite.scale.set(3700,3700,1);scene.add(sunSprite);
  const disc=new THREE.Mesh(new THREE.SphereGeometry(170,24,16),new THREE.MeshBasicMaterial({color:'#fff0c6',fog:false}));disc.position.copy(sunSprite.position);scene.add(disc);
  const phase=rng()*6.28;
  function terrainHeight(x,z) {
    // A broad, nearly level floodplain gives way to ridges on either side.
    const ridge=Math.max(0,(Math.abs(x)-460)/1550);
    const waves=.56+.24*Math.sin(z*.00108+phase+x*.00085)+.15*Math.sin(z*.0022-x*.0021)+.1*Math.cos(z*.0037+x*.0014);
    return 15 + Math.min(1,Math.abs(x)/420)*4 + Math.pow(ridge,1.12)*(650+1550*Math.max(.1,waves)) + Math.pow(ridge,.7)*70*Math.sin(x*.008+z*.005);
  }
  const terrainGeo = new THREE.PlaneGeometry(14000,14000,220,220);terrainGeo.rotateX(-Math.PI/2);
  const pos=terrainGeo.attributes.position;
  for(let i=0;i<pos.count;i++) pos.setY(i,terrainHeight(pos.getX(i),pos.getZ(i)));
  terrainGeo.computeVertexNormals();
  const normals=terrainGeo.attributes.normal, colors=new Float32Array(pos.count*3), col=new THREE.Color();
  const valley=new THREE.Color('#456d4e'), grass=new THREE.Color('#7a8556'), stone=new THREE.Color('#8e887a'), snow=new THREE.Color('#e1e2cf');
  for(let i=0;i<pos.count;i++) {
    const y=pos.getY(i), slope=1-normals.getY(i), variation=.89+rng()*.2;
    col.copy(valley).lerp(grass,clamp(y/700,0,1));
    col.lerp(stone,clamp(slope*1.9+(y-500)/1200,0,.95));
    col.lerp(snow,clamp((y-1750)/500,0,1));col.multiplyScalar(variation);col.toArray(colors,i*3);
  }
  terrainGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  scene.add(new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true})));
  const silhouetteMat=new THREE.MeshStandardMaterial({color:'#758b88',flatShading:true,roughness:1});
  const peakGeo=new THREE.ConeGeometry(1,1,5);
  for(let i=0;i<42;i++) {
    const a=i/42*Math.PI*2, peak=new THREE.Mesh(peakGeo,silhouetteMat), h=1200+rng()*1900;
    peak.position.set(Math.sin(a)*8500,h/2-130,Math.cos(a)*8500);peak.scale.set(1200+rng()*900,h,1100+rng()*1100);peak.rotation.y=rng()*6;scene.add(peak);
  }
  // Continuous water ribbon, flat and slightly above the floodplain.
  const rv=[], ri=[];
  for(let i=0;i<=300;i++) { const z=-7000+i/300*14000, x=riverX(z), w=34+Math.sin(z*.002)*9;rv.push(x-w,20,z,x+w,20,z);if(i<300){const n=i*2;ri.push(n,n+2,n+1,n+1,n+2,n+3);} }
  const riverGeo=new THREE.BufferGeometry();riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(rv,3));riverGeo.setIndex(ri);riverGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(riverGeo,new THREE.MeshStandardMaterial({color:'#358e9d',metalness:.48,roughness:.22,side:THREE.DoubleSide})));
  const mats={asphalt:new THREE.MeshStandardMaterial({color:'#28383d',roughness:.95}),white:new THREE.MeshStandardMaterial({color:'#f4e9ce',roughness:.9}),red:new THREE.MeshStandardMaterial({color:'#a24d39'}),hangar:new THREE.MeshStandardMaterial({color:'#9caaa0',roughness:.8}),dark:new THREE.MeshStandardMaterial({color:'#41595b'})};
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  function box(x,y,z,w,h,d,mat){const m=new THREE.Mesh(boxGeo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);scene.add(m);return m;}
  box(0,20.65,2600,65,.3,960,new THREE.MeshStandardMaterial({color:'#9c9b78'}));
  box(0,20.95,2600,45,.1,900,mats.asphalt);
  for(let z=2190;z<3035;z+=62) box(0,21.025,z,1.2,.03,24,mats.white);
  for(const x of [-21.4,21.4])box(x,21.03,2600,.55,.03,890,mats.white);
  for(const z of [2167,3033])for(let i=-4;i<=4;i++)if(i!==0)box(i*4,21.03,z,2.4,.03,27,mats.white);
  const runwayCanvas=document.createElement('canvas');runwayCanvas.width=256;runwayCanvas.height=256;const rc=runwayCanvas.getContext('2d');rc.clearRect(0,0,256,256);rc.fillStyle='#f4e9ce';rc.font='bold 140px monospace';rc.textAlign='center';rc.fillText('36',128,176);
  const numberMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(runwayCanvas),transparent:true,depthWrite:false});
  const number=new THREE.Mesh(new THREE.PlaneGeometry(17,25),numberMat);number.rotation.x=-Math.PI/2;number.position.set(0,21.06,2984);scene.add(number);
  const number2=number.clone();number2.rotation.z=Math.PI;number2.position.z=2216;scene.add(number2);
  const bulbGeo=new THREE.SphereGeometry(.7,6,4),warmBulb=new THREE.MeshBasicMaterial({color:'#ffe6ae'});
  for(let z=2160;z<=3040;z+=55)for(const x of [-24,24]){const b=new THREE.Mesh(bulbGeo,warmBulb);b.position.set(x,22,z);scene.add(b);}
  const papiRed=new THREE.MeshBasicMaterial({color:'#ff4430'}),papiWhite=new THREE.MeshBasicMaterial({color:'#fff3df'});
  for(let i=0;i<4;i++){box(-40-i*4,22,2280,2,1.5,2,mats.white);box(-40-i*4,22.2,2278.95,1.65,.6,.12,i<2?papiRed:papiWhite);}
  box(80,20.9,2710,85,.2,250,mats.asphalt);
  for(let i=0;i<3;i++){box(112,29,2650+i*75,44,18,56,mats.hangar);box(88.9,27,2650+i*75,.3,13,40,mats.dark);const roof=new THREE.Mesh(new THREE.CylinderGeometry(31,31,44,3),mats.dark);roof.rotation.z=Math.PI/2;roof.position.set(112,37,2650+i*75);roof.scale.z=.95;scene.add(roof);}
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.24,.4,13,7),mats.white);pole.position.set(65,27.5,2450);scene.add(pole);
  const windsock=new THREE.Group();windsock.position.set(65,34,2450);windsock.rotation.z=-.15;
  for(let i=0;i<5;i++){const seg=new THREE.Mesh(new THREE.CylinderGeometry(1.4-i*.18,1.22-i*.18,1.8,10,1,true),i%2?mats.white:mats.red);seg.rotation.z=Math.PI/2;seg.position.x=1+i*1.7;windsock.add(seg);}scene.add(windsock);
  // Instanced low-poly trees supply scale without thousands of draw calls.
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.6,.9,5,4),new THREE.MeshStandardMaterial({color:'#69583e'}),550);
  const trees=new THREE.InstancedMesh(new THREE.ConeGeometry(5,18,5),new THREE.MeshStandardMaterial({color:'#284d42',roughness:1}),550);
  const matrix=new THREE.Matrix4(), p=new THREE.Vector3(), q=new THREE.Quaternion(), sc=new THREE.Vector3();
  for(let i=0;i<550;i++){let x=(rng()-.5)*3000,z=(rng()-.5)*12500;if(Math.abs(x)<105)x+=x<0?-135:135;if(Math.abs(x-riverX(z))<65)x+=130;const y=terrainHeight(x,z),s=.6+rng()*.9;p.set(x,y+10*s,z);sc.setScalar(s);matrix.compose(p,q,sc);trees.setMatrixAt(i,matrix);p.y=y+2;matrix.compose(p,q,sc);trunks.setMatrixAt(i,matrix);}scene.add(trees,trunks);
  // Each cloud is one merged BufferGeometry of flattened icosahedrons.
  const cloudMat=new THREE.MeshStandardMaterial({color:'#fff0d6',roughness:1,flatShading:true});
  for(let c=0;c<15;c++) {
    const vertices=[];
    for(let j=0;j<5;j++){const g=new THREE.IcosahedronGeometry(1,1);g.scale(80+rng()*90,28+rng()*35,55+rng()*55);g.translate(j*95,Math.sin(j)*15,Math.sin(j*3)*30);vertices.push(...g.attributes.position.array);g.dispose();}
    const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));cg.computeVertexNormals();
    const cloud=new THREE.Mesh(cg,cloudMat);cloud.position.set((rng()-.5)*10500,1700+rng()*1500,(rng()-.5)*13000);scene.add(cloud);
  }
  const course=[[0,165,1730],[-155,235,850],[175,320,-40],[-180,365,-970],[120,435,-1880],[-155,345,-2780],[120,255,-3630],[0,175,-4480]];
  const rings=[],ringGeo=new THREE.TorusGeometry(64,2.1,10,72),rimGeo=new THREE.TorusGeometry(70,.38,5,72);
  for(let i=0;i<course.length;i++) {
    const color=i%2?'#6ee6ee':'#ffb550',mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2,roughness:.3,metalness:.3});
    const group=new THREE.Group();group.position.set(...course[i]);
    const torus=new THREE.Mesh(ringGeo,mat);group.add(torus);
    group.add(new THREE.Mesh(rimGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.4})));
    const glowMat=new THREE.SpriteMaterial({map:glow,color,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending});
    const halo=new THREE.Sprite(glowMat);halo.scale.set(182,182,1);group.add(halo);
    // Luminous cardinal ticks give the course a restrained navigational language.
    for(let j=0;j<4;j++){const a=j*Math.PI/2,b=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color}));b.scale.set(1.8,9,1.8);b.position.set(Math.sin(a)*76,Math.cos(a)*76,0);b.rotation.z=-a;group.add(b);}
    const labelCanvas=document.createElement('canvas');labelCanvas.width=128;labelCanvas.height=64;const lc=labelCanvas.getContext('2d');lc.fillStyle='white';lc.font='500 38px monospace';lc.textAlign='center';lc.fillText(String(i+1).padStart(2,'0'),64,44);
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),transparent:true,depthWrite:false}));label.scale.set(28,14,1);label.position.y=94;group.add(label);
    scene.add(group);rings.push({group,mat,glowMat,passed:false,radius:62});
  }
  return {scene,terrainHeight,rings,riverX,windsock,sky,update(time,next){
    windsock.rotation.y=Math.sin(time*.45)*.13;
    for(let i=0;i<rings.length;i++){const r=rings[i];r.mat.emissiveIntensity=r.passed?1.2:i===next?2.2+Math.sin(time*3)*.65:.65;r.glowMat.opacity=r.passed?.07:i===next?.28+Math.sin(time*3)*.08:.06;}
  }};
}
