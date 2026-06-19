'use strict';
// ===== CHAT ENGINE — CORE =====
// Initialization, messaging, AI response generation, whisper routing
// Rendering split → chat-render.js | Session management split → chat-session.js
// Message actions (img/voice/regen/branch) in chat-actions.js
const Chat={
 // STT state (used by chat-session.js)
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
 // Auto-migrate stale/invalid modelIds to 'openai-fast'
 for(const c of chars){
 if(c.modelId&&!MODELS.find(m=>m.id===c.modelId)){
 Ctrl?.dlog?.(`Migrating ${c.name} model from '${c.modelId}' to 'openai-fast'`,'warn');
 c.modelId='openai-fast';
 await DB.put('characters',c);
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
 // Load memories – respect unified flag
 const unified = scenario.unifiedMemory === true;
 await Ctrl.loadMemories(scenId, chars, unified);
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
 // Track user's own message in their memory – respect unified flag
 const unified = ST.chat.scenario?.unifiedMemory === true;
 await Ctrl.addMemory(char.id, ST.chat.scenId, `I said: "${content.trim().slice(0,150)}"`, 'witnessed', unified);
 // Other characters witness this message (only if they can see it)
 for(const other of ST.chat.characters){
 if(other.id!==charId){
 if(!isPrivate||privateWith.includes(other.id)){
 await Ctrl.addMemory(other.id, ST.chat.scenId, `${char.name} said: "${content.trim().slice(0,100)}"`, 'witnessed', unified);
 }
 }
 }
 // FIX #1: Trigger AI responses after user message.
 // Pass true to skipSendingCheck so doResponses runs even though
 // sending is still true (it gets reset in the finally block below).
 // Pass whisperTarget so only the targeted character responds in group mode.
 const whisperResp=isPrivate&&privateWith.length?privateWith[0]:null;
 await Chat.doResponses(charId,true,whisperResp);
 }finally{ST.chat.sending=false;}
 },

 // doResponses: trigger AI character replies after a user message.
 // skipSendingCheck: when true, bypass the sending guard (used when called
 // from inside send() where sending=true but we still want responses).
 // onlyCharId: when set, ONLY this character responds (whisper routing).
 async doResponses(excludeId,skipSendingCheck=false,onlyCharId=null){
 let responders=ST.chat.characters.filter(c=>c.id!==excludeId&&!c.isUser);
 // Whisper routing: if onlyCharId is set, filter to just that character
 if(onlyCharId){
 responders=responders.filter(c=>c.id===onlyCharId);
 }
 if(!responders.length){
 Ctrl?.dlog?.('No AI characters available to respond','warn');
 return;
 }
 for(const c of responders){
 if(ST.chat.autoChatStop)break;
 // When called from send(), skipSendingCheck is true so we skip this guard.
 // When called from auto-chat (startAuto), skipSendingCheck is false and
 // the guard prevents responses during an active user send.
 if(!skipSendingCheck&&ST.chat.sending&&!ST.chat.autoChatRunning)break;
 // #12: Each character only sees messages they're allowed to see
 const visible=Chat.filterVisible(ST.chat.messages,c.id);
 await Chat.genResponse(c,visible);
 if(ST.chat.autoChatStop)break;
 }
 },

 async genResponse(char,visibleMessages){
 if(!char)return;
 const tid=`th-${char.id}-${Date.now()}`;
 let msgId=null;
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
 const tidEl=$(tid);
 if(tidEl)tidEl.remove();
 // BUG 2: Use smart scrollEnd — only scrolls if user is near bottom
 await API.stream([{role:'system',content:sys},...hist],model,(chunk,done)=>{
 full+=chunk;Chat.updateStreamEl(el,char,full,done);Chat.scrollEnd();
 },{temp:0.93});
 Chat.finalizeEl(el,msgId);
 const msg={id:msgId,scenarioId:ST.chat.scenId,charId:char.id,content:full,timestamp:Date.now(),isUser:false};
 ST.chat.messages.push(msg);
 await DB.put('messages',msg);
 // Track this character's memory of what they said – respect unified flag
 const unified = ST.chat.scenario?.unifiedMemory === true;
 await Ctrl.addMemory(char.id, ST.chat.scenId, `I said: "${full.slice(0,150)}"`, 'witnessed', unified);
 // Track other characters witnessing this message
 for(const other of ST.chat.characters){
 if(other.id!==char.id){
 if(!msg.isPrivate||!msg.privateWith||msg.privateWith.includes(other.id)){
 await Ctrl.addMemory(other.id, ST.chat.scenId, `${char.name} said: "${full.slice(0,100)}"`, 'witnessed', unified);
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
 const imgModel = ST.settings.imgModel || 'flux';
 const imgUrl = await API.generateImageUrl(imgPrompt, 512, 512, imgModel);
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
 }
};
