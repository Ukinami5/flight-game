export function createInput(onGesture) {
  const keys=Object.create(null),pressed=Object.create(null),control={pitch:0,roll:0,rudder:0,throttle:0,brake:false};
  let dragging=false,startX=0,startY=0,mx=0,my=0;
  const allowed=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','KeyB','KeyC','KeyR','KeyP','Escape','Enter','KeyM']);
  window.addEventListener('keydown',e=>{if(allowed.has(e.code))e.preventDefault();if(!keys[e.code]&&!e.repeat)pressed[e.code]=true;keys[e.code]=true;onGesture();});
  window.addEventListener('keyup',e=>{keys[e.code]=false;});
  window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;dragging=false;mx=my=0;pressed.Blur=true;});
  window.addEventListener('pointerdown',e=>{onGesture();if(e.target.tagName==='CANVAS'){dragging=true;startX=e.clientX;startY=e.clientY;}});
  window.addEventListener('pointermove',e=>{if(dragging){mx=Math.max(-1,Math.min(1,(startX-e.clientX)/180));my=Math.max(-1,Math.min(1,(e.clientY-startY)/180));}});
  window.addEventListener('pointerup',()=>{dragging=false;mx=my=0;});
  return {take(key){const v=!!pressed[key];pressed[key]=false;return v;},clear(){for(const k in pressed)pressed[k]=false;},sample(){
    control.pitch=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0)+my;
    control.roll=(keys.ArrowLeft||keys.KeyA?1:0)-(keys.ArrowRight||keys.KeyD?1:0)+mx;
    control.rudder=(keys.KeyQ?1:0)-(keys.KeyE?1:0);
    control.throttle=(keys.KeyW?1:0)-(keys.KeyS?1:0);control.brake=!!keys.KeyB;return control;
  }};
}
