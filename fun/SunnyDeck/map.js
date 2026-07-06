/* ===================================================================
   SUNNY DECK // RETRO  —  map.j
   Interactive map engine: zones, movement, proximity / earshot.
   Loaded after app.js as a classic script; shares its globals
   (currentRealm, currentSession, chatTargetKey, esc, dbPut, toast...).
   =================================================================== */
'use strict';

/* Distance model: token x/y are % of the map box. The map is a wide
   strip, so vertical % covers far fewer pixels than horizontal % —
   MAP_ASPECT compresses dy to keep distances visually honest. */
const MAP_ASPECT=0.35;
const EARSHOT_RANGE=14;   // in %-of-width units
const APPROACH_GAP=5;     // how close you stop when walking up to someone

function mapDist(a,b){return Math.hypot(a.x-b.x,(a.y-b.y)*MAP_ASPECT);}

/* ====================== ZONES ====================== */
function defaultZones(mapType){
  if(mapType==='ship')return[
    {key:'cabin',name:'CABIN',x:13,y:32,w:17,h:33},
    {key:'galley',name:'GALLEY',x:30,y:58,w:14,h:30},
    {key:'lawn',name:'LAWN',x:40,y:28,w:34,h:44},
    {key:'mast',name:'MAST',x:52,y:42,w:11,h:17},
    {key:'helm',name:'HELM',x:85,y:26,w:13,h:48}];
  if(mapType==='apartment')return[
    {key:'couch',name:'COUCH',x:8,y:17,w:38,h:65},
    {key:'counter',name:'COUNTER',x:50,y:17,w:21,h:38},
    {key:'stage',name:'STAGE',x:50,y:60,w:21,h:22},
    {key:'door',name:'DOOR',x:75,y:17,w:17,h:65}];
  if(mapType==='tower')return[
    {key:'lounge',name:'LOUNGE',x:16,y:38,w:33,h:46},
    {key:'bar',name:'BAR',x:51,y:38,w:33,h:46},
    {key:'window',name:'WINDOW',x:8,y:10,w:84,h:22}];
  return[{key:'area',name:'AREA',x:10,y:15,w:80,h:70}];
}
function realmZones(realm){
  const z=realm?.mapConfig?.zones;
  return(Array.isArray(z)&&z.length)?z:defaultZones(realm?.mapConfig?.mapType||'custom');
}
function zoneAt(realm,x,y){
  const hits=realmZones(realm).filter(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h);
  if(!hits.length)return null;
  return hits.sort((a,b)=>a.w*a.h-b.w*b.h)[0]; // smallest wins (nested zones like MAST inside LAWN)
}
function zoneOf(key){
  const p=currentSession?.positions?.[key];
  return p?zoneAt(currentRealm,p.x,p.y):null;
}

/* ====================== SESSION SPACE ====================== */
/* Lazy migration: older sessions have no positions/activities. */
function ensureSessionSpace(sess,realm){
  if(!sess.positions)sess.positions={};
  (realm.characters||[]).forEach(c=>{
    if(!sess.positions[c.key])sess.positions[c.key]={x:c.pos?.x??50,y:c.pos?.y??50};
  });
  if(!sess.activities)sess.activities={};
  if(sess.ambientEnabled===undefined)sess.ambientEnabled=true;
}

let posSaveTimer=null;
function schedulePosSave(){
  clearTimeout(posSaveTimer);
  posSaveTimer=setTimeout(()=>{if(currentSession)dbPut('sessions',currentSession);},600);
}

/* ====================== RENDER ====================== */
function initSessionMap(realm,sess){
  ensureSessionSpace(sess,realm);
  const mapWrap=document.getElementById('chatMapWrap');
  mapWrap.innerHTML=`<div id="chatMap">${getMapSVG(realm.mapConfig?.mapType||'custom')}<div id="earshotRing"></div><div id="chatMapTokens"></div></div>`;
  mapWrap.classList.toggle('collapsed',realm.mapConfig?.enabled===false);
  mapWrap.classList.remove('expanded');
  const mapEl=document.getElementById('chatMap');
  realmZones(realm).forEach(z=>{
    const d=document.createElement('div');d.className='map-zone';
    d.style.left=z.x+'%';d.style.top=z.y+'%';d.style.width=z.w+'%';d.style.height=z.h+'%';
    d.innerHTML=`<span class="mz-label">${esc(z.name)}</span>`;
    mapEl.insertBefore(d,document.getElementById('earshotRing'));
  });
  const tok=document.getElementById('chatMapTokens');
  (realm.characters||[]).forEach(c=>{
    const p=sess.positions[c.key];
    const t=document.createElement('div');t.className='map-token';t.dataset.key=c.key;t.style.background=c.color;
    t.style.left=p.x+'%';t.style.top=p.y+'%';
    t.textContent=c.name.slice(0,2).toUpperCase();
    const lbl=document.createElement('span');lbl.className='mt-label';lbl.textContent=c.name;
    const act=document.createElement('span');act.className='mt-activity';
    t.append(lbl,act);
    t.onclick=e=>{e.stopPropagation();if(c.key!==currentSession.playerKey)approachCharacter(c.key);};
    tok.appendChild(t);
    c._mapEl=t;
  });
  mapEl.onclick=e=>{
    if(e.target.closest('.map-token'))return;
    const r=mapEl.getBoundingClientRect();
    const x=Math.min(97,Math.max(3,(e.clientX-r.left)/r.width*100));
    const y=Math.min(92,Math.max(8,(e.clientY-r.top)/r.height*100));
    movePlayerTo(x,y);
  };
  refreshActivityChips();
  updateEarshotUI();
}

function toggleMapExpand(){
  const wrap=document.getElementById('chatMapWrap');
  wrap.classList.remove('collapsed');
  wrap.classList.toggle('expanded');
}

/* ====================== MOVEMENT ====================== */
function moveCharacter(key,x,y){
  const sess=currentSession;if(!sess?.positions)return;
  const from=sess.positions[key]||{x:50,y:50};
  const d=mapDist(from,{x,y});
  sess.positions[key]={x,y};
  const c=(currentRealm?.characters||[]).find(ch=>ch.key===key);
  const el=c?._mapEl;
  const dur=Math.min(3,0.35+d*0.06);
  if(el){
    el.style.transitionDuration=dur+'s';
    el.style.left=x+'%';el.style.top=y+'%';
    el.classList.add('walking');
    clearTimeout(el._walkT);
    el._walkT=setTimeout(()=>{
      el.classList.remove('walking');el.style.transitionDuration='';
      if(key===currentSession?.playerKey)onPlayerArrived();else updateEarshotUI();
    },dur*1000);
  }
  if(key===sess.playerKey)positionEarshotRing(x,y,dur);
  schedulePosSave();
}

function movePlayerTo(x,y){
  const sess=currentSession;if(!sess)return;
  moveCharacter(sess.playerKey,x,y);
}

function moveToZone(key,zoneKey){
  const z=realmZones(currentRealm).find(zz=>zz.key===zoneKey);
  if(!z)return;
  const x=z.x+2+Math.random()*Math.max(1,z.w-4);
  const y=z.y+3+Math.random()*Math.max(1,z.h-6);
  moveCharacter(key,x,y);
}

function onPlayerArrived(){
  updateEarshotUI();
  if(chatTargetKey&&!isWhisperActive()&&!inEarshot(chatTargetKey)){
    const c=currentRealm?.characters.find(x=>x.key===chatTargetKey);
    chatTargetKey='';
    renderChatTarget();
    if(c)toast('YOU STEPPED AWAY FROM '+(c.name||'').toUpperCase());
  }
}

function approachCharacter(key){
  const sess=currentSession;if(!sess)return;
  if(isCharDisabled(sess,key)){toast('CHARACTER IS MUTED');return;}
  const tp=sess.positions[key];if(!tp)return;
  const pp=sess.positions[sess.playerKey]||{x:50,y:50};
  const dx=pp.x>=tp.x?APPROACH_GAP:-APPROACH_GAP;
  movePlayerTo(Math.min(97,Math.max(3,tp.x+dx)),tp.y);
  chatTargetKey=key;
  renderChatTarget();
  const c=currentRealm.characters.find(x=>x.key===key);
  toast('WALKING OVER TO '+(c?.name||'').toUpperCase());
}

/* ====================== PROXIMITY ====================== */
function inEarshot(key){
  const sess=currentSession;if(!sess?.positions)return true;
  const pp=sess.positions[sess.playerKey],cp=sess.positions[key];
  if(!pp||!cp)return true;
  return mapDist(pp,cp)<=EARSHOT_RANGE;
}
function isNear(keyA,keyB){
  const pos=currentSession?.positions;if(!pos)return false;
  const a=pos[keyA],b=pos[keyB];
  return!!(a&&b)&&mapDist(a,b)<=EARSHOT_RANGE;
}
function earshotKeys(realm,sess){
  return(realm.characters||[])
    .filter(c=>c.key!==sess.playerKey&&!isCharDisabled(sess,c.key)&&inEarshot(c.key))
    .map(c=>c.key);
}

function positionEarshotRing(x,y,dur){
  const ring=document.getElementById('earshotRing');if(!ring)return;
  if(dur!==undefined)ring.style.transitionDuration=dur+'s';
  ring.style.left=x+'%';ring.style.top=y+'%';
  ring.style.width=(EARSHOT_RANGE*2)+'%';
  ring.style.height=Math.min(96,EARSHOT_RANGE/MAP_ASPECT*2)+'%';
}

function updateEarshotUI(){
  const sess=currentSession,realm=currentRealm;
  if(!sess||!realm)return;
  const pp=sess.positions?.[sess.playerKey];
  if(pp)positionEarshotRing(pp.x,pp.y);
  (realm.characters||[]).forEach(c=>{
    if(!c._mapEl)return;
    c._mapEl.classList.toggle('far',c.key!==sess.playerKey&&!inEarshot(c.key));
  });
}

/* ====================== ACTIVITY CHIPS ====================== */
function setActivity(key,act){
  const sess=currentSession;if(!sess)return;
  if(!sess.activities)sess.activities={};
  sess.activities[key]=act;
  refreshActivityChips();
  schedulePosSave();
}
function refreshActivityChips(){
  const sess=currentSession,realm=currentRealm;
  if(!sess||!realm)return;
  (realm.characters||[]).forEach(c=>{
    const chip=c._mapEl?.querySelector('.mt-activity');if(!chip)return;
    const a=sess.activities?.[c.key];
    chip.textContent=a?a.emoji:'';
    chip.title=a?a.label:'';
  });
}

/* ====================== PROMPT CONTEXT ====================== */
/* One-line scene description injected into character prompts. */
function spatialSummary(realm,sess,forKey){
  const me=sess.positions?.[forKey];if(!me)return'';
  const myZone=zoneAt(realm,me.x,me.y);
  const near=[],far=[];
  (realm.characters||[]).forEach(c=>{
    if(c.key===forKey||isCharDisabled(sess,c.key))return;
    const p=sess.positions[c.key];if(!p)return;
    const act=sess.activities?.[c.key];
    if(mapDist(me,p)<=EARSHOT_RANGE)near.push(c.name+(act?` (${act.label})`:''));
    else{const z=zoneAt(realm,p.x,p.y);far.push(c.name+(z?` at the ${z.name}`:''));}
  });
  let s=`Scene: you are at the ${myZone?myZone.name:'open area'}.`;
  if(near.length)s+=` Right next to you: ${near.join(', ')}.`;
  if(far.length)s+=` Further away (out of earshot): ${far.join(', ')}.`;
  return s;
}
