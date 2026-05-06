'use strict';
// ===== CHAT ENGINE =====
// Core chat logic: messaging, AI responses, auto-chat, rendering, STT
// Message actions (img/voice/regen/branch) moved to chat-actions.js
const Chat={
  // STT state
  _sttRecorder:null,
  _sttChunks:[],
  _sttStream:null,

  // #12: Filter messages visible to a character (respects private conversations)
  filterVisible(messages,charId){
    return messages.filter(m=>{
      if(m.isPrivate){
        if(m.privateWith&&m.privateWith.length)
          return m.charId===charId||m.privateWith.includes(charId);
        return m.charId===charId;
      }
      return true;
    });
  },

  async init(scenId){
    // BUG 23: Stop any running auto-chat before overwriting state
    if(ST.chat.autoChatRunning){Chat.stopAuto();await new Promise(r=>setTimeout(r,200));}
    const scenario=await DB.get('scenarios',scenId);
    if(!scenario){Toast.e('Scenario not found');return;}
    const chars=[];
    for(const cid of scenario.characterIds||[]){
      const c=await DB.get('characters',cid);
      if(c){
        chars.push({...c,
          emotionalState:c.emotionalState||'neutral',
          moodNotes:c.moodNotes||'',
          systemInjection:c.systemInjection||''
        });
      }
    }
    let msgs=await DB.getByIndex('messages','scenarioId',scenId);
    msgs.sort((a,b)=>a.timestamp-b.timestamp);
    // BUG 28: Persist opening message if no messages exist yet
    if(!msgs.length&&scenario.openingMessage){
      const openingMsg={id:'opening-'+scenId,scenarioId:scenId,charId:'narrator',content:scenario.openingMessage,timestamp:Date.now(),isUser:false};
      msgs.push(openingMsg);
      await DB.put('messages',openingMsg);
    }
    const relData=await DB.get('relationships',scenId);
    const allChars=await DB.getAll('characters');
    const userChar=allChars.find(c=>c.isUser);
    // Load per-character private memories
    await Ctrl.loadMemories(scenId,chars);
    ST.chat={
      ...ST.chat,scenId,scenario,characters:chars,messages:msgs,rels:relData?.matrix||{},
      activeCharId:userChar?.id||chars[0]?.id||null,
      autoChatRunning:false,autoChatStop:false,msgSinceCtrl:0,
      panelOpen:window.innerWidth>900,panelTab:'directive',
      directive:{next:'',details:''},debugLog:[],
      sending:false,controllerRunning:false,sttRecording:false,
      whisper:false,whisperWith:[],
      whisperTarget:null,
    };
    Router.go('chat');
  },

  async send(content,charId,isPrivate=false,privateWith=[]){
    if(!content.trim())return;
    // Race condition guard
    if(ST.chat.sending){Toast.w('Please wait — still processing...');return;}
    ST.chat.sending=true;
    try{
      const char=ST.chat.characters.find(c=>c.id===charId);if(!char)return;
      const msg={id:uid(),scenarioId:ST.chat.scenId,charId,content:content.trim(),timestamp:Date.now(),isUser:!!char.isUser};
      // #12: Track private conversation metadata
      if(isPrivate){msg.isPrivate=true;msg.privateWith=privateWith;}
      ST.chat.messages.push(msg);
      await DB.put('messages',msg);
      Chat.renderMsg(msg,char,true);
      Chat.scrollEnd();
      // Track user's own message in their memory
      await Ctrl.addMemory(char.id,ST.chat.scenId,`I said: "${content.trim().slice(0,150)}"`,'witnessed');
      // Other characters witness this message (only if they can see it)
      for(const other of ST.chat.characters){
        if(other.id!==charId){
          if(!isPrivate||privateWith.includes(other.id)){
            await Ctrl.addMemory(other.id,ST.chat.scenId,`${char.name} said: "${content.trim().slice(0,100)}"`,'witnessed');
          }
        }
      }
      // FIX #1: Always trigger AI responses
      await Chat.doResponses(charId);
    }finally{ST.chat.sending=false;}
  },

  async doResponses(excludeId){
    const responders=ST.chat.characters.filter(c=>c.id!==excludeId&&!c.isUser);
    for(const c of responders){
      if(ST.chat.autoChatStop)break;
      if(ST.chat.sending&&!ST.chat.autoChatRunning)break;
      // #12: Each character only sees messages they're allowed to see
      const visible=Chat.filterVisible(ST.chat.messages,c.id);
      await Chat.genResponse(c,visible);
      if(ST.chat.autoChatStop)break;
    }
  },

  async genResponse(char,visibleMessages){
    if(!char)return;
    const tid=`th-${char.id}-${Date.now()}`;
    let msgId; // BUG 32: Declare outside try for catch cleanup
    Chat.addThinking(tid,char);Chat.scrollEnd();
    try{
      const msgs=visibleMessages||Chat.filterVisible(ST.chat.messages,char.id);
      const sys=Ctrl.buildSysPrompt(char,ST.chat.scenario,msgs,ST.chat.rels);
      const hist=Ctrl.buildConvo(char,msgs,ST.chat.characters);
      // BUG 33: Replaced 'llama-scout' with 'openai-fast'
      const model=char.modelId||ST.settings.charModel||'openai-fast';
      Ctrl.dlog(`Generating for ${char.name} (${model})...`,'dinfo');
      let full='';
      msgId=uid();
      const el=Chat.createStreamEl(msgId,char);
      $(`#${tid}`)?.remove();
      await API.stream([{role:'system',content:sys},...hist],model,(chunk,done)=>{
        full+=chunk;Chat.updateStreamEl(el,char,full,done);Chat.scrollEnd();
      },{temp:0.93});
      Chat.finalizeEl(el,msgId);
      const msg={id:msgId,scenarioId:ST.chat.scenId,charId:char.id,content:full,timestamp:Date.now(),isUser:false};
      ST.chat.messages.push(msg);
      await DB.put('messages',msg);
      // Track this character's memory of what they said
      await Ctrl.addMemory(char.id,ST.chat.scenId,`I said: "${full.slice(0,150)}"`,'witnessed');
      // Track other characters witnessing this message
      for(const other of ST.chat.characters){
        if(other.id!==char.id){
          if(!msg.isPrivate||!msg.privateWith||msg.privateWith.includes(other.id)){
            await Ctrl.addMemory(other.id,ST.chat.scenId,`${char.name} said: "${full.slice(0,100)}"`,'witnessed');
          }
        }
      }
      ST.chat.msgSinceCtrl++;
      const freq=ST.chat.scenario?.settings?.controllerFreq||ST.settings.ctrlFreq||10;
      if(ST.chat.msgSinceCtrl>=freq){
        ST.chat.msgSinceCtrl=0;
        // FIX #2: Use controllerRunning flag to prevent concurrent controller + auto-chat
        if(!ST.chat.controllerRunning){
          ST.chat.controllerRunning=true;
          try{
            await Ctrl.runMain(ST.chat.scenario,ST.chat.characters,ST.chat.messages,ST.chat.rels);
            await DB.put('relationships',{scenarioId:ST.chat.scenId,matrix:ST.chat.rels});
          }catch(err){
            Ctrl.dlog(`Controller run failed: ${err.message}`,'err');
          }finally{
            ST.chat.controllerRunning=false;
          }
        }
      }
      // BUG 26: Use Media Controller for auto-image generation
      if(ST.chat.scenario?.settings?.autoImage){
        try{
          let imgPrompt;
          try{
            const imgData=await Ctrl.genImagePrompt(msg,char,ST.chat.scenario);
            imgPrompt=imgData?.prompt||`${char.appearance||''}, ${full.replace(/\*[^*]+\*/g,'').replace(/"[^"]+"/g,'').trim().slice(0,200)}`;
          }catch{
            imgPrompt=`${char.appearance||''}, ${full.replace(/\*[^*]+\*/g,'').replace(/"[^"]+"/g,'').trim().slice(0,200)}`;
          }
          const imgUrl=API.imageUrl(imgPrompt);
          const mb=el.querySelector('.msg-body');
          if(mb){const img=document.createElement('img');img.className='msg-img';img.src=imgUrl;img.loading='lazy';mb.appendChild(img);}
          // FIX #4: Persist imageUrl to IndexedDB
          msg.imageUrl=imgUrl;
          await DB.put('messages',msg);
        }catch{}
      }
      Ctrl.dlog(`${char.name} responded`,'dok');
    }catch(err){
      $(`#${tid}`)?.remove();
      // BUG 32: Clean up partial stream message on error
      if(msgId){
        const partialEl=$(`#msg-${msgId}`);
        if(partialEl){
          const mb=partialEl.querySelector('.msg-body');
          if(mb){
            mb.classList.remove('stream');
            if(!mb.textContent.trim()){
              partialEl.remove();
            }
          }
        }
      }
      Toast.e(`${char.name} failed: ${err.message}`);
      Ctrl.dlog(`${char.name} error: ${err.message}`,'derr');
    }
  },

  addThinking(id,char){
    const log=$('#chat-log');if(!log)return;
    const el=document.createElement('div');el.className='msg';el.id=id;
    el.innerHTML=`<div class="msg-hdr">${Chat.avHtml(char,26)}<span class="msg-name" style="color:${esc(char.color)}">${esc(char.name)}</span></div>
    <div class="msg-body" style="--mc:${esc(char.color)}"><div class="thinking"><span></span><span></span><span></span></div></div>`;
    log.appendChild(el);
  },
  createStreamEl(msgId,char){
    const log=$('#chat-log');if(!log)return null;
    const el=document.createElement('div');el.className='msg';el.id=`msg-${msgId}`;
    el.innerHTML=`<div class="msg-hdr">${Chat.avHtml(char,26)}<span class="msg-name" style="color:${esc(char.color)}">${esc(char.name)}</span><span class="msg-time">${fmtT(Date.now())}</span></div>
    <div class="msg-body stream" id="mb-${msgId}" style="--mc:${esc(char.color)}"></div>`;
    log.appendChild(el);return el;
  },
  updateStreamEl(el,char,text,done){
    if(!el)return;
    const mb=el.querySelector('[id^="mb-"]');if(!mb)return;
    mb.innerHTML=parseRP(text,char.color);
    if(done)mb.classList.remove('stream');
  },
  finalizeEl(el,msgId){
    if(!el)return;
    const mb=el.querySelector('[id^="mb-"]');if(mb)mb.classList.remove('stream');
    const ar=document.createElement('div');ar.className='msg-ar';
    ar.innerHTML=`<button class="mabtn" onclick="CA.img('${msgId}')">${I('image',11)} Image</button>
    <button class="mabtn" onclick="CA.voice('${msgId}')">${I('voice',11)} Voice</button>
    <button class="mabtn" onclick="CA.regen('${msgId}')">${I('regen',11)} Regen</button>
    <button class="mabtn" onclick="CA.branch('${msgId}')">${I('branch',11)} Branch</button>`;
    el.appendChild(ar);
  },
  renderMsg(msg,char,withActions=false){
    const log=$('#chat-log');if(!log)return;
    const el=document.createElement('div');
    let cls=`msg${char.isUser?' usr':''}`;
    // #12: Visual indicator for private messages
    if(msg.isPrivate)cls+=' private';
    el.className=cls;el.id=`msg-${msg.id}`;
    const privateTag=msg.isPrivate?'<span class="priv-tag">🔒 whisper</span>':'';
    el.innerHTML=`<div class="msg-hdr">${Chat.avHtml(char,26)}<span class="msg-name" style="color:${esc(char.color)}">${esc(char.name)}</span>${privateTag}<span class="msg-time">${fmtT(msg.timestamp)}</span></div>
    <div class="msg-body" style="--mc:${esc(char.color)}">${parseRP(msg.content,char.color)}${msg.imageUrl?`<img class="msg-img" src="${esc(msg.imageUrl)}" loading="lazy">`:''}</div>`;
    if(withActions){
      const ar=document.createElement('div');ar.className='msg-ar';
      ar.innerHTML=`<button class="mabtn" onclick="CA.img('${msg.id}')">${I('image',11)} Image</button>
      <button class="mabtn" onclick="CA.voice('${msg.id}')">${I('voice',11)} Voice</button>
      <button class="mabtn" onclick="CA.regen('${msg.id}')">${I('regen',11)} Regen</button>
      <button class="mabtn" onclick="CA.branch('${msg.id}')">${I('branch',11)} Branch</button>`;
      el.appendChild(ar);
    }
    log.appendChild(el);
  },
  addCtrlMsg(text){
    const log=$('#chat-log');if(!log)return;
    const el=document.createElement('div');el.className='msg ctrl';
    el.innerHTML=`<div class="msg-hdr"><div class="msg-av" style="background:var(--s3);color:var(--tmut);font-size:10px">⚙</div><span class="msg-name" style="color:var(--tmut);font-size:10px">System</span></div><div class="msg-body">${esc(text)}</div>`;
    log.appendChild(el);Chat.scrollEnd();
  },
  // BUG 30: scrollEnd also removes scroll-to-bottom button
  scrollEnd(){const l=$('#chat-log');if(l)l.scrollTop=l.scrollHeight;$('#scroll-bottom-btn')?.remove();},
  // BUG 30: Show scroll-to-bottom button when user is scrolled up during auto-chat
  _showScrollBtn(){
    let btn=$('#scroll-bottom-btn');
    if(btn)return;
    const log=$('#chat-log');if(!log)return;
    btn=document.createElement('button');
    btn.id='scroll-bottom-btn';
    btn.className='scroll-bottom-btn';
    btn.innerHTML='↓ New messages';
    btn.onclick=()=>{Chat.scrollEnd();btn.remove();};
    log.parentElement.style.position='relative';
    log.parentElement.appendChild(btn);
  },
  avHtml(char,sz=26){
    const st=`width:${sz}px;height:${sz}px;background:${char.color}22;border:2px solid ${char.color};`;
    if(char.avatar)return`<div class="msg-av" style="${st}"><img src="${esc(char.avatar)}" style="width:100%;height:100%;object-fit:cover"></div>`;
    return`<div class="msg-av" style="${st};color:${char.color};font-size:${Math.floor(sz*.4)}px">${char.name[0].toUpperCase()}</div>`;
  },
  renderRels(){
    const c=$('#rel-container');if(!c)return;
    const entries=Object.values(ST.chat.rels);
    if(!entries.length){c.innerHTML='<p style="color:var(--tmut);font-size:12px">No relationships tracked yet.</p>';return;}
    c.innerHTML=entries.map(r=>`<div class="rel-entry">
      <div class="rel-chars">${esc(r.fromName||r.fromId)} → ${esc(r.toName||r.toId)}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="rmood ${r.mood==='positive'||r.mood==='romantic'?r.mood==='romantic'?'rom':'pos':r.mood==='negative'?'neg':'neu'}">${esc(r.mood||'neutral')}</span>
        <span style="font-size:11px;color:var(--tmut)">${r.intensity||5}/10</span>
      </div>
      <div class="rel-reason">${esc(r.reason||'')}</div>
    </div>`).join('');
  },
  renderCast(){
    const c=$('#active-chars-list');if(!c)return;
    c.innerHTML=ST.chat.characters.map(ch=>`<div class="act-char-row">${Chat.avHtml(ch,24)}
      <div style="flex:1"><div style="font-size:12px;color:${esc(ch.color)};font-weight:600">${esc(ch.name)}</div>
      <div style="font-size:11px;color:var(--tmut)">${esc(ch.emotionalState||'neutral')}</div></div>
      ${ch.isUser?'<span class="pill g" style="font-size:10px">You</span>':''}
    </div>`).join('');
  },
  async startAuto(){
    if(ST.chat.autoChatRunning)return;
    ST.chat.autoChatRunning=true;ST.chat.autoChatStop=false;
    // BUG 23: Capture scenario ID for safety guard
    const startedScenId=ST.chat.scenId;
    const btn=$('#auto-btn');if(btn){btn.classList.add('on');btn.innerHTML=`${I('pause',13)} Pause`;}
    Toast.i('Auto-chat started');
    const chars=ST.chat.characters.filter(c=>!c.isUser);
    while(!ST.chat.autoChatStop){
      // BUG 23: Scenario ID mismatch guard — exit if state was overwritten
      if(ST.chat.scenId!==startedScenId)break;
      if(!chars.length)break;
      // FIX #2: Race condition check — also check controllerRunning
      if(ST.chat.sending||ST.chat.controllerRunning){await sleep(500);continue;}
      const last=ST.chat.messages[ST.chat.messages.length-1];
      const li=last?chars.findIndex(c=>c.id===last.charId):-1;
      const next=chars[(li+1)%chars.length];
      // #12: Each character sees only their visible messages
      const visible=Chat.filterVisible(ST.chat.messages,next.id);
      await Chat.genResponse(next,visible);
      // BUG 30: Show scroll button if user is scrolled up during auto-chat
      const log=$('#chat-log');
      if(log&&(log.scrollHeight-log.scrollTop-log.clientHeight)>100){
        Chat._showScrollBtn();
      }
      if(ST.chat.autoChatStop)break;
      await sleep(1200);
    }
    ST.chat.autoChatRunning=false;
    const btn2=$('#auto-btn');if(btn2){btn2.classList.remove('on');btn2.innerHTML=`${I('play',13)} Auto`;}
  },
  stopAuto(){
    ST.chat.autoChatStop=true;ST.chat.autoChatRunning=false;
    const btn=$('#auto-btn');if(btn){btn.classList.remove('on');btn.innerHTML=`${I('play',13)} Auto`;}
    Toast.i('Auto-chat paused');
  },
  // FIX #13: Revoke object URL after download to prevent memory leak
  async saveJSON(){
    const name=await Modal.prompt('Save name:',{title:'Save Chat Session',placeholder:`${ST.chat.scenario?.name||'session'} - ${new Date().toLocaleDateString()}`,ok:'Save'});
    if(!name)return;
    const data={_theatro:true,version:1,name,savedAt:Date.now(),scenario:ST.chat.scenario,characters:ST.chat.characters,messages:ST.chat.messages,rels:ST.chat.rels,charMems:ST.chat.charMems};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;
    a.download=`${name.replace(/[^a-z0-9]/gi,'_')}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    Toast.s('Chat saved');
  },
  // FIX #3: Restore full context (scenario, characters, memories) when loading JSON
  async loadJSON(){
    const inp=document.createElement('input');inp.type='file';inp.accept='.json';
    inp.onchange=async e=>{
      const f=e.target.files[0];if(!f)return;
      try{
        const data=JSON.parse(await f.text());
        if(!data._theatro){Toast.e('Not a Theatro file');return;}
        // Restore full context if present in the JSON
        if(data.scenario)ST.chat.scenario=data.scenario;
        if(data.characters&&data.characters.length)ST.chat.characters=data.characters;
        if(data.charMems)ST.chat.charMems=data.charMems;
        ST.chat.messages=data.messages||[];
        ST.chat.rels=data.rels||{};
        // Re-render the chat screen with restored context
        const log=$('#chat-log');
        if(log){log.innerHTML='';
          for(const m of ST.chat.messages){
            const ch=ST.chat.characters.find(c=>c.id===m.charId);
            if(ch)Chat.renderMsg(m,ch,true);
          }
        }
        Chat.renderRels();
        Chat.renderCast();
        Toast.s(`Loaded: "${data.name}"`);
      }catch{Toast.e('Load failed');}
    };
    inp.click();
  },

  // ===== STT (Speech-to-Text) =====
  async startSTT(){
    if(ST.chat.sttRecording)return;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      Chat._sttStream=stream;
      Chat._sttChunks=[];
      const recorder=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus'});
      Chat._sttRecorder=recorder;
      recorder.ondataavailable=e=>{if(e.data.size>0)Chat._sttChunks.push(e.data);};
      recorder.onstop=async()=>{
        // Cleanup stream tracks
        stream.getTracks().forEach(t=>t.stop());
        Chat._sttStream=null;
        if(!Chat._sttChunks.length)return;
        const blob=new Blob(Chat._sttChunks,{type:'audio/webm'});
        Chat._sttChunks=[];
        const micBtn=$('#mic-btn');
        if(micBtn){micBtn.disabled=true;micBtn.innerHTML=`<div class="spinner" style="width:14px;height:14px"></div>`;}
        try{
          Toast.i('Transcribing...');
          const text=await API.transcribe(blob);
          const ta=$('#chat-ta');
          if(ta&&text){
            ta.value=(ta.value?ta.value+' ':'')+text;
            Scr.taResize(ta);ta.focus();
          }
          Toast.s('Transcribed');
        }catch(err){
          Toast.e('Transcription failed: '+err.message);
          Ctrl.dlog(`STT error: ${err.message}`,'err');
        }finally{
          if(micBtn){micBtn.disabled=false;micBtn.innerHTML=I('mic',15);}
        }
      };
      recorder.start();
      ST.chat.sttRecording=true;
      const micBtn=$('#mic-btn');
      if(micBtn){micBtn.classList.add('recording');micBtn.innerHTML=I('stop',15);}
      Toast.i('Recording... click mic again to stop');
    }catch(err){
      Toast.e('Microphone access denied');
      Ctrl.dlog(`STT mic error: ${err.message}`,'err');
    }
  },
  stopSTT(){
    if(!ST.chat.sttRecording||!Chat._sttRecorder)return;
    Chat._sttRecorder.stop();
    ST.chat.sttRecording=false;
    const micBtn=$('#mic-btn');
    if(micBtn){micBtn.classList.remove('recording');micBtn.innerHTML=I('mic',15);}
  },
  toggleSTT(){
    if(ST.chat.sttRecording)Chat.stopSTT();else Chat.startSTT();
  }
};
