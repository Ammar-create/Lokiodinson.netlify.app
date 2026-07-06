/* ===================================================================
   SUNNY DECK // RETRO  —  memory.j
   Persistent realm memory: after a session, a cheap model distills
   what each character would remember; notes are injected into their
   prompts next time and editable from the realm detail screen.
   =================================================================== */
'use strict';

function memoryNotes(charKey,realm){
  const notes=realm?.memories?.[charKey];
  if(!Array.isArray(notes)||!notes.length)return'';
  return notes.map(n=>n.text).join(' | ');
}

let distillBusy=false;
async function distillSession(sess,realm){
  if(!sess||!realm||distillBusy||!hasApiKeys())return;
  const dlg=(sess.history||[]).filter(h=>!h.kind||h.kind==='dialogue');
  if(dlg.length-(sess.lastDistilledCount||0)<6)return;
  distillBusy=true;
  try{
    const lines=dlg.slice(-30).map(h=>`${h.speaker}: ${h.text}`).join('\n');
    const keys=realm.characters.map(c=>c.key).join(', ');
    const prompt=`These characters just talked in ${realm.name}. For each character who learned or experienced something worth remembering later, write ONE short first-person memory sentence. Skip characters with nothing memorable.
Character keys: ${keys}
Conversation:
${lines}
Output ONLY JSON like {"zoro":["I promised the captain a rematch."]} or {} if nothing is memorable.`;
    const parsed=await aiJson(prompt,settings.taskModel,300);
    if(!realm.memories)realm.memories={};
    let changed=false;
    Object.entries(parsed||{}).forEach(([k,arr])=>{
      if(!realm.characters.some(c=>c.key===k)||!Array.isArray(arr))return;
      const list=realm.memories[k]||(realm.memories[k]=[]);
      arr.slice(0,2).forEach(t=>{
        if(typeof t==='string'&&t.trim()){list.push({text:t.trim().slice(0,160),ts:Date.now()});changed=true;}
      });
      while(list.length>10)list.shift();
    });
    if(changed)await dbPut('realms',realm);
    sess.lastDistilledCount=dlg.length;
    await dbPut('sessions',sess);
  }catch(e){console.warn('Memory distill failed',e);}
  finally{distillBusy=false;}
}

/* ====================== MEMORIES EDITOR (realm detail) ====================== */
function renderRealmMemories(realm){
  const wrap=document.getElementById('detailMemories');if(!wrap)return;
  wrap.innerHTML='';
  const mem=realm.memories||{};
  const withNotes=(realm.characters||[]).filter(c=>(mem[c.key]||[]).length);
  if(!withNotes.length){
    wrap.innerHTML='<div class="activity-empty">NO MEMORIES YET. THEY FORM AS YOU CHAT.</div>';
    return;
  }
  withNotes.forEach(c=>{
    const row=document.createElement('div');row.className='mem-row';
    row.innerHTML=`<div class="mem-head"><div class="char-avatar" style="background:${esc(c.color)}">${esc(c.name.slice(0,2).toUpperCase())}</div><div class="char-name">${esc(c.name)}</div></div>
      <div class="mem-notes">${mem[c.key].map((n,i)=>`<span class="mem-note">${esc(n.text)}<button data-key="${esc(c.key)}" data-i="${i}" title="Forget">&times;</button></span>`).join('')}</div>`;
    wrap.appendChild(row);
  });
  const clear=document.createElement('button');
  clear.className='btn btn-ghost btn-danger-out';clear.style.marginTop='10px';
  clear.textContent='CLEAR ALL MEMORIES';
  clear.onclick=async()=>{
    if(!confirm('Wipe all character memories in this realm?'))return;
    realm.memories={};await dbPut('realms',realm);
    renderRealmMemories(realm);toast('MEMORIES CLEARED');
  };
  wrap.appendChild(clear);
  wrap.querySelectorAll('.mem-note button').forEach(b=>b.onclick=async e=>{
    const{key,i}=e.target.dataset;
    (realm.memories[key]||[]).splice(+i,1);
    if(!(realm.memories[key]||[]).length)delete realm.memories[key];
    await dbPut('realms',realm);
    renderRealmMemories(realm);
  });
}
