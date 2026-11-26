export function createHUD() {
  const $=id=>document.getElementById(id),els={alt:$('alt'),spd:$('spd'),hdg:$('hdg'),vsi:$('vsi'),throttle:$('throttle'),rings:$('rings'),score:$('score'),time:$('time'),mission:$('mission'),distance:$('distance'),message:$('message'),stall:$('stall'),view:$('view'),overlay:$('overlay'),hud:$('hud'),title:$('title-screen'),result:$('result-screen'),pause:$('pause-screen'),mute:$('mute')};
  let flashUntil=0,flashMessage='',last=-1;
  return {flash(message,time,duration=2.5){flashMessage=message;flashUntil=time+duration;},view(chase){els.view.textContent=chase?'CHASE CAM':'COCKPIT';},muted(v){els.mute.textContent=v?'M · SOUND OFF':'M · SOUND ON';},screen(state,data={}){
    els.overlay.hidden=state==='flying'||state==='landing';els.title.hidden=state!=='title';els.pause.hidden=state!=='paused';els.result.hidden=!['success','crashed'].includes(state);els.hud.hidden=state==='title';
    if(state==='success'||state==='crashed'){
      $('result-kicker').textContent=state==='success'?'FLIGHT LOG / COMPLETE':'FLIGHT LOG / ENDED';$('result-title').textContent=state==='success'?'A perfect return.':'Flight interrupted.';
      $('result-sub').textContent=state==='success'?'Eight gates. One valley. Home in one piece.':data.reason+' · Press R for a fresh flight.';
      $('result-score').textContent=String(data.score||0).padStart(4,'0');$('result-rings').textContent=(data.rings||0)+' / 8';$('result-bonus').textContent=String(data.bonus||0);$('result-landing').textContent=state==='success'?'+ 1000':'—';
    }
  },update(s,flight,world,time,force=false){
    if(!force&&Math.floor(time*10)===last)return;last=Math.floor(time*10);
    const heading=((-s.yaw*180/Math.PI)%360+360)%360;
    els.alt.textContent=Math.round(s.position.y*3.28084).toLocaleString('en-US');els.spd.textContent=String(Math.round(s.speed*1.94384)).padStart(3,'0');els.hdg.textContent=String(Math.round(heading)%360).padStart(3,'0')+'°';
    const vsi=Math.round(s.vy*196.85/10)*10;els.vsi.textContent=(vsi>0?'+':'')+vsi;els.throttle.style.transform='scaleX('+s.throttle+')';$('throttle-value').textContent=Math.round(s.throttle*100)+'%';
    els.rings.textContent=String(flight.next).padStart(2,'0')+' / 08';els.score.textContent=String(flight.score).padStart(4,'0');
    const left=Math.max(0,Math.ceil(flight.timeLeft));els.time.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
    els.stall.hidden=!s.stall;els.message.textContent=time<flashUntil?flashMessage:'';
    if(flight.next<8){const target=world.rings[flight.next].group.position;const dist=Math.hypot(target.x-s.position.x,target.y-s.position.y,target.z-s.position.z);els.mission.textContent='GATE '+String(flight.next+1).padStart(2,'0')+' / CANYON RUN';els.distance.textContent=(dist/1000).toFixed(2)+' KM TO GATE';}
    else{els.mission.textContent='RETURN TO STRIP / LAND';els.distance.textContent='RWY 18 / 36 · '+(Math.hypot(s.position.x,s.position.z-2600)/1000).toFixed(1)+' KM';}
  }};
}
