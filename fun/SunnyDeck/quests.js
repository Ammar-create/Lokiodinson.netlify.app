/* ===================================================================
   SUNNY DECK // RETRO  —  quests.js
   Quest / scenario engine: the Creative Controller generates a short
   quest (premise + objectives), a cheap Task Controller call tracks
   progress after exchanges, and the Chat model narrates the finale.
   Quest state lives on the session (sess.quest, null = none).
   =================================================================== */
'use strict';

const QUEST_CHECK_MIN_NEW=2;

async function aiText(prompt,modelStr,maxTokens){
  const{provider,model}=parseModel(modelStr||settings.chatModel);
  const p=PROVIDERS[provider];if(!p)throw new Error('Unknown provider');
  const key=settings[p.keyName];if(!key)throw new Error('Missing API key');
  const res=await fetch(`${p.base}/chat/completions`,{
    method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:.8,max_tokens:maxTokens||250})});
  if(!res.ok)throw new Error(`AI ${res.status}`);
  const data=await res.json();
  return(data.choices?.[0]?.message?.content||'').trim();
}

/* ====================== GENERATION ====================== */
async function generateQuest(realm,sess,theme){
  const player=realm.characters.find(c=>c.key===sess.playerKey);
  const zones=typeof realmZones==='function'?realmZones(realm).map(z=>z.name).join(', '):'';
  const prompt=`You design a short interactive quest for the roleplay world "${realm.name}". ${realm.overview||''}
Characters: ${realm.characters.map(c=>`${c.name} (${c.personality})`).join('; ')}
The player is ${player?.name||'a visitor'}. Zones on the map: ${zones||'one open area'}.
${theme?`Requested theme: ${theme}`:''}
Design a quest achievable purely through conversation and moving around the map.
Output ONLY JSON:
{"title":"3-6 words","premise":"2-3 sentences","objectives":["concrete objective","3 to 5 of them"],"ending":"one sentence: how the quest concludes"}`;
  const parsed=await aiJson(prompt,realm.creativeModel||settings.creativeModel,400);
  if(typeof parsed?.title!=='string'||typeof parsed?.premise!=='string'||!Array.isArray(parsed?.objectives))
    throw new Error('Bad quest JSON');
  const objectives=parsed.objectives.filter(o=>typeof o==='string'&&o.trim()).slice(0,5)
    .map(o=>({text:o.trim().slice(0,140),done:false,doneAt:null}));
  if(objectives.length<2)throw new Error('Too few objectives');
  return{
    id:'quest-'+Date.now(),
    title:parsed.title.trim().slice(0,60),
    premise:parsed.premise.trim().slice(0,400),
    objectives,
    ending:String(parsed.ending||'').trim().slice(0,200),
    status:'active',startedAt:Date.now(),completedAt:null,lastCheckedCount:0
  };
}

async function startQuest(theme){
  if(!settings.questsEnabled){toast('ENABLE QUESTS IN SETTINGS');return;}
  if(!hasApiKeys()){toast('ADD YOUR AQUA API KEY IN SETTINGS');return;}
  const sess=currentSession,realm=currentRealm;if(!sess||!realm)return;
  toast('DESIGNING QUEST...');
  try{
    const quest=await generateQuest(realm,sess,theme);
    const dlg=(sess.history||[]).filter(h=>!h.kind||h.kind==='dialogue');
    quest.lastCheckedCount=dlg.length;
    sess.quest=quest;
    const h={kind:'event',speakerKey:'',speaker:'Narrator',
      text:`QUEST STARTED: ${quest.title} — ${quest.premise}`,timestamp:Date.now()};
    addChatBubble(h);sess.history.push(h);
    await dbPut('sessions',sess);
    renderQuestPanel();
    if(typeof sfx==='function')sfx('questStart');
    toast('QUEST STARTED');
  }catch(e){console.warn('Quest generation failed',e);toast('QUEST GENERATION FAILED');}
}

/* ====================== PROGRESS TICK ====================== */
let questBusy=false;
async function questCheckTick(sess,realm){
  if(!settings.questsEnabled)return;
  const q=sess?.quest;
  if(questBusy||!q||q.status!=='active'||!hasApiKeys()||typeof aiJson!=='function')return;
  const dlg=(sess.history||[]).filter(h=>!h.kind||h.kind==='dialogue');
  if(dlg.length-(q.lastCheckedCount||0)<QUEST_CHECK_MIN_NEW)return;
  questBusy=true;
  try{
    const recent=(sess.history||[]).filter(h=>h.kind!=='system').slice(-12)
      .map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
    const prompt=`You track quest progress in a roleplay. Quest: "${q.title}" — ${q.premise}
Ending condition: ${q.ending||'all objectives done'}
Objectives:
${q.objectives.map((o,i)=>`${i+1}. [${o.done?'x':' '}] ${o.text}`).join('\n')}
Recent conversation:
${recent}
Which NOT-yet-done objectives were JUST clearly accomplished? Be strict.
Output ONLY JSON: {"completed":[2],"questComplete":false}`;
    const parsed=await aiJson(prompt,settings.taskModel,60);
    q.lastCheckedCount=dlg.length;
    let changed=false;
    (Array.isArray(parsed?.completed)?parsed.completed:[]).forEach(n=>{
      const o=q.objectives[Math.floor(+n)-1];
      if(o&&!o.done){
        o.done=true;o.doneAt=Date.now();changed=true;
        toast('OBJECTIVE COMPLETE: '+o.text.toUpperCase().slice(0,50));
        if(typeof sfx==='function')sfx('objective');
      }
    });
    await dbPut('sessions',sess);
    if(changed)renderQuestPanel();
    if(q.objectives.every(o=>o.done)||parsed?.questComplete===true)await finishQuest(sess,realm);
  }catch(e){console.warn('Quest tick failed',e);}
  finally{questBusy=false;}
}

async function finishQuest(sess,realm){
  const q=sess?.quest;if(!q||q.status!=='active')return;
  q.status='completed';q.completedAt=Date.now();
  q.objectives.forEach(o=>{if(!o.done){o.done=true;o.doneAt=Date.now();}});
  let finale='The quest is complete.';
  try{
    const recent=(sess.history||[]).filter(h=>h.kind!=='system').slice(-10)
      .map(h=>`${h.speaker||'Narrator'}: ${h.text}`).join('\n');
    finale=await aiText(`You are the narrator of ${realm.name}. The quest "${q.title}" just concluded successfully.
Objectives achieved: ${q.objectives.map(o=>o.text).join('; ')}
Recent scene:
${recent}
Write a 2-4 sentence finale narration, present tense, no dialogue, no quotes.`,settings.chatModel,250);
  }catch(e){console.warn('Quest finale failed',e);}
  const h={kind:'event',speakerKey:'',speaker:'Narrator',
    text:`QUEST COMPLETE: ${q.title} — ${finale}`,timestamp:Date.now()};
  addChatBubble(h);sess.history.push(h);
  await dbPut('sessions',sess);
  renderQuestPanel();
  if(typeof bumpStat==='function')bumpStat('questsCompleted',1,realm.id);
  if(typeof sfx==='function')sfx('questDone');
  toast('QUEST COMPLETE!');
}

/* ====================== PROMPT NOTE ====================== */
function questPromptNote(sess){
  if(!settings.questsEnabled)return'';
  const q=sess?.quest;
  if(!q||q.status!=='active')return'';
  const open=q.objectives.filter(o=>!o.done).map(o=>o.text);
  return`Active quest: "${q.title}". ${q.premise} Open objectives: ${open.join('; ')||'(wrap it up)'}. Play along naturally and nudge things forward, but never break character or mention "objectives".`;
}

/* ====================== UI ====================== */
function renderQuestPanel(){
  const panel=document.getElementById('questPanel');if(!panel)return;
  if(!settings.questsEnabled){panel.style.display='none';panel.innerHTML='';return;}
  const q=currentSession?.quest;
  if(!q){panel.style.display='none';panel.innerHTML='';return;}
  const done=q.objectives.filter(o=>o.done).length,total=q.objectives.length;
  const completed=q.status==='completed';
  panel.classList.toggle('completed',completed);
  panel.style.display='block';
  panel.innerHTML=`
    <div class="quest-head">
      <div class="quest-title ${completed?'done':''}">QUEST :: ${esc(q.title)}${completed?' — COMPLETE':''}</div>
      <button class="quest-mini-btn" id="questCollapse">${panel.classList.contains('collapsed')?'SHOW':'HIDE'}</button>
      <button class="quest-mini-btn danger" id="questDismiss">${completed?'CLEAR':'ABANDON'}</button>
    </div>
    <div class="quest-premise">${esc(q.premise)}</div>
    <div class="quest-objs">${q.objectives.map(o=>
      `<div class="quest-obj ${o.done?'done':''}"><span class="q-box">${o.done?'☑':'☐'}</span><span>${esc(o.text)}</span></div>`).join('')}</div>
    <div class="quest-bar"><i style="width:${total?Math.round(done/total*100):0}%"></i></div>`;
  panel.querySelector('#questCollapse').onclick=()=>{
    panel.classList.toggle('collapsed');
    panel.querySelector('#questCollapse').textContent=panel.classList.contains('collapsed')?'SHOW':'HIDE';
  };
  panel.querySelector('#questDismiss').onclick=async()=>{
    if(!completed&&!confirm('Abandon this quest?'))return;
    currentSession.quest=null;
    await dbPut('sessions',currentSession);
    renderQuestPanel();
    toast(completed?'QUEST CLEARED':'QUEST ABANDONED');
  };
}

function openQuestUI(){
  if(!settings.questsEnabled){toast('ENABLE QUESTS IN SETTINGS');return;}
  const sess=currentSession;if(!sess)return;
  if(sess.quest){
    const panel=document.getElementById('questPanel');
    panel.classList.toggle('collapsed');
    renderQuestPanel();
    return;
  }
  openModal('START A QUEST',`
    <p style="font-size:16px;color:var(--text-2);margin-bottom:12px">The AI designs a short quest inside this realm — objectives complete themselves as your conversation makes them happen.</p>
    <div class="field"><label>Theme (optional)</label><input id="q-theme" placeholder="e.g. a stolen treasure, a birthday surprise..."></div>
    <div class="btn-row"><button class="btn btn-ghost" id="q-cancel">Cancel</button><button class="btn btn-primary" id="q-go">GENERATE</button></div>
  `);
  document.getElementById('q-cancel').onclick=closeModal;
  document.getElementById('q-go').onclick=async()=>{
    const theme=document.getElementById('q-theme').value.trim();
    closeModal();
    await startQuest(theme);
  };
}
