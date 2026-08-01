/* ===================================================================
   SUNNY DECK // V3 —  rooms.js
   Rooms: Theatro-style scenario chat areas, dual-mode (standalone or
   anchored to a session map zone as a building) with a three-state door
   (open = sound leaks both ways, closed = no leak but free movement,
   locked = no one in/out). Rooms masquerade as sessions (isRoom:true)
   so the shared chat engine (addChatBubble, getReply, char logs,
   whisper/shout, TTS) works through one code path; dbPut routes them
   to the 'rooms' store. Loaded after rewind.js, before director.js.
   =================================================================== */
'use strict';

let currentRoom=null;          // the open room (also currentSession while in-room)
let roomReturnState=null;      // {screen,sess,realm} restored on exit
let roomBusy=false;
let roomWhisper=false;
let roomTargetKey='';
let roomShoutNext=false;
let rcPlayerDD=null;

/* ====================== CORE / PERSISTENCE ====================== */

function roomHist(room){return Array.isArray(room.messages)?room.messages:(room.messages=[]);}

/* Non-enumerable history getter aliases messages so the shared engine
   sees sess.history while JSON persistence stays single-source. */
function roomAsSession(room){
  if(!Object.getOwnPropertyDescriptor(room,'history')){
    Object.defineProperty(room,'history',{
      get(){return roomHist(this);},
      enumerable:false,configurable:true
    });
  }
  if(!room.charLogs)room.charLogs={};
  if(!room.moods)room.moods={};
  if(!room.activeTags)room.activeTags=[];
  return room;
}

function newRoomObject(name,description,characters,playerKey,anchor){
  return{
    id:'room-'+Date.now(),isRoom:true,name:String(name||'Untitled Room').slice(0,80),
    description:String(description||'').slice(0,1000),
    characters:Array.isArray(characters)?characters:[],
    playerKey:playerKey||(characters&&characters[0]?.key)||'',
    messages:[],charLogs:{},moods:{},rels:{},memories:{},
    anchor:anchor?{realmId:anchor.realmId,sessionId:anchor.sessionId||null,zoneKey:anchor.zoneKey||null}:null,
    door:'closed',settings:{},createdAt:Date.now(),lastActiveAt:Date.now()
  };
}

/* The room write path: tag against ROOM characters, push, bump activity. */
function roomPush(room,h){
  if(!room||!h)return h;
  histPush(roomAsSession(room),h,{characters:room.characters||[]});
  room.lastActiveAt=Date.now();
  return h;
}

/* Door-open leak: mirror room dialogue into the anchored session timeline
   (heardBy computed against the SESSION's realm, so in-range characters
   record it as overheard). One-way: room -> session. Whispers NEVER leak. */
let roomMirrorChain=Promise.resolve();
async function roomMirrorToSession(room,h){
  if(!room||!h||room.door!=='open'||!room.anchor?.sessionId||h.kind!=='dialogue'||h.whisperTo)return;
  try{
    const s=await dbGet('sessions',room.anchor.sessionId);
    const realm=room.anchor.realmId?await dbGet('realms',room.anchor.realmId):null;
    if(!s||s.isRoom)return;
    const m={kind:'ambient',speakerKey:h.speakerKey,speaker:h.speaker,
      text:`[${room.name}] ${h.text}`,timestamp:h.timestamp,isPlayer:false,mirrored:true};
    histPush(s,m,realm);
    s.lastActiveAt=Date.now();
    await dbPut('sessions',s);
  }catch(e){console.warn('Room mirror failed',e);}
}
function queueRoomMirror(room,h){
  roomMirrorChain=roomMirrorChain
    .then(()=>roomMirrorToSession(room,h))
    .catch(e=>console.warn('Room mirror failed',e));
  return roomMirrorChain;
}

/* ====================== DOOR ====================== */

const ROOM_DOOR_LABEL={open:'OPEN',closed:'CLOSED',locked:'LOCKED'};
function roomDoorLabel(room){return ROOM_DOOR_LABEL[room?.door]||'CLOSED';}

async function roomSetDoor(room,state){
  if(!room||!['open','closed','locked'].includes(state))return;
  room.door=state;
  await dbPut('sessions',room);
  renderRoomHeader(room);
  if(typeof refreshRoomMarkers==='function')refreshRoomMarkers();
  toast('DOOR '+ROOM_DOOR_LABEL[state]);
}

function openDoorPopover(anchorEl){
  const room=currentRoom;if(!room||!anchorEl)return;
  document.querySelectorAll('.target-popover.open').forEach(p=>p.remove());
  const box=document.createElement('div');
  box.className='target-popover open';
  box.style.cssText='position:absolute;z-index:60;min-width:170px;background:var(--surface-2);border:2px solid var(--border);border-radius:8px;padding:4px';
  ['open','closed','locked'].forEach(st=>{
    const b=document.createElement('button');
    b.className='pp-item'+(room.door===st?' active':'');
    b.textContent=ROOM_DOOR_LABEL[st]+
      (st==='open'?' · sound leaks':st==='closed'?' · private':' · sealed');
    b.onclick=async()=>{box.remove();await roomSetDoor(room,st);};
    box.appendChild(b);
  });
  const r=anchorEl.getBoundingClientRect();
  box.style.left=Math.min(window.innerWidth-190,Math.max(8,r.left))+'px';
  box.style.top=(r.bottom+6)+'px';
  document.body.appendChild(box);
}

/* ====================== ROOM UI ====================== */

function renderRoomHeader(room){
  const tag=document.getElementById('roomRealmTag');if(tag)tag.textContent=room.anchor?'ANCHORED ROOM':'ROOM';
  const nm=document.getElementById('roomName');if(nm)nm.textContent=room.name+(room.anchor?` · DOOR ${roomDoorLabel(room)}`:'');
  const door=document.getElementById('roomDoorBtn');
  if(door){
    if(room.anchor){door.style.display='';door.textContent='🚪 '+roomDoorLabel(room);}
    else door.style.display='none';
  }
}

function renderRoomPortraits(room){
  const strip=document.getElementById('roomPortraitStrip');if(!strip)return;
  strip.innerHTML='';
  (room.characters||[]).forEach(c=>{
    const b=document.createElement('button');b.className='ps-item';b.dataset.key=c.key;b.title=c.name;
    const av=(typeof charAvatarInner==='function')?charAvatarInner(c):'';
    b.innerHTML=`<div class="char-avatar" style="background:${esc(c.color)}">${av||esc(c.name.slice(0,2).toUpperCase())}</div><span class="ps-name">${esc(c.name)}</span>`;
    b.classList.toggle('is-player',c.key===room.playerKey);
    b.onclick=()=>{if(typeof openCharLogModal==='function')openCharLogModal(c.key);};
    strip.appendChild(b);
  });
}

function renderRoomChat(room){
  const chat=document.getElementById('roomChat');if(!chat)return;
  chat.innerHTML='';
  (room.messages||[]).forEach(h=>addChatBubble(h));
  chat.scrollTop=chat.scrollHeight;
}

/* ---- direct-target / shout / whisper ---- */

function roomTargetCandidates(room){
  return(room.characters||[]).filter(c=>c.key!==room.playerKey&&!isCharDisabled(room,c.key)).map(c=>c.key);
}
function renderRoomTarget(){
  const wrap=document.getElementById('roomTargetWrap');if(!wrap)return;
  const room=currentRoom;if(!room)return;
  let label='AUTO';
  if(roomShoutNext)label='SHOUT';
  else if(roomTargetKey){
    const c=room.characters.find(x=>x.key===roomTargetKey);
    label=c?c.name.toUpperCase():'AUTO';
  }
  wrap.innerHTML=`<button class="comp-btn target-pill" id="roomTargetBtn" title="Who to talk to">${esc(label)}</button>`;
  document.getElementById('roomTargetBtn').onclick=e=>{e.stopPropagation();roomTargetPopover();};
}
function roomTargetPopover(){
  const room=currentRoom;if(!room)return;
  document.querySelectorAll('.target-popover.open').forEach(p=>p.remove());
  const btn=document.getElementById('roomTargetBtn');if(!btn)return;
  const box=document.createElement('div');box.className='target-popover open';
  box.style.cssText='position:absolute;z-index:60;min-width:150px;max-height:220px;overflow:auto;background:var(--surface-2);border:2px solid var(--border);border-radius:8px;padding:4px';
  const mk=(label,fn,active)=>{
    const b=document.createElement('button');b.className='pp-item'+(active?' active':'');b.textContent=label;
    b.onclick=()=>{box.remove();fn();renderRoomTarget();};
    box.appendChild(b);
  };
  mk('AUTO',()=>{roomTargetKey='';roomShoutNext=false;},!roomTargetKey&&!roomShoutNext);
  mk('SHOUT',()=>{roomTargetKey='';roomShoutNext=true;},roomShoutNext);
  (room.characters||[]).forEach(c=>{
    if(c.key===room.playerKey||isCharDisabled(room,c.key))return;
    mk(c.name,()=>{roomTargetKey=c.key;roomShoutNext=false;},roomTargetKey===c.key);
  });
  const r=btn.getBoundingClientRect();
  box.style.left=Math.min(window.innerWidth-170,Math.max(8,r.left))+'px';
  box.style.top=(r.bottom+6)+'px';
  document.body.appendChild(box);
}
function roomSetWhisper(on){
  roomWhisper=!!on;
  if(roomWhisper&&!roomTargetKey){
    const room=currentRoom;
    if(room){
      const cs=roomTargetCandidates(room);
      if(cs.length===1)roomTargetKey=cs[0];
      else if(cs.length>1)toast('PICK A TARGET FOR THE WHISPER');
      else{roomWhisper=false;toast('NO ONE TO WHISPER TO');}
    }
  }
  const b=document.getElementById('roomWhisperBanner');
  if(b)b.style.display=roomWhisper?'flex':'none';
  renderRoomTarget();
  if(typeof renderRoomToneChips==='function')renderRoomToneChips();
}

/* v3 tone chips for rooms: preset tags on room.activeTags; whisper chip
   toggles whisper mode. getReply reads sess.activeTags, so rooms share
   the exact injection path. */
function renderRoomToneChips(){
  const bar=document.getElementById('roomToneChips');
  if(!bar||!currentRoom)return;
  bar.innerHTML='';
  (typeof TONE_PRESETS==='object'?TONE_PRESETS:[]).forEach(t=>{
    const b=document.createElement('button');b.className='tag-pill tone-chip';
    const on=(t==='whisper')?roomWhisper:((currentRoom.activeTags||[]).includes(t));
    b.textContent=t;
    if(on)b.style.cssText='border-color:var(--neon-1);color:var(--neon-1)';
    b.onclick=()=>{
      if(t==='whisper'){roomSetWhisper(!roomWhisper);return;}
      const tags=currentRoom.activeTags||(currentRoom.activeTags=[]);
      const i=tags.indexOf(t);
      if(i>=0)tags.splice(i,1);else tags.push(t);
      dbPut('sessions',currentRoom);
      renderRoomToneChips();
    };
    bar.appendChild(b);
  });
}

/* ====================== SEND ====================== */

async function roomSend(){
  const room=currentRoom;if(!room)return;
  const input=document.getElementById('roomInput');if(!input)return;
  const text=input.value.trim();
  if(!text||roomBusy)return;
  if(!providerReady(settings.chatModel||DEFAULT_SETTINGS.chatModel)){toast('ADD AN API KEY FOR YOUR CHAT MODEL IN SETTINGS');return;}
  roomBusy=true;
  input.value='';
  const playerKey=room.playerKey||room.characters[0]?.key;
  const player=room.characters.find(c=>c.key===playerKey)||room.characters[0];
  if(!player){roomBusy=false;return;}
  const shout=!!roomShoutNext;roomShoutNext=false;
  const h={kind:'dialogue',speakerKey:playerKey,speaker:player.name,text,timestamp:Date.now(),isPlayer:true,
    shout,whisperTo:(roomWhisper&&roomTargetKey)?roomTargetKey:null,
    targetKey:(!roomWhisper&&roomTargetKey)?roomTargetKey:null};
  addChatBubble(h);
  roomPush(room,h);
  await dbPut('sessions',room);
  if(typeof bumpStat==='function')bumpStat('messagesSent',1,room.id);
  queueRoomMirror(room,h);

  let responders=[];
  if(roomWhisper&&roomTargetKey)responders=[roomTargetKey];
  else if(roomTargetKey&&!isCharDisabled(room,roomTargetKey))responders=[roomTargetKey];
  else{
    const cands=roomTargetCandidates(room);
    if(cands.length)responders=[cands[Math.floor(Math.random()*cands.length)]];
  }
  for(const rKey of responders){
    const c=room.characters.find(x=>x.key===rKey);if(!c)continue;
    if(typeof showTyping==='function')showTyping(c.name);
    let reply='';
    try{
      reply=await getReply(rKey,text,[],room,{id:room.id,name:room.name,overview:room.description,characters:room.characters});
    }catch(e){console.error(e);toast(e.message||'CHAT FAILED');break;}
    finally{if(typeof hideTyping==='function')hideTyping();}
    if(!reply||!reply.trim())continue;
    const replyH={kind:'dialogue',speakerKey:rKey,speaker:c.name,text:reply,timestamp:Date.now(),isPlayer:false,
      whisperTo:(roomWhisper&&roomTargetKey)?roomTargetKey:null,targetKey:playerKey};
    addChatBubble(replyH);
    roomPush(room,replyH);
    queueRoomMirror(room,replyH);
    await dbPut('sessions',room);
    if(typeof bumpStat==='function')bumpStat('repliesReceived',1,room.id);
    if(typeof speakChat==='function')await speakChat(reply,rKey);
  }
  roomBusy=false;
  input.focus();
}

/* ====================== MIC ====================== */

let roomRecorder=null,roomAudioChunks=[];
async function roomMicToggle(){
  if(roomRecorder&&roomRecorder.state==='recording'){roomRecorder.stop();return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    roomRecorder=new MediaRecorder(stream);roomAudioChunks=[];
    roomRecorder.ondataavailable=e=>roomAudioChunks.push(e.data);
    roomRecorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      document.getElementById('roomMicBtn')?.classList.remove('rec');
      const blob=new Blob(roomAudioChunks,{type:'audio/webm'});
      const txt=await transcribe(blob);
      if(txt){const inp=document.getElementById('roomInput');if(inp){inp.value=txt;roomSend();}}
      else toast('COULD NOT TRANSCRIBE');
    };
    roomRecorder.start();
    document.getElementById('roomMicBtn')?.classList.add('rec');
  }catch{toast('MIC ACCESS DENIED');}
}

/* ====================== OPEN / CLOSE ====================== */

async function openRoom(roomId,fromScreen){
  const room=await dbGet('rooms',roomId);
  if(!room){toast('ROOM NOT FOUND');return;}
  if(typeof stopAmbient==='function')stopAmbient();
  roomReturnState={screen:fromScreen||'screen-dash',sess:currentSession,realm:currentRealm};
  currentRoom=room;
  roomAsSession(room);
  roomWhisper=false;roomTargetKey='';roomShoutNext=false;roomBusy=false;
  currentSession=room;
  currentRealm={id:room.id,name:room.name,overview:room.description,characters:room.characters||[],isRoom:true};
  chatTargetKey='';
  renderRoomHeader(room);
  renderRoomPortraits(room);
  renderRoomTarget();
  renderRoomToneChips();
  renderRoomChat(room);
  const wb=document.getElementById('roomWhisperBanner');if(wb)wb.style.display='none';
  const db2=document.getElementById('roomDirectBanner');if(db2)db2.style.display='none';
  showScreen('screen-room');
  document.getElementById('roomInput')?.focus();
}
function closeRoom(){
  const ret=roomReturnState;
  currentRoom=null;roomWhisper=false;roomTargetKey='';roomShoutNext=false;
  if(ret){
    currentSession=ret.sess;currentRealm=ret.realm;
    roomReturnState=null;
    showScreen(ret.screen);
    if(ret.screen==='screen-chat'&&typeof refreshRoomMarkers==='function')refreshRoomMarkers();
  }else{
    currentSession=null;currentRealm=null;
    showScreen('screen-dash');renderDashboard();
  }
}

/* ====================== DASHBOARD ====================== */

async function renderRoomsSection(){
  const wrap=document.getElementById('roomsSection');if(!wrap)return;
  const rooms=await dbGetAll('rooms');
  wrap.innerHTML='';
  const head=document.createElement('div');
  head.style.cssText='display:flex;gap:8px;margin-bottom:8px';
  head.innerHTML=`
    <button class="btn btn-primary" id="newRoomBtn" style="padding:8px 14px">+ NEW ROOM</button>
    <button class="btn btn-ghost" id="roomImportBtn" style="padding:8px 14px">IMPORT ROOM</button>
    <input type="file" id="roomImportFile" accept=".json,application/json" hidden>`;
  wrap.appendChild(head);
  document.getElementById('newRoomBtn').onclick=()=>openRoomCreate();
  document.getElementById('roomImportBtn').onclick=()=>document.getElementById('roomImportFile').click();
  document.getElementById('roomImportFile').onchange=e=>{importRoomFile(e.target.files?.[0]);e.target.value='';};
  if(!rooms.length){
    const empty=document.createElement('div');empty.className='activity-empty';
    empty.textContent='NO ROOMS YET. CREATE A SCENARIO CHAT WITH ANY CHARACTERS.';
    wrap.appendChild(empty);
    return;
  }
  rooms.sort((a,b)=>(b.lastActiveAt||0)-(a.lastActiveAt||0));
  const list=document.createElement('div');list.className='activity-list';
  rooms.forEach(room=>{
    const row=document.createElement('div');row.className='activity-row';
    const anchor=room.anchor?` · 📍 ${room.anchor.zoneKey||'map'}`:'';
    const door=room.anchor?` · 🚪 ${roomDoorLabel(room)}`:'';
    row.innerHTML=`<div class="activity-info"><div class="activity-title">${esc(room.name)}</div>
      <div class="activity-meta">${(room.characters||[]).length} CHARS${anchor}${door} · ${(room.messages||[]).length} MSGS</div></div>
      <div style="display:flex;gap:6px">
        <button class="quest-mini-btn" data-a="open">OPEN</button>
        <button class="quest-mini-btn" data-a="export">EXPORT</button>
        <button class="quest-mini-btn danger" data-a="del">DEL</button>
      </div>`;
    row.querySelector('[data-a=open]').onclick=()=>openRoom(room.id,'screen-dash');
    row.querySelector('[data-a=export]').onclick=()=>exportRoom(room.id);
    row.querySelector('[data-a=del]').onclick=async()=>{
      if(!confirm('Delete this room and its entire conversation?'))return;
      await dbDelete('rooms',room.id);
      renderRoomsSection();
      toast('ROOM DELETED');
    };
    list.appendChild(row);
  });
  wrap.appendChild(list);
}

/* ====================== CREATE ====================== */

let roomDraftChars=[];
function slugCharName(n){
  return String(n||'char').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,20)||'char';
}

function openRoomCreate(anchor){
  roomDraftChars=[];
  rcPlayerDD=null;
  openModal('NEW ROOM',`
    <div class="field"><label>Room name</label><input id="rcName" placeholder="The Tavern" autocomplete="off"></div>
    <div class="field"><label>Description / scenario</label><textarea id="rcDesc" style="min-height:70px" placeholder="A warm tavern by the docks..."></textarea></div>
    ${anchor?'<div class="hint">📍 Will be anchored to this session map.</div>':''}
    <div class="detail-section" style="margin-top:10px"><h3>Characters</h3></div>
    <div id="rcChars"></div>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn btn-ghost" id="rcAddChar">+ New Character</button>
      <button class="btn btn-ghost" id="rcImport">Import from Realm</button>
    </div>
    <div class="field" style="margin-top:10px"><label>You play as</label><div id="rcPlayerWrap"></div></div>
    <div class="btn-row"><button class="btn btn-primary" id="rcCreate">CREATE ROOM</button></div>
  `);
  renderRcChars();
  document.getElementById('rcAddChar').onclick=()=>{
    roomDraftChars.push({key:'',name:'',color:'#00f0ff',description:'',personality:'',keywords:[]});
    renderRcChars();
  };
  document.getElementById('rcImport').onclick=openRoomImportPicker;
  document.getElementById('rcCreate').onclick=async()=>{
    const name=document.getElementById('rcName').value.trim();
    if(!name){toast('ENTER A ROOM NAME');return;}
    const desc=document.getElementById('rcDesc').value.trim();
    const chars=roomDraftChars.filter(c=>c.name&&c.name.trim());
    if(!chars.length){toast('ADD AT LEAST ONE CHARACTER');return;}
    const pk=(rcPlayerDD&&rcPlayerDD.value)||chars[0].key||'';
    const room=newRoomObject(name,desc,chars,pk,anchor||null);
    await dbPut('rooms',room);
    closeModal();
    renderRoomsSection();
    openRoom(room.id,'screen-dash');
  };
}
function renderRcChars(){
  const wrap=document.getElementById('rcChars');if(!wrap)return;
  wrap.innerHTML='';
  roomDraftChars.forEach((c,i)=>{
    const row=document.createElement('div');row.className='rc-char';
    row.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr 44px;gap:6px;margin-bottom:6px';
    row.innerHTML=`
      <input placeholder="Name" data-f="name" value="${esc(c.name)}" autocomplete="off">
      <input placeholder="Personality" data-f="personality" value="${esc(c.personality)}" autocomplete="off">
      <input placeholder="Traits (comma)" data-f="traits" value="${esc((c.traits||[]).join(', '))}" autocomplete="off">
      <button class="quest-mini-btn danger" data-del="1">✕</button>`;
    row.querySelector('[data-del]').onclick=()=>{roomDraftChars.splice(i,1);renderRcChars();};
    row.querySelectorAll('input').forEach(inp=>{
      inp.oninput=()=>{
        if(inp.dataset.f==='traits')c.traits=inp.value.split(',').map(x=>x.trim()).filter(Boolean);
        else c[inp.dataset.f]=inp.value;
        if(inp.dataset.f==='name'&&!c.key)c.key=slugCharName(c.name);
        renderRcPlayer();
      };
    });
    wrap.appendChild(row);
  });
  renderRcPlayer();
}
function renderRcPlayer(){
  const wrap=document.getElementById('rcPlayerWrap');if(!wrap)return;
  const chars=roomDraftChars.filter(c=>c.name&&c.key);
  if(!chars.length){wrap.innerHTML='<div class="hint">Add characters first.</div>';rcPlayerDD=null;return;}
  const opts=chars.map(c=>({value:c.key,note:c.name}));
  if(typeof createDropdown==='function')rcPlayerDD=createDropdown(wrap,opts,chars[0].key,'');
}

async function openRoomImportPicker(){
  const realms=await dbGetAll('realms');
  if(!realms.length){toast('NO REALMS TO IMPORT FROM');return;}
  openModal('IMPORT CHARACTERS',`
    <div class="field"><label>Realm</label><div id="riRealm"></div></div>
    <div id="riChars" class="hint">Pick a realm first.</div>
    <div class="btn-row"><button class="btn btn-primary" id="riAdd">ADD SELECTED</button></div>
  `);
  const rdd=createDropdown(document.getElementById('riRealm'),
    realms.map(r=>({value:r.id,note:r.name})),realms[0].id,'');
  const renderChars=()=>{
    const r=realms.find(x=>x.id===rdd.value);
    const wrap=document.getElementById('riChars');if(!wrap)return;
    if(!r){wrap.innerHTML='';return;}
    wrap.innerHTML=(r.characters||[]).map(c=>`
      <label style="display:flex;align-items:center;gap:8px;padding:4px 0">
        <input type="checkbox" class="ri-check" value="${esc(c.key)}" style="width:auto"> ${esc(c.name)} <span class="hint">${esc(c.personality||'')}</span>
      </label>`).join('')||'<div class="hint">No characters.</div>';
  };
  renderChars();
  rdd.el.querySelector('.dd-face')?.addEventListener('click',()=>setTimeout(renderChars,50));
  document.getElementById('riAdd').onclick=()=>{
    const r=realms.find(x=>x.id===rdd.value);
    const checked=[...document.querySelectorAll('.ri-check:checked')].map(x=>x.value);
    if(!r||!checked.length){toast('SELECT AT LEAST ONE CHARACTER');return;}
    importRoomCharsFromRealm(r,checked);
    closeModal();
    renderRcChars();
    toast('CHARACTERS IMPORTED');
  };
}
function importRoomCharsFromRealm(realm,keys){
  (realm.characters||[]).forEach(c=>{
    if(!keys.includes(c.key))return;
    const taken=new Set(roomDraftChars.map(x=>x.key));
    let base=slugCharName(c.name),key=base,i=2;
    while(taken.has(key))key=(base+'_'+i++).slice(0,20);
    roomDraftChars.push({
      key,name:c.name,color:c.color||'#00f0ff',
      description:c.description||'',personality:c.personality||'',
      keywords:Array.isArray(c.keywords)?c.keywords.slice():[],
      traits:Array.isArray(c.traits)?c.traits.slice():[],
      system:c.system||'',voice:c.voice||'',sourceRealmId:realm.id
    });
  });
}

/* ====================== EXPORT / IMPORT ====================== */

async function exportRoom(roomId){
  const room=await dbGet('rooms',roomId);
  if(!room){toast('ROOM NOT FOUND');return;}
  const payload={format:'sunnydeck-room',version:1,exportedAt:Date.now(),app:'SunnyDeck',room:stripUnsafe(room)};
  downloadTextFile(`sunnydeck-room-${shareSlug(room.name)}.json`,JSON.stringify(payload,null,2),'application/json');
  toast('ROOM EXPORTED');
}
async function importRoomFile(file){
  if(!file)return;
  if(file.size>2*1024*1024){toast('FILE TOO LARGE');return;}
  let data;
  try{data=JSON.parse(await file.text());}
  catch{toast('NOT VALID JSON');return;}
  if(data?.format!=='sunnydeck-room'||!data.room){toast('NOT A SUNNYDECK ROOM FILE');return;}
  const room=stripUnsafe(data.room);
  room.id='room-'+Date.now();
  room.createdAt=Date.now();room.lastActiveAt=Date.now();
  if(!Array.isArray(room.messages))room.messages=[];
  if(!room.charLogs)room.charLogs={};
  await dbPut('rooms',room);
  renderRoomsSection();
  toast('ROOM IMPORTED');
}

/* ====================== MAP ANCHORS ====================== */

async function renderRoomMarkers(sess,realm){
  const mapEl=document.getElementById('chatMap');if(!mapEl||!sess||!realm)return;
  mapEl.querySelectorAll('.room-marker').forEach(el=>el.remove());
  const rooms=await dbGetAll('rooms');
  const anchored=rooms.filter(r=>r.anchor&&r.anchor.realmId===realm.id&&(!r.anchor.sessionId||r.anchor.sessionId===sess.id));
  const zones=(typeof realmZones==='function')?realmZones(realm):[];
  anchored.forEach(room=>{
    const z=zones.find(zz=>zz.key===room.anchor.zoneKey);
    if(!z)return;
    const m=document.createElement('button');
    m.className='room-marker';
    m.style.cssText=`position:absolute;left:${z.x+z.w/2}%;top:${z.y+z.h/2}%;transform:translate(-50%,-50%);z-index:6;cursor:pointer;background:var(--surface-2);border:2px solid ${room.door==='open'?'var(--ok)':room.door==='locked'?'var(--danger)':'var(--neon-2)'};border-radius:8px;padding:2px 6px;font-size:10px;color:var(--text);white-space:nowrap`;
    m.textContent=`🚪 ${esc(room.name)} [${roomDoorLabel(room)}]`;
    m.title='Click to enter the room';
    m.onclick=e=>{
      e.stopPropagation();
      if(room.door==='locked'){toast('DOOR IS LOCKED');return;}
      openRoom(room.id,'screen-chat');
    };
    mapEl.appendChild(m);
  });
}
async function refreshRoomMarkers(){
  if(currentSession&&currentRealm&&!currentSession.isRoom)renderRoomMarkers(currentSession,currentRealm);
}

/* ====================== PLAYER SWITCH ====================== */

function openRoomPlayerPopover(anchorEl){
  const room=currentRoom;if(!room||!anchorEl)return;
  document.querySelectorAll('.target-popover.open').forEach(p=>p.remove());
  const box=document.createElement('div');box.className='target-popover open';
  box.style.cssText='position:absolute;z-index:60;min-width:150px;max-height:220px;overflow:auto;background:var(--surface-2);border:2px solid var(--border);border-radius:8px;padding:4px';
  (room.characters||[]).forEach(c=>{
    const b=document.createElement('button');
    b.className='pp-item'+(c.key===room.playerKey?' active':'');
    b.textContent=c.name;
    b.onclick=async()=>{
      box.remove();
      room.playerKey=c.key;
      roomTargetKey='';roomWhisper=false;
      await dbPut('sessions',room);
      renderRoomPortraits(room);renderRoomTarget();
      toast('NOW PLAYING AS '+c.name.toUpperCase());
    };
    box.appendChild(b);
  });
  const r=anchorEl.getBoundingClientRect();
  box.style.left=Math.min(window.innerWidth-170,Math.max(8,r.left))+'px';
  box.style.top=(r.bottom+6)+'px';
  document.body.appendChild(box);
}

/* ====================== BINDINGS ====================== */

document.getElementById('roomBack').onclick=closeRoom;
document.getElementById('roomSendBtn').onclick=roomSend;
document.getElementById('roomInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();roomSend();}
});
document.getElementById('roomMicBtn').onclick=roomMicToggle;
document.getElementById('roomWhisperBtn').onclick=()=>roomSetWhisper(!roomWhisper);
document.getElementById('roomDoorBtn').onclick=e=>{e.stopPropagation();openDoorPopover(e.currentTarget);};
document.getElementById('roomPlayerBtn').onclick=e=>{e.stopPropagation();openRoomPlayerPopover(e.currentTarget);};
document.getElementById('roomExitWhisper').onclick=()=>roomSetWhisper(false);
document.getElementById('roomClearDirect').onclick=()=>{roomTargetKey='';renderRoomTarget();};
