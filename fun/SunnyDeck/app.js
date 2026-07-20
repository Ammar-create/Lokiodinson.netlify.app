/* ===================================================================
   SUNNY DECK // RETRO  —  application logic
   app.js     UI/state/persistence/init/non-AI handlers
   app-ai.js AI firing (router/reply/TTS/STT/auto-rename)
   Both run as classic scripts so they share global scope.
   =================================================================== */
'use strict';

/* ====================== THEMES ====================== */
const THEMES={
  synthwave:{  '--bg':'#0d0221','--surface':'#160a2e','--surface-2':'#1f1140','--surface-3':'#2a1a55','--border':'#3b2a6e','--border-soft':'#2a1a55','--neon-1':'#ff2e97','--neon-2':'#00f0ff','--neon-3':'#ffe600','--danger':'#ff3860','--ok':'#00ff9c','--text':'#f2eaff','--text-2':'#b39ddb','--text-3':'#7a63a8'},
  terminal:{    '--bg':'#020a02','--surface':'#07140a','--surface-2':'#0c2010','--surface-3':'#123018','--border':'#1e4a28','--border-soft':'#123018','--neon-1':'#33ff33','--neon-2':'#7dff9a','--neon-3':'#d4ff33','--danger':'#ff5533','--ok':'#33ff33','--text':'#d8ffd8','--text-2':'#7ec98a','--text-3':'#4a7a52'},
  vaporwave:{   '--bg':'#160b26','--surface':'#231240','--surface-2':'#2f1a55','--surface-3':'#3c266b','--border':'#54398c','--border-soft':'#3c266b','--neon-1':'#ff71ce','--neon-2':'#01cdfe','--neon-3':'#05ffa1','--danger':'#ff4f7b','--ok':'#05ffa1','--text':'#fdf3ff','--text-2':'#c9a9e8','--text-3':'#8a6bb5'},
  sunset:{      '--bg':'#1a0a05','--surface':'#28110a','--surface-2':'#381a10','--surface-3':'#4a2416','--border':'#6b3a22','--border-soft':'#4a2416','--neon-1':'#ff6b1a','--neon-2':'#ffd23f','--neon-3':'#ff2e63','--danger':'#ff2e63','--ok':'#7dff9a','--text':'#fff3e8','--text-2':'#e8a87c','--text-3':'#a06a48'},
  arcade:{      '--bg':'#04041c','--surface':'#0a0a30','--surface-2':'#121245','--surface-3':'#1c1c5e','--border':'#2e2e80','--border-soft':'#1c1c5e','--neon-1':'#ff2222','--neon-2':'#22aaff','--neon-3':'#ffcc00','--danger':'#ff2222','--ok':'#22ff88','--text':'#eef2ff','--text-2':'#9aa8e0','--text-3':'#5c68a0'}
};
function applyTheme(name){
  const t=THEMES[name]||THEMES.synthwave;
  const root=document.documentElement;
  if(typeof settings!=='undefined'&&settings.uiSkin==='modern'){
    /* modern skin owns the palette via modern.css — clear the inline
       retro variables so the stylesheet values win */
    Object.keys(t).forEach(k=>root.style.removeProperty(k));
    root.style.removeProperty('--glow-1');root.style.removeProperty('--glow-2');
  }else{
    Object.entries(t).forEach(([k,v])=>root.style.setProperty(k,v));
    root.style.setProperty('--glow-1',`0 0 6px ${t['--neon-1']}b0,0 0 18px ${t['--neon-1']}50`);
    root.style.setProperty('--glow-2',`0 0 6px ${t['--neon-2']}b0,0 0 18px ${t['--neon-2']}50`);
  }
  document.querySelectorAll('.theme-opt').forEach(el=>el.classList.toggle('active',el.dataset.theme===name));
}

/* ====================== UI SKIN (modern | retro) ====================== */
function applySkin(){
  const root=document.documentElement;
  root.dataset.skin=settings.uiSkin==='retro'?'retro':'modern';
  root.dataset.mtheme=['light','dark'].includes(settings.modernTheme)?settings.modernTheme:'auto';
  applyTheme(settings.theme);
  updateSkinUI();
}
function updateSkinUI(){
  const modern=settings.uiSkin!=='retro';
  document.querySelectorAll('.skin-opt[data-skin]').forEach(b=>b.classList.toggle('active',(b.dataset.skin==='modern')===modern));
  document.querySelectorAll('.skin-opt[data-mtheme]').forEach(b=>b.classList.toggle('active',b.dataset.mtheme===(settings.modernTheme||'auto')));
  const mf=document.getElementById('modernThemeField');
  if(mf)mf.style.display=modern?'':'none';
  const tp=document.getElementById('themePickerField');
  if(tp)tp.style.display=modern?'none':'';
  const dt=document.getElementById('dashSkinToggle');
  if(dt)dt.textContent=modern?'SKIN: MODERN — GO RETRO':'SKIN: RETRO — GO MODERN';
}
async function setUiSkin(skin){
  settings.uiSkin=skin==='retro'?'retro':'modern';
  await saveSettings();
  applySkin();
  toast(settings.uiSkin==='retro'?'RETRO MODE ENGAGED':'MODERN UI ON');
}
function bindSkinControls(){
  document.querySelectorAll('.skin-opt[data-skin]').forEach(b=>b.onclick=()=>setUiSkin(b.dataset.skin));
  document.querySelectorAll('.skin-opt[data-mtheme]').forEach(b=>b.onclick=async()=>{
    settings.modernTheme=b.dataset.mtheme;
    await saveSettings();applySkin();
  });
  const dt=document.getElementById('dashSkinToggle');
  if(dt)dt.onclick=()=>setUiSkin(settings.uiSkin==='retro'?'modern':'retro');
}

/* ====================== PROVIDERS / HELPERS ====================== */
const PROVIDERS={
  aqua:{base:'https://api.aquadevs.com/v1',keyName:'aquaKey'},
  groq:{base:'https://api.groq.com/openai/v1',keyName:'groqKey'}
};
function parseModel(str){
  const i=(str||'').indexOf(':');
  if(i===-1)return{provider:'aqua',model:str||''};
  return{provider:str.slice(0,i).trim().toLowerCase(),model:str.slice(i+1).trim()};
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function hasApiKeys(){return settings.aquaKey.trim().length>0;}

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
  return{get value(){return input.value.trim();},set value(v){input.value=v;},el:dd};
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

/* ====================== OPTIONS LIBRARIES (shared by app-ai.js) ====================== */
const TEXT_MODEL_OPTS=[
  {value:'aqua:deepseek-v4',note:'balanced'},{value:'aqua:deepseek-v4-pro',note:'stronger'},
  {value:'aqua:kimi-k2.6',note:'creative'},{value:'aqua:glm-5.1',note:'solid'},
  {value:'aqua:llama-4',note:'fast'},{value:'aqua:mistral-3.5',note:'fast'}
];
const FAST_MODEL_OPTS=[
  {value:'aqua:gemini-3.1-lite',note:'fast'},{value:'aqua:diffusion-gemma',note:'instant'},
  {value:'aqua:llama-3.1',note:'tiny'},{value:'aqua:mercury',note:'diffusion'}
];
const TTS_MODEL_OPTS=[
  {value:'aqua:mimo-v2.5-tts-voicedesign',note:'described'},
  {value:'aqua:mimo-v2.5-tts',note:'voice IDs'},
  {value:'aqua:mimo-v2.5-tts-voiceclone',note:'clone'}
];
const STT_MODEL_OPTS=[{value:'groq:whisper-large-v3',note:'default'},{value:'groq:whisper-large-v3-turbo',note:'faster'}];
const VOICE_OPTS=[
  {value:'Mia',note:'soft female'},{value:'Chloe',note:'calm female'},
  {value:'Milo',note:'energetic male'},{value:'Dean',note:'deep male'},{value:'mimo_default',note:'neutral'}
];

/* ====================== INDEXEDDB ====================== */
const DB_NAME='sunny-deck-retro',DB_VERSION=1;
function dbOpen(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{
      const db=r.result;
      ['realms','sessions','settings'].forEach(s=>{
        if(!db.objectStoreNames.contains(s))db.createObjectStore(s,s==='settings'?undefined:{keyPath:'id'});
      });
    };
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
}
/* Strip transient underscore-prefixed props (e.g. character._mapEl DOM
   refs) — IndexedDB's structured clone throws on DOM nodes. */
function dbSanitize(data){
  if(!data||typeof data!=='object')return data;
  return JSON.parse(JSON.stringify(data,(k,v)=>k.startsWith('_')?undefined:v));
}
async function dbPut(store,data,key){
  const db=await dbOpen();
  data=dbSanitize(data);
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readwrite');
    if(key!==undefined)tx.objectStore(store).put(data,key);else tx.objectStore(store).put(data);
    tx.oncomplete=res;tx.onerror=()=>rej(tx.error);
  });
}
async function dbGet(store,key){
  const db=await dbOpen();
  return new Promise(res=>{
    const g=db.transaction(store,'readonly').objectStore(store).get(key);
    g.onsuccess=()=>res(g.result);g.onerror=()=>res(undefined);
  });
}
async function dbGetAll(store){
  const db=await dbOpen();
  return new Promise(res=>{
    const g=db.transaction(store,'readonly').objectStore(store).getAll();
    g.onsuccess=()=>res(g.result||[]);g.onerror=()=>res([]);
  });
}
async function dbDelete(store,key){
  const db=await dbOpen();
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readwrite');
    tx.objectStore(store).delete(key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);
  });
}

/* ====================== SETTINGS ====================== */
const DEFAULT_SETTINGS={
  aquaKey:'',groqKey:'',theme:'synthwave',
  creativeModel:'aqua:deepseek-v4',taskModel:'aqua:gemini-3.1-lite',
  routerModel:'aqua:diffusion-gemma',chatModel:'aqua:deepseek-v4',
  ttsModel:'aqua:mimo-v2.5-tts-voicedesign',sttModel:'groq:whisper-large-v3',
  ttsEnabled:true,
  soundEnabled:true,soundVolume:0.4,ambientLoopEnabled:false,
  weatherFxEnabled:true,worldClockMode:'hybrid',
  pixelAvatarsEnabled:true,
  diceEnabled:false,questsEnabled:false,inventoryEnabled:false,
  uiSkin:'modern',modernTheme:'auto'
};

/* Inner HTML for a .char-avatar circle: pixel sprite when avatars.js
   is loaded + enabled, otherwise the classic two-letter initials. */
function avatarInnerHTML(c){
  if(!c)return'??';
  const av=typeof charAvatarInner==='function'?charAvatarInner(c):'';
  return av||esc((c.name||'?').slice(0,2).toUpperCase());
}
let settings={...DEFAULT_SETTINGS};
async function loadSettings(){
  const s=await dbGet('settings','cfg');
  if(s){
    settings={...DEFAULT_SETTINGS,...s};
    if(s.uiSkin===undefined){
      /* upgrading users keep the retro look they know; new installs
         default to the modern skin */
      settings.uiSkin='retro';
      await saveSettings();
      setTimeout(()=>toast('NEW MINIMAL UI AVAILABLE IN SETTINGS'),1500);
    }
  }
  applySkin();
}
async function saveSettings(){await dbPut('settings',settings,'cfg');}

let dd={};
function initSettingsDropdowns(){
  dd.creative=createDropdown(document.getElementById('ddCreative'),TEXT_MODEL_OPTS,settings.creativeModel);
  dd.task=createDropdown(document.getElementById('ddTask'),FAST_MODEL_OPTS,settings.taskModel);
  dd.router=createDropdown(document.getElementById('ddRouter'),FAST_MODEL_OPTS,settings.routerModel);
  dd.chat=createDropdown(document.getElementById('ddChat'),TEXT_MODEL_OPTS,settings.chatModel);
  dd.tts=createDropdown(document.getElementById('ddTts'),TTS_MODEL_OPTS,settings.ttsModel);
  dd.stt=createDropdown(document.getElementById('ddStt'),STT_MODEL_OPTS,settings.sttModel);
  dd.worldClock=createDropdown(document.getElementById('ddWorldClock'),
    [{value:'off'},{value:'exchanges',note:'per message'},{value:'hybrid',note:'default'}],settings.worldClockMode);
}

/* ====================== TOAST ====================== */
let toastTimer;
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}

/* ====================== ICON LIBRARY (used by app-ai.js) ====================== */
const SOUND_ON_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
const SOUND_OFF_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`;
const EYE_ON_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const LOCK_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const LOCK_OPEN_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;
const MAP_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`;
const SPARKLE_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>`;
const EXPAND_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const SCROLL_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`;

/* ====================== NAVIGATION ====================== */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.getElementById('mainHeader').style.display=(id==='screen-chat')?'none':'flex';
  if(typeof directorOnScreenChange==='function')directorOnScreenChange(id);
  if(typeof worldOnScreenChange==='function')worldOnScreenChange(id);
  if(typeof soundOnScreenChange==='function')soundOnScreenChange(id);
  if(typeof bigmapOnScreenChange==='function')bigmapOnScreenChange(id);
  if(typeof statsOnScreenChange==='function')statsOnScreenChange(id);
  if(typeof sfx==='function')sfx('screen');
}
document.getElementById('toDashboard').onclick=()=>{showScreen('screen-dash');renderDashboard();};
document.getElementById('btnCreateRealm').onclick=()=>openCreateRealm();
document.getElementById('newRealmBtn').onclick=()=>openCreateRealm();
document.getElementById('btnBrowseRealms').onclick=()=>{showScreen('screen-browse');renderBrowse();};
document.getElementById('settingsBtn').onclick=()=>{fillSettings();showScreen('screen-settings');};

/* ====================== PREMADE REALMS ====================== */
function seedPremadeRealms(){
  const mk=(k,n,c,v,d,p,kw,x,y)=>({key:k,name:n,color:c,voice:v,description:d,personality:p,keywords:kw,pos:{x,y}});
  const onePiece={id:'premade-onepiece',name:'Thousand Sunny',isPremade:true,
    description:'The Straw Hat crew relaxing on the Sunny deck between islands.',
    overview:'The sun is warm, the sea is calm, and the Straw Hats are scattered across the deck. Luffy is starving, Zoro is napping against the mast, and Sanji is prepping lunch.',
    mapConfig:{enabled:true,mapType:'ship',zones:[
      {key:'cabin',name:'CABIN',x:13,y:32,w:17,h:33},
      {key:'galley',name:'GALLEY',x:30,y:58,w:14,h:30},
      {key:'lawn',name:'LAWN',x:40,y:28,w:34,h:44},
      {key:'mast',name:'MAST',x:52,y:42,w:11,h:17},
      {key:'helm',name:'HELM',x:85,y:26,w:13,h:48}]},
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
      mk('jinbe','Jinbe','#3a6ea5','Dean','Helmsman','Wise, honorable, calm anchor',['sea','fishman','helm','honor'],40,75)]};
  const friends={id:'premade-friends',name:'Central Perk',isPremade:true,
    description:'The iconic coffee house where the Friends hang out.',
    overview:'It is a rainy afternoon at Central Perk. The orange couch is claimed, Gunther is wiping the counter, and the gang is debating nonsense over oversized mugs.',
    mapConfig:{enabled:true,mapType:'apartment',zones:[
      {key:'couch',name:'COUCH',x:8,y:17,w:38,h:65},
      {key:'counter',name:'COUNTER',x:50,y:17,w:21,h:38},
      {key:'stage',name:'STAGE',x:50,y:60,w:21,h:22},
      {key:'door',name:'DOOR',x:75,y:17,w:17,h:65}]},
    characters:[
      mk('monica','Monica','#e74c3c','Mia','Chef and neat freak','Competitive, caring, obsessively organized',['cleaning','cooking','chef','perfection'],50,50),
      mk('chandler','Chandler','#3498db','Milo','Sarcastic data processor','Witty, insecure, uses humor as defense',['joke','sarcasm','work','marriage'],40,55),
      mk('rachel','Rachel','#f39c12','Mia','Fashion enthusiast','Spoiled but growing, style-obsessed',['fashion','job','hair','shopping'],60,45),
      mk('ross','Ross','#9b59b6','Dean','Paleontologist','Intellectual, jealous, romantically clumsy',['dinosaurs','divorce','pivot','science'],30,60),
      mk('joey','Joey','#e67e22','Milo','Actor and ladies man','Loyal, simple, loves food and fame',['acting','food','how you doin','show'],55,55),
      mk('phoebe','Phoebe','#2ecc71','Chloe','Eccentric masseuse','Weirdly wise, unpredictable, kind-hearted',['song','massage','smelly cat','spiritual'],45,40)]};
  const mcu={id:'premade-mcu',name:'Avengers Tower',isPremade:true,
    description:'Tony Stark\'s penthouse overlooking Manhattan.',
    overview:'The Avengers are recovering after a mission. Thor is eating shawarma at the bar, Tony is tweaking his suit, and Steve is judging everyone silently from the couch.',
    mapConfig:{enabled:true,mapType:'tower',zones:[
      {key:'lounge',name:'LOUNGE',x:16,y:38,w:33,h:46},
      {key:'bar',name:'BAR',x:51,y:38,w:33,h:46},
      {key:'window',name:'WINDOW',x:8,y:10,w:84,h:22}]},
    characters:[
      mk('tony','Tony Stark','#c0392b','Dean','Iron Man, billionaire genius','Sarcastic, guilt-driven, protective',['suit','tech','money','whiskey'],50,50),
      mk('steve','Steve Rogers','#2980b9','Dean','Captain America','Idealistic, awkward, old-fashioned',['shield','honor','war','righteous'],35,55),
      mk('natasha','Natasha','#8e44ad','Mia','Black Widow, spy','Calculated, guarded, tactically intimate',['spy','mission','red room','fight'],60,45),
      mk('thor','Thor','#f1c40f','Dean','God of Thunder','Boisterous, noble, slightly out of touch',['hammer','asgard','mead','lightning'],45,60),
      mk('bruce','Bruce Banner','#27ae60','Milo','Hulk, scientist','Gentle, self-loathing, avoids conflict',['gamma','science','anger','smash'],25,50),
      mk('clint','Clint Barton','#d35400','Milo','Hawkeye, archer','Dry, family-focused, grounded',['bow','arrows','farm','family'],55,40)]};
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
    <rect x="1" y1="1" width="518" height="163" fill="#05010f" stroke="#3b2a6e" stroke-width="2"/>
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
  const realms=await dbGetAll('realms'),sessions=await dbGetAll('sessions');
  let chars=0;realms.forEach(r=>chars+=(r.characters||[]).length);
  document.getElementById('statRealms').textContent=realms.length;
  document.getElementById('statSessions').textContent=sessions.length;
  document.getElementById('statChars').textContent=chars;
  if(typeof renderStatsSection==='function')renderStatsSection();
  const regular=sessions.filter(s=>!s.isWhisper).sort((a,b)=>(b.lastActiveAt||0)-(a.lastActiveAt||0)).slice(0,5);
  const list=document.getElementById('recentList');list.innerHTML='';
  if(regular.length===0){list.innerHTML='<div class="activity-empty">NO SESSIONS YET. CREATE A REALM AND START CHATTING.</div>';return;}
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
  const realms=await dbGetAll('realms'),sessions=await dbGetAll('sessions');
  const grid=document.getElementById('realmGrid');grid.innerHTML='';
  const q=(document.getElementById('realmSearch').value||'').toLowerCase();
  realms.forEach(r=>{
    if(q&&!r.name.toLowerCase().includes(q)&&!(r.description||'').toLowerCase().includes(q))return;
    const sessCount=sessions.filter(s=>s.realmId===r.id).length;
    const card=document.createElement('div');card.className='realm-card';
    card.innerHTML=`<div class="realm-preview">${getMapSVG(r.mapConfig?.mapType||'custom')}<span class="realm-badge">${r.isPremade?'PREMADE':'CUSTOM'}</span></div>
      <div class="realm-body"><div class="realm-name">${esc(r.name)}</div><div class="realm-desc">${esc(r.description||'')}</div>
      <div class="realm-meta"><span>${(r.characters||[]).length} CHARS</span><span>${sessCount} SESSIONS</span></div></div>`;
    card.onclick=()=>openRealmDetail(r.id);grid.appendChild(card);
  });
  if(!grid.children.length)grid.innerHTML='<div class="activity-empty" style="grid-column:1/-1">NO REALMS FOUND.</div>';
}
document.getElementById('realmSearch').oninput=renderBrowse;

/* ====================== CREATE REALM ====================== */
let draftRealm=null,ddCrController=null;
function openCreateRealm(){
  draftRealm=null;
  document.getElementById('crName').value='';document.getElementById('crDesc').value='';document.getElementById('crOverview').value='';
  ddCrController=createDropdown(document.getElementById('crControllerDD'),TEXT_MODEL_OPTS,settings.creativeModel);
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step-info').classList.add('active');
  document.getElementById('addCharForm').classList.remove('active');
  showScreen('screen-create');
}
document.getElementById('crCancel').onclick=()=>showScreen('screen-dash');
document.getElementById('createBack').onclick=()=>showScreen('screen-dash');
document.getElementById('crBack2').onclick=()=>{document.getElementById('step-review').classList.remove('active');document.getElementById('step-info').classList.add('active');};

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
      ...result,id:'realm-'+Date.now(),name,description:desc,
      creativeModel:controllerStr,chatModel:settings.chatModel,
      routerModel:settings.routerModel,ttsModel:settings.ttsModel,
      isPremade:false,mapConfig:{enabled:true,mapType:result.mapType||'custom',
        zones:(Array.isArray(result.zones)?result.zones:[]).filter(z=>z&&z.key&&[z.x,z.y,z.w,z.h].every(n=>typeof n==='number')).map(z=>({key:String(z.key),name:String(z.name||z.key).toUpperCase().slice(0,14),x:z.x,y:z.y,w:z.w,h:z.h}))}};
    document.getElementById('crOverview').value=draftRealm.overview||'';
    renderReviewChars();
    document.getElementById('step-gen').classList.remove('active');
    document.getElementById('step-review').classList.add('active');
  }catch(e){console.error(e);toast(e.message||'GENERATION FAILED');document.getElementById('step-gen').classList.remove('active');document.getElementById('step-info').classList.add('active');}
};

async function generateRealmWithAI(name,description,modelStr){
  const{provider,model}=parseModel(modelStr);
  const p=PROVIDERS[provider];if(!p)throw new Error('Unknown provider');
  const key=settings[p.keyName];if(!key)throw new Error(`Missing API key for ${provider}`);
  const sys=`You are a world-building assistant for a roleplay chat platform. Given a realm name and description, output ONLY valid JSON matching this exact schema:
{"overview":"2-3 sentence scene description","mapType":"ship|apartment|tower|custom","zones":[{"key":"lowercase_unique","name":"SHORT LABEL","x":0-100,"y":0-100,"w":10-90,"h":10-90}],"characters":[{"key":"lowercase_unique","name":"Character Name","description":"Role/appearance (1 sentence)","personality":"Core traits (1 sentence)","keywords":["topic1","topic2"],"voice":"Mia|Chloe|Milo|Dean|mimo_default","color":"#hexcolor","pos":{"x":0-100,"y":0-100}}]}
Zones are 3-6 named areas of the location laid out on a 100x100 map (x,y = top-left corner, w,h = size); they must not extend past 100. Place each character's pos inside a fitting zone.
Include 3-10 characters appropriate to the world. Be authentic. Output ONLY JSON.`;
  const res=await fetch(`${p.base}/chat/completions`,{
    method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'system',content:sys},{role:'user',content:`Realm: ${name}\nDescription: ${description}`}],temperature:.8,max_tokens:2000})});
  if(!res.ok)throw new Error(`${provider} API ${res.status}`);
  const data=await res.json();
  const raw=data.choices[0].message.content;
  const m=raw.match(/\{[\s\S]*\}/);if(!m)throw new Error('No JSON returned');
  const parsed=JSON.parse(m[0]);
  if(!Array.isArray(parsed.characters))throw new Error('Invalid structure');
  return parsed;
}

function renderReviewChars(){
  const grid=document.getElementById('reviewChars');grid.innerHTML='';
  if(!draftRealm?.characters)return;
  draftRealm.characters.forEach((c,i)=>{
    const card=document.createElement('div');card.className='char-card';
    card.innerHTML=`<div class="top"><div class="char-avatar" style="background:${esc(c.color)}">${avatarInnerHTML(c)}</div>
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
  document.getElementById('m-name').value=c.name;document.getElementById('m-key').value=c.key;document.getElementById('m-color').value=c.color;
  document.getElementById('m-desc').value=c.description;document.getElementById('m-personality').value=c.personality;
  document.getElementById('m-keywords').value=(c.keywords||[]).join(', ');document.getElementById('m-system').value=c.system||'';
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
    pos:{x:+document.getElementById('acPosX').value||50,y:+document.getElementById('acPosY').value||50}};
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
  if(typeof bumpStat==='function')bumpStat('realmsCreated',1,draftRealm.id);
  toast('REALM SAVED');showScreen('screen-dash');renderDashboard();
};

/* ====================== REALM DETAIL ====================== */
let currentRealmId=null,currentRealm=null;

async function openRealmDetail(id){
  const r=await dbGet('realms',id);if(!r)return;
  currentRealmId=id;currentRealm=r;
  document.getElementById('detailName').textContent=r.name;
  document.getElementById('detailDesc').textContent=r.description||'';
  document.getElementById('detailOverview').textContent=r.overview||'No overview.';
  document.getElementById('detailCharCount').textContent=(r.characters||[]).length;
  document.getElementById('detailModel').textContent=parseModel(r.creativeModel||'').model||'AI';
  document.getElementById('detailVisual').innerHTML=getMapSVG(r.mapConfig?.mapType||'custom');
  renderDetailChars();
  if(typeof renderRealmMemories==='function')renderRealmMemories(r);
  if(typeof renderRelationshipWeb==='function')renderRelationshipWeb(r);
  if(typeof renderRealmJournal==='function')renderRealmJournal(r);

  const sessions=await dbGetAll('sessions');
  const whispers=sessions.filter(s=>s.realmId===id&&s.isWhisper).sort((a,b)=>(b.lastActiveAt||0)-(a.lastActiveAt||0));
  const regular=sessions.filter(s=>s.realmId===id&&!s.isWhisper).sort((a,b)=>(b.lastActiveAt||0)-(a.lastActiveAt||0));
  document.getElementById('detailSessCount').textContent=regular.length;
  const sList=document.getElementById('detailSessions');sList.innerHTML='';
  const renderSessRow=(s)=>{
    const rc=currentRealm.characters.filter(c=>!isCharDisabled(s,c.key)).length;
    const totalC=currentRealm.characters.length;
    const p=currentRealm.characters.find(c=>c.key===s.playerKey);
    const playerLabel=p?`as ${esc(p.name)}`:'(no player)';
    const muteNote=rc<totalC?` &middot; <span style="color:var(--danger)">${rc}/${totalC}</span>`:'';
    const row=document.createElement('div');row.className='session-row';
    const branchMark=s.branchedFrom?'⑂ ':'';
    const titleHTML=s.isWhisper
      ? `<span class="lock-pill" title="Whisper session">${LOCK_SVG} PRIVATE</span> ${branchMark}${esc(s.name)}`
      : branchMark+esc(s.name);
    row.innerHTML=`<div class="s-name">${titleHTML}</div><div class="s-meta">${playerLabel}${muteNote} &middot; ${new Date(s.lastActiveAt||Date.now()).toLocaleDateString()} &middot; ${(s.history||[]).length} MSGS</div>`;
    const go=document.createElement('button');go.className='s-btn';go.textContent='OPEN';go.onclick=()=>openSession(s.id);
    row.appendChild(go);
    if(typeof openTranscriptModal==='function'){
      const ex=document.createElement('button');ex.className='s-btn';ex.textContent='STORY';
      ex.title='Export as transcript / screenplay / AI story';
      ex.onclick=()=>openTranscriptModal(s.id);
      row.appendChild(ex);
    }
    const del=document.createElement('button');del.className='s-btn danger';del.textContent='DEL';
    del.onclick=async()=>{if(confirm('Delete session?')){await dbDelete('sessions',s.id);openRealmDetail(id);}};
    row.appendChild(del);
    return row;
  };
  regular.forEach(s=>sList.appendChild(renderSessRow(s)));
  if(regular.length===0)sList.innerHTML='<div class="activity-empty">NO SESSIONS YET. START ONE TO CHAT.</div>';
  if(whispers.length){
    const h=document.createElement('div');
    h.style.cssText='margin-top:14px;padding-top:10px;border-top:2px dashed var(--border);font-family:"Press Start 2P",monospace;font-size:9px;color:var(--neon-1);text-transform:uppercase;letter-spacing:1px';
    h.innerHTML=`PRIVATE WHISPERS (${whispers.length})`;
    sList.appendChild(h);
    whispers.forEach(s=>sList.appendChild(renderSessRow(s)));
  }
  showScreen('screen-detail');
}

function renderDetailChars(){
  const cList=document.getElementById('detailChars');cList.innerHTML='';
  (currentRealm.characters||[]).forEach((c,i)=>{
    const row=document.createElement('div');row.className='char-row';
    row.innerHTML=`<div class="char-avatar" style="background:${esc(c.color)}">${avatarInnerHTML(c)}</div>
      <div class="char-info"><div class="char-name">${esc(c.name)}</div><div class="char-mini" title="${esc(c.personality||c.description||'')}">${esc(c.personality||c.description||'')}</div></div>
      <div class="char-actions"><button data-i="${i}" class="edit-realm-char">EDIT</button></div>`;
    cList.appendChild(row);
  });
  cList.querySelectorAll('.edit-realm-char').forEach(btn=>{btn.onclick=e=>editRealmCharacter(+e.target.dataset.i);});
}

function editRealmCharacter(idx){
  const c=currentRealm.characters[idx];
  openModal('EDIT '+c.name.toUpperCase(),`
    <div class="field"><label>Name</label><input id="m-name"></div>
    <div class="field"><label>Key</label><input id="m-key"></div>
    <div class="field"><label>Color</label><input id="m-color"></div>
    <div class="field"><label>Voice ID</label><div id="m-voice-dd"></div></div>
    <div class="field"><label>Description</label><input id="m-desc"></div>
    <div class="field"><label>Personality</label><input id="m-personality"></div>
    <div class="field"><label>Keywords (comma)</label><input id="m-keywords"></div>
    <div class="field"><label>System Prompt (optional)</label><textarea id="m-system" placeholder="Extra persona instructions" style="min-height:90px"></textarea></div>
    <div class="btn-row"><button class="btn btn-primary" id="m-save">SAVE</button></div>
  `,'wide');
  document.getElementById('m-name').value=c.name;document.getElementById('m-key').value=c.key;document.getElementById('m-color').value=c.color;
  document.getElementById('m-desc').value=c.description||'';document.getElementById('m-personality').value=c.personality||'';
  document.getElementById('m-keywords').value=(c.keywords||[]).join(', ');document.getElementById('m-system').value=c.system||'';
  const voiceDD=createDropdown(document.getElementById('m-voice-dd'),VOICE_OPTS,c.voice||'Milo');
  document.getElementById('m-save').onclick=async()=>{
    c.name=document.getElementById('m-name').value.trim();
    c.key=document.getElementById('m-key').value.trim().toLowerCase();
    c.color=document.getElementById('m-color').value.trim();
    c.voice=voiceDD.value;
    c.description=document.getElementById('m-desc').value.trim();
    c.personality=document.getElementById('m-personality').value.trim();
    c.keywords=document.getElementById('m-keywords').value.split(',').map(x=>x.trim()).filter(Boolean);
    c.system=document.getElementById('m-system').value.trim();
    currentRealm.updatedAt=Date.now();
    await dbPut('realms',currentRealm);
    closeModal();renderDetailChars();
    toast(esc(c.name)+' UPDATED');
  };
}

document.getElementById('detailBack').onclick=()=>{showScreen('screen-browse');renderBrowse();};
document.getElementById('btnDeleteRealm').onclick=async()=>{
  if(!currentRealmId)return;
  if(!confirm('Delete this realm and all its sessions?'))return;
  const sessions=await dbGetAll('sessions');
  for(const s of sessions){if(s.realmId===currentRealmId)await dbDelete('sessions',s.id);}
  await dbDelete('realms',currentRealmId);
  toast('REALM DELETED');showScreen('screen-browse');renderBrowse();
};

document.getElementById('btnStartSession').onclick=async()=>{
  if(!currentRealmId)return;
  const r=await dbGet('realms',currentRealmId);if(!r)return;
  const sessions=await dbGetAll('sessions');
  const count=sessions.filter(s=>s.realmId===currentRealmId).length;
  const sess={
    id:'sess-'+Date.now(),realmId:currentRealmId,name:'Session '+(count+1),
    playerKey:(r.characters[0]?.key||''),history:[],activeTags:[],
    disabledCharacters:[],isWhisper:false,createdAt:Date.now(),lastActiveAt:Date.now(),renameDone:false};
  await dbPut('sessions',sess);
  if(typeof bumpStat==='function')bumpStat('sessionsStarted',1,currentRealmId);
  openSession(sess.id);
};

/* ====================== CHAT SESSION (UI only) ====================== */
let currentSession=null;
let chatTargetKey='';
let shoutNext=false;

function isCharDisabled(sess,charKey){return(sess?.disabledCharacters||[]).includes(charKey);}
function isWhisperActive(){return !!currentSession?.isWhisper;}

async function openSession(sessId){
  const sess=await dbGet('sessions',sessId);
  if(!sess){toast('SESSION NOT FOUND');return;}
  const realm=await dbGet('realms',sess.realmId);
  if(!realm){toast('REALM NOT FOUND');return;}
  if(!Array.isArray(sess.disabledCharacters))sess.disabledCharacters=[];
  await dbPut('sessions',sess);
  currentSession=sess;currentRealm=realm;
  chatTargetKey='';
  if(sess.isWhisper){
    const candidates=realm.characters.filter(c=>c.key!==sess.playerKey&&!isCharDisabled(sess,c.key));
    if(candidates.length===1)chatTargetKey=candidates[0].key;
  }

  // Header layout: back button outside .chat-toolbar so refreshing toolbar can't nuke it
  const hh=document.getElementById('chat-header');
  hh.style.display='flex';
  hh.innerHTML=`<button class="back" style="margin:0">&lt;&lt;</button>
    <div>${renderSessionTitle()}</div>
    <div class="chat-toolbar">${renderChatToolbarHTML()}</div>`;
  hh.querySelector('.back').onclick=()=>{
    if(typeof distillSession==='function')distillSession(sess,realm);
    if(typeof journalChapterTick==='function')journalChapterTick(sess,realm);
    showScreen('screen-detail');openRealmDetail(realm.id);
  };
  bindChatToolbar();

  initSessionMap(realm,sess);
  if(typeof initPortraitStrip==='function')initPortraitStrip();
  if(typeof initBigMap==='function')initBigMap();
  highlightPlayerToken();
  if(typeof startAmbient==='function')startAmbient();
  if(typeof initWorldLayer==='function')initWorldLayer(realm,sess);
  if(typeof startWorldClock==='function')startWorldClock();
  if(typeof decayMoods==='function')decayMoods(sess);
  if(typeof refreshMoodChips==='function')refreshMoodChips();
  if(typeof renderQuestPanel==='function')renderQuestPanel();
  if(typeof renderInvPanel==='function')renderInvPanel();

  renderChatTarget();
  document.getElementById('chat-tags').style.display='flex';
  renderChatTags();

  const chat=document.getElementById('chat');chat.innerHTML='';
  if(typeof renderBranchNote==='function')renderBranchNote(sess);
  (sess.history||[]).forEach(h=>addChatBubble(h));

  document.getElementById('composer').style.display='block';
  document.getElementById('chatInput').value='';
  document.getElementById('chatInput').disabled=false;
  document.getElementById('sendBtnChat').disabled=false;
  document.getElementById('micBtnChat').disabled=false;
  document.getElementById('sendBtnChat').classList.remove('direct-mode','whisper-mode');
  document.getElementById('directBanner').style.display='none';
  document.getElementById('whisperBanner').style.display=sess.isWhisper?'flex':'none';
  showScreen('screen-chat');
}

function renderSessionTitle(){
  const lockIcon=currentSession?.isWhisper?`<span class="lock-inline" title="Private whisper session" aria-hidden="true">${LOCK_SVG}</span>`:'';
  return `<div class="realm-tag">${esc(currentRealm.name)}</div><div class="session-name">${lockIcon}${esc(currentSession.name)}</div>`;
}

function renderChatToolbarHTML(){
  const p=currentPlayer();
  const soundOn=!!settings.ttsEnabled;
  const whisperOn=!!currentSession?.isWhisper;
  const ambientOn=currentSession?.ambientEnabled!==false;
  return `
    <button class="player-badge ${whisperOn?'whisper':''}" id="playerBadgeBtn" title="Switch character & toggle mute" aria-haspopup="listbox">
      <div class="char-avatar pb-avatar" style="background:${esc(p?p.color:'#888')}">${p?avatarInnerHTML(p):'??'}</div>
      <div class="pb-meta">
        <div class="pb-label">${whisperOn?'WHISPER AS':'YOU ARE'}</div>
        <div class="pb-name">${esc(p?p.name:'—')}</div>
      </div>
      <span class="pb-arrow">&#9660;</span>
    </button>
    <div class="header-right">
      ${settings.inventoryEnabled&&typeof inventoryBtnHTML==='function'?inventoryBtnHTML():''}
      ${settings.questsEnabled?`<button class="icon-btn ${currentSession?.quest?'is-on':''}" id="questBtn" title="${currentSession?.quest?'Quest active — toggle panel':'Start a quest'}">${SCROLL_SVG}</button>`:''}
      <button class="icon-btn ${soundOn?'is-on':'is-off'}" id="soundToggle" title="${soundOn?'Voice auto-play ON':'Voice auto-play OFF'}">
        ${soundOn?SOUND_ON_SVG:SOUND_OFF_SVG}
      </button>
      <button class="icon-btn ${whisperOn?'is-lock':''}" id="whisperToggle" title="${whisperOn?'Whisper mode ON':'Start a private whisper session'}">
        ${whisperOn?LOCK_SVG:LOCK_OPEN_SVG}
      </button>
      <button class="icon-btn ${ambientOn?'is-on':'is-off'}" id="ambientToggle" title="${ambientOn?'Ambient life ON — characters act on their own':'Ambient life OFF'}">${SPARKLE_SVG}</button>
      <button class="icon-btn" id="chatMapExpand" title="Expand map">${EXPAND_SVG}</button>
      <button class="icon-btn" id="chatMapToggle" title="Toggle map">${MAP_SVG}</button>
    </div>
  `;
}

function bindChatToolbar(){
  const pb=document.getElementById('playerBadgeBtn');
  if(pb)pb.onclick=(e)=>{e.stopPropagation();openPlayerSwitcher(pb);};
  const qb=document.getElementById('questBtn');
  if(qb)qb.onclick=()=>{if(typeof openQuestUI==='function')openQuestUI();};
  const mt=document.getElementById('chatMapToggle');
  if(mt)mt.onclick=()=>document.getElementById('chatMapWrap').classList.toggle('collapsed');
  const sb=document.getElementById('soundToggle');
  if(sb)sb.onclick=()=>setSoundEnabled(!settings.ttsEnabled);
  const wt=document.getElementById('whisperToggle');
  if(wt)wt.onclick=()=>toggleWhisper();
  const at=document.getElementById('ambientToggle');
  if(at)at.onclick=()=>toggleAmbientLife();
  const me=document.getElementById('chatMapExpand');
  if(me)me.onclick=()=>toggleMapExpand();
  if(typeof bindInventoryBtn==='function')bindInventoryBtn();
}

async function toggleAmbientLife(){
  if(!currentSession)return;
  currentSession.ambientEnabled=currentSession.ambientEnabled===false;
  await dbPut('sessions',currentSession);
  if(currentSession.ambientEnabled){if(typeof startAmbient==='function')startAmbient();}
  else if(typeof stopAmbient==='function')stopAmbient();
  refreshPlayerBadgeOnly();
  toast(currentSession.ambientEnabled?'AMBIENT LIFE ON':'AMBIENT LIFE OFF');
}

function refreshChatHeader(){
  const hh=document.getElementById('chat-header');if(!hh)return;
  const titleBlock=hh.querySelector(':scope > div:not(.chat-toolbar)');
  const toolbar=hh.querySelector('.chat-toolbar');
  if(titleBlock)titleBlock.innerHTML=currentSession&&currentRealm?renderSessionTitle():'';
  if(toolbar)toolbar.innerHTML=renderChatToolbarHTML();
  bindChatToolbar();highlightPlayerToken();
  if(typeof updateEarshotUI==='function')updateEarshotUI();
  const banner=document.getElementById('whisperBanner');
  if(banner)banner.style.display=isWhisperActive()?'flex':'none';
}
function refreshPlayerBadgeOnly(){
  const wrap=document.querySelector('#chat-header .chat-toolbar');
  if(!wrap)return;
  wrap.innerHTML=renderChatToolbarHTML();
  bindChatToolbar();highlightPlayerToken();
}

function currentPlayer(){
  if(!currentSession||!currentRealm)return null;
  return currentRealm.characters.find(c=>c.key===currentSession.playerKey)||currentRealm.characters[0]||null;
}
function highlightPlayerToken(){
  if(!currentRealm||!currentSession)return;
  const pk=currentSession.playerKey;
  currentRealm.characters.forEach(c=>{
    if(!c._mapEl)return;
    c._mapEl.classList.toggle('is-player',c.key===pk);
    c._mapEl.classList.toggle('muted',isCharDisabled(currentSession,c.key));
  });
  if(typeof updatePortraitStrip==='function')updatePortraitStrip();
}

function openPlayerSwitcher(anchor){
  document.querySelectorAll('.player-popover').forEach(p=>p.remove());
  const pop=document.createElement('div');pop.className='player-popover';pop.setAttribute('role','listbox');
  const chars=currentRealm?.characters||[];
  if(chars.length===0){pop.innerHTML='<div class="player-popover-empty">No characters in this realm.</div>';}
  else{
    chars.forEach(c=>{
      const muted=isCharDisabled(currentSession,c.key);
      const active=c.key===currentSession.playerKey;
      const row=document.createElement('div');
      row.className='player-popover-row'+(muted?' muted':'')+(active?' active':'');
      row.setAttribute('role','option');
      row.innerHTML=`<div class="char-avatar" style="background:${esc(c.color)}">${avatarInnerHTML(c)}</div>
        <div class="player-popover-meta"><div class="player-popover-name">${esc(c.name)}</div></div>
        <button class="pp-mute-btn ${muted?'is-muted':''}" data-key="${esc(c.key)}" title="${muted?'Unmute':'Mute'}">${muted?EYE_OFF_SVG:EYE_ON_SVG}</button>`;
      row.onclick=(e)=>{
        if(e.target.closest('.pp-mute-btn'))return;
        if(c.key===currentSession.playerKey){pop.remove();return;}
        currentSession.playerKey=c.key;
        if(chatTargetKey===c.key)chatTargetKey='';
        dbPut('sessions',currentSession);
        refreshChatHeader();renderChatTarget();pop.remove();
        toast('NOW PLAYING AS '+(c.name||'').toUpperCase());
      };
      row.querySelector('.pp-mute-btn').onclick=(e)=>{e.stopPropagation();toggleCharEnabled(c.key);pop.remove();};
      pop.appendChild(row);
    });
  }
  document.body.appendChild(pop);
  const r=anchor.getBoundingClientRect();
  pop.style.top=(window.scrollY+r.bottom+6)+'px';
  pop.style.left=(window.scrollX+r.right-pop.offsetWidth-8)+'px';
  const pr=pop.getBoundingClientRect();
  if(pr.right>window.innerWidth-8)pop.style.left=(window.scrollX+window.innerWidth-pr.width-8)+'px';
  if(pr.left<8)pop.style.left='8px';
}

async function toggleCharEnabled(key){
  if(!currentSession)return;
  const dc=currentSession.disabledCharacters||(currentSession.disabledCharacters=[]);
  const name=(currentRealm.characters.find(c=>c.key===key)||{}).name||key;
  if(dc.includes(key)){currentSession.disabledCharacters=dc.filter(k=>k!==key);toast(name+' UNMUTED');}
  else{currentSession.disabledCharacters=[...dc,key];toast(name+' MUTED');}
  await dbPut('sessions',currentSession);
  if(chatTargetKey===key){
    chatTargetKey='';
    if(isWhisperActive()&&chatTargetCandidates().length===0){
      currentSession.isWhisper=false;
      await dbPut('sessions',currentSession);
      toast('WHISPER EXITED — NO PARTICIPANTS LEFT');
    }
  }
  renderChatTarget();highlightPlayerToken();
  if(typeof updateEarshotUI==='function')updateEarshotUI();
}

async function setSoundEnabled(on){
  settings.ttsEnabled=!!on;await saveSettings();
  refreshPlayerBadgeOnly();
  toast(settings.ttsEnabled?'VOICE AUTOPLAY ON':'VOICE AUTOPLAY OFF');
}

async function toggleWhisper(){
  if(!currentSession)return;
  currentSession.isWhisper=!currentSession.isWhisper;
  await dbPut('sessions',currentSession);
  if(currentSession.isWhisper){
    const candidates=chatTargetCandidates();
    if(candidates.length===0){toast('UNMUTE A CHARACTER FIRST');currentSession.isWhisper=false;await dbPut('sessions',currentSession);refreshChatHeader();return;}
    if(candidates.length===1)chatTargetKey=candidates[0].key;
    toast('WHISPER MODE — PRIVATE CHANNEL');
  }else{toast('WHISPER MODE OFF');}
  refreshChatHeader();renderChatTarget();
}

function chatTargetCandidates(){
  return (currentRealm?.characters||[])
    .filter(c=>c.key!==currentSession?.playerKey)
    .filter(c=>!isCharDisabled(currentSession,c.key));
}

function renderChatTarget(){
  const wrap=document.getElementById('chatTargetWrap');
  const whisper=isWhisperActive();
  wrap.innerHTML=`
    <div class="chat-target">
      <div class="target-pill ${whisper?'whisper-mode':''} ${chatTargetKey?'direct':''}" id="targetPill" title="${whisper?'Whisper mode: pick one to address directly':'Auto: router decides. Pick: address directly'}" aria-haspopup="listbox">
        <span class="tp-icon">${whisper?'🔒':'@'}</span>
        <span class="tp-name" id="targetLabel">${chatTargetKey?'PICKED':'AUTO'}</span>
        <span style="color:var(--text-3);font-size:11px;margin-left:2px">&#9660;</span>
      </div>
      <div class="target-popover" id="targetPopover" role="listbox"></div>
    </div>
  `;
  const pill=document.getElementById('targetPill'),pop=document.getElementById('targetPopover');
  const setTarget=()=>{
    const label=document.getElementById('targetLabel');
    const isDirect=!!chatTargetKey;
    pill.classList.toggle('direct',isDirect&&!whisper);
    pill.classList.toggle('whisper-mode',whisper&&isDirect);
    pill.classList.toggle('shout',shoutNext&&!isDirect&&!whisper);
    document.getElementById('sendBtnChat').classList.toggle('direct-mode',isDirect&&!whisper);
    document.getElementById('sendBtnChat').classList.toggle('whisper-mode',whisper);
    const banner=document.getElementById('directBanner');
    if(isDirect){
      const c=currentRealm.characters.find(x=>x.key===chatTargetKey);
      label.textContent=c?c.name.toUpperCase():'DIRECT';
      document.getElementById('directToName').textContent=c?c.name:'character';
      banner.style.display='flex';
    }else{label.textContent=shoutNext?'SHOUT':'AUTO';banner.style.display='none';}
    pop.querySelectorAll('.tp-row[data-key]').forEach(r=>{r.classList.toggle('active',r.dataset.key===chatTargetKey);});
  };
  pill.onclick=(e)=>{
    e.stopPropagation();
    document.querySelectorAll('.player-popover').forEach(p=>p.remove());
    document.querySelectorAll('.dd.open').forEach(d=>d.classList.remove('open'));
    pop.classList.toggle('open');
  };
  pop.innerHTML='';
  const candidates=chatTargetCandidates();
  if(!whisper){
    const autoRow=document.createElement('div');
    autoRow.className='tp-row'+(chatTargetKey?'':' active');
    autoRow.dataset.key='';
    const desc=candidates.length<=1?'FORCED DIRECT':'NEARBY + ROUTER';
    autoRow.innerHTML=`<div class="char-avatar" style="background:linear-gradient(135deg,var(--neon-1),var(--neon-2))">AI</div>
      <div class="tp-row-meta"><div class="tp-row-name">AUTO (${desc})</div></div>`;
    autoRow.onclick=()=>{chatTargetKey='';shoutNext=false;pop.classList.remove('open');setTarget();toast('AUTO MODE');};
    pop.appendChild(autoRow);
    const shoutRow=document.createElement('div');
    shoutRow.className='tp-row shout-row'+(shoutNext?' active':'');
    shoutRow.innerHTML=`<div class="char-avatar" style="background:var(--neon-3);color:#0d0221">!!</div>
      <div class="tp-row-meta"><div class="tp-row-name">SHOUT (EVERYONE HEARS)</div></div>`;
    shoutRow.onclick=()=>{shoutNext=true;chatTargetKey='';pop.classList.remove('open');setTarget();toast('NEXT MESSAGE IS A SHOUT');};
    pop.appendChild(shoutRow);
  }else{
    const head=document.createElement('div');
    head.className='tp-empty';
    head.innerHTML='PRIVATE WHISPER &mdash; PICK ONE:';
    pop.appendChild(head);
  }
  if(candidates.length===0){
    const empty=document.createElement('div');
    empty.className='tp-empty';
    empty.textContent=whisper?'No partners enabled. Unmute one first.':'No other characters enabled.';
    pop.appendChild(empty);
  }else{
    candidates.forEach(c=>{
      const row=document.createElement('div');
      row.className='tp-row'+(c.key===chatTargetKey?' active':'');
      row.dataset.key=c.key;
      row.innerHTML=`<div class="char-avatar" style="background:${esc(c.color)}">${avatarInnerHTML(c)}</div>
        <div class="tp-row-meta"><div class="tp-row-name">${esc(c.name)}</div></div>
        ${whisper?'<span class="tp-lock-badge">LOCK</span>':''}`;
      row.onclick=()=>{chatTargetKey=c.key;shoutNext=false;pop.classList.remove('open');setTarget();toast(whisper?'WHISPERING TO '+(c.name||'').toUpperCase():'TALKING TO '+(c.name||'').toUpperCase());};
      pop.appendChild(row);
    });
  }
  setTarget();
}
document.getElementById('clearDirect').onclick=()=>{chatTargetKey='';renderChatTarget();};
document.getElementById('exitWhisper').onclick=()=>{toggleWhisper();};

function renderChatTags(){
  const bar=document.getElementById('chat-tags');bar.innerHTML='';
  const sess=currentSession;if(!sess)return;
  (sess.activeTags||[]).forEach(tag=>{
    const p=document.createElement('span');p.className='tag-pill';
    p.innerHTML=`${esc(tag)} <span class="x">&times;</span>`;
    p.querySelector('.x').onclick=()=>{sess.activeTags=sess.activeTags.filter(t=>t!==tag);dbPut('sessions',sess);renderChatTags();};
    bar.appendChild(p);
  });
  const add=document.createElement('button');add.className='add-tag-btn';add.textContent='+ TAG';
  add.onclick=()=>{
    const inp=document.createElement('input');inp.id='tagInput';inp.placeholder='type...';
    inp.onblur=()=>{const v=inp.value.trim().toLowerCase();if(v&&!sess.activeTags.includes(v)){sess.activeTags.push(v);dbPut('sessions',sess);}renderChatTags();};
    inp.onkeydown=e=>{if(e.key==='Enter')inp.blur();};
    add.replaceWith(inp);setTimeout(()=>inp.focus(),10);
  };
  bar.appendChild(add);
}

function addChatBubble(h){
  const chat=document.getElementById('chat');
  const key=h.speakerKey||'',name=h.speaker||'?',text=h.text||'';
  if(h.kind==='roll'){
    // dice.js renders live rolls itself (with animation); this path replays saved history
    if(typeof renderRollBubble==='function'){
      const rb=renderRollBubble(h,true);
      if(h.timestamp)rb.dataset.ts=h.timestamp;
      chat.appendChild(rb);
    }else{
      const line=document.createElement('div');line.className='narration-line';
      if(h.timestamp)line.dataset.ts=h.timestamp;
      line.textContent=text;chat.appendChild(line);
    }
    chat.scrollTop=chat.scrollHeight;
    return;
  }
  if(h.kind==='event'||h.kind==='system'){
    const line=document.createElement('div');
    line.className='narration-line'+(h.kind==='system'?' system':'');
    if(h.timestamp)line.dataset.ts=h.timestamp;
    line.textContent=(h.kind==='event'?'☀ ':'')+text;
    chat.appendChild(line);chat.scrollTop=chat.scrollHeight;
    return;
  }
  const isMe=!!h.isPlayer;
  const c=(currentRealm?.characters||[]).find(x=>x.key===key)||{color:'#888',name};
  const div=document.createElement('div');div.className='msg'+(isMe?' me':'')+(h.kind==='ambient'?' ambient':'');
  if(h.timestamp)div.dataset.ts=h.timestamp;
  const moodHTML=(!isMe&&typeof moodBadge==='function')?moodBadge(key):'';
  div.innerHTML=`<div class="char-avatar" style="background:${esc(c.color)}">${c.key?avatarInnerHTML(c):esc(name.slice(0,2).toUpperCase())}${moodHTML}</div>
    <div class="bubble"><div class="who" style="color:${esc(c.color)}">${h.shout?'📢 ':''}${esc(name)}${!isMe?'<button class="replay" title="Replay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>':''}</div><div>${esc(text)}</div></div>`;
  if(!isMe)div.querySelector('.replay').onclick=()=>speakChat(text,key);
  if(typeof bindMessageActions==='function')bindMessageActions(div,h);
  chat.appendChild(div);chat.scrollTop=chat.scrollHeight;
}

/* ====================== MODAL HELPERS ====================== */
function openModal(title,html,sizeCls){
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=html;
  document.getElementById('modalBox').classList.toggle('wide',sizeCls==='wide');
  document.getElementById('overlay').classList.add('open');
}
function closeModal(){document.getElementById('overlay').classList.remove('open');}
document.getElementById('modalClose').onclick=closeModal;
document.getElementById('overlay').onclick=e=>{if(e.target===document.getElementById('overlay'))closeModal();};

/* ====================== SETTINGS UI ====================== */
function fillSettings(){
  document.getElementById('sAquaKey').value=settings.aquaKey;
  document.getElementById('sGroqKey').value=settings.groqKey;
  dd.creative.value=settings.creativeModel;
  dd.task.value=settings.taskModel;
  dd.router.value=settings.routerModel;
  dd.chat.value=settings.chatModel;
  dd.tts.value=settings.ttsModel;
  dd.stt.value=settings.sttModel;
  document.getElementById('sTtsOn').checked=settings.ttsEnabled;
  document.getElementById('sSoundOn').checked=settings.soundEnabled!==false;
  document.getElementById('sSoundVol').value=Math.round((settings.soundVolume??0.4)*100);
  document.getElementById('sAmbientLoop').checked=!!settings.ambientLoopEnabled;
  document.getElementById('sWeatherFx').checked=settings.weatherFxEnabled!==false;
  document.getElementById('sDiceEnabled').checked=!!settings.diceEnabled;
  document.getElementById('sQuestsEnabled').checked=!!settings.questsEnabled;
  document.getElementById('sInventoryEnabled').checked=!!settings.inventoryEnabled;
  const pixEl=document.getElementById('sPixelAvatars');
  if(pixEl)pixEl.checked=settings.pixelAvatarsEnabled!==false;
  if(dd.worldClock)dd.worldClock.value=settings.worldClockMode||'hybrid';
  renderThemePicker();
}
document.getElementById('sSoundVol').addEventListener('input',e=>{
  if(typeof setSfxVolume==='function')setSfxVolume(e.target.value/100);
  if(typeof sfx==='function')sfx('reply');
});
document.getElementById('sSave').onclick=async()=>{
  settings.aquaKey=document.getElementById('sAquaKey').value.trim();
  settings.groqKey=document.getElementById('sGroqKey').value.trim();
  settings.creativeModel=dd.creative.value||DEFAULT_SETTINGS.creativeModel;
  settings.taskModel=dd.task.value||DEFAULT_SETTINGS.taskModel;
  settings.routerModel=dd.router.value||DEFAULT_SETTINGS.routerModel;
  settings.chatModel=dd.chat.value||DEFAULT_SETTINGS.chatModel;
  settings.ttsModel=dd.tts.value||DEFAULT_SETTINGS.ttsModel;
  settings.sttModel=dd.stt.value||DEFAULT_SETTINGS.sttModel;
  settings.ttsEnabled=document.getElementById('sTtsOn').checked;
  settings.soundEnabled=document.getElementById('sSoundOn').checked;
  settings.soundVolume=Math.min(1,Math.max(0,(+document.getElementById('sSoundVol').value||0)/100));
  settings.ambientLoopEnabled=document.getElementById('sAmbientLoop').checked;
  settings.weatherFxEnabled=document.getElementById('sWeatherFx').checked;
  settings.diceEnabled=document.getElementById('sDiceEnabled').checked;
  settings.questsEnabled=document.getElementById('sQuestsEnabled').checked;
  settings.inventoryEnabled=document.getElementById('sInventoryEnabled').checked;
  const pixEl=document.getElementById('sPixelAvatars');
  if(pixEl)settings.pixelAvatarsEnabled=pixEl.checked;
  const wc=dd.worldClock?dd.worldClock.value:'';
  settings.worldClockMode=['off','exchanges','hybrid'].includes(wc)?wc:DEFAULT_SETTINGS.worldClockMode;
  await saveSettings();
  applyFeatureAvailability();
  if(typeof setSfxVolume==='function')setSfxVolume(settings.soundVolume);
  toast('SETTINGS SAVED');showScreen('screen-dash');renderDashboard();
};
document.getElementById('sReset').onclick=async()=>{
  settings={...DEFAULT_SETTINGS};
  await saveSettings();applySkin();applyFeatureAvailability();fillSettings();
  toast('DEFAULTS RESTORED');
};

function applyFeatureAvailability(){
  const diceBtn=document.getElementById('diceBtnChat');
  if(diceBtn)diceBtn.hidden=!settings.diceEnabled;
  if(!settings.diceEnabled){
    document.querySelectorAll('.dice-popover.open').forEach(p=>p.classList.remove('open'));
    if(typeof clearRollNote==='function')clearRollNote();
  }
  if(!settings.questsEnabled){
    const panel=document.getElementById('questPanel');
    if(panel){panel.style.display='none';panel.innerHTML='';}
  }else if(typeof renderQuestPanel==='function'&&currentSession)renderQuestPanel();
  if(!settings.inventoryEnabled){
    if(typeof invOpen!=='undefined')invOpen=false;
    const panel=document.getElementById('invPanel');
    if(panel){panel.style.display='none';panel.innerHTML='';}
  }else if(typeof renderInvPanel==='function'&&currentSession)renderInvPanel();
  if(currentSession)refreshPlayerBadgeOnly();
}

function renderThemePicker(){
  const wrap=document.getElementById('themePicker');wrap.innerHTML='';
  Object.entries(THEMES).forEach(([name,vars])=>{
    const dot=document.createElement('div');
    dot.className='theme-opt'+(name===settings.theme?' active':'');
    dot.style.background=`linear-gradient(135deg, ${vars['--neon-1']} 0 50%, ${vars['--bg']} 50% 100%)`;
    dot.dataset.theme=name;dot.title=name;
    dot.onclick=()=>{settings.theme=name;applyTheme(name);saveSettings();};
    wrap.appendChild(dot);
  });
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    document.querySelectorAll('.player-popover').forEach(p=>p.remove());
    document.querySelectorAll('.target-popover.open').forEach(p=>p.classList.remove('open'));
    if(document.getElementById('overlay').classList.contains('open'))closeModal();
  }
});

/* ====================== INIT ====================== */
(async()=>{
  await loadSettings();
  applyFeatureAvailability();
  bindSkinControls();
  initSettingsDropdowns();
  await ensurePremades();
  renderDashboard();
  renderBrowse();
  if(!settings.aquaKey)setTimeout(()=>toast('ADD YOUR AQUA API KEY IN SETTINGS'),700);
})();
