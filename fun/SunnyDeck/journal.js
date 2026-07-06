/* ===================================================================
   SUNNY DECK // RETRO  —  journal.js
   Story journal: a cheap model writes chapter summaries at natural
   exit points (leaving a session / tab hidden), stored on the realm
   and shown as a retro timeline on the realm detail screen.
   Mirrors the memory.js distillation economics.
   =================================================================== */
'use strict';

const JOURNAL_MIN_NEW_MSGS=12;
const JOURNAL_MAX_CHAPTERS=50;

let journalBusy=false;
async function journalChapterTick(sess,realm){
  if(journalBusy||!sess||!realm||!hasApiKeys()||typeof aiJson!=='function')return;
  const dlg=(sess.history||[]).filter(h=>!h.kind||h.kind==='dialogue');
  if(dlg.length-(sess.lastJournaledCount||0)<JOURNAL_MIN_NEW_MSGS)return;
  journalBusy=true;
  try{
    const lines=(sess.history||[])
      .filter(h=>!h.kind||h.kind==='dialogue'||h.kind==='event'||h.kind==='roll')
      .slice(-(dlg.length-(sess.lastJournaledCount||0)+10)).slice(-40)
      .map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
    const prompt=`Write a story-journal chapter covering what just happened in ${realm.name}. ${realm.overview||''}
Scene transcript:
${lines}
Output ONLY JSON: {"title":"3-6 word chapter title","summary":"3-5 sentence past-tense narrative summary, like a novel recap"}`;
    const parsed=await aiJson(prompt,settings.taskModel,250);
    if(typeof parsed?.title==='string'&&typeof parsed?.summary==='string'&&parsed.summary.trim()){
      if(!Array.isArray(realm.journal))realm.journal=[];
      realm.journal.push({
        id:'ch-'+Date.now(),sessionId:sess.id,sessionName:sess.name,
        title:parsed.title.trim().slice(0,60),
        summary:parsed.summary.trim().slice(0,800),ts:Date.now()
      });
      while(realm.journal.length>JOURNAL_MAX_CHAPTERS)realm.journal.shift();
      await dbPut('realms',realm);
    }
    sess.lastJournaledCount=dlg.length;
    await dbPut('sessions',sess);
  }catch(e){console.warn('Journal chapter failed',e);}
  finally{journalBusy=false;}
}

/* Best-effort chapter when the tab goes to background (same shape as
   the memory distill listener in director.js). */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&currentSession&&currentRealm)journalChapterTick(currentSession,currentRealm);
});

/* ====================== TIMELINE (realm detail) ====================== */
function renderRealmJournal(realm){
  const wrap=document.getElementById('detailJournal');if(!wrap)return;
  wrap.innerHTML='';
  const chapters=Array.isArray(realm.journal)?realm.journal:[];
  if(!chapters.length){
    wrap.innerHTML='<div class="activity-empty">NO CHAPTERS YET. STORIES ARE WRITTEN AS YOU PLAY.</div>';
    return;
  }
  const tl=document.createElement('div');tl.className='journal-timeline';
  chapters.forEach((ch,i)=>{
    const div=document.createElement('div');div.className='journal-chapter';
    div.innerHTML=`<div class="jc-head">
        <span class="jc-num">CH.${String(i+1).padStart(2,'0')}</span>
        <span class="jc-title">${esc(ch.title)}</span>
        <button class="jc-del" data-id="${esc(ch.id)}" title="Delete chapter">&times;</button>
      </div>
      <div class="jc-meta">${new Date(ch.ts).toLocaleDateString()} · ${esc(ch.sessionName||'')}</div>
      <div class="jc-summary">${esc(ch.summary)}</div>`;
    tl.appendChild(div);
  });
  wrap.appendChild(tl);
  tl.querySelectorAll('.jc-del').forEach(b=>b.onclick=async e=>{
    realm.journal=realm.journal.filter(c=>c.id!==e.target.dataset.id);
    await dbPut('realms',realm);
    renderRealmJournal(realm);
  });
  const clear=document.createElement('button');
  clear.className='btn btn-ghost btn-danger-out';clear.style.marginTop='10px';
  clear.textContent='CLEAR JOURNAL';
  clear.onclick=async()=>{
    if(!confirm('Delete every chapter in this realm\'s journal?'))return;
    realm.journal=[];await dbPut('realms',realm);
    renderRealmJournal(realm);toast('JOURNAL CLEARED');
  };
  wrap.appendChild(clear);
}
