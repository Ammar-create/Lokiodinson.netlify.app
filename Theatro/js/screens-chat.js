'use strict';
// ===== SCREENS-CHAT =====
// Extends Scr with chat screen methods (loaded after screens.js)
Object.assign(Scr,{

 // --- CHAT ---
 async chat(){
 const el=$('#screen-chat');if(!el)return;
 const{scenario,characters,messages,panelOpen}=ST.chat;if(!scenario)return;
 const userChar=characters.find(c=>c.isUser)||characters[0];
 // BUG 24: Ensure whisperTarget exists (defensive — also set in Chat.init)
 if(ST.chat.whisperTarget===undefined)ST.chat.whisperTarget=null;
 // BUG 25: Dynamic layout class — 1-2 chars = DM, 3+ = group
 const layoutClass=characters.length<=2?'dm-mode':'group-mode';
 el.innerHTML=`<div class="chat-main ${layoutClass}">
 <div class="chat-hdr">
 <div style="display:flex;margin-right:4px">
 ${characters.slice(0,5).map(c=>`<div title="${esc(c.name)}" style="width:24px;height:24px;border-radius:50%;background:${c.color}22;border:2px solid ${c.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;font-family:var(--fd);color:${c.color};margin-left:-4px;overflow:hidden;flex-shrink:0">${c.avatar?`<img src="${esc(c.avatar)}" style="width:100%;height:100%;object-fit:cover">`:c.name[0]}</div>`).join('')}
 </div>
 <!-- BUG 27: Show scenario name as primary, lore as subtitle -->
 <div style="flex:1;min-width:0;display:flex;flex-direction:column">
 <span class="chat-title">${esc(scenario.name||'Untitled Scenario')}</span>
 ${scenario.lore?`<span style="font-size:11px;color:var(--tmut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(scenario.lore.slice(0,60))}${scenario.lore.length>60?'…':''}</span>`:''}
 </div>
 <!-- Mobile: Panel trigger button (visible only on mobile via CSS) -->
 <button class="ibtn panel-trigger-btn" title="Directive Panel" onclick="Scr.openMobilePanel()" style="flex-shrink:0">${I('panel',15)}</button>
 <button class="ibtn" title="Run Controller Now" onclick="Scr.runCtrl()" style="margin-left:auto;flex-shrink:0">${I('ctrl',15)}</button>
 </div>
 <div id="chat-log" class="chat-log"></div>
 <div class="chat-input-area">
 <!-- BUG 24: Whisper indicator bar (hidden by default) -->
 <div class="whisper-indicator" id="whisper-bar" style="display:none"></div>
 <div class="input-row">
 <div class="input-char-btn" id="char-av-btn" onclick="Scr.openCharPicker()" title="Switch character">
 ${userChar?.avatar?`<img src="${esc(userChar.avatar)}" style="width:100%;height:100%;object-fit:cover">`:
 `<span style="color:${userChar?.color||'var(--gold)'};font-family:var(--fd);font-size:11px">${(userChar?.name||'?')[0]}</span>`}
 </div>
 <textarea id="chat-ta" placeholder='Write as ${esc(userChar?.name||"your character") }... (*action* and "dialogue")' rows="1"
 oninput="Scr.taResize(this)" onkeydown="Scr.taKey(event)"></textarea>
 <div class="input-btns">
 <!-- BUG 24+4: Whisper (private message) button — added id="whisper-btn" -->
 <button class="ibtn" id="whisper-btn" title="Whisper (Private Message)" onclick="Scr.openWhisperPicker()">${I('lock',15)}</button>
 <button class="ibtn" id="improve-btn" title="Auto-Improve" onclick="Scr.improve()">${I('improve',15)}</button>
 <button class="ibtn" id="mic-btn" title="Voice input (Whisper)" onclick="Chat.toggleSTT()">${I('mic',15)}</button>
 <button class="ibtn on" title="Send (Enter)" onclick="Scr.sendMsg()" style="color:var(--gold);border-color:var(--gdim)">${I('send',15)}</button>
 </div>
 </div>
 <div class="input-sub-row">
 <button class="btn bs bsm" id="auto-btn" onclick="Scr.toggleAuto()">${I('play',13)} Auto</button>
 <div id="cpill"></div>
 </div>
 </div>
 </div>
 <!-- Mobile panel backdrop (hidden on desktop via CSS) -->
 <div class="panel-backdrop" id="panel-backdrop" onclick="Scr.closeMobilePanel()"></div>
 <div class="spanel ${panelOpen?'':'collapsed'}" id="spanel">
 <div class="ptoggle" onclick="Scr.togPanel()">${I('panel',14)}</div>
 <!-- Mobile close button (hidden on desktop via CSS) -->
 <button class="panel-close" onclick="Scr.closeMobilePanel()">✕</button>
 <div class="ptabs">
 ${['directive','memory','rels','cast','debug'].map(t=>`<button class="ptab ${ST.chat.panelTab===t?'on':''}" onclick="Scr.setPTab('${t}')">${t==='directive'?'Directive':t==='memory'?'Memory':t==='rels'?'Relations':t==='cast'?'Cast':'Debug'}</button>`).join('')}
 </div>
 <div class="pcontent">
 <div class="p-sec ${ST.chat.panelTab==='directive'?'on':''}" id="pt-directive">
 <div><div class="plbl">${I('target',13)} What Happens Next</div><textarea rows="3" placeholder="What should happen in the next few messages..." style="font-size:12px" oninput="ST.chat.directive.next=this.value">${esc(ST.chat.directive.next)}</textarea></div>
 <div><div class="plbl">${I('memo',13)} Style Notes</div><textarea rows="3" placeholder="Writing style, tone, things to avoid..." style="font-size:12px" oninput="ST.chat.directive.details=this.value">${esc(ST.chat.directive.details)}</textarea></div>
 <button class="btn bp bsm" onclick="Scr.runCtrl()" style="align-self:flex-start">${I('ctrl',12)} Apply to Controller</button>
 </div>
 <div class="p-sec ${ST.chat.panelTab==='memory'?'on':''}" id="pt-memory">
 <div class="plbl">${I('scroll',13)} Story Summary</div>
 <div id="panel-memory" style="font-size:12px;color:var(--tdim);line-height:1.6;background:var(--s2);padding:10px;border-radius:var(--r);min-height:60px">${esc(scenario.summary||'No summary yet — generated after first controller analysis.')}</div>
 </div>
 <div class="p-sec ${ST.chat.panelTab==='rels'?'on':''}" id="pt-rels">
 <div class="plbl">${I('hearts',13)} Relationship Matrix</div>
 <div id="rel-container"><p style="color:var(--tmut);font-size:12px">Relationships appear after controller analysis.</p></div>
 </div>
 <div class="p-sec ${ST.chat.panelTab==='cast'?'on':''}" id="pt-cast">
 <div class="plbl">${I('people',13)} Active Cast</div>
 <div id="active-chars-list"></div>
 </div>
 <div class="p-sec ${ST.chat.panelTab==='debug'?'on':''}" id="pt-debug">
 <div class="plbl">${I('bug',13)} Debug Console</div>
 <div class="debug-area" id="debug-area">Theatro Debug Console\nReady.\n</div>
 <button class="btn bg bsm" onclick="const d=$('#debug-area');if(d)d.innerHTML=''">Clear</button>
 </div>
 </div>
 </div>`;

 // BUG 28: Opening message is now persisted to IndexedDB in Chat.init,
 // so it arrives in the messages array — no special DOM-only rendering needed.
 // Render existing messages (including persisted opening message)
 for(const msg of messages){
 const char=characters.find(c=>c.id===msg.charId)||{id:'narrator',name:'Narrator',color:'#8b7355',isUser:false};
 Chat.renderMsg(msg,char,true);
 }
 Chat.scrollEnd();
 // Auto-dismiss scroll-to-bottom button when user scrolls near bottom
 const chatLog=$('#chat-log');
 if(chatLog){
 chatLog.addEventListener('scroll',function(){
 if(Chat._nearBottom()){
 $('#scroll-bottom-btn')?.remove();
 }
 });
 }
 Chat.renderCast();
 Chat.renderRels();
 Scr.updateCPill();
 // BUG 24: Initialize whisper bar state
 Scr.updateWhisperBar();
 },

 // BUG 24: Update whisper indicator bar visibility + content
 updateWhisperBar(){
 const bar=$('#whisper-bar');if(!bar)return;
 if(!ST.chat.whisperTarget){bar.style.display='none';return;}
 const char=ST.chat.characters.find(c=>c.id===ST.chat.whisperTarget);
 if(!char){bar.style.display='none';return;}
 bar.style.display='flex';
 bar.innerHTML=`${I('lock',13)} Whisper to ${esc(char.name)} <span class="whisper-x" onclick="ST.chat.whisperTarget=null;Scr.updateWhisperBar()">×</span>`;
 },

 // BUG 24: Open whisper target picker modal
 openWhisperPicker(){
 const chars=ST.chat.characters.filter(c=>c.id!==ST.chat.activeCharId);
 if(!chars.length){Toast.w('No other characters to whisper to');return;}
 Modal.open({
 title:'Whisper To',narrow:true,
 content:`<div class="mlist">
 <div class="mopt ${!ST.chat.whisperTarget?'sel':''}" onclick="ST.chat.whisperTarget=null;Scr.updateWhisperBar();Modal.close()">
 <div><div style="font-weight:600">${I('globe',13)} Public</div><div style="font-size:11px;color:var(--tmut)">Everyone can see this message</div></div>
 ${!ST.chat.whisperTarget?'<span style="color:var(--gold)">✓</span>':''}
 </div>
 ${chars.map(c=>`<div class="mopt ${ST.chat.whisperTarget===c.id?'sel':''}" onclick="ST.chat.whisperTarget='${c.id}';Scr.updateWhisperBar();Modal.close()">
 <div style="display:flex;align-items:center;gap:8px">${Chat.avHtml(c,22)}<div><div style="font-weight:600;color:${c.color}">${esc(c.name)}</div></div></div>
 ${ST.chat.whisperTarget===c.id?'<span style="color:var(--gold)">✓</span>':''}
 </div>`).join('')}
 </div>`
 });
 },

 updateCPill(){
 const el=$('#cpill');if(!el)return;
 const char=ST.chat.characters.find(c=>c.id===ST.chat.activeCharId);if(!char)return;
 el.innerHTML=`<div class="char-pill" onclick="Scr.openCharPicker()"><div class="dot" style="background:${esc(char.color)}"></div>Playing as <strong style="color:${esc(char.color)}">${esc(char.name)}</strong><span class="arr">▼</span></div>`;
 },
 openCharPicker(){
 const chars=ST.chat.characters;
 Modal.open({title:'Play As Character',narrow:true,content:()=>`<div class="mlist">${
 chars.map(c=>`<div class="mopt ${c.id===ST.chat.activeCharId?'sel':''}" onclick="Scr.selectChar('${c.id}')">
 <div style="display:flex;align-items:center;gap:8px">${Chat.avHtml(c,22)}<span style="color:${esc(c.color)};font-weight:600">${esc(c.name)}</span>${c.isUser?'<span class="pill g" style="font-size:10px">You</span>':''}</div>
 ${c.id===ST.chat.activeCharId?'<span style="color:var(--gold)">✓</span>':''}
 </div>`).join('')}
 </div>`});
 },
 selectChar(cid){
 ST.chat.activeCharId=cid;Modal.close();Scr.updateCPill();
 const char=ST.chat.characters.find(c=>c.id===cid);
 if(char){
 const ta=$('#chat-ta');if(ta)ta.placeholder=`Write as ${char.name}... (*action* and "dialogue")`;
 const avb=$('#char-av-btn');
 if(avb)avb.innerHTML=char.avatar?`<img src="${esc(char.avatar)}" style="width:100%;height:100%;object-fit:cover">`:`<span style="color:${char.color};font-family:var(--fd);font-size:11px">${char.name[0]}</span>`;
 }
 },
 taResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,110)+'px'},
 taKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();Scr.sendMsg();}},
 // BUG 24: Modified sendMsg — supports whisperTarget for private messages
 async sendMsg(){
 const ta=$('#chat-ta');if(!ta)return;
 const content=ta.value.trim();if(!content)return;
 ta.value='';ta.style.height='auto';
 const isPrivate=!!ST.chat.whisperTarget;
 const privateWith=isPrivate?[ST.chat.whisperTarget]:[];
 await Chat.send(content,ST.chat.activeCharId,isPrivate,privateWith);
 // BUG 24: Clear whisper target after sending
 if(isPrivate){ST.chat.whisperTarget=null;Scr.updateWhisperBar();}
 },
 setPTab(tab){
 ST.chat.panelTab=tab;
 $$('.ptab').forEach(t=>t.classList.toggle('on',t.getAttribute('onclick')?.includes(`'${tab}'`)));
 $$('.p-sec').forEach(s=>s.classList.remove('on'));
 $(`#pt-${tab}`)?.classList.add('on');
 },

 // Panel toggle — on desktop this is a no-op (panel always open); on mobile it slides overlay
 togPanel(){
 ST.chat.panelOpen=!ST.chat.panelOpen;
 $('#spanel')?.classList.toggle('collapsed',!ST.chat.panelOpen);
 if(window.innerWidth<=700){
 $('#panel-backdrop')?.classList.toggle('show',ST.chat.panelOpen);
 }
 },

 // Mobile-specific: open the directive panel overlay
 openMobilePanel(){
 ST.chat.panelOpen=true;
 $('#spanel')?.classList.remove('collapsed');
 $('#panel-backdrop')?.classList.add('show');
 },

 // Mobile-specific: close the directive panel overlay
 closeMobilePanel(){
 ST.chat.panelOpen=false;
 $('#spanel')?.classList.add('collapsed');
 $('#panel-backdrop')?.classList.remove('show');
 },

 toggleAuto(){if(ST.chat.autoChatRunning)Chat.stopAuto();else Chat.startAuto()},
 async runCtrl(){
 Toast.i('Running Main Controller...');
 const r=await Ctrl.runMain(ST.chat.scenario,ST.chat.characters,ST.chat.messages,ST.chat.rels);
 if(r){await DB.put('relationships',{scenarioId:ST.chat.scenId,matrix:ST.chat.rels});Toast.s('Analysis complete');}
 else Toast.e('Controller failed');
 },
 async improve(){
 const char=ST.chat.characters.find(c=>c.id===ST.chat.activeCharId);if(!char)return;
 const btn=$('#improve-btn');if(btn){btn.disabled=true;btn.innerHTML=`<div class="spinner" style="width:14px;height:14px"></div>`;}
 try{
 const text=await Ctrl.autoImprove(char,ST.chat.scenario,ST.chat.messages);
 if(text){
 const ta=$('#chat-ta');if(ta&&!ta.value){ta.value=text;Scr.taResize(ta);ta.focus();}
 }
 Toast.i('Suggestion ready — edit then send');
 }catch(err){Toast.e('Auto-improve failed: '+err.message);}
 finally{const b=$('#improve-btn');if(b){b.disabled=false;b.innerHTML=I('improve',15);}}
 }
});
