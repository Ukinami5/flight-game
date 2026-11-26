import { mulberry32 } from './random.js';
export function createAudio() {
  let ctx,master,engine,engineGain,filter,muted=false;
  function start(){
    if(ctx){if(ctx.state==='suspended')ctx.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    ctx=new AC();master=ctx.createGain();master.gain.value=.38;master.connect(ctx.destination);
    filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;filter.connect(master);
    engineGain=ctx.createGain();engineGain.gain.value=0;engineGain.connect(filter);
    engine=ctx.createOscillator();engine.type='sawtooth';engine.frequency.value=45;engine.connect(engineGain);engine.start();
    const rng=mulberry32(412),buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(rng()*2-1)*.2;
    const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;noise.connect(engineGain);noise.start();
  }
  function tone(freq,when,duration,volume,type='sine') {if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime+when);g.gain.setValueAtTime(0,ctx.currentTime+when);g.gain.linearRampToValueAtTime(volume,ctx.currentTime+when+.015);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+when+duration);o.connect(g);g.connect(master);o.start(ctx.currentTime+when);o.stop(ctx.currentTime+when+duration+.02);}
  return {start,toggle(){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.38,ctx.currentTime,.03);return muted;},update(throttle,active){if(!ctx)return;engine.frequency.setTargetAtTime(32+throttle*64,ctx.currentTime,.15);engineGain.gain.setTargetAtTime(active?.07+throttle*.075:0,ctx.currentTime,.12);filter.frequency.setTargetAtTime(240+throttle*620,ctx.currentTime,.15);},ring(){tone(660,0,.38,.24);tone(990,.1,.6,.19);},success(){[523,659,784,1047].forEach((f,i)=>tone(f,i*.16,.8,.22));},crash(){tone(70,0,.65,.6,'triangle');tone(42,.08,.9,.35,'sawtooth');}};
}
