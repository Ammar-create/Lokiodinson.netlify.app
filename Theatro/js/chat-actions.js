'use strict';
// ===== CHAT ACTIONS =====
const CA={
  async img(msgId){
    const msg=ST.chat.messages.find(m=>m.id===msgId);
    const char=msg?ST.chat.characters.find(c=>c.id===msg.charId):null;
    if(!msg||!char)return;
    Toast.i('Generating image...');
    try{
      let prompt;
      try{
        const imgData=await Ctrl.genImagePrompt(msg,char,ST.chat.scenario);
        prompt=imgData?.prompt||`${char.appearance||''}, ${msg.content.replace(/\*[^*]+\*/g,'').replace(/\"[^\"]+\"/g,'').trim().slice(0,200)}`;
      }catch{prompt=`${char.appearance||''}, ${msg.content.replace(/\*[^*]+\*/g,'').replace(/\"[^\"]+\"/g,'').trim().slice(0,200)}`;}
      const url=await API.generateImageUrl(prompt);
      const mb=$(`#msg-${msgId} .msg-body`);
      if(mb){
        const img=document.createElement('img');img.className='msg-img';img.src=url;img.loading='lazy';
        img.onclick=()=>Modal.open({title:'Image',wide:true,content:`<img src=\"${esc(url)}\" style=\"width:100%;border-radius:8px\">`});
        mb.appendChild(img);
      }
      msg.imageUrl=url;
      await DB.put('messages',msg);
      Toast.s('Image generated');
    }catch(err){Toast.e('Image failed: '+err.message);}
  },
  async voice(msgId){
    const msg=ST.chat.messages.find(m=>m.id===msgId);
    const char=msg?ST.chat.characters.find(c=>c.id===msg.charId):null;
    if(!msg||!char)return;
    Toast.i('Generating voice...');
    try{
      const text=msg.content.replace(/\*[^*]+\*/g,'').replace(/\"/g,'').trim();
      // Pass full voice config to new TTS
      const ttsOpts={
        voice:char.voice||ST.settings.defVoice||'Mia',
        voiceDescription:char.voiceDescription||'',
        useStandardVoice:!!char.useStandardVoice,
        voiceClone:char.voiceClone||null,
      };
      const audioUrl=await API.tts(text,ttsOpts);
      const mb=$(`#msg-${msgId} .msg-body`);
      if(mb){
        mb.querySelector('.audio-player')?.remove();
        const wrapper=document.createElement('div');
        wrapper.innerHTML=Chat._audioPlayerHtml(audioUrl);
        const playerEl=wrapper.firstElementChild;
        mb.appendChild(playerEl);
        Chat._apToggle(playerEl.id);
      }
      msg.audioUrl=audioUrl;
      await DB.put('messages',msg);
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
    const visible=Chat.filterVisible(ST.chat.messages,char.id);
    await Chat.genResponse(char,visible);
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
    for(const m of ST.chat.messages.slice(0,idx+1)){const newMsg={...m,id:uid(),scenarioId:bs.id};await DB.put('messages',newMsg);}
    if(ST.chat.rels&&Object.keys(ST.chat.rels).length)await DB.put('relationships',{scenarioId:bs.id,matrix:{...ST.chat.rels}});
    for(const char of ST.chat.characters){
      const memKey=`${char.id}_${ST.chat.scenId}`;
      const mems=ST.chat.charMems?.[memKey];
      if(mems&&mems.length){const newMemKey=`${char.id}_${bs.id}`;const copiedMems=mems.map(m=>({...m,id:uid(),scenId:bs.id}));await DB.put('memories',{id:newMemKey,charId:char.id,scenId:bs.id,events:copiedMems});}
    }
    Toast.s(`Branch "${bname}" created`);
    const go=await Modal.confirm(`Branch "${bname}" created. Open it?`,{ok:'Open Branch'});
    if(go)await Chat.init(bs.id);
  },
  async cacheAllMedia(){
    const messages=ST.chat.messages||[];let count=0;
    for(const msg of messages){
      if(msg.imageUrl&&typeof msg.imageUrl==='string'&&!(await DB.hasBlob(msg.imageUrl))){try{const res=await fetch(msg.imageUrl);if(res.ok){const blob=await res.blob();await DB.cacheBlob(msg.imageUrl,blob,'image');count++;}}catch(e){Ctrl?.dlog?.(`Failed to cache image: ${e.message}`,'warn');}}
      if(msg.audioUrl&&typeof msg.audioUrl==='string'&&!(await DB.hasBlob(msg.audioUrl))){try{const res=await fetch(msg.audioUrl);if(res.ok){const blob=await res.blob();await DB.cacheBlob(msg.audioUrl,blob,'audio');count++;}}catch(e){Ctrl?.dlog?.(`Failed to cache audio: ${e.message}`,'warn');}}
    }
    Toast.s(`Cached ${count} media blob(s) from current chat`);
    return count;
  }
};