/* ===================================================================
   SUNNY DECK // RETRO  —  sound.js
   Synthesized chiptune SFX + optional ambient loop. WebAudio only,
   no audio files. Classic script sharing app.js globals (settings).
   AudioContext is created lazily on the first user gesture so the
   browser autoplay policy is never violated.
   =================================================================== */
'use strict';

let audioCtx=null,masterGain=null,noiseBuf=null;

function ensureAudio(){
  if(!window.AudioContext&&!window.webkitAudioContext)return null;
  if(!audioCtx){
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=audioCtx.createGain();
    masterGain.gain.value=(typeof settings!=='undefined'?settings.soundVolume:0.4)??0.4;
    masterGain.connect(audioCtx.destination);
  }
  if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  return audioCtx;
}
document.addEventListener('pointerdown',ensureAudio,{once:true});
document.addEventListener('keydown',ensureAudio,{once:true});

function setSfxVolume(v){
  if(masterGain)masterGain.gain.value=Math.min(1,Math.max(0,v));
}

function getNoiseBuf(){
  if(noiseBuf)return noiseBuf;
  const len=audioCtx.sampleRate*1.5;
  noiseBuf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
  const d=noiseBuf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  return noiseBuf;
}

/* One oscillator note with an exponential decay envelope. */
function blip(freq,dur,type,when,vol,endFreq){
  const t=audioCtx.currentTime+(when||0);
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type||'square';
  o.frequency.setValueAtTime(freq,t);
  if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+dur);
  g.gain.setValueAtTime(vol??0.18,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g);g.connect(masterGain);
  o.start(t);o.stop(t+dur+0.02);
}

/* Filtered noise burst (dice clatter, thunder). */
function noiseBurst(dur,when,vol,filterFreq){
  const t=audioCtx.currentTime+(when||0);
  const src=audioCtx.createBufferSource();src.buffer=getNoiseBuf();
  const f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=filterFreq||900;
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(vol??0.2,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  src.connect(f);f.connect(g);g.connect(masterGain);
  src.start(t);src.stop(t+dur+0.05);
}

function sfx(name){
  if(typeof settings!=='undefined'&&settings.soundEnabled===false)return;
  if(!ensureAudio())return;
  try{
    switch(name){
      case 'send':blip(440,0.09,'square',0,0.12,660);break;
      case 'reply':blip(880,0.08,'triangle',0,0.14);blip(587,0.12,'triangle',0.07,0.14);break;
      case 'screen':blip(1150,0.035,'square',0,0.06);break;
      case 'toastPing':blip(1200,0.18,'sine',0,0.10);break;
      case 'roll':for(let i=0;i<6;i++)noiseBurst(0.05,i*0.07,0.12,2200);break;
      case 'rollCrit':[523,659,784,1047].forEach((f,i)=>blip(f,0.14,'square',i*0.09,0.13));break;
      case 'rollFail':blip(330,0.16,'square',0,0.14,180);blip(196,0.3,'square',0.14,0.14,110);break;
      case 'questStart':[392,523,659].forEach((f,i)=>blip(f,0.13,'triangle',i*0.1,0.14));break;
      case 'questDone':
      case 'achievement':[523,659,784,1047,1319].forEach((f,i)=>blip(f,0.16,'square',i*0.08,0.12));break;
      case 'objective':blip(784,0.1,'triangle',0,0.13);blip(1047,0.14,'triangle',0.08,0.13);break;
      case 'thunder':noiseBurst(1.2,0,0.28,300);noiseBurst(0.6,0.12,0.2,160);break;
      default:break;
    }
  }catch(e){/* audio is best-effort */}
}

/* ====================== AMBIENT LOOP ====================== */
/* A very quiet 8-step arpeggio; rain/storm add a noise-wash layer. */
let ambientLoopTimer=null,ambientStep=0,ambientWeather='clear';
const AMBIENT_STEPS=[262,330,392,523,392,330,294,392];

function ambientTick(){
  if(!audioCtx||typeof settings==='undefined'||!settings.ambientLoopEnabled)return;
  if(settings.soundEnabled===false)return;
  const f=AMBIENT_STEPS[ambientStep%AMBIENT_STEPS.length];
  ambientStep++;
  const t=audioCtx.currentTime;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),flt=audioCtx.createBiquadFilter();
  o.type='triangle';o.frequency.value=f/2;
  flt.type='lowpass';flt.frequency.value=700;
  g.gain.setValueAtTime(0.035,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+0.55);
  o.connect(flt);flt.connect(g);g.connect(masterGain);
  o.start(t);o.stop(t+0.6);
  if((ambientWeather==='rain'||ambientWeather==='storm')&&ambientStep%2===0){
    noiseBurst(0.5,0,ambientWeather==='storm'?0.05:0.03,600);
  }
}
function startAmbientLoop(){
  stopAmbientLoop();
  if(typeof settings!=='undefined'&&!settings.ambientLoopEnabled)return;
  if(!ensureAudio())return;
  ambientLoopTimer=setInterval(ambientTick,620);
}
function stopAmbientLoop(){clearInterval(ambientLoopTimer);ambientLoopTimer=null;}
function soundWeatherChanged(weather){ambientWeather=weather||'clear';}

function soundOnScreenChange(id){
  if(id==='screen-chat')startAmbientLoop();
  else stopAmbientLoop();
}
