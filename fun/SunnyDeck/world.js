/* ===================================================================
   SUNNY DECK // RETRO  —  world.js
   In-world day/night clock + weather per session. Zero API cost:
   the clock advances with exchanges (and real time in hybrid mode),
   weather drifts through a Markov table on ambient beats. Current
   time + weather are injected into prompts via worldPromptNote().
   =================================================================== */
'use strict';

const WORLD_MIN_PER_EXCHANGE=12;
const WORLD_TICK_MS=20000;            // hybrid mode: +1 in-world minute per 20s
const WEATHER_STATES=['clear','rain','storm','snow','fog'];
const WEATHER_EMOJI={clear:'☀',rain:'🌧',storm:'⛈',snow:'❄',fog:'🌫'};
/* Markov transition table; snow entries only used in 'cold' climates. */
const WEATHER_NEXT={
  clear:{clear:.7,fog:.1,rain:.2},
  rain:{rain:.5,clear:.3,storm:.2},
  storm:{rain:.6,storm:.3,clear:.1},
  snow:{snow:.6,clear:.3,fog:.1},
  fog:{fog:.5,clear:.5}
};
const PHASE_LINES={
  dawn:'Dawn breaks; the first light creeps in and the sky slowly turns gold.',
  day:'The sun climbs high. It is fully daytime now.',
  dusk:'The light turns amber and long shadows stretch out. Dusk settles in.',
  night:'The sun is gone. Night falls and everything softens into darkness.'
};
const WEATHER_LINES={
  clear:'The weather clears up; the sky opens wide.',
  rain:'A steady rain starts to fall, drumming on everything.',
  storm:'The sky darkens fast — a storm rolls in with wind and thunder.',
  snow:'Snow begins drifting down in slow, quiet flakes.',
  fog:'A thick fog creeps in, blurring everything past arm\'s reach.'
};

function ensureWorldState(sess,realm){
  if(!sess.world){
    sess.world={
      minutes:realm?.worldConfig?.startMinutes??840,  // 14:00 default
      day:1,weather:'clear',weatherSince:0
    };
  }
  return sess.world;
}
function worldClimate(){return currentRealm?.worldConfig?.climate||'temperate';}
function worldPhase(minutes){
  const h=Math.floor(minutes/60);
  if(h>=5&&h<8)return'dawn';
  if(h>=8&&h<18)return'day';
  if(h>=18&&h<21)return'dusk';
  return'night';
}
function fmtWorldTime(minutes){
  const h=Math.floor(minutes/60),m=Math.floor(minutes%60);
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}

let worldSaveTimer=null;
function scheduleWorldSave(){
  clearTimeout(worldSaveTimer);
  worldSaveTimer=setTimeout(()=>{if(currentSession)dbPut('sessions',currentSession);},1000);
}

/* ====================== CLOCK ====================== */
function advanceWorldMinutes(n,quiet){
  const sess=currentSession;if(!sess?.world)return;
  const before=worldPhase(sess.world.minutes);
  sess.world.minutes+=n;
  while(sess.world.minutes>=1440){sess.world.minutes-=1440;sess.world.day++;}
  const after=worldPhase(sess.world.minutes);
  if(after!==before&&!quiet){
    const h={kind:'event',speakerKey:'',speaker:'Narrator',text:PHASE_LINES[after],timestamp:Date.now()};
    addChatBubble(h);sess.history.push(h);
  }
  applyWorldVisuals();
  renderWorldHud();
  scheduleWorldSave();
}
function worldOnExchange(){
  if(typeof settings!=='undefined'&&settings.worldClockMode==='off')return;
  advanceWorldMinutes(WORLD_MIN_PER_EXCHANGE);
}

let worldClockTimer=null;
function startWorldClock(){
  stopWorldClock();
  if(typeof settings!=='undefined'&&settings.worldClockMode!=='hybrid')return;
  worldClockTimer=setInterval(()=>{
    if(document.hidden||!currentSession?.world)return;
    if(!document.getElementById('screen-chat')?.classList.contains('active'))return;
    advanceWorldMinutes(1);
  },WORLD_TICK_MS);
}
function stopWorldClock(){clearInterval(worldClockTimer);worldClockTimer=null;}

/* ====================== WEATHER ====================== */
function pickNextWeather(cur){
  const table=WEATHER_NEXT[cur]||WEATHER_NEXT.clear;
  const entries=Object.entries(table).filter(([w])=>w!=='snow'||worldClimate()==='cold');
  /* cold climates: give snow a chance from clear/fog */
  if(worldClimate()==='cold'&&(cur==='clear'||cur==='fog'))entries.push(['snow',.25]);
  const total=entries.reduce((s,[,p])=>s+p,0);
  let r=Math.random()*total;
  for(const[w,p]of entries){r-=p;if(r<=0)return w;}
  return cur;
}
/* Called from the director's ambient beat — zero API cost. */
function weatherDirectorTick(){
  const sess=currentSession;if(!sess?.world)return;
  if(Math.random()>0.2)return;
  if((sess.history||[]).length-(sess.world.weatherSince||0)<8)return;
  const next=pickNextWeather(sess.world.weather);
  if(next===sess.world.weather)return;
  sess.world.weather=next;
  sess.world.weatherSince=(sess.history||[]).length;
  const h={kind:'event',speakerKey:'',speaker:'Narrator',text:WEATHER_LINES[next],timestamp:Date.now()};
  addChatBubble(h);sess.history.push(h);
  applyWorldVisuals();
  renderWorldHud();
  if(typeof soundWeatherChanged==='function')soundWeatherChanged(next);
  scheduleWorldSave();
}

/* ====================== VISUAL LAYER ====================== */
let stormFlashTimer=null;
function initWorldLayer(realm,sess){
  ensureWorldState(sess,realm);
  const mapEl=document.getElementById('chatMap');
  if(mapEl&&!document.getElementById('worldTint')){
    const tint=document.createElement('div');tint.id='worldTint';
    const fx=document.createElement('div');fx.id='weatherFx';
    mapEl.append(tint,fx);
  }
  applyWorldVisuals();
  renderWorldHud();
  document.getElementById('worldHud').style.display='flex';
  if(typeof soundWeatherChanged==='function')soundWeatherChanged(sess.world.weather);
}

function applyWorldVisuals(){
  const sess=currentSession,mapEl=document.getElementById('chatMap');
  if(!sess?.world||!mapEl)return;
  const phase=worldPhase(sess.world.minutes);
  ['dawn','day','dusk','night'].forEach(p=>mapEl.classList.toggle('phase-'+p,p===phase));
  WEATHER_STATES.forEach(w=>mapEl.classList.toggle('weather-'+w,w===sess.world.weather));
  renderWeatherParticles(mapEl,sess.world.weather);
  clearInterval(stormFlashTimer);stormFlashTimer=null;
  if(sess.world.weather==='storm'&&(typeof settings==='undefined'||settings.weatherFxEnabled!==false)){
    stormFlashTimer=setInterval(()=>{
      const tint=document.getElementById('worldTint');if(!tint)return;
      if(document.hidden||!document.getElementById('screen-chat')?.classList.contains('active'))return;
      tint.classList.add('flash');
      setTimeout(()=>tint.classList.remove('flash'),120);
      if(typeof sfx==='function')sfx('thunder');
    },6000+Math.random()*8000);
  }
}

function renderWeatherParticles(mapEl,weather){
  const fx=document.getElementById('weatherFx');if(!fx)return;
  fx.innerHTML='';
  if(typeof settings!=='undefined'&&settings.weatherFxEnabled===false)return;
  if(weather==='rain'||weather==='storm'||weather==='snow'){
    const n=weather==='storm'?30:20;
    for(let i=0;i<n;i++){
      const p=document.createElement('i');
      p.style.left=(Math.random()*100)+'%';
      p.style.animationDelay=(Math.random()*3)+'s';
      p.style.animationDuration=(weather==='snow'?3+Math.random()*3:0.6+Math.random()*0.7)+'s';
      fx.appendChild(p);
    }
  }else if(weather==='fog'){
    const b1=document.createElement('div');b1.className='fog-band';b1.style.top='12%';
    const b2=document.createElement('div');b2.className='fog-band b2';
    fx.append(b1,b2);
  }
}

/* ====================== HUD ====================== */
function renderWorldHud(){
  const hud=document.getElementById('worldHud');if(!hud)return;
  const w=currentSession?.world;if(!w){hud.style.display='none';return;}
  const phase=worldPhase(w.minutes);
  const icon=phase==='night'?'☾':phase==='dawn'?'🌅':phase==='dusk'?'🌇':'☀';
  hud.innerHTML=`<span class="world-pill" title="Day ${w.day} — click to toggle weather effects">${icon} ${fmtWorldTime(w.minutes)} · ${phase.toUpperCase()} · ${WEATHER_EMOJI[w.weather]||''} ${w.weather.toUpperCase()}</span>`;
  hud.querySelector('.world-pill').onclick=async()=>{
    settings.weatherFxEnabled=settings.weatherFxEnabled===false;
    await saveSettings();
    applyWorldVisuals();
    toast(settings.weatherFxEnabled?'WEATHER FX ON':'WEATHER FX OFF');
  };
}

function worldOnScreenChange(id){
  if(id!=='screen-chat'){
    stopWorldClock();
    clearInterval(stormFlashTimer);stormFlashTimer=null;
    const hud=document.getElementById('worldHud');
    if(hud)hud.style.display='none';
  }
}

/* ====================== PROMPT NOTE ====================== */
function worldPromptNote(){
  const w=currentSession?.world;if(!w)return'';
  const phase=worldPhase(w.minutes);
  const weatherTxt={
    clear:'the weather is clear',rain:'steady rain is falling',
    storm:'a thunderstorm is raging',snow:'snow is falling',fog:'thick fog covers everything'
  }[w.weather]||'';
  return`In-world time: ${phase} (~${fmtWorldTime(w.minutes)}), and ${weatherTxt}.`;
}
