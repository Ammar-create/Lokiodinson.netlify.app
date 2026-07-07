/* ===================================================================
   SUNNY DECK // RETRO  —  share.js
   Realm export/import as JSON files. Export strips transient
   underscore-prefixed fields (DOM refs) and anything secret-shaped;
   import validates, regenerates IDs and re-strips defensively.
   =================================================================== */
'use strict';

const SHARE_FORMAT='sunnydeck-realm',SHARE_VERSION=1;
const SHARE_DENY_KEYS=['aquakey','groqkey','apikey','token','secret','password'];

function shareReplacer(key,value){
  if(key.startsWith('_'))return undefined;                 // _mapEl etc (DOM refs)
  if(SHARE_DENY_KEYS.includes(key.toLowerCase()))return undefined;
  return value;
}
function stripUnsafe(obj){
  return JSON.parse(JSON.stringify(obj,shareReplacer));
}
function shareSlug(s){return String(s||'realm').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'realm';}

/* ====================== EXPORT ====================== */
async function exportRealm(realmId,includeSessions,includeWhispers){
  const realm=await dbGet('realms',realmId);
  if(!realm){toast('REALM NOT FOUND');return;}
  const payload={format:SHARE_FORMAT,version:SHARE_VERSION,exportedAt:Date.now(),app:'SunnyDeck',
    realm:stripUnsafe(realm)};
  if(includeSessions){
    const sessions=(await dbGetAll('sessions')).filter(s=>s.realmId===realmId&&(includeWhispers||!s.isWhisper));
    payload.sessions=stripUnsafe(sessions);
  }
  const d=new Date();
  const stamp=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`sunnydeck-${shareSlug(realm.name)}-${stamp}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast('REALM EXPORTED');
}

function openExportModal(){
  if(!currentRealmId)return;
  openModal('EXPORT REALM',`
    <p style="font-size:16px;color:var(--text-2);margin-bottom:12px">Download this realm as a JSON file you can back up or share. API keys are never included.</p>
    <div class="field" style="display:flex;align-items:center;gap:10px">
      <input type="checkbox" id="expSessions" style="width:auto;accent-color:var(--neon-1)" checked>
      <label style="margin:0">Include sessions (chat history)</label>
    </div>
    <div class="field" style="display:flex;align-items:center;gap:10px">
      <input type="checkbox" id="expWhispers" style="width:auto;accent-color:var(--neon-1)">
      <label style="margin:0">Include private whisper sessions</label>
    </div>
    <div class="btn-row"><button class="btn btn-primary" id="expGo">EXPORT</button></div>
  `);
  document.getElementById('expGo').onclick=async()=>{
    const inc=document.getElementById('expSessions').checked;
    const whis=document.getElementById('expWhispers').checked;
    closeModal();
    await exportRealm(currentRealmId,inc,whis);
  };
}

/* ====================== IMPORT ====================== */
function validateRealmExport(data){
  if(!data||typeof data!=='object')return'Not a JSON object';
  if(data.format!==SHARE_FORMAT)return'Not a SunnyDeck realm file';
  if(typeof data.version!=='number'||data.version>SHARE_VERSION)return'Made with a newer SunnyDeck';
  const r=data.realm;
  if(!r||typeof r.name!=='string'||!r.name.trim())return'Realm has no name';
  if(!Array.isArray(r.characters)||!r.characters.length)return'Realm has no characters';
  for(const c of r.characters){
    if(!c||typeof c.key!=='string'||!c.key.trim()||typeof c.name!=='string'||!c.name.trim())
      return'Invalid character entry';
  }
  return null;
}
function normalizeImportedRealm(r){
  r.name=String(r.name).slice(0,80);
  r.description=String(r.description||'').slice(0,400);
  r.overview=String(r.overview||'').slice(0,1200);
  r.isPremade=false;
  r.characters=r.characters.slice(0,30).map(c=>({
    key:String(c.key).toLowerCase().trim().slice(0,30),
    name:String(c.name).slice(0,60),
    color:/^#[0-9a-f]{3,8}$/i.test(String(c.color||''))?c.color:'#00f0ff',
    voice:String(c.voice||'Milo').slice(0,30),
    description:String(c.description||'').slice(0,300),
    personality:String(c.personality||'').slice(0,300),
    keywords:(Array.isArray(c.keywords)?c.keywords:[]).slice(0,8).map(k=>String(k).slice(0,30)),
    system:String(c.system||'').slice(0,1500),
    pos:{x:Math.min(100,Math.max(0,+c.pos?.x||50)),y:Math.min(100,Math.max(0,+c.pos?.y||50))}
  }));
  const mc=r.mapConfig||{};
  r.mapConfig={enabled:mc.enabled!==false,mapType:String(mc.mapType||'custom').slice(0,20),
    zones:(Array.isArray(mc.zones)?mc.zones:[])
      .filter(z=>z&&z.key&&[z.x,z.y,z.w,z.h].every(n=>typeof n==='number'))
      .slice(0,12)
      .map(z=>({key:String(z.key).slice(0,20),name:String(z.name||z.key).toUpperCase().slice(0,14),x:z.x,y:z.y,w:z.w,h:z.h}))};
  return r;
}

async function importRealmFile(file){
  if(!file)return;
  if(file.size>5*1024*1024){toast('FILE TOO LARGE (MAX 5MB)');return;}
  let data;
  try{data=JSON.parse(await file.text());}
  catch(e){toast('NOT VALID JSON');return;}
  const err=validateRealmExport(data);
  if(err){toast(err.toUpperCase());return;}
  const realm=normalizeImportedRealm(stripUnsafe(data.realm));
  const existing=await dbGetAll('realms');
  if(existing.some(r=>r.name===realm.name))realm.name=(realm.name+' (imported)').slice(0,90);
  const oldId=data.realm.id;
  realm.id='realm-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
  realm.createdAt=realm.createdAt||Date.now();
  realm.updatedAt=Date.now();
  await dbPut('realms',realm);
  let sessCount=0;
  if(Array.isArray(data.sessions)){
    for(const s of data.sessions.slice(0,100)){
      if(!s||typeof s!=='object'||(oldId&&s.realmId!==oldId))continue;
      const sess=stripUnsafe(s);
      sess.id='sess-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'-'+sessCount;
      sess.realmId=realm.id;
      if(!Array.isArray(sess.history))sess.history=[];
      await dbPut('sessions',sess);
      sessCount++;
    }
  }
  toast(`REALM IMPORTED${sessCount?` (+${sessCount} SESSIONS)`:''}`);
  renderBrowse();renderDashboard();
}

/* ====================== TRANSCRIPT EXPORT / NOVELIZE ====================== */
function downloadTextFile(name,text,mime){
  const blob=new Blob([text],{type:mime||'text/plain;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function transcriptEntries(sess){
  return(sess.history||[]).filter(h=>!h.kind||['dialogue','event','ambient','roll'].includes(h.kind));
}

function transcriptMarkdown(sess,realm){
  const lines=transcriptEntries(sess).map(h=>{
    if(h.kind==='event')return`> *${h.text}*`;
    if(h.kind==='roll')return`> \`${h.text}\``;
    return`**${h.speaker}:** ${h.text}`;
  });
  return`# ${realm.name} — ${sess.name}\n\n_${new Date(sess.createdAt||Date.now()).toLocaleDateString()} · ${lines.length} lines_\n\n${lines.join('\n\n')}\n`;
}
function transcriptScreenplay(sess,realm){
  const lines=transcriptEntries(sess).map(h=>{
    if(h.kind==='event'||h.kind==='roll')return`          [${h.text}]`;
    return`${(h.speaker||'?').toUpperCase()}\n    ${h.text}`;
  });
  return`${realm.name.toUpperCase()} — "${sess.name.toUpperCase()}"\n${'='.repeat(40)}\n\n${lines.join('\n\n')}\n`;
}

async function novelizeSession(sess,realm){
  if(!hasApiKeys())throw new Error('ADD YOUR AQUA API KEY IN SETTINGS');
  const lines=transcriptEntries(sess).slice(-150)
    .map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
  const prompt=`Rewrite this roleplay chat transcript from ${realm.name} as a polished short story chapter.
${realm.overview||''}
Write in third person past tense with vivid but economical prose. Keep every character voice intact, turn stage events into narration, and keep all plot beats. 400-800 words. Output ONLY the story text, no headers.

Transcript:
${lines}`;
  return await aiText(prompt,settings.chatModel,1400);
}

function openTranscriptModal(sessId){
  openModal('EXPORT STORY',`
    <p style="font-size:16px;color:var(--text-2);margin-bottom:12px">Save this session as a readable file.</p>
    <div class="btn-row" style="flex-direction:column;align-items:stretch;gap:8px">
      <button class="btn btn-ghost" id="tr-md">📄 Markdown transcript (.md)</button>
      <button class="btn btn-ghost" id="tr-play">🎬 Screenplay (.txt)</button>
      <button class="btn btn-primary" id="tr-novel">✨ AI Novelize — prose chapter (.md)</button>
    </div>
  `);
  const run=async(kind)=>{
    const sess=await dbGet('sessions',sessId);if(!sess){toast('SESSION NOT FOUND');return;}
    const realm=await dbGet('realms',sess.realmId);if(!realm){toast('REALM NOT FOUND');return;}
    if(!transcriptEntries(sess).length){toast('NOTHING TO EXPORT YET');return;}
    const base=`sunnydeck-${shareSlug(realm.name)}-${shareSlug(sess.name)}`;
    try{
      if(kind==='md')downloadTextFile(base+'.md',transcriptMarkdown(sess,realm),'text/markdown');
      else if(kind==='play')downloadTextFile(base+'-screenplay.txt',transcriptScreenplay(sess,realm));
      else{
        toast('NOVELIZING... THIS TAKES A MOMENT');
        const story=await novelizeSession(sess,realm);
        if(!story||!story.trim())throw new Error('EMPTY STORY RETURNED');
        downloadTextFile(base+'-story.md',`# ${realm.name} — ${sess.name}\n\n${story.trim()}\n`,'text/markdown');
      }
      closeModal();toast('STORY EXPORTED');
      if(typeof bumpStat==='function')bumpStat('storiesExported',1,realm.id);
    }catch(e){console.warn('Transcript export failed',e);toast(String(e.message||'EXPORT FAILED').toUpperCase());}
  };
  document.getElementById('tr-md').onclick=()=>run('md');
  document.getElementById('tr-play').onclick=()=>run('play');
  document.getElementById('tr-novel').onclick=()=>run('novel');
}

/* ====================== BINDINGS ====================== */
(function bindShareUI(){
  const imp=document.getElementById('importRealmBtn');
  const file=document.getElementById('importFile');
  if(imp&&file){
    imp.onclick=()=>file.click();
    file.onchange=async()=>{await importRealmFile(file.files[0]);file.value='';};
  }
  const exp=document.getElementById('btnExportRealm');
  if(exp)exp.onclick=openExportModal;
})();
