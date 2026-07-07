/* ===================================================================
   SUNNY DECK // RETRO  —  rewind.js
   Message actions: edit your own lines, regenerate AI replies, and
   branch a session into an alternate timeline from any message.
   Branches are plain sessions with history truncated at the branch
   point — no tree UI, just a "branched from" note.
   =================================================================== */
'use strict';

function rerenderChat(){
  const chat=document.getElementById('chat');if(!chat||!currentSession)return;
  chat.innerHTML='';
  renderBranchNote(currentSession);
  (currentSession.history||[]).forEach(h=>addChatBubble(h));
}

function renderBranchNote(sess){
  if(!sess?.branchedFrom)return;
  const chat=document.getElementById('chat');if(!chat)return;
  const div=document.createElement('div');div.className='branch-note';
  div.textContent=`⑂ BRANCHED FROM "${sess.branchedFrom.sessionName}" AT MESSAGE ${(sess.branchedFrom.at||0)+1}`;
  chat.appendChild(div);
}

/* ====================== PER-MESSAGE ACTIONS ====================== */
function bindMessageActions(div,h){
  if(!div||!h||(h.kind&&h.kind!=='dialogue'))return;
  const who=div.querySelector('.who');if(!who)return;
  const more=document.createElement('button');
  more.className='msg-more';more.title='Message actions';more.textContent='⋯';
  who.appendChild(more);
  if(h.edited){
    const tag=document.createElement('span');tag.className='edited-tag';tag.textContent='· edited';
    who.appendChild(tag);
  }
  const bubble=div.querySelector('.bubble');
  const actions=document.createElement('div');actions.className='msg-actions';
  const mkBtn=(label,fn,danger)=>{
    const b=document.createElement('button');
    b.textContent=label;if(danger)b.className='danger';
    b.onclick=fn;actions.appendChild(b);
  };
  if(h.isPlayer)mkBtn('EDIT',()=>editOwnMessage(h));
  else mkBtn('REDO',()=>regenerateReply(h));
  mkBtn('BRANCH',()=>branchFromMessage(h));
  bubble.appendChild(actions);
  more.onclick=e=>{
    e.stopPropagation();
    document.querySelectorAll('.msg-actions.open').forEach(a=>{if(a!==actions)a.classList.remove('open');});
    actions.classList.toggle('open');
  };
}

function editOwnMessage(h){
  openModal('EDIT MESSAGE',`
    <div class="field"><label>Your message</label><textarea id="rw-text" style="min-height:90px"></textarea></div>
    <div class="btn-row"><button class="btn btn-primary" id="rw-save">SAVE</button></div>
  `);
  document.getElementById('rw-text').value=h.text||'';
  document.getElementById('rw-save').onclick=async()=>{
    const v=document.getElementById('rw-text').value.trim();
    if(!v){toast('MESSAGE CANNOT BE EMPTY');return;}
    h.text=v;h.edited=true;
    await dbPut('sessions',currentSession);
    closeModal();rerenderChat();
    toast('MESSAGE EDITED');
  };
}

async function regenerateReply(h){
  if(chatBusy){toast('WAIT FOR THE CURRENT REPLY');return;}
  if(!hasApiKeys()){toast('ADD YOUR AQUA API KEY IN SETTINGS');return;}
  const sess=currentSession,realm=currentRealm;if(!sess||!realm)return;
  const i=sess.history.indexOf(h);if(i<0)return;
  const c=realm.characters.find(x=>x.key===h.speakerKey);if(!c)return;
  /* the player line this reply answered */
  let userText='';
  for(let j=i-1;j>=0;j--){
    const e=sess.history[j];
    if(e.isPlayer&&(!e.kind||e.kind==='dialogue')){userText=e.text;break;}
  }
  chatBusy=true;
  showTyping(c.name);
  try{
    /* shallow session copy with truncated history scopes getReply's context */
    const scoped={...sess,history:sess.history.slice(0,i)};
    const reply=await getReply(h.speakerKey,userText,[],scoped,realm);
    h.text=reply;h.timestamp=Date.now();h.regenerated=true;
    await dbPut('sessions',sess);
    rerenderChat();
    toast('REPLY REGENERATED');
  }catch(e){console.error(e);toast(e.message||'REGENERATE FAILED');}
  finally{hideTyping();chatBusy=false;}
}

async function branchFromMessage(h){
  const src=currentSession;if(!src)return;
  const i=src.history.indexOf(h);if(i<0)return;
  const branch=structuredClone({...src});
  branch.id='sess-'+Date.now();
  branch.name=(src.name+' — branch').slice(0,60);
  branch.history=branch.history.slice(0,i+1);
  branch.branchedFrom={sessionId:src.id,sessionName:src.name,at:i,ts:Date.now()};
  branch.createdAt=branch.lastActiveAt=Date.now();
  branch.renameDone=true;                      // keep the "— branch" name
  const n=branch.history.filter(x=>!x.kind||x.kind==='dialogue').length;
  branch.lastDistilledCount=n;                 // don't re-distill inherited content
  branch.lastJournaledCount=n;
  branch.lastSocialCount=n;
  if(branch.quest)branch.quest.lastCheckedCount=n;
  await dbPut('sessions',branch);
  if(typeof bumpStat==='function')bumpStat('branchesMade',1,branch.realmId);
  toast('BRANCH CREATED');
  openSession(branch.id);
}
