/* ===================================================================
   SUNNY DECK // RETRO  —  director.js
   Ambient life: NPC wandering, activity states, background chatter,
   scene events, and the post-exchange stage-direction tick.
   Loaded after map.js / memory.js; before app-ai.js.
   =================================================================== */
'use strict';

const AMBIENT_MIN_MS=45000,AMBIENT_MAX_MS=90000;

/* Authored pools for the premade casts; other realms fall back to
   character keywords. Keyed by character key so existing saved realms
   get them without a DB migration. */
const PREMADE_ACTIVITY_POOLS={
  luffy:[{emoji:'🍖',label:'gnawing on meat'},{emoji:'🎣',label:'fishing off the rail'},{emoji:'😆',label:'laughing at nothing'}],
  zoro:[{emoji:'💤',label:'napping against the mast'},{emoji:'🏋️',label:'lifting weights'},{emoji:'⚔️',label:'running sword drills'}],
  nami:[{emoji:'🗺️',label:'drawing charts'},{emoji:'💰',label:'counting berries'},{emoji:'🍊',label:'tending the tangerines'}],
  usopp:[{emoji:'🔧',label:'tinkering with a gadget'},{emoji:'🎯',label:'target practice'},{emoji:'📖',label:'rehearsing a tall tale'}],
  sanji:[{emoji:'🍳',label:'cooking'},{emoji:'☕',label:'brewing coffee'},{emoji:'🚬',label:'taking a smoke break'}],
  chopper:[{emoji:'💊',label:'mixing medicine'},{emoji:'🍬',label:'eating cotton candy'},{emoji:'📚',label:'reading a medical book'}],
  robin:[{emoji:'📖',label:'reading'},{emoji:'☕',label:'sipping coffee'},{emoji:'🏺',label:'studying an artifact'}],
  franky:[{emoji:'🔧',label:'doing ship repairs'},{emoji:'🥤',label:'chugging cola'},{emoji:'🕺',label:'striking a pose'}],
  brook:[{emoji:'🎻',label:'playing violin'},{emoji:'🎵',label:'humming a tune'},{emoji:'☕',label:'having afternoon tea'}],
  jinbe:[{emoji:'⚓',label:'minding the helm'},{emoji:'🍵',label:'drinking tea'},{emoji:'🧘',label:'meditating'}],
  monica:[{emoji:'🧽',label:'re-cleaning the counter'},{emoji:'🍰',label:'plating dessert'},{emoji:'📋',label:'organizing something'}],
  chandler:[{emoji:'📰',label:'pretending to read'},{emoji:'☕',label:'nursing a coffee'},{emoji:'🙃',label:'workshopping a joke'}],
  rachel:[{emoji:'🛍️',label:'browsing a catalog'},{emoji:'💅',label:'fixing her nails'},{emoji:'☕',label:'carrying a tray'}],
  ross:[{emoji:'🦕',label:'talking dinosaurs'},{emoji:'📖',label:'grading papers'},{emoji:'😤',label:'quietly fuming'}],
  joey:[{emoji:'🥪',label:'eating a sandwich'},{emoji:'🎬',label:'running lines'},{emoji:'😏',label:'people watching'}],
  phoebe:[{emoji:'🎸',label:'strumming her guitar'},{emoji:'✨',label:'sensing an aura'},{emoji:'🧶',label:'knitting something odd'}],
  tony:[{emoji:'🔧',label:'tweaking the suit'},{emoji:'🥃',label:'pouring a drink'},{emoji:'📱',label:'arguing with JARVIS'}],
  steve:[{emoji:'🛡️',label:'polishing the shield'},{emoji:'📓',label:'updating his list'},{emoji:'🥊',label:'working the bag'}],
  natasha:[{emoji:'🗡️',label:'sharpening a knife'},{emoji:'👀',label:'watching everyone'},{emoji:'📂',label:'reading a dossier'}],
  thor:[{emoji:'🌯',label:'eating shawarma'},{emoji:'🍺',label:'draining a flagon'},{emoji:'⚡',label:'admiring the storm'}],
  bruce:[{emoji:'🧪',label:'running an experiment'},{emoji:'🫖',label:'making calming tea'},{emoji:'🧘',label:'breathing exercises'}],
  clint:[{emoji:'🏹',label:'fletching arrows'},{emoji:'📞',label:'calling the farm'},{emoji:'☕',label:'drinking bad coffee'}]
};
function activityPoolFor(c){
  if(PREMADE_ACTIVITY_POOLS[c.key])return PREMADE_ACTIVITY_POOLS[c.key];
  if(Array.isArray(c.activityPool)&&c.activityPool.length)return c.activityPool;
  return(c.keywords||[]).slice(0,3).map(k=>({emoji:'✦',label:k}));
}

/* ====================== SHARED AI JSON HELPER ====================== */
async function aiJson(prompt,modelStr,maxTokens){
  const{provider,model}=parseModel(modelStr||settings.taskModel);
  const p=PROVIDERS[provider];if(!p)throw new Error('Unknown provider');
  const key=settings[p.keyName];if(!key)throw new Error('Missing API key');
  const res=await fetch(`${p.base}/chat/completions`,{
    method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:.7,max_tokens:maxTokens||200})});
  if(!res.ok)throw new Error(`AI ${res.status}`);
  const data=await res.json();
  const m=(data.choices?.[0]?.message?.content||'').match(/[\[{][\s\S]*[\]}]/);
  if(!m)throw new Error('no json');
  return JSON.parse(m[0]);
}

/* ====================== AMBIENT SCHEDULER ====================== */
let ambientTimer=null;
function startAmbient(){stopAmbient();scheduleNextBeat();}
function stopAmbient(){clearTimeout(ambientTimer);ambientTimer=null;}
function scheduleNextBeat(){
  ambientTimer=setTimeout(runAmbientBeat,AMBIENT_MIN_MS+Math.random()*(AMBIENT_MAX_MS-AMBIENT_MIN_MS));
}
function directorOnScreenChange(id){if(id!=='screen-chat')stopAmbient();}

async function runAmbientBeat(){
  try{
    const sess=currentSession,realm=currentRealm;
    if(!sess||!realm)return;
    if(document.hidden||chatBusy||sess.isWhisper||sess.ambientEnabled===false)return;
    if(!document.getElementById('screen-chat')?.classList.contains('active'))return;
    const npcs=realm.characters.filter(c=>c.key!==sess.playerKey&&!isCharDisabled(sess,c.key));
    if(!npcs.length)return;
    if(typeof decayMoods==='function')decayMoods(sess);
    if(typeof weatherDirectorTick==='function')weatherDirectorTick();
    const roll=Math.random();
    if(roll<0.6||!hasApiKeys())visualBeat(npcs);
    else if(roll<0.95)await chatterBeat(npcs,realm,sess);
    else await eventBeat(npcs,realm,sess);
  }catch(e){console.warn('Ambient beat failed',e);}
  finally{if(ambientTimer!==null)scheduleNextBeat();}
}

/* --- 60%: pure visuals, zero API cost --- */
function visualBeat(npcs){
  const npc=npcs[Math.floor(Math.random()*npcs.length)];
  if(Math.random()<0.5){
    const zones=realmZones(currentRealm);
    const cur=zoneOf(npc.key);
    const others=zones.filter(z=>z.key!==cur?.key);
    const z=(others.length?others:zones)[Math.floor(Math.random()*(others.length||zones.length))];
    moveToZone(npc.key,z.key);
  }else{
    const pool=activityPoolFor(npc);
    if(pool.length)setActivity(npc.key,pool[Math.floor(Math.random()*pool.length)]);
  }
}

/* --- 35%: two nearby NPCs exchange a couple of lines (1 API call) --- */
async function chatterBeat(npcs,realm,sess){
  const pairs=[];
  for(let i=0;i<npcs.length;i++)for(let j=i+1;j<npcs.length;j++){
    if(isNear(npcs[i].key,npcs[j].key))pairs.push([npcs[i],npcs[j]]);
  }
  if(!pairs.length){visualBeat(npcs);return;}
  const[a,b]=pairs[Math.floor(Math.random()*pairs.length)];
  const zone=zoneOf(a.key);
  const actA=sess.activities?.[a.key],actB=sess.activities?.[b.key];
  const recent=sess.history.slice(-4).filter(h=>h.kind!=='system').map(h=>`${h.speaker}: ${h.text}`).join('\n');
  const worldCtx=typeof worldPromptNote==='function'?worldPromptNote():'';
  const prompt=`You write ambient background dialogue for ${realm.name}.
${a.name} (${a.personality})${actA?`, currently ${actA.label},`:''} and ${b.name} (${b.personality})${actB?`, currently ${actB.label},`:''} are hanging out${zone?` at the ${zone.name}`:''}.
${worldCtx?worldCtx+'\n':''}Main conversation nearby (for context, do not repeat it): ${recent||'(quiet so far)'}
Write a short, natural exchange between the two of them — spoken words only, one line each, fully in character.
Output ONLY JSON: [{"key":"${a.key}","text":"..."},{"key":"${b.key}","text":"..."}]`;
  const lines=await aiJson(prompt,settings.chatModel,180);
  if(!Array.isArray(lines))return;
  for(const line of lines.slice(0,2)){
    const c=realm.characters.find(x=>x.key===line.key);
    if(!c||typeof line.text!=='string'||!line.text.trim())continue;
    if(inEarshot(c.key)){
      const h={kind:'ambient',speakerKey:c.key,speaker:c.name,text:line.text.trim(),timestamp:Date.now(),isPlayer:false};
      addChatBubble(h);sess.history.push(h);
    }else{
      flashDistantChatter(c.key);
    }
    setMapSpeaking(c.key,true);
    await new Promise(r=>setTimeout(r,1600));
    setMapSpeaking(c.key,false);
  }
  sess.lastActiveAt=Date.now();
  await dbPut('sessions',sess);
}

function flashDistantChatter(key){
  const c=(currentRealm?.characters||[]).find(x=>x.key===key);
  const el=c?._mapEl;if(!el)return;
  let chip=el.querySelector('.mt-chatter');
  if(!chip){chip=document.createElement('span');chip.className='mt-chatter';chip.textContent='💬';el.appendChild(chip);}
  chip.classList.add('show');
  clearTimeout(el._chatterT);
  el._chatterT=setTimeout(()=>chip.classList.remove('show'),4000);
}

/* --- 5%: a narrated scene event + one reaction (1 API call) --- */
async function eventBeat(npcs,realm,sess){
  const sceneLines=npcs.map(c=>{
    const z=zoneOf(c.key),a=sess.activities?.[c.key];
    return`${c.key} (${c.name})${z?` at the ${z.name}`:''}${a?`, ${a.label}`:''}`;
  }).join('; ');
  const worldCtx=typeof worldPromptNote==='function'?worldPromptNote():'';
  const prompt=`You are the scene narrator of ${realm.name}. ${realm.overview||''}
Current scene: ${sceneLines}.${worldCtx?' '+worldCtx:''}
Invent ONE small ambient event that just happens (1-2 sentences, present tense, no dialogue), then pick one character to react with one short spoken line.
Output ONLY JSON: {"narration":"...","reaction":{"key":"one_of: ${npcs.map(c=>c.key).join(', ')}","text":"..."}}`;
  const parsed=await aiJson(prompt,settings.chatModel,200);
  if(typeof parsed?.narration==='string'&&parsed.narration.trim()){
    const h={kind:'event',speakerKey:'',speaker:'Narrator',text:parsed.narration.trim(),timestamp:Date.now()};
    addChatBubble(h);sess.history.push(h);
  }
  const rc=realm.characters.find(x=>x.key===parsed?.reaction?.key);
  if(rc&&typeof parsed.reaction.text==='string'&&parsed.reaction.text.trim()){
    const h={kind:'ambient',speakerKey:rc.key,speaker:rc.name,text:parsed.reaction.text.trim(),timestamp:Date.now(),isPlayer:false};
    if(inEarshot(rc.key))addChatBubble(h);else flashDistantChatter(rc.key);
    sess.history.push(h);
    setMapSpeaking(rc.key,true);setTimeout(()=>setMapSpeaking(rc.key,false),1600);
  }
  sess.lastActiveAt=Date.now();
  await dbPut('sessions',sess);
}

/* ====================== STAGE DIRECTIONS ====================== */
/* One cheap call after each player exchange: does the conversation
   imply someone moves or changes what they're doing? */
let stageBusy=false;
async function stageDirectionTick(sess,realm){
  if(stageBusy||!hasApiKeys()||!sess||!realm)return;
  stageBusy=true;
  try{
    const recent=sess.history.slice(-6).filter(h=>h.kind!=='system').map(h=>`${h.speaker}: ${h.text}`).join('\n');
    const zones=realmZones(realm).map(z=>z.key).join(', ');
    const chars=realm.characters.filter(c=>!isCharDisabled(sess,c.key))
      .map(c=>`${c.key}${c.key===sess.playerKey?' (the player)':''}${zoneOf(c.key)?` at ${zoneOf(c.key).key}`:''}`).join('; ');
    const prompt=`You are the silent stage director of ${realm.name}. Based ONLY on the latest exchange, decide if any NON-PLAYER character would physically move to another zone or start a new activity. Most exchanges change nothing — then output {}.
Zones: ${zones}
Characters: ${chars}
Latest exchange:
${recent}
Output ONLY JSON: {"moves":[{"key":"zoro","zone":"mast"}],"activities":{"sanji":{"emoji":"🍳","label":"cooking"}}} or {}`;
    const parsed=await aiJson(prompt,settings.routerModel,150);
    (parsed?.moves||[]).forEach(mv=>{
      if(mv?.key&&mv.key!==sess.playerKey&&realm.characters.some(c=>c.key===mv.key))moveToZone(mv.key,mv.zone);
    });
    Object.entries(parsed?.activities||{}).forEach(([k,a])=>{
      if(k!==sess.playerKey&&realm.characters.some(c=>c.key===k)&&a&&typeof a.label==='string'&&a.label.trim()){
        setActivity(k,{emoji:String(a.emoji||'✦').slice(0,4),label:a.label.trim().slice(0,40)});
      }
    });
  }catch(e){console.warn('Stage tick failed',e);}
  finally{stageBusy=false;}
}

/* Best-effort memory distill when the tab goes to background. */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&currentSession&&currentRealm&&typeof distillSession==='function'){
    distillSession(currentSession,currentRealm);
  }
});
