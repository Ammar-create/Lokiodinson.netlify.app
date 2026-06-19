'use strict';
// ===== CHAT ENGINE — CORE =====
const Chat={
  _sttRecorder:null,
  _sttChunks:[],
  _sttStream:null,

  filterVisible(messages,charId){
    return messages.filter(function(m){
      if(m.isPrivate){
        if(m.privateWith&&m.privateWith.length)
          return m.charId===charId||m.privateWith.includes(charId);
        return m.charId===charId;
      }
      return true;
    });
  },

  async init(scenId){
    if(ST.chat.autoChatRunning){Chat.stopAuto();await new Promise(function(r){setTimeout(r,200);});}
    const scenario=await DB.get('scenarios',scenId);
    if(!scenario){Toast.e('Scenario not found');return;}
    const chars=[];
    for(const cid of scenario.characterIds||[]){
      const c=await DB.get('characters',cid);
      if(c){
        chars.push(Object.assign({},c,{
          emotionalState:c.emotionalState||'neutral',
          moodNotes:c.moodNotes||'',
          systemInjection:c.systemInjection||''
        }));
      }
    }
    for(const c of chars){
      if(c.modelId&&!MODELS.find(function(m){return m.id===c.modelId})){
        Ctrl?.dlog?.('Migrating '+c.name+' model from '+c.modelId+' to openai-fast','warn');
        c.modelId='openai-fast';
        await DB.put('characters',c);
      }
    }
    let msgs=await DB.getByIndex('messages','scenarioId',scenId);
    msgs.sort(function(a,b){return a.timestamp-b.timestamp;});
    if(!msgs.length&&scenario.openingMessage){
      const openingMsg={id:'opening-'+scenId,scenarioId:scenId,charId:'narrator',content:scenario.openingMessage,timestamp:Date.now(),isUser:false};
      msgs.push(openingMsg);
      await DB.put('messages',openingMsg);
    }
    const relData=await DB.get('relationships',scenId);
    const allChars=await DB.getAll('characters');
    const userChar=allChars.find(function(c){return c.isUser;});
    const unified=scenario.unifiedMemory===true;
    await Ctrl.loadMemories(scenId,chars,unified);
    ST.chat=Object.assign({},ST.chat,{scenId:scenId,scenario:scenario,characters:chars,messages:msgs,rels:relData?relData.matrix||{},{},
      activeCharId:userChar?userChar.id:chars[0]?chars[0].id:null,
      autoChatRunning:false,autoChatStop:false,msgSinceCtrl:0,
      panelOpen:window.innerWidth>900,panelTab:'directive',
      directive:{next:'',details:''},debugLog:[],
      sending:false,controllerRunning:false,sttRecording:false,
      whisper:false,whisperWith:[],whisperTarget:null
    });
    Router.go('chat');
  },

  async send(content,charId,isPrivate,privateWith){
    if(!content.trim())return;
    if(ST.chat.sending){Toast.w('Please wait — still processing...');return;}
    ST.chat.sending=true;
    try{
      const char=ST.chat.characters.find(function(c){return c.id===charId;});if(!char)return;
      const msg={id:uid(),scenarioId:ST.chat.scenId,charId:charId,content:content.trim(),timestamp:Date.now(),isUser:!!char.isUser};
      if(isPrivate){msg.isPrivate=true;msg.privateWith=privateWith;}
      ST.chat.messages.push(msg);
      await DB.put('messages',msg);
      Chat.renderMsg(msg,char,true);
      Chat.scrollEnd();
      const unified=ST.chat.scenario?ST.chat.scenario.unifiedMemory===true:false;
      await Ctrl.addMemory(char.id,ST.chat.scenId,'I said: "'+content.trim().slice(0,150)+'"','witnessed',unified);
      for(const other of ST.chat.characters){
        if(other.id!==charId){
          if(!isPrivate||privateWith.indexOf(other.id)!==-1){
            await Ctrl.addMemory(other.id,ST.chat.scenId,char.name+' said: "'+content.trim().slice(0,100)+'"','witnessed',unified);
          }
        }
      }
      const whisperResp=isPrivate&&privateWith.length?privateWith[0]:null;
      await Chat.doResponses(charId,true,whisperResp);
    }finally{ST.chat.sending=false;}
  },

  async doResponses(excludeId,skipSendingCheck,onlyCharId){
    let responders=ST.chat.characters.filter(function(c){return c.id!==excludeId&&!c.isUser;});
    if(onlyCharId){
      responders=responders.filter(function(c){return c.id===onlyCharId;});
    }
    if(!responders.length){
      Ctrl?.dlog?.('No AI characters available to respond','warn');
      return;
    }
    for(const c of responders){
      if(ST.chat.autoChatStop)break;
      if(!skipSendingCheck&&ST.chat.sending&&!ST.chat.autoChatRunning)break;
      const visible=Chat.filterVisible(ST.chat.messages,c.id);
      await Chat.genResponse(c,visible);
      if(ST.chat.autoChatStop)break;
    }
  },

  async genResponse(char,visibleMessages){
    if(!char)return;
    const tid='th-'+char.id+'-'+Date.now();
    let msgId=null;
    let reasoningInterval=null;
    let reasoningText='';
    let reasoningStartTime=0;
    let useReasoning=false;
    Chat.addThinking(tid,char);Chat.scrollEnd();
    try{
      const msgs=visibleMessages||Chat.filterVisible(ST.chat.messages,char.id);
      const sys=Ctrl.buildSysPrompt(char,ST.chat.scenario,msgs,ST.chat.rels);
      const hist=Ctrl.buildConvo(char,msgs,ST.chat.characters);
      const model=char.modelId||ST.settings.charModel||'openai-fast';
      Ctrl.dlog('Generating for '+char.name+' ('+model+')...','dinfo');
      let full='';
      msgId=uid();
      const el=Chat.createStreamEl(msgId,char);
      useReasoning=ST.settings.reasoning&&API.isReasoningModel(model);
      if(useReasoning){
        reasoningStartTime=Date.now();
        Chat.addReasoning(el,msgId);
        reasoningInterval=setInterval(function(){
          const elapsed=Math.floor((Date.now()-reasoningStartTime)/1000);
          Chat.updateReasoningTime(msgId,elapsed);
        },1000);
      }
      const tidEl=document.getElementById(tid);
      if(tidEl)tidEl.remove();
      const streamOpts={temp:0.93};
      if(useReasoning){
        streamOpts.onReasoning=function(text,done){
          if(!done&&text){
            reasoningText+=text;
            const elapsed=Math.floor((Date.now()-reasoningStartTime)/1000);
            Chat.updateReasoningContent(el,msgId,reasoningText,elapsed);
          }
        };
      }
      await API.stream([{role:'system',content:sys},...hist],model,function(chunk,done){
        full+=chunk;Chat.updateStreamEl(el,char,full,done);Chat.scrollEnd();
      },streamOpts);
      if(reasoningInterval){clearInterval(reasoningInterval);reasoningInterval=null;}
      if(useReasoning)Chat.finalizeReasoning(el,msgId);
      Chat.finalizeEl(el,msgId);
      const msg={id:msgId,scenarioId:ST.chat.scenId,charId:char.id,content:full,timestamp:Date.now(),isUser:false};
      ST.chat.messages.push(msg);
      await DB.put('messages',msg);
      const unified=ST.chat.scenario?ST.chat.scenario.unifiedMemory===true:false;
      await Ctrl.addMemory(char.id,ST.chat.scenId,'I said: "'+full.slice(0,150)+'"','witnessed',unified);
      for(const other of ST.chat.characters){
        if(other.id!==char.id){
          if(!msg.isPrivate||!msg.privateWith||msg.privateWith.indexOf(other.id)!==-1){
            await Ctrl.addMemory(other.id,ST.chat.scenId,char.name+' said: "'+full.slice(0,100)+'"','witnessed',unified);
          }
        }
      }
      ST.chat.msgSinceCtrl++;
      const freq=ST.chat.scenario?ST.chat.scenario.settings?ST.chat.scenario.settings.controllerFreq:null:null;
      const actualFreq=freq||ST.settings.ctrlFreq||10;
      if(ST.chat.msgSinceCtrl>=actualFreq){
        ST.chat.msgSinceCtrl=0;
        if(!ST.chat.controllerRunning){
          ST.chat.controllerRunning=true;
          try{
            await Ctrl.runMain(ST.chat.scenario,ST.chat.characters,ST.chat.messages,ST.chat.rels);
            await DB.put('relationships',{scenarioId:ST.chat.scenId,matrix:ST.chat.rels});
          }catch(err){
            Ctrl.dlog('Controller run failed: '+err.message,'err');
          }finally{
            ST.chat.controllerRunning=false;
          }
        }
      }
      if(ST.chat.scenario&&ST.chat.scenario.settings&&ST.chat.scenario.settings.autoImage){
        try{
          let imgPrompt='';
          try{
            const imgData=await Ctrl.genImagePrompt(msg,char,ST.chat.scenario);
            imgPrompt=(imgData&&imgData.prompt)?imgData.prompt:(char.appearance||'')+', '+full.replace(/\*[^*]+\*/g,'').replace(/"/g,'').trim().slice(0,200);
          }catch(e){
            imgPrompt=(char.appearance||'')+', '+full.replace(/\*[^*]+\*/g,'').replace(/"/g,'').trim().slice(0,200);
          }
          const imgModel=ST.settings.imgModel||'flux';
          const imgUrl=await API.generateImageUrl(imgPrompt,512,512,imgModel);
          const mb=el.querySelector('.msg-body');
          if(mb){
            const img=document.createElement('img');
            img.className='msg-img';
            img.src=imgUrl;
            img.loading='lazy';
            mb.appendChild(img);
          }
          msg.imageUrl=imgUrl;
          await DB.put('messages',msg);
        }catch(e){}
      }
      Ctrl.dlog(char.name+' responded','dok');
    }catch(err){
      if(reasoningInterval){clearInterval(reasoningInterval);reasoningInterval=null;}
      const tidEl=document.getElementById(tid);
      if(tidEl)tidEl.remove();
      if(msgId){
        const partialEl=document.getElementById('msg-'+msgId);
        if(partialEl){
          const mb=partialEl.querySelector('.msg-body');
          if(mb){
            mb.classList.remove('stream');
            if(!mb.textContent.trim())partialEl.remove();
          }
        }
      }
      Toast.e(char.name+' failed: '+err.message);
      Ctrl.dlog(char.name+' error: '+err.message,'derr');
    }
  }
};
