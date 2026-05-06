'use strict';
// ===== CHAT ENGINE — SESSION MANAGEMENT =====
// Auto-chat, save/load sessions, STT (speech-to-text)
// Depends on: Chat (from chat-core.js + chat-render.js), ST, DB, API, Modal, Toast, I, esc
Object.assign(Chat,{
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
      // BUG 2: scrollEnd now handles near-bottom check + button display internally
      // BUG 5: No duplicate threshold check needed — scrollEnd uses _nearBottom() with 200px
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
});
