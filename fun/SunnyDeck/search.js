/* ===================================================================
   SUNNY DECK // RETRO  —  search.js
   Global search across everything stored locally: realms, characters,
   sessions, chat history, journal chapters, memories, quests and
   inventory items. Opens from the header 🔍 button, "/" or Ctrl+K.
   Data volumes are tiny (single-user IndexedDB), so it loads both
   stores into memory on open and does debounced substring matching —
   no index, no API calls. Deep links jump to the realm detail or
   straight into a session, flashing the matching message.
   =================================================================== */
'use strict';

const SR_DEBOUNCE_MS=200;
const SR_GROUP_MAX=8;

let srData=null,srTimer=null;

/* ====================== OVERLAY ====================== */
function srEnsureOverlay(){
  if(document.getElementById('searchOverlay'))return;
  const ov=document.createElement('div');ov.id='searchOverlay';
  ov.innerHTML=`
    <div id="searchBox">
      <div class="sr-input-row">
        <input id="srInput" placeholder="SEARCH EVERYTHING..." autocomplete="off" spellcheck="false">
        <button class="sr-close" id="srClose" title="Close (Esc)">✕</button>
      </div>
      <div id="searchResults"><div class="sr-empty">TYPE TO SEARCH REALMS, CHARACTERS, CHATS, JOURNALS, ITEMS...</div></div>
    </div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{if(e.target===ov)srClose();};
  document.getElementById('srClose').onclick=srClose;
  const input=document.getElementById('srInput');
  input.oninput=()=>{clearTimeout(srTimer);srTimer=setTimeout(srRun,SR_DEBOUNCE_MS);};
  input.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();srClose();}};
}

async function srOpen(){
  srEnsureOverlay();
  const[realms,sessions]=await Promise.all([dbGetAll('realms'),dbGetAll('sessions')]);
  srData={realms,sessions};
  document.getElementById('searchOverlay').classList.add('open');
  const input=document.getElementById('srInput');
  input.value='';
  document.getElementById('searchResults').innerHTML='<div class="sr-empty">TYPE TO SEARCH REALMS, CHARACTERS, CHATS, JOURNALS, ITEMS...</div>';
  setTimeout(()=>input.focus(),30);
}
function srClose(){
  document.getElementById('searchOverlay')?.classList.remove('open');
  srData=null;
}
function srIsOpen(){return!!document.getElementById('searchOverlay')?.classList.contains('open');}

/* ====================== MATCHING ====================== */
function srSnippet(text,q){
  text=String(text||'');
  const i=text.toLowerCase().indexOf(q);
  if(i<0)return esc(text.slice(0,90));
  const start=Math.max(0,i-32);
  const pre=(start>0?'…':'')+text.slice(start,i);
  const hit=text.slice(i,i+q.length);
  const post=text.slice(i+q.length,i+q.length+58)+(i+q.length+58<text.length?'…':'');
  return`${esc(pre)}<mark>${esc(hit)}</mark>${esc(post)}`;
}
function srMatch(q,...fields){
  return fields.some(f=>String(f||'').toLowerCase().includes(q));
}

function srRun(){
  const q=(document.getElementById('srInput')?.value||'').trim().toLowerCase();
  const out=document.getElementById('searchResults');
  if(!out)return;
  if(q.length<2){out.innerHTML='<div class="sr-empty">TYPE AT LEAST 2 CHARACTERS.</div>';return;}
  if(!srData){out.innerHTML='<div class="sr-empty">LOADING…</div>';return;}
  const{realms,sessions}=srData;
  const realmName=id=>realms.find(r=>r.id===id)?.name||'Realm';
  const groups=[];
  const add=(group,row)=>{
    let g=groups.find(x=>x.name===group);
    if(!g){g={name:group,rows:[]};groups.push(g);}
    if(g.rows.length<SR_GROUP_MAX)g.rows.push(row);
  };

  realms.forEach(r=>{
    if(srMatch(q,r.name,r.description,r.overview))
      add('Realms',{title:r.name,snippet:srSnippet(r.description||r.overview||r.name,q),go:()=>{srClose();openRealmDetail(r.id);}});
    (r.characters||[]).forEach(c=>{
      if(srMatch(q,c.name,c.personality,c.description))
        add('Characters',{title:`${c.name} — ${r.name}`,snippet:srSnippet(c.personality||c.description||c.name,q),go:()=>{srClose();openRealmDetail(r.id);}});
    });
    (r.journal||[]).forEach(ch=>{
      if(srMatch(q,ch.title,ch.summary))
        add('Journal',{title:`${ch.title} — ${r.name}`,snippet:srSnippet(ch.summary,q),go:()=>{srClose();openRealmDetail(r.id);}});
    });
    Object.entries(r.memories||{}).forEach(([key,notes])=>{
      (notes||[]).forEach(n=>{
        if(srMatch(q,n.text)){
          const cn=(r.characters||[]).find(c=>c.key===key)?.name||key;
          add('Memories',{title:`${cn} remembers — ${r.name}`,snippet:srSnippet(n.text,q),go:()=>{srClose();openRealmDetail(r.id);}});
        }
      });
    });
  });

  sessions.forEach(s=>{
    if(srMatch(q,s.name))
      add('Sessions',{title:`${s.name} — ${realmName(s.realmId)}`,snippet:srSnippet(s.name,q),go:()=>{srClose();openSession(s.id);}});
    if(s.quest&&srMatch(q,s.quest.title,s.quest.premise,(s.quest.objectives||[]).map(o=>o.text).join(' ')))
      add('Quests',{title:`${s.quest.title} — ${s.name}`,snippet:srSnippet(s.quest.premise,q),go:()=>{srClose();openSession(s.id);}});
    Object.entries(s.inventory||{}).forEach(([,items])=>{
      (items||[]).forEach(i=>{
        if(srMatch(q,i.name,i.desc))
          add('Items',{title:`${i.emoji||'📦'} ${i.name} — ${s.name}`,snippet:srSnippet(i.desc||i.name,q),go:()=>{srClose();openSession(s.id);}});
      });
    });
    (s.history||[]).forEach(h=>{
      if(h.kind==='system'||!srMatch(q,h.text))return;
      add('Messages',{
        title:`${h.speaker||'Narrator'} — ${s.name} · ${realmName(s.realmId)}`,
        snippet:srSnippet(h.text,q),
        go:()=>{srClose();srJumpToMessage(s.id,h.timestamp);}});
    });
  });

  if(!groups.length){out.innerHTML=`<div class="sr-empty">NOTHING FOUND FOR “${esc(q)}”.</div>`;return;}
  out.innerHTML='';
  groups.forEach(g=>{
    const head=document.createElement('div');head.className='sr-group';head.textContent=g.name;
    out.appendChild(head);
    g.rows.forEach(r=>{
      const row=document.createElement('div');row.className='sr-row';
      row.innerHTML=`<span class="sr-title">${esc(r.title)}</span><span class="sr-snippet">${r.snippet}</span>`;
      row.onclick=r.go;
      out.appendChild(row);
    });
  });
}

/* ====================== DEEP LINK ====================== */
async function srJumpToMessage(sessId,ts){
  await openSession(sessId);
  requestAnimationFrame(()=>{
    const el=document.querySelector(`#chat [data-ts="${ts}"]`);
    if(!el)return;
    el.scrollIntoView({block:'center'});
    el.classList.add('search-flash');
    setTimeout(()=>el.classList.remove('search-flash'),2600);
  });
}

/* ====================== BINDINGS ====================== */
(function bindSearchUI(){
  const btn=document.getElementById('searchBtn');
  if(btn)btn.onclick=srOpen;
  document.addEventListener('keydown',e=>{
    if(srIsOpen())return;
    const ae=document.activeElement;
    const typing=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable);
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();srOpen();return;}
    if(typing)return;
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      /* not from the chat screen — "/" there belongs to slash commands */
      if(document.getElementById('screen-chat')?.classList.contains('active'))return;
      e.preventDefault();srOpen();
    }
  });
})();
