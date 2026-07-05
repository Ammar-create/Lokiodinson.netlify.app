/* ===================================================================
   SUNNY DECK // RETRO  —  application logic
   Vanilla JS · ES2020 · no globals on window · IndexedDB for persistence
   =================================================================== */
'use strict';

/* ====================== THEMES ====================== */
const THEMES={
  synthwave:{
    '--bg':'#0d0221','--surface':'#160a2e','--surface-2':'#1f1140','--surface-3':'#2a1a55',
    '--border':'#3b2a6e','--border-soft':'#2a1a55','--neon-1':'#ff2e97','--neon-2':'#00f0ff',
    '--neon-3':'#ffe600','--danger':'#ff3860','--ok':'#00ff9c',
    '--text':'#f2eaff','--text-2':'#b39ddb','--text-3':'#7a63a8'
  },
  terminal:{
    '--bg':'#020a02','--surface':'#07140a','--surface-2':'#0c2010','--surface-3':'#123018',
    '--border':'#1e4a28','--border-soft':'#123018','--neon-1':'#33ff33','--neon-2':'#7dff9a',
    '--neon-3':'#d4ff33','--danger':'#ff5533','--ok':'#33ff33',
    '--text':'#d8ffd8','--text-2':'#7ec98a','--text-3':'#4a7a52'
  },
  vaporwave:{
    '--bg':'#160b26','--surface':'#231240','--surface-2':'#2f1a55','--surface-3':'#3c266b',
    '--border':'#54398c','--border-soft':'#3c266b','--neon-1':'#ff71ce','--neon-2':'#01cdfe',
    '--neon-3':'#05ffa1','--danger':'#ff4f7b','--ok':'#05ffa1',
    '--text':'#fdf3ff','--text-2':'#c9a9e8','--text-3':'#8a6bb5'
  },
  sunset:{
    '--bg':'#1a0a05','--surface':'#28110a','--surface-2':'#381a10','--surface-3':'#4a2416',
    '--border':'#6b3a22','--border-soft':'#4a2416','--neon-1':'#ff6b1a','--neon-2':'#ffd23f',
    '--neon-3':'#ff2e63','--danger':'#ff2e63','--ok':'#7dff9a',
    '--text':'#fff3e8','--text-2':'#e8a87c','--text-3':'#a06a48'
  },
  arcade:{
    '--bg':'#04041c','--surface':'#0a0a30','--surface-2':'#121245','--surface-3':'#1c1c5e',
    '--border':'#2e2e80','--border-soft':'#1c1c5e','--neon-1':'#ff2222','--neon-2':'#22aaff',
    '--neon-3':'#ffcc00','--danger':'#ff2222','--ok':'#22ff88',
    '--text':'#eef2ff','--text-2':'#9aa8e0','--text-3':'#5c68a0'
  }
};
function applyTheme(name){
  const t=THEMES[name]||THEMES.synthwave;
  const root=document.documentElement;
  Object.entries(t).forEach(([k,v])=>root.style.setProperty(k,v));
  root.style.setProperty('--glow-1',`0 0 6px ${t['--neon-1']}b0,0 0 18px ${t['--neon-1']}50`);
  root.style.setProperty('--glow-2',`0 0 6px ${t['--neon-2']}b0,0 0 18px ${t['--neon-2']}50`);
  document.querySelectorAll('.theme-opt').forEach(el=>el.classList.toggle('active',el.dataset.theme===name));
}

/* ====================== PROVIDERS ====================== */
const PROVIDERS={
  aqua:{base:'https://api.aquadevs.com/v1',keyName:'aquaKey'},
  groq:{base:'https://api.groq.com/openai/v1',keyName:'groqKey'}
};
function parseModel(str){
  const i=(str||'').indexOf(':');
  if(i===-1)return{provider:'aqua',model:str||''};
  return{provider:str.slice(0,i).trim().toLowerCase(),model:str.slice(i+1).trim()};
}

/* ====================== CUSTOM DROPDOWN ====================== */
function createDropdown(container,options,value,placeholder){
  container.innerHTML='';
  const dd=document.createElement('div');dd.className='dd';
  const face=document.createElement('div');face.className='dd-face';
  const input=document.createElement('input');
  input.value=value||'';input.placeholder=placeholder||'';input.autocomplete='off';
  const arrow=document.createElement('span');arrow.className='dd-arrow';
  arrow.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>';
  face.append(input,arrow);
  const list=document.createElement('div');list.className='dd-list';
  options.forEach(opt=>{
    const it=document.createElement('div');it.className='dd-item';
    it.innerHTML=`${esc(opt.value)}${opt.note?`<span class="dd-note">${esc(opt.note)}</span>`:''}`;
    it.onclick=()=>{input.value=opt.value;dd.classList.remove('open');input.dispatchEvent(new Event('change'));};
    list.appendChild(it);
  });
  dd.append(face,list);
  container.appendChild(dd);
  arrow.onclick=()=>toggleDropdown(dd,list,input);
  input.onfocus=()=>closeAllDropdowns(dd);
  return{
    get value(){return input.value.trim();},
    set value(v){input.value=v;},
    el:dd
  };
}
function toggleDropdown(self,list,input){
  document.querySelectorAll('.dd.open').forEach(d=>{if(d!==self)d.classList.remove('open');});
  document.querySelectorAll('.target-popover.open').forEach(p=>p.classList.remove('open'));
  self.classList.toggle('open');
  list.querySelectorAll('.dd-item').forEach(it=>it.classList.toggle('sel',it.textContent.startsWith(input.value)));
}
function closeAllDropdowns(except){document.querySelectorAll('.dd.open').forEach(d=>{if(d!==except)d.classList.remove('open');});}
document.addEventListener('click',e=>{
  if(!e.target.closest('.dd')&&!e.target.closest('.target-popover')&&!e.target.closest('.target-pill')&&!e.target.closest('.player-popover')&&!e.target.closest('.player-badge')){
    closeAllDropdowns(null);
    document.querySelectorAll('.player-popover').forEach(p=>p.remove());
    document.querySelectorAll('.target-popover.open').forEach(p=>p.classList.remove('open'));
  }
});

const TEXT_MODEL_OPTS=[
  {value:'aqua:deepseek-v4',note:'balanced'},
  {value:'aqua:deepseek-v4-pro',note:'stronger'},
  {value:'aqua:kimi-k2.6',note:'creative'},
  {value:'aqua:glm-5.1',note:'solid'},
  {value:'aqua:llama-4',note:'fast'},
  {value:'aqua:mistral-3.5',note:'fast'}
];
const FAST_MODEL_OPTS=[
  {value:'aqua:gemini-3.1-lite',note:'fast'},
  {value:'aqua:diffusion-gemma',note:'instant'},
  {value:'aqua:llama-3.1',note:'tiny'},
  {value:'aqua:mercury',note:'diffusion'}
];
const TTS_MODEL_OPTS=[
  {value:'aqua:mimo-v2.5-tts-voicedesign',note:'described'},
  {value:'aqua:mimo-v2.5-tts',note:'voice IDs'},
  {value:'aqua:mimo-v2.5-tts-voiceclone',note:'clone'}
];
const STT_MODEL_OPTS=[
  {value:'groq:whisper-large-v3',note:'default'},
  {value:'groq:whisper-large-v3-turbo',note:'faster'}
];
const VOICE_OPTS=[
  {value:'Mia',note:'soft female'},
  {value:'Chloe',note:'calm female'},
  {value:'Milo',note:'energetic male'},
  {value:'Dean',note:'deep male'},
  {value:'mimo_default',note:'neutral'}
];

/* ====================== INDEXEDDB ====================== */
const DB_NAME='sunny-deck-retro';
const DB_VERSION=1;
function dbOpen(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{
      const db=r.result;
      ['realms','sessions','settings'].forEach(s=>{
        if(!db.objectStoreNames.contains(s))db.createObjectStore(s,s==='settings'?undefined:{keyPath:'id'});
      });
    };
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
}
async function dbPut(store,data,key){
  const db=await dbOpen();
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readwrite');
    if(key!==undefined)tx.objectStore(store).put(data,key);
    else tx.objectStore(store).put(data);
    tx.oncomplete=res;
    tx.onerror=()=>rej(tx.error);
  });
}
async function dbGet(store,key){
  const db=await dbOpen();
  return new Promise(res=>{
    const g=db.transaction(store,'readonly').objectStore(store).get(key);
    g.onsuccess=()=>res(g.result);
    g.onerror=()=>res(undefined);
  });
}
async function dbGetAll(store){
  const db=await dbOpen();
  return new Promise(res=>{
    const g=db.transaction(store,'readonly').objectStore(store).getAll();
    g.onsuccess=()=>res(g.result||[]);
    g.onerror=()=>res([]);
  });
}
async function dbDelete(store,key){
  const db=await dbOpen();
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete=res;
    tx.onerror=()=>rej(tx.error);
  });
}

/* ====================== SETTINGS ====================== */
const DEFAULT_SETTINGS={
  aquaKey:'',groqKey:'',
  creativeModel:'aqua:deepseek-v4',
  taskModel:'aqua:gemini-3.1-lite',
  routerModel:'aqua:diffusion-gemma',
  chatModel:'aqua:deepseek-v4',
  ttsModel:'aqua:mimo-v2.5-tts-voicedesign',
  sttModel:'groq:whisper-large-v3',
  ttsEnabled:true,
  theme:'synthwave'
};
let settings={...DEFAULT_SETTINGS};
async function loadSettings(){
  const s=await dbGet('settings','cfg');
  if(s)settings={...DEFAULT_SETTINGS,...s};
  applyTheme(settings.theme);
}
async function saveSettings(){await dbPut('settings',settings,'cfg');}
function hasApiKeys(){return settings.aquaKey.trim().length>0;}

let dd={};
function initSettingsDropdowns(){
  dd.creative=createDropdown(document.getElementById('ddCreative'),TEXT_MODEL_OPTS,settings.creativeModel);
  dd.task=createDropdown(document.getElementById('ddTask'),FAST_MODEL_OPTS,settings.taskModel);
  dd.router=createDropdown(document.getElementById('ddRouter'),FAST_MODEL_OPTS,settings.routerModel);
  dd.chat=createDropdown(document.getElementById('ddChat'),TEXT_MODEL_OPTS,settings.chatModel);
  dd.tts=createDropdown(document.getElementById('ddTts'),TTS_MODEL_OPTS,settings.ttsModel);
  dd.stt=createDropdown(document.getElementById('ddStt'),STT_MODEL_OPTS,settings.sttModel);
}

/* ====================== TOAST ====================== */
let toastTimer;
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}

/* ====================== HTML SAFETY ====================== */
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ====================== ICON LIBRARY ====================== */
const SOUND_ON_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
const SOUND_OFF_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`;
const EYE_ON_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const LOCK_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const LOCK_OPEN_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;
const MAP_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`;

/* ====================== NAVIGATION ====================== */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.getElementById('mainHeader').style.display=(id==='screen-chat')?'none':'flex';
}
document.getElementById('toDashboard').onclick=()=>{showScreen('screen-dash');renderDashboard();};
document.getElementById('btnCreateRealm').onclick=()=>openCreateRealm();
document.getElementById('newRealmBtn').onclick=()=>openCreateRealm();
document.getElementById('btnBrowseRealms').onclick=()=>{showScreen('screen-browse');renderBrowse();};
document.getElementById('settingsBtn').onclick=()=>{fillSettings();showScreen('screen-settings');};

/* ====================== PREMADE REALMS ====================== */
function seedPremadeRealms(){
  const mk=(k,n,c,v,d,p,kw,x,y)=>({key:k,name:n,color:c,voice:v,description:d,personality:p,keywords:kw,pos:{x,y}});
  const onePiece={
    id:'premade-onepiece',name:'Thousand Sunny',isPremade:true,
    description:'The Straw Hat crew relaxing on the Sunny deck between islands.',
    overview:'The sun is warm, the sea is calm, and the Straw Hats are scattered across the deck. Luffy is starving, Zoro is napping against the mast, and Sanji is prepping lunch.',
    mapConfig:{enabled:true,mapType:'ship'},
    characters:[
      mk('luffy','Luffy','#e63946','Milo','Rubber-powered captain','Energetic, food-obsessed, fearless',['meat','food','captain','pirate king'],50,45),
      mk('zoro','Zoro','#2a9d8f','Dean','Swordsman','Blunt, stoic, directionally hopeless',['sword','training','sake','nap'],35,60),
      mk('nami','Nami','#f4a261','Mia','Navigator','Sharp-tongued, money-obsessed',['money','berries','weather','map'],28,35),
      mk('usopp','Usopp','#e9c46a','Milo','Sniper','Cowardly but brave when it counts',['lie','story','sniper','brave'],60,30),
      mk('sanji','Sanji','#457b9d','Dean','Cook','Chivalrous, hopeless romantic',['cook','kitchen','food','ladies'],20,50),
      mk('chopper','Chopper','#f28ab2','Mia','Doctor','Childlike, sweet, naive reindeer',['doctor','medicine','cotton candy','heal'],45,70),
      mk('robin','Robin','#9d6b9e','Chloe','Archaeologist','Calm, intelligent, darkly humorous',['history','poneglyph','books','ancient'],65,55),
      mk('franky','Franky','#00b4d8','Dean','Shipwright','Loud cyborg with zero shame',['cola','ship','repair','super'],15,65),
      mk('brook','Brook','#adb5bd','Dean','Musician','Skeleton gentleman, polite, whimsical',['music','song','soul','bone jokes'],55,40),
      mk('jinbe','Jinbe','#3a6ea5','Dean','Helmsman','Wise, honorable, calm anchor',['sea','fishman','helm','honor'],40,75)
    ]
  };
  const friends={
    id:'premade-friends',name:'Central Perk',isPremade:true,
    description:'The iconic coffee house where the Friends hang out.',
    overview:'It is a rainy afternoon at Central Perk. The orange couch is claimed, Gunther is wiping the counter, and the gang is debating nonsense over oversized mugs.',
    mapConfig:{enabled:true,mapType:'apartment'},
    characters:[
      mk('monica','Monica','#e74c3c','Mia','Chef and neat freak','Competitive, caring, obsessively organized',['cleaning','cooking','chef','perfection'],50,50),
      mk('chandler','Chandler','#3498db','Milo','Sarcastic data processor','Witty, insecure, uses humor as defense',['joke','sarcasm','work','marriage'],40,55),
      mk('rachel','Rachel','#f39c12','Mia','Fashion enthusiast','Spoiled but growing, style-obsessed',['fashion','job','hair','shopping'],60,45),
      mk('ross','Ross','#9b59b6','Dean','Paleontologist','Intellectual, jealous, romantically clumsy',['dinosaurs','divorce','pivot','science'],30,60),
      mk('joey','Joey','#e67e22','Milo','Actor and ladies man','Loyal, simple, loves food and fame',['acting','food','how you doin','show'],55,55),
      mk('phoebe','Phoebe','#2ecc71','Chloe','Eccentric masseuse','Weirdly wise, unpredictable, kind-hearted',['song','massage','smelly cat','spiritual'],45,40)
    ]
  };
  const mcu={
    id:'premade-mcu',name:'Avengers Tower',isPremade:true,
    description:'Tony Stark\'s penthouse overlooking Manhattan.',
    overview:'The Avengers are recovering after a mission. Thor is eating shawarma at the bar, Tony is tweaking his suit, and Steve is judging everyone silently from the couch.',
    mapConfig:{enabled:true,mapType:'tower'},
    characters:[
      mk('tony','Tony Stark','#c0392b','Dean','Iron Man, billionaire genius','Sarcastic, guilt-driven, protective',['suit','tech','money','whiskey'],50,50),
      mk('steve','Steve Rogers','#2980b9','Dean','Captain America','Idealistic, awkward, old-fashioned',['shield','honor','war','righteous'],35,55),
      mk('natasha','Natasha','#8e44ad','Mia','Black Widow, spy','Calculated, guarded, tactically intimate',['spy','mission','red room','fight'],60,45),
      mk('thor','Thor','#f1c40f','Dean','God of Thunder','Boisterous, noble, slightly out of touch',['hammer','asgard','mead','lightning'],45,60),
      mk('bruce','Bruce Banner','#27ae60','Milo','Hulk, scientist','Gentle, self-loathing, avoids conflict',['gamma','science','anger','smash'],25,50),
      mk('clint','Clint Barton','#d35400','Milo','Hawkeye, archer','Dry, family-focused, grounded',['bow','arrows','farm','family'],55,40)
    ]
  };
  [onePiece,friends,mcu].forEach(r=>{
    r.creativeModel='aqua:deepseek-v4';r.chatModel='aqua:deepseek-v4';
    r.routerModel='aqua:diffusion-gemma';r.ttsModel='aqua:mimo-v2.5-tts-voicedesign';
  });
  return[onePiece,friends,mcu];
}
async function ensurePremades(){
  const existing=await dbGetAll('realms');
  if(existing.length===0){for(const r of seedPremadeRealms())await dbPut('realms',r);}
}

/* ====================== RETRO MAP SVGS ====================== */
function getMapSVG(type){
  const wrap=(inner)=>`<svg viewBox="0 0 520 165" preserveAspectRatio="xMidYMid meet">
    <rect x="1" y="1" width="518" height="163" fill="#05010f" stroke="#3b2a6e" stroke-width="2"/>
    <g opacity=".25" stroke="#ff2e97" stroke-width="1">${Array.from({length:12},(_,i)=>`<line x1="${i*44+20}" y1="0" x2="${i*44+20}" y2="165"/>`).join('')}${Array.from({length:5},(_,i)=>`<line x1="0" y1="${i*36+18}" x2="520" y2="${i*36+18}"/>`).join('')}</g>
    ${inner}</svg>`;
  if(type==='ship')return wrap(`
    <path d="M 40 82 Q 45 38 110 32 L 420 32 Q 468 40 486 82 Q 468 124 420 132 L 110 132 Q 45 126 40 82 Z" fill="none" stroke="#00f0ff" stroke-width="2"/>
    <path d="M 58 82 Q 62 48 115 44 L 412 44 Q 452 50 466 82 Q 452 114 412 120 L 115 120 Q 62 116 58 82 Z" fill="rgba(0,240,255,.06)" stroke="#00f0ff" stroke-width="1"/>
    <ellipse cx="300" cy="82" rx="95" ry="34" fill="none" stroke="#00ff9c" stroke-width="2"/>
    <circle cx="300" cy="82" r="8" fill="none" stroke="#00ff9c" stroke-width="2"/>
    <rect x="80" y="58" width="70" height="48" fill="none" stroke="#ffe600" stroke-width="2"/>
    <circle cx="490" cy="82" r="18" fill="none" stroke="#ffe600" stroke-width="2"/>
    <g stroke="#ffe600" stroke-width="2"><line x1="490" y1="58" x2="490" y2="50"/><line x1="490" y1="106" x2="490" y2="114"/><line x1="508" y1="66" x2="514" y2="60"/><line x1="508" y1="98" x2="514" y2="104"/></g>
    <text x="115" y="86" fill="#ffe600" font-size="11" font-family="monospace" text-anchor="middle">CABIN</text>
    <text x="300" y="86" fill="#00ff9c" font-size="11" font-family="monospace" text-anchor="middle">LAWN</text>`);
  if(type==='apartment')return wrap(`
    <rect x="40" y="28" width="200" height="108" fill="rgba(0,240,255,.05)" stroke="#00f0ff" stroke-width="2"/>
    <rect x="258" y="28" width="112" height="62" fill="none" stroke="#ffe600" stroke-width="2"/>
    <rect x="258" y="100" width="112" height="36" fill="none" stroke="#ff2e97" stroke-width="2"/>
    <rect x="388" y="28" width="92" height="108" fill="none" stroke="#00ff9c" stroke-width="2"/>
    <text x="140" y="86" fill="#00f0ff" font-size="12" font-family="monospace" text-anchor="middle">COUCH AREA</text>
    <text x="314" y="63" fill="#ffe600" font-size="11" font-family="monospace" text-anchor="middle">COUNTER</text>
    <text x="434" y="86" fill="#00ff9c" font-size="11" font-family="monospace" text-anchor="middle">DOOR</text>`);
  if(type==='tower')return wrap(`
    <polygon points="260,12 480,50 480,152 40,152 40,50" fill="rgba(255,46,151,.05)" stroke="#ff2e97" stroke-width="2"/>
    <rect x="80" y="60" width="360" height="80" fill="none" stroke="#00f0ff" stroke-width="2"/>
    <line x1="260" y1="60" x2="260" y2="140" stroke="#00f0ff" stroke-width="1"/>
    <text x="170" y="104" fill="#00f0ff" font-size="12" font-family="monospace" text-anchor="middle">LOUNGE</text>
    <text x="350" y="104" fill="#ffe600" font-size="12" font-family="monospace" text-anchor="middle">BAR</text>`);
  return wrap(`<text x="260" y="88" fill="#00f0ff" font-size="14" font-family="monospace" text-anchor="middle">CUSTOM REALM</text>`);
}

/* ====================== DASHBOARD ====================== */
async function renderDashboard(){
  const realms=await dbGetAll('realms');
  const sessions=await dbGetAll('sessions');
  let chars=0;realms.forEach(r=>chars+=(r.characters||[]).length);
  document.getElementById('statRealms').textContent=realms.length;
  document.getElementById('statSessions').textContent=sessions.length;
  document.getElementById('statChars').textContent=chars;

  // Recent activity: filter out whispers (they belong to private section)
  const regular=sessions.filter(s=>!s.isWhisper).sort((a,b)=>(b.lastActiveAt||0)-(a.lastActiveAt||0)).slice(0,5);
  const list=document.getElementById('recentList');
  list.innerHTML='';
  if(regular.length===0){
    list.innerHTML='<div class="activity-empty">NO SESSIONS YET. CREATE A REALM AND START CHATTING.</div>';return;
  }
  const realmMap={};realms.forEach(r=>realmMap[r.id]=r);
  regular.forEach(s=>{
    const r=realmMap[s.realmId];
    const div=document.createElement('div');div.className='activity';div.style.cursor='pointer';
    div.onclick=()=>openSession(s.id);
    div.innerHTML=`<div class="dot"></div><div class="activity-info"><div class="activity-title">${esc(s.name)} :: ${esc(r?r.name:'Realm')}</div><div class="activity-meta">${new Date(s.lastActiveAt||Date.now()).toLocaleDateString()} · ${(s.history||[]).length} MSGS</div></div>`;
    list.appendChild(div);
  });
}

/* ====================== BROWSE ====================== */
async function renderBrowse(){
  const realms=await dbGetAll('realms');
  const sessions=await dbGetAll('sessions');
  const grid=document.getElementById('realmGrid');
  grid.innerHTML='';
  const q=(document.getElementById('realmSearch').value||'').toLowerCase();
  realms.forEach(r=>{
    if(q&&!r.name.toLowerCase().includes(q)&&!(r.description||'').toLowerCase().includes(q))return;
    const sessCount=sessions.filter(s=>s.realmId===r.id).length;
    const card=document.createElement('div');card.className='realm-card';
    card.innerHTML=`<div class="realm-preview">${getMapSVG(r.mapConfig?.mapType||'custom')}<span class="realm-badge">${r.isPremade?'PREMADE':'CUSTOM'}</span></div>
      <div class="realm-body"><div class="realm-name">${esc(r.name)}</div><div class="realm-desc">${esc(r.description||'')}</div>
      <div class="realm-meta"><span>${(r.characters||[]).length} CHARS</span><span>${sessCount} SESSIONS</span></div></div>`;
    card.onclick=()=>openRealmDetail(r.id);
    grid.appendChild(card);
  });
  if(!grid.children.length)grid.innerHTML='<div class="activity-empty" style="grid-column:1/-1">NO REALMS FOUND.</div>';
}
document.getElementById('realmSearch').oninput=renderBrowse;

/* ====================== CREATE REALM ====================== */
let draftRealm=null;
let ddCrController=null;

function openCreateRealm(){
  draftRealm=null;
  document.getElementById('crName').value='';
  document.getElementById('crDesc').value='';
  document.getElementById('crOverview').value='';
  ddCrController=createDropdown(document.getElementById('crControllerDD'),TEXT_MODEL_OPTS,settings.creativeModel);
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step-info').classList.add('active');
  document.getElementById('addCharForm').classList.remove('active');
  showScreen('screen-create');
}
document.getElementById('crCancel').onclick=()=>showScreen('screen-dash');
document.getElementById('createBack').onclick=()=>showScreen('screen-dash');
document.getElementById('crBack2').onclick=()=>{
  document.getElementById('step-review').classList.remove('active');
  document.getElementById('step-info').classList.add('active');
};

document.getElementById('crGenerate').onclick=async()=>{
  const name=document.getElementById('crName').value.trim();
  const desc=document.getElementById('crDesc').value.trim();
  const controllerStr=ddCrController.value||settings.creativeModel;
  if(!name||!desc){toast('ENTER NAME AND DESCRIPTION');return;}
  if(!hasApiKeys()){toast('ADD YOUR AQUA API KEY IN SETTINGS');return;}

  document.getElementById('step-info').classList.remove('active');
  document.getElementById('step-gen').classList.add('active');

  try{
    const result=await generateRealmWithAI(name,desc,controllerStr);
    draftRealm={
      ...result,
      id:'realm-'+Date.now(),name,description:desc,
      creativeModel:controllerStr,chatModel:settings.chatModel,
      routerModel:settings.routerModel,ttsModel:settings.ttsModel,
      isPremade:false,mapConfig:{enabled:true,mapType:result.mapType||'custom'}
    };
    document.getElementById('crOverview').value=draftRealm.overview||'';
    renderReviewChars();
    document.getElementById('step-gen').classList.remove('active');
    document.getElementById('step-review').classList.add('active');
  }catch(e){
    console.error(e);
    toast(e.message||'GENERATION FAILED');
    document.getElementById('step-gen').classList.remove('active');
    document.getElementById('step-info').classList.add('active');
  }
};

async function generateRealmWithAI(name,description,modelStr){
  const{provider,model}=parseModel(modelStr);
  const p=PROVIDERS[provider];
  if(!p)throw new Error('Unknown provider');
  const key=settings[p.keyName];
  if(!key)throw new Error(`Missing API key for ${provider}`);
  const sys=`You are a world-building assistant for a roleplay chat platform. Given a realm name and description, output ONLY valid JSON matching this exact schema:
{"overview":"2-3 sentence scene description","mapType":"ship|apartment|tower|custom","characters":[{"key":"lowercase_unique","name":"Character Name","description":"Role/appearance (1 sentence)","personality":"Core traits (1 sentence)","keywords":["topic1","topic2"],"voice":"Mia|Chloe|Milo|Dean|mimo_default","color":"#hexcolor","pos":{"x":0-100,"y":0-100}}]}
Include 3-10 characters appropriate to the world. Be authentic. Output ONLY JSON.`;
  const res=await fetch(`${p.base}/chat/completions`,{
    method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'system',content:sys},{role:'user',content:`Realm: ${name}\nDescription: ${description}`}],temperature:.8,max_tokens:2000})
  });
  if(!res.ok)throw new Error(`${provider} API ${res.status}`);
  const data=await res.json();
  const raw=data.choices[0].message.content;
  const m=raw.match(/\{[\s\S]*\}/);
  if(!m)throw new Error('No JSON returned');
  const parsed=JSON.parse(m[0]);
  if(!Array.isArray(parsed.characters))throw new Error('Invalid structure');
  return parsed;
}

function renderReviewChars(){
  const grid=document.getElementById('reviewChars');
  grid.innerHTML='';
  if(!draftRealm?.characters)return;
  draftRealm.characters.forEach((c,i)=>{
    const card=document.createElement('div');card.className='char-card';
    card.innerHTML=`<div class="top"><div class="char-avatar" style="background:${esc(c.color)}">${esc(c.name.slice(0,2).toUpperCase())}</div>
      <div><div class="nm">${esc(c.name)}</div><div class="per">${esc(c.personality)}</div></div></div>
      <div class="body">${esc(c.description)}</div>
      <div class="kws">${(c.keywords||[]).map(k=>`<span class="kw">${esc(k)}</span>`).join('')}</div>
      <div class="card-actions"><button data-i="${i}" class="edit-char-btn">EDIT</button><button class="danger del-char-btn" data-i="${i}">REMOVE</button></div>`;
    grid.appendChild(card);
  });
  grid.querySelectorAll('.edit-char-btn').forEach(b=>b.onclick=e=>editDraftChar(+e.target.dataset.i));
  grid.querySelectorAll('.del-char-btn').forEach(b=>b.onclick=e=>{draftRealm.characters.splice(+e.target.dataset.i,1);renderReviewChars();});
}

function editDraftChar(idx){
  const c=draftRealm.characters[idx];
  openModal('EDIT CHARACTER',`
    <div class="field"><label>Name</label><input id="m-name"></div>
    <div class="field"><label>Key</label><input id="m-key"></div>
    <div class="field"><label>Color</label><input id="m-color"></div>
    <div class="field"><label>Voice ID</label><div id="m-voice-dd"></div></div>
    <div class="field"><label>Description</label><input id="m-desc"></div>
    <div class="field"><label>Personality</label><input id="m-personality"></div>
    <div class="field"><label>Keywords (comma)</label><input id="m-keywords"></div>
    <div class="field"><label>System Prompt (optional)</label><textarea id="m-system" placeholder="Extra persona instructions..." style="min-height:80px"></textarea></div>
    <div class="btn-row"><button class="btn btn-primary" id="m-save">SAVE</button></div>
  `,'wide');
  document.getElementById('m-name').value=c.name;
  document.getElementById('m-key').value=c.key;
  document.getElementById('m-color').value=c.color;
  document.getElementById('m-desc').value=c.description;
  document.getElementById('m-personality').value=c.personality;
  document.getElementById('m-keywords').value=(c.keywords||[]).join(', ');
  document.getElementById('m-system').value=c.system||'';
  const voiceDD=createDropdown(document.getElementById('m-voice-dd'),VOICE_OPTS,c.voice||'Milo');
  document.getElementById('m-save').onclick=()=>{
    c.name=document.getElementById('m-name').value.trim();
    c.key=document.getElementById('m-key').value.trim().toLowerCase();
    c.color=document.getElementById('m-color').value.trim();
    c.voice=voiceDD.value;
    c.description=document.getElementById('m-desc').value.trim();
    c.personality=document.getElementById('m-personality').value.trim();
    c.keywords=document.getElementById('m-keywords').value.split(',').map(x=>x.trim()).filter(Boolean);
    c.system=document.getElementById('m-system').value.trim();
    closeModal();renderReviewChars();
  };
}

document.getElementById('crAddChar').onclick=()=>document.getElementById('addCharForm').classList.add('active');
document.getElementById('acCancel').onclick=()=>document.getElementById('addCharForm').classList.remove('active');
document.getElementById('acSave').onclick=()=>{
  const c={
    key:document.getElementById('acKey').value.trim().toLowerCase(),
    name:document.getElementById('acName').value.trim(),
    color:document.getElementById('acColor').value.trim()||'#00f0ff',
    voice:document.getElementById('acVoice').value.trim()||'Milo',
    description:document.getElementById('acDesc').value.trim(),
    personality:document.getElementById('acPersonality').value.trim(),
    keywords:document.getElementById('acKeywords').value.split(',').map(x=>x.trim()).filter(Boolean),
    system:document.getElementById('acSystem').value.trim(),
    pos:{x:+document.getElementById('acPosX').value||50,y:+document.getElementById('acPosY').value||50}
  };
  if(!c.key||!c.name){toast('KEY AND NAME REQUIRED');return;}
  if(!draftRealm)draftRealm={characters:[]};
  draftRealm.characters.push(c);
  document.getElementById('addCharForm').classList.remove('active');
  renderReviewChars();
};

document.getElementById('crFinish').onclick=async()=>{
  if(!draftRealm)return;
  draftRealm.overview=document.getElementById('crOverview').value.trim();
  draftRealm.createdAt=Date.now();draftRealm.updatedAt=Date.now();
  await dbPut('realms',draftRealm);
  toast('REALM SAVED');
  showScreen('screen-dash');renderDashboard();
};

/* ====================== REALM DETAIL ====================== */
let currentRealmId=null;

async function openRealmDetail(id){
  const r=await dbGet('realms',id);if(!r)return;
  currentRealmId=id;
  currentRealm=r;
  document