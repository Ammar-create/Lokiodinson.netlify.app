'use strict';
// ===== CHAT ENGINE =====
const Chat={
  async init(scenId){
    const scenario=await DB.get('scenarios',scenId);
    if(!scenario){Toast.e('Scenario not found');return;}
    const chars=[];
    for(const cid of scenario.characterIds||[]){
      const c=await DB.get('characters',cid);
      if(c)chars.push({...c,emotionalState:'neutral',moodNotes:'',systemInjection:''});
    }
    let msgs=await DB.getByIndex('messages','scenarioId',scenId);
    msgs.sort((a,b)=>a.timestamp-b.timestamp);
    const relData=await DB.get('relationships',scenId);
    const allChars=await DB.getAll('characters');
    const userChar=allChars.find(c=>c.isUser);
    ST.chat={
      ...ST.chat,scenId,scenario,characters:chars,messages:msgs,rels:relData?.matrix||{},
      activeCharId:userChar?.id||chars[0]?.id||null,
      autoChatRunning:false,autoChatStop:false,msgSinceCtrl:0,
      panelOpen:window.innerWidth>900,panelTab:'directive',
      directive:{next:'',details:''},debugLog:[],
    };
    Router.go('chat');
  },
  async send(content,charId){
    if(!content.trim())return;
    const char=ST.chat.characters.find(c=>c.id===charId);if(!char)return;
    const msg={id:uid(),scenarioId:ST.chat.scenId,charId,content:content.trim(),timestamp:Date.now(),isUser:!!char.isUser};
    ST.chat.messages.push(msg);
    await DB.put('messages',msg);
    Chat.renderMsg(msg,char,true);
    Chat.scrollEnd();
    const isUserChar=char.isUser||ST.chat.scenario?.settings?.aiKnowsUser!==false;
    if(isUserChar)await Chat.doResponses(charId);
  },
  async doResponses(excludeId){
    const responders=ST.chat.characters.filter(c=>c.id!==excludeId&&!c.isUser);
    for(const c of responders){await Chat.genResponse(c);if(ST.chat.autoChatStop)break;}
  },
  async genResponse(char){
    if(!char)return;
    const tid=`th-${char.id}-${Date.now()}`;
    Chat.addThinking(tid,char);Chat.scrollEnd();
    try{
      const sys=Ctrl.buildSysPrompt(char,ST.chat.scenario,ST.chat.messages,ST.chat.rels);
      const hist=Ctrl.buildConvo(char,ST.chat.messages,ST.chat.characters);
      const model=char.modelId||ST.settings.charModel||'llama-scout';
      Ctrl.dlog(`Generating for ${char.name} (${model})...`,'dinfo');
      let full='';
      const msgId=uid();
      const el=Chat.createStreamEl(msgId,char);
      $(`#${tid}`)?.remove();
      await API.stream([{role:'system',content:sys},...hist],model,(chunk,done)=>{
        full+=chunk;Chat.updateStreamEl(el,char,full,done);Chat.scrollEnd();
      },{temp:0.93});
      Chat.finalizeEl(el,msgId);
      const msg={id:msgId,scenarioId:ST.chat.scenId,charId:char.id,content:full,timestamp:Date.now(),isUser:false};
      ST.chat.messages.push(msg);
      await DB.put('messages',msg);
      ST.chat.msgSinceCtrl++;
      const freq=ST.chat.scenario?.settings?.controllerFreq||ST.settings.ctrlFreq||10;
      if(ST.chat.msgSinceCtrl>=freq){
        ST.chat.msgSinceCtrl=0;
        setTimeout(async()=>{
          await Ctrl.runMain(ST.chat.scenario,ST.chat.characters,ST.chat.messages,ST.chat.rels);
          await DB.put('relationships',{scenarioId:ST.chat.scenId,matrix:ST.chat.rels});
        },500);
      }
      if(ST.chat.scenario?.settings?.autoImage){
        try{
          const imgPrompt=`${char.appearance||''}, ${full.replace(/\*[^*]+\*/g,'').replace(/"[^"]+"/g,'').slice(0,200)}`;
          const imgUrl=API.imageUrl(imgPrompt);
          const mb=el.querySelector('.msg-body');
          if(mb){const img=document.createElement('img');img.className='msg-img';img.src=imgUrl;img.loading='lazy';mb.appendChild(img);}
        }catch{}
      }
      Ctrl.dlog(`${char.name} responded`,'dok');
    }catch(err){
      $(`#${tid}`)?.remove();
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
    el.className=`msg${char.isUser?' usr':''}`;el.id=`msg-${msg.id}`;
    el.innerHTML=`<div class="msg-hdr">${Chat.avHtml(char,26)}<span class="msg-name" style="color:${esc(char.color)}">${esc(char.name)}</span><span class="msg-time">${fmtT(msg.timestamp)}</span></div>
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
  scrollEnd(){const l=$('#chat-log');if(l)l.scrollTop=l.scrollHeight},
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
    const btn=$('#auto-btn');if(btn){btn.classList.add('on');btn.innerHTML=`${I('pause',13)} Pause`;}
    Toast.i('Auto-chat started');
    const chars=ST.chat.characters.filter(c=>!c.isUser);
    while(!ST.chat.autoChatStop){
      if(!chars.length)break;
      const last=ST.chat.messages[ST.chat.messages.length-1];
      const li=last?chars.findIndex(c=>c.id===last.charId):-1;
      const next=chars[(li+1)%chars.length];
      await Chat.genResponse(next);
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
  async saveJSON(){
    const name=await Modal.prompt('Save name:',{title:'Save Chat Session',placeholder:`${ST.chat.scenario?.name||'session'} - ${new Date().toLocaleDateString()}`,ok:'Save'});
    if(!name)return;
    const data={_theatro:true,version:1,name,savedAt:Date.now(),scenario:ST.chat.scenario,characters:ST.chat.characters,messages:ST.chat.messages,rels:ST.chat.rels};
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download=`${name.replace(/[^a-z0-9]/gi,'_')}.json`;a.click();
    Toast.s('Chat saved');
  },
  async loadJSON(){
    const inp=document.createElement('input');inp.type='file';inp.accept='.json';
    inp.onchange=async e=>{
      const f=e.target.files[0];if(!f)return;
      try{
        const data=JSON.parse(await f.text());
        if(!data._theatro){Toast.e('Not a Theatro file');return;}
        ST.chat.messages=data.messages||[];ST.chat.rels=data.rels||{};
        const log=$('#chat-log');if(log){log.innerHTML='';
          for(const m of ST.chat.messages){const ch=ST.chat.characters.find(c=>c.id===m.charId);if(ch)Chat.renderMsg(m,ch,true);}
        }
        Toast.s(`Loaded: "${data.name}"`);
      }catch{Toast.e('Load failed');}
    };
    inp.click();
  }
};

// ===== CHAT ACTIONS =====
const CA={
  async img(msgId){
    const msg=ST.chat.messages.find(m=>m.id===msgId);
    const char=msg?ST.chat.characters.find(c=>c.id===msg.charId):null;
    if(!msg||!char)return;
    Toast.i('Generating image...');
    try{
      const prompt=`${char.appearance||''}, ${msg.content.replace(/\*[^*]+\*/g,'').replace(/"[^"]+"/g,'').trim().slice(0,200)}`;
      const url=API.imageUrl(prompt);
      const mb=$(`#msg-${msgId} .msg-body`);
      if(mb){
        const img=document.createElement('img');img.className='msg-img';img.src=url;img.loading='lazy';
        img.onclick=()=>Modal.open({title:'Image',wide:true,content:`<img src="${esc(url)}" style="width:100%;border-radius:8px">`});
        mb.appendChild(img);
      }
      msg.imageUrl=url;Toast.s('Image generated');
    }catch(err){Toast.e('Image failed: '+err.message);}
  },
  async voice(msgId){
    const msg=ST.chat.messages.find(m=>m.id===msgId);
    const char=msg?ST.chat.characters.find(c=>c.id===msg.charId):null;
    if(!msg||!char)return;
    Toast.i('Generating voice...');
    try{
      const text=msg.content.replace(/\*[^*]+\*/g,'').replace(/"/g,'').trim();
      const voice=char.voice||ST.settings.defVoice||'nova';
      const audioUrl=await API.tts(text,voice,ST.settings.ttsModel||'tts-1');
      const mb=$(`#msg-${msgId} .msg-body`);
      if(mb){
        mb.querySelector('audio')?.remove();
        const au=document.createElement('audio');au.controls=true;au.src=audioUrl;
        au.style.cssText='width:200px;height:32px;margin-top:8px;display:block;filter:invert(.8)';
        mb.appendChild(au);au.play().catch(()=>{});
      }
      Toast.s('Voice generated');
    }catch(err){Toast.e('Voice failed: '+err.message);}
  },
  async regen(msgId){
    const idx=ST.chat.messages.findIndex(m=>m.id===msgId);if(idx<0)return;
    const msg=ST.chat.messages[idx];
    const char=ST.chat.characters.find(c=>c.id===msg.charId);if(!char)return;
    const ok=await Modal.confirm('Regenerate this message? Current version will be lost.',{ok:'Regenerate'});if(!ok)return;
    ST.chat.messages.splice(idx,1);await DB.del('messages',msgId);
    $(`#msg-${msgId}`)?.remove();
    await Chat.genResponse(char);
  },
  async branch(msgId){
    const idx=ST.chat.messages.findIndex(m=>m.id===msgId);if(idx<0)return;
    const ok=await Modal.confirm('Create a branch from this message point?',{ok:'Branch Here'});if(!ok)return;
    const base=ST.chat.scenario?.name||'Scenario';
    const all=await DB.getAll('scenarios');
    const bc=all.filter(s=>s.parentId===ST.chat.scenId).length;
    const bname=`${base}-${bc+2}`;
    const bs={...ST.chat.scenario,id:uid(),name:bname,parentId:ST.chat.scenId,messageIds:[],summary:'',createdAt:Date.now(),updatedAt:Date.now()};
    await DB.put('scenarios',bs);
    for(const m of ST.chat.messages.slice(0,idx+1)){await DB.put('messages',{...m,id:uid(),scenarioId:bs.id});}
    Toast.s(`Branch "${bname}" created`);
    const go=await Modal.confirm(`Branch "${bname}" created. Open it?`,{ok:'Open Branch'});
    if(go)await Chat.init(bs.id);
  }
};