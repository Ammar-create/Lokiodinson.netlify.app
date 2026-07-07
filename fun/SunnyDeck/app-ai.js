/* ===================================================================
   SUNNY DECK // RETRO  —  app-ai.js
   Chat-firing pipeline: send → router → character reply → TTS
   Loaded AFTER app.js so it can reference its globals.
   =================================================================== */
'use strict';

function setMapSpeaking(key,on){
  const c=(currentRealm?.characters||[]).find(x=>x.key===key);
  if(c?._mapEl)c._mapEl.classList.toggle('speaking',on);
}

function showTyping(name){
  const chat=document.getElementById('chat');
  const div=document.createElement('div');div.className='typing';div.id='typingInd';
  div.innerHTML=`${esc(name.toUpperCase())} IS TYPING <span class="cursor"></span>`;
  chat.appendChild(div);chat.scrollTop=chat.scrollHeight;
}
function hideTyping(){document.getElementById('typingInd')?.remove();}

/* ===== Selection rule: direct > earshot filter > forced-single > router ===== */
async function pickResponders(text,playerKey,realm,sess,shout){
  if(chatTargetKey){
    const target=realm.characters.find(c=>c.key===chatTargetKey);
    if(target&&!isCharDisabled(sess,target.key))return [chatTargetKey];
    chatTargetKey='';
  }
  let candidates=realm.characters
    .filter(c=>c.key!==playerKey&&!isCharDisabled(sess,c.key))
    .map(c=>c.key);
  if(candidates.length===0)return [];
  if(!sess.isWhisper&&!shout&&typeof inEarshot==='function'){
    const near=candidates.filter(k=>inEarshot(k));
    if(near.length===0)return{outOfRange:true};
    candidates=near;
  }
  if(candidates.length===1)return candidates;
  return await routeMessage(text,playerKey,realm,sess,candidates,shout);
}

async function routeMessage(text,playerKey,realm,sess,candidates,shout){
  if(candidates.length===0)return[];
  if(candidates.length===1)return candidates;
  const recent=sess.history.slice(-8).filter(h=>h.kind!=='system').map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
  const{provider,model}=parseModel(settings.routerModel||DEFAULT_SETTINGS.routerModel);
  const p=PROVIDERS[provider];const key=settings[p.keyName];
  const where=typeof zoneOf==='function'
    ?candidates.map(k=>{const c=realm.characters.find(x=>x.key===k);const z=zoneOf(k);const a=sess.activities?.[k];return`${k} (${c?.name}${z?', at the '+z.name:''}${a?', '+a.label:''})`;}).join('; ')
    :candidates.join(', ');
  const prompt=`You are the conversation director in ${realm.name}.
The speaker is ${realm.characters.find(c=>c.key===playerKey)?.name}.
${shout?'The speaker SHOUTS across the whole place, so everyone hears.':'Only the characters listed below are close enough to hear.'}
Message: "${text}"
Recent: ${recent||'(none)'}
Who can hear: ${where}
Decide who naturally responds (1 or 2 keys if the message clearly involves/provokes two people).
Output ONLY JSON: {"responders":["key1"]} or {"responders":["key1","key2"]}
Options: ${candidates.join(', ')}`;
  try{
    const res=await fetch(`${p.base}/chat/completions`,{
      method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,messages:[{role:'user',content:prompt}],max_tokens:60,temperature:0})});
    const data=await res.json();
    const m=data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if(!m)throw new Error('no json');
    const parsed=JSON.parse(m[0]);
    const picks=(parsed.responders||[]).map(n=>String(n).toLowerCase().trim()).filter(n=>candidates.includes(n)).slice(0,2);
    if(picks.length)return picks;
  }catch(e){console.warn('Router failed',e);}
  return[candidates[Math.floor(Math.random()*candidates.length)]];
}

async function getReply(responderKey,userText,alreadyReplied,sess,realm){
  const c=realm.characters.find(x=>x.key===responderKey);
  const player=realm.characters.find(x=>x.key===sess.playerKey);
  const recent=sess.history.slice(-20).filter(h=>h.kind!=='system').map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
  const tags=(sess.activeTags||[]).join(', ');
  const repliedNote=alreadyReplied.length?`\n${alreadyReplied.map(k=>realm.characters.find(x=>x.key===k)?.name).join(' and ')} already replied; react to what they said.`:'';
  const tagNote=tags?`\nActive tone tags: ${tags}. Apply their natural meaning. Do not mention the tags.`:'';
  const extra=c.system?`\n${c.system}`:'';
  const spatial=typeof spatialSummary==='function'?spatialSummary(realm,sess,responderKey):'';
  const act=sess.activities?.[responderKey];
  const mem=typeof memoryNotes==='function'?memoryNotes(responderKey,realm):'';
  const sceneNote=spatial?`\n${spatial}`:'';
  const actNote=act?`\nYou were just ${act.label}.`:'';
  const memNote=mem?`\nYou remember from before: ${mem}`:'';
  const world=typeof worldPromptNote==='function'?worldPromptNote():'';
  const worldNote=world?`\n${world}`:'';
  const social=typeof socialPromptNote==='function'?socialPromptNote(responderKey,realm,sess):'';
  const socialNote=social?`\n${social}`:'';
  const quest=typeof questPromptNote==='function'?questPromptNote(sess):'';
  const questNote=quest?`\n${quest}`:'';
  const inv=typeof inventoryPromptNote==='function'?inventoryPromptNote(responderKey,sess):'';
  const invNote=inv?`\n${inv}`:'';
  const roll=typeof rollPromptNote==='function'?rollPromptNote():'';
  const rollNote=roll?`\n${roll}`:'';
  const sys=`You are ${c.name} in ${realm.name}. ${c.description}. Personality: ${c.personality}.${extra}
Talking to ${player?.name||'the user'}.${repliedNote}${tagNote}${sceneNote}${actNote}${memNote}${worldNote}${socialNote}${questNote}${invNote}${rollNote}
RULES:
- Output SPOKEN DIALOGUE ONLY. No asterisks, no narration, no actions. These words become audio.
- Stay fully in character. 1-3 sentences, natural conversational length.
- Never mention being an AI.

Conversation so far:
${recent||'(just started)'}`;
  const{provider,model}=parseModel(settings.chatModel||DEFAULT_SETTINGS.chatModel);
  const p=PROVIDERS[provider];const key=settings[p.keyName];
  const res=await fetch(`${p.base}/chat/completions`,{
    method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'system',content:sys},{role:'user',content:`${player?.name||'User'} says: "${userText}"`}],temperature:.9,max_tokens:200})});
  if(!res.ok)throw new Error(`Chat ${res.status}`);
  const data=await res.json();
  return data.choices[0].message.content.trim();
}

/* ===== TTS ===== */
let currentAudio=null;
async function speakChat(text,speakerKey){
  if(!settings.ttsEnabled||!settings.aquaKey)return;
  const{model}=parseModel(settings.ttsModel||DEFAULT_SETTINGS.ttsModel);
  const c=(currentRealm?.characters||[]).find(x=>x.key===speakerKey);if(!c)return;
  const voiceId=c.voice||'mimo_default';
  try{
    setMapSpeaking(speakerKey,true);
    const res=await fetch(`${PROVIDERS.aqua.base}/audio/speech`,{
      method:'POST',headers:{'Authorization':`Bearer ${settings.aquaKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,input:text,audio:{voice:voiceId}})});
    if(!res.ok)throw new Error(`TTS ${res.status}`);
    const data=await res.json();
    if(!data.success||!data.url)throw new Error('No audio URL');
    const audioRes=await fetch(data.url);
    if(!audioRes.ok)throw new Error('Audio fetch failed');
    const blob=await audioRes.blob();
    const url=URL.createObjectURL(blob);
    if(currentAudio){currentAudio.pause();currentAudio=null;}
    currentAudio=new Audio(url);
    await new Promise(done=>{
      currentAudio.onended=()=>{URL.revokeObjectURL(url);done();};
      currentAudio.onerror=()=>{URL.revokeObjectURL(url);done();};
      currentAudio.play().catch(done);
    });
  }catch(e){console.error('TTS failed',e);}
  finally{setMapSpeaking(speakerKey,false);}
}

/* ===== STT ===== */
async function transcribe(blob){
  if(!settings.groqKey){toast('GROQ KEY MISSING FOR SPEECH');return null;}
  try{
    const{model}=parseModel(settings.sttModel||DEFAULT_SETTINGS.sttModel);
    const fd=new FormData();
    fd.append('file',blob,'audio.webm');
    fd.append('model',model||'whisper-large-v3');
    const res=await fetch(`${PROVIDERS.groq.base}/audio/transcriptions`,{
      method:'POST',headers:{'Authorization':`Bearer ${settings.groqKey}`},body:fd});
    const data=await res.json();
    return(data.text||'').trim();
  }catch(e){console.error('STT failed',e);return null;}
}

let mediaRecorder=null,audioChunks=[];
async function startMicRecording(){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder=new MediaRecorder(stream);audioChunks=[];
    mediaRecorder.ondataavailable=e=>audioChunks.push(e.data);
    mediaRecorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      document.getElementById('micBtnChat').classList.remove('rec');
      const blob=new Blob(audioChunks,{type:'audio/webm'});
      const txt=await transcribe(blob);
      if(txt){document.getElementById('chatInput').value=txt;handleChatSend();}
      else toast('COULD NOT TRANSCRIBE');
    };
    mediaRecorder.start();
    document.getElementById('micBtnChat').classList.add('rec');
  }catch{toast('MIC ACCESS DENIED');}
}

document.getElementById('micBtnChat').onclick=async()=>{
  if(mediaRecorder&&mediaRecorder.state==='recording'){mediaRecorder.stop();return;}
  await startMicRecording();
};

/* ===== Send flow ===== */
let chatBusy=false;
async function handleChatSend(){
  const text=document.getElementById('chatInput').value.trim();
  if(!text||chatBusy)return;
  if(text.startsWith('/')&&typeof handleSlashCommand==='function'){
    document.getElementById('chatInput').value='';
    if(await handleSlashCommand(text))return;
    document.getElementById('chatInput').value=text;
  }
  if(!hasApiKeys()){toast('ADD YOUR AQUA API KEY IN SETTINGS');return;}
  chatBusy=true;
  document.getElementById('sendBtnChat').disabled=true;
  document.getElementById('chatInput').value='';

  const sess=currentSession,realm=currentRealm;
  const playerKey=sess.playerKey||realm.characters[0]?.key;
  const player=realm.characters.find(c=>c.key===playerKey)||realm.characters[0];
  const playerName=player?player.name:'You';

  const shout=!!shoutNext;
  shoutNext=false;

  const h={kind:'dialogue',speakerKey:playerKey,speaker:playerName,text,timestamp:Date.now(),isPlayer:true,shout};
  addChatBubble(h);
  sess.history.push(h);
  sess.lastActiveAt=Date.now();
  await dbPut('sessions',sess);
  if(shout)renderChatTarget();
  if(typeof sfx==='function')sfx('send');
  if(typeof worldOnExchange==='function')worldOnExchange();

  maybeAutoRename(sess);

  const picked=await pickResponders(text,playerKey,realm,sess,shout);
  if(picked&&picked.outOfRange){
    const sysH={kind:'system',speakerKey:'',speaker:'',text:'No one is close enough to hear you. Walk closer on the map, or use SHOUT.',timestamp:Date.now()};
    addChatBubble(sysH);
    sess.history.push(sysH);
    await dbPut('sessions',sess);
  }else{
    const responders=Array.isArray(picked)?picked:[];
    try{
      const already=[];
      for(const rKey of responders){
        const c=realm.characters.find(x=>x.key===rKey);if(!c)continue;
        // shouted-at characters walk over before answering
        if(shout&&typeof inEarshot==='function'&&!inEarshot(rKey)){
          const pp=sess.positions?.[playerKey];
          if(pp){
            moveCharacter(rKey,Math.min(97,Math.max(3,pp.x+(already.length?7:-7))),Math.min(92,Math.max(8,pp.y+4)));
            await new Promise(r=>setTimeout(r,900));
          }
        }
        showTyping(c.name);
        setMapSpeaking(rKey,true);
        let reply;
        try{reply=await getReply(rKey,text,already,sess,realm);}
        finally{hideTyping();setMapSpeaking(rKey,false);}
        const replyH={kind:'dialogue',speakerKey:rKey,speaker:c.name,text:reply,timestamp:Date.now(),isPlayer:false};
        addChatBubble(replyH);
        if(typeof sfx==='function')sfx('reply');
        sess.history.push(replyH);
        sess.lastActiveAt=Date.now();
        await dbPut('sessions',sess);
        already.push(rKey);
        await speakChat(reply,rKey);
      }
      if(responders.length&&typeof stageDirectionTick==='function')stageDirectionTick(sess,realm);
      if(responders.length&&typeof questCheckTick==='function')questCheckTick(sess,realm);
      if(responders.length&&typeof socialAnalysisTick==='function')socialAnalysisTick(sess,realm);
      if(responders.length&&typeof inventoryTick==='function')inventoryTick(sess,realm);
    }catch(e){console.error(e);toast(e.message||'CHAT FAILED');}
  }
  if(typeof clearRollNote==='function')clearRollNote();

  chatBusy=false;
  document.getElementById('sendBtnChat').disabled=false;
  document.getElementById('chatInput').focus();
}

document.getElementById('sendBtnChat').onclick=handleChatSend;
document.getElementById('chatInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleChatSend();}
});

/* ===== Auto-rename once 10 dialogue messages exist (ambient/event lines don't count) ===== */
async function maybeAutoRename(sess){
  if(!sess||sess.renameDone)return;
  const dlg=(sess.history||[]).filter(h=>!h.kind||h.kind==='dialogue');
  if(dlg.length<10)return;
  sess.renameDone=true;
  await dbPut('sessions',sess);
  const ctl=new AbortController();
  const timeoutId=setTimeout(()=>ctl.abort(),8000);
  try{
    const lines=dlg.slice(0,10).map(h=>`${h.speaker}: ${h.text}`).join('\n');
    const{provider,model}=parseModel(settings.taskModel||DEFAULT_SETTINGS.taskModel);
    const p=PROVIDERS[provider];const key=settings[p.keyName];
    const prompt=`Summarize this conversation into a short, catchy session title (2-4 words). Output ONLY the title, no quotes.\n\n${lines}`;
    const res=await fetch(`${p.base}/chat/completions`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:.7,max_tokens:20}),
      signal:ctl.signal});
    clearTimeout(timeoutId);
    if(!res.ok)throw new Error(`Rename API ${res.status}`);
    const data=await res.json();
    let content=data?.choices?.[0]?.message?.content;
    if(typeof content!=='string'||!content.trim())throw new Error('No text content');
    const title=content.trim().replace(/^["']|["']$/g,'').slice(0,40);
    if(!title||title.toLowerCase()===sess.name.toLowerCase())return;
    sess.name=title;
    await dbPut('sessions',sess);
    if(currentSession?.id===sess.id){
      const el=document.querySelector('#chat-header .session-name');
      if(el)el.textContent=title;
    }
    renderDashboard();
  }catch(e){
    sess.renameDone=false;
    await dbPut('sessions',sess).catch(()=>{});
    if(e.name!=='AbortError')console.warn('Auto rename failed:',e.message);
  }
}
