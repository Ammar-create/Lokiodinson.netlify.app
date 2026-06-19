'use strict';
// ===== CHAT ENGINE — CORE =====
// Initialization, messaging, AI response generation, whisper routing
// Rendering split → chat-render.js | Session management split → chat-session.js
// Message actions (img/voice/regen/branch) in chat-actions.js
const Chat={
 _sttRecorder:null,
 _sttChunks:[],
 _sttStream:null,

 filterVisible(messages,charId){
 return messages.filter(m=>{
 if(m.isPrivate){
 if(m.privateWith&&m.privateWith.length)return m.charId===charId||m.privateWith.includes(charId);
 return m.charId===charId;
 }
 return true;
 });
 },

 async init(scenId){
 if(ST.chat.autoChatRunning){Chat.stopAuto();await new Promise(r=>setTimeout(r,200));}
 ST.chat.genToken=(ST.chat.genToken||0)+1;
 ST.chat.generating=false;
 ST.chat.generatingChars={};
 await Chat.cleanupOrphans();
 const scenario=await DB.get('scenarios',scenId);
 if(!scenario){Toast.e('Scenario not found');return;}
 const chars=[];
 for(const cid of scenario.characterIds||[]){
 const c=await DB.get('characters',cid);
 if(c){chars.push({...c,emotionalState:c.emotionalState||'neutral',moodNotes:c.moodNotes||'',systemInjection:c.systemInjection||''});}
 }
 for(const c of chars){
 if(c.modelId&&!MODELS.find(m=>m.id===c.modelId)){
 Ctrl?.dlog?.(`Migrating ${c.name} model from '${c.modelId}' to 'openai-fast'`,'warn');
 c.modelId='openai-fast';
 await DB.put('characters',c);
 }
 }
 let msgs=await DB.getByIndex('messages','scenarioId',scenId);
 msgs.sort((a,b)=>a.timestamp-b.timestamp);
 if(!msgs.length&&scenario.openingMessage){
 const openingMsg={id:'opening-'+scenId,scenarioId:scenId,charId:'narrator',content:scenario.openingMessage,timestamp:Date.now(),isUser:false};
 msgs.push(openingMsg);
 await DB.put('messages',openingMsg);
 }
 const relData=await DB.get('relationships',scenId);
 const allChars=await DB.getAll('characters');
 const userChar=allChars.find(c=>c.isUser);
 const unified=scenario.unifiedMemory===true;
 await Ctrl.loadMemories(scenId,chars,unified);
 ST.chat={
 ...ST.chat,scenId,scenario,characters:chars,messages:msgs,rels:relData?.matrix||{},
 activeCharId:userChar?.id||chars[0]?.id||null,
 autoChatRunning:false,autoChatStop:false,msgSinceCtrl:0,
 panelOpen:window.innerWidth>700,panelTab:'directive',
 directive:{next:'',details:''},debugLog:[],
 sending:false,controllerRunning:false,generating:false,generatingChars:{},
 sttRecording:false,whisper:false,whisperWith:[],whisperTarget:null,
 };
 Router.go('chat');
 },

 async send(content,charId,isPrivate=false,privateWith=[]){
 if(!content.trim())return;
 if(ST.chat.sending||ST.chat.generating){Toast.w('Please wait — still processing...');return;}
 ST.chat.sending=true;
 try{
 const char=ST.chat.characters.find(c=>c.id===charId);if(!char)return;
 const msg={id:uid(),scenarioId:ST.chat.scenId,charId,content:content.trim(),timestamp:Date.now(),isUser:!!char.isUser};
 if(isPrivate){msg.isPrivate=true;msg.privateWith=privateWith;}
 ST.chat.messages.push(msg);
 await DB.put('messages',msg);
 Chat.renderMsg(msg,char,true);
 Chat.scrollEnd();
 const unified=ST.chat.scenario?.unifiedMemory===true;
 await Ctrl.addMemory(char.id,ST.chat.scenId,`I said: "${content.trim().slice(0,150)}"`,'witnessed',unified);
 for(const other of ST.chat.characters){
 if(other.id!==charId){
 if(!isPrivate||privateWith.includes(other.id))await Ctrl.addMemory(other.id,ST.chat.scenId,`${char.name} said: "${content.trim().slice(0,100)}"`,'witnessed',unified);
 }
 }
 const whisperResp=isPrivate&&privateWith.length?privateWith[0]:null;
 await Chat.doResponses(charId,true,whisperResp);
 }finally{ST.chat.sending=false;}
 },

 async doResponses(excludeId,skipSendingCheck=false,onlyCharId=null){
 let responders=ST.chat.characters.filter(c=>c.id!==excludeId&&!c.isUser);
 if(onlyCharId)responders=responders.filter(c=>c.id===onlyCharId);
 responders=[...new Map(responders.map(c=>[c.id,c])).values()];
 if(!responders.length){Ctrl?.dlog?.('No AI characters available to respond','warn');return;}
 for(const c of responders){
 if(ST.chat.autoChatStop)break;
 if(ST.chat.generatingChars?.[c.id]){Ctrl?.dlog?.(`Skipped duplicate response for ${c.name}`,'warn');continue;}
 if(!skipSendingCheck&&ST.chat.sending&&!ST.chat.autoChatRunning)break;
 const visible=Chat.filterVisible(ST.chat.messages,c.id);
 await Chat.genResponse(c,visible);
 if(ST.chat.autoChatStop)break;
 }
 },

 async genResponse(char,visibleMessages){
 if(!char)return;
 if(!ST.chat.generatingChars)ST.chat.generatingChars={};
 if(ST.chat.generatingChars[char.id]){
 Ctrl?.dlog?.(`Blocked duplicate generation for ${char.name}`,'warn');
 return;
 }
 const _genToken=ST.chat.genToken||0;
 ST.chat.generatingChars[char.id]=true;
 ST.chat.generating=true;
 Chat.cleanupCharOrphans(char.id);
 const tid=`th-${char.id}-${Date.now()}`;
 let msgId=null;
 Chat.addThinking(tid,char);Chat.scrollEnd();
 try{
 const msgs=visibleMessages||Chat.filterVisible(ST.chat.messages,char.id);
 const sys=Ctrl.buildSysPrompt(char,ST.chat.scenario,msgs,ST.chat.rels);
 const hist=Ctrl.buildConvo(char,msgs,ST.chat.characters);
 const model=char.modelId||ST.settings.charModel||'openai-fast';
 Ctrl.dlog(`Generating for ${char.name} (${model})...`,'dinfo');
 let full='';
 msgId=uid();
 const el=Chat.createStreamEl(msgId,char);
 if(el)el.dataset.streamChar=char.id;
 // BUGFIX: $(tid) without # prefix was searching for a non-existent <th-...> tag
 // It must be #${tid} to match the element's id attribute
 const tidEl=$('#'+tid);if(tidEl)tidEl.remove();
 await API.stream([{role:'system',content:sys},...hist],model,(chunk,done)=>{
 if(ST.chat.genToken!==_genToken)return;
 full+=chunk;Chat.updateStreamEl(el,char,full,done);Chat.scrollEnd();
 },{temp:0.93});
 if(ST.chat.genToken!==_genToken){Ctrl?.dlog?.(`Generation for ${char.name} aborted (session changed during stream)`,'warn');return;}
 Chat.finalizeEl(el,msgId);
 const msg={id:msgId,scenarioId:ST.chat.scenId,charId:char.id,content:full,timestamp:Date.now(),isUser:false};
 ST.chat.messages.push(msg);
 await DB.put('messages',msg);
 const unified=ST.chat.scenario?.unifiedMemory===true;
 await Ctrl.addMemory(char.id,ST.chat.scenId,`I said: "${full.slice(0,150)}"`,'witnessed',unified);
 for(const other of ST.chat.characters){
 if(other.id!==char.id){
 if(!msg.isPrivate||!msg.privateWith||msg.privateWith.includes(other.id))await Ctrl.addMemory(other.id,ST.chat.scenId,`${char.name} said: "${full.slice(0,100)}"`,'witnessed',unified);
 }
 }
 ST.chat.msgSinceCtrl++;
 const freq=ST.chat.scenario?.settings?.controllerFreq||ST.settings.ctrlFreq||10;
 if(ST.chat.msgSinceCtrl>=freq){
 ST.chat.msgSinceCtrl=0;
 if(!ST.chat.controllerRunning){
 ST.chat.controllerRunning=true;
 try{await Ctrl.runMain(ST.chat.scenario,ST.chat.characters,ST.chat.messages,ST.chat.rels);await DB.put('relationships',{scenarioId:ST.chat.scenId,matrix:ST.chat.rels});}
 catch(err){Ctrl.dlog(`Controller run failed: ${err.message}`,'err');}
 finally{ST.chat.controllerRunning=false;}
 }
 }
 if(ST.chat.scenario?.settings?.autoImage){
 try{
 let imgPrompt;
 try{const imgData=await Ctrl.genImagePrompt(msg,char,ST.chat.scenario);imgPrompt=imgData?.prompt||`${char.appearance||''}, ${full.replace(/\*[^*]+\*/g,'').replace(/\"[^\"]+\"/g,'').trim().slice(0,200)}`;}
 catch{imgPrompt=`${char.appearance||''}, ${full.replace(/\*[^*]+\*/g,'').replace(/\"[^\"]+\"/g,'').trim().slice(0,200)}`;}
 const imgModel=ST.settings.imgModel||'flux';
 const imgUrl=await API.generateImageUrl(imgPrompt,512,512,imgModel);
 const mb=el.querySelector('.msg-body');
 if(mb){const img=document.createElement('img');img.className='msg-img';img.src=imgUrl;img.loading='lazy';mb.appendChild(img);}
 msg.imageUrl=imgUrl;
 await DB.put('messages',msg);
 }catch{}
 }
 Ctrl.dlog(`${char.name} responded`,'dok');
 }catch(err){
 $(`#${tid}`)?.remove();
 if(msgId){
 const partialEl=$(`#msg-${msgId}`);
 if(partialEl){
 const mb=partialEl.querySelector('.msg-body');
 if(mb){mb.classList.remove('stream');if(!mb.textContent.trim())partialEl.remove();}
 }
 }
 Toast.e(`${char.name} failed: ${err.message}`);
 Ctrl.dlog(`${char.name} error: ${err.message}`,'derr');
 }finally{
 if(ST.chat.genToken===_genToken){
 delete ST.chat.generatingChars[char.id];
 ST.chat.generating=Object.keys(ST.chat.generatingChars||{}).length>0;
 }
 }
 },

 cleanupCharOrphans(charId){
 $$(`[id^="th-${charId}-"]`).forEach(el=>el.remove());
 $$(`[data-stream-char="${CSS.escape(charId)}"]`).forEach(el=>{
 const mb=el.querySelector('.msg-body');
 if(mb&&mb.classList.contains('stream')&&!mb.textContent.trim())el.remove();
 });
 },

 async cleanupOrphans(){
 $$('[id^="th-"]').forEach(el=>el.remove());
 $$('.msg .msg-body.stream').forEach(mb=>{if(!mb.textContent.trim())mb.closest('.msg')?.remove();});
 }
};