'use strict';
// ===== CHAT ENGINE — RENDERING =====
// Message rendering, streaming elements, scroll management, avatars, panels
// Depends on: Chat (from chat-core.js), ST, DB, I, esc, parseRP, fmtT
Object.assign(Chat,{
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
 <div class="msg-body" style="--mc:${esc(char.color)}">${parseRP(msg.content,char.color)}${msg.imageUrl?`<img class="msg-img" src="${esc(msg.imageUrl)}" loading="lazy">`:''}${msg.audioUrl?Chat._audioPlayerHtml(msg.audioUrl):''}</div>`;
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
 scrollEnd(force){
 const l=$('#chat-log');
 if(!l)return;
 if(force||Chat._nearBottom()){
 l.scrollTop=l.scrollHeight;
 $('#scroll-bottom-btn')?.remove();
 }else{
 Chat._showScrollBtn();
 }
 },
 _nearBottom(){
 const l=$('#chat-log');
 if(!l)return true;
 return(l.scrollHeight-l.scrollTop-l.clientHeight)<=200;
 },
 _showScrollBtn(){
 let btn=$('#scroll-bottom-btn');
 if(btn)return;
 const log=$('#chat-log');if(!log)return;
 btn=document.createElement('button');
 btn.id='scroll-bottom-btn';
 btn.className='scroll-bottom-btn';
 btn.innerHTML='↓ New messages';
 btn.onclick=function(){Chat.scrollEnd(true);};
 log.parentElement.style.position='relative';
 log.parentElement.appendChild(btn);
 },
 avHtml(char,sz=26){
 const st=`width:${sz}px;height:${sz}px;background:${char.color}22;border:2px solid ${char.color};`;
 if(char.avatar)return`<div class="msg-av" style="${st}"><img src="${esc(char.avatar)}" style="width:100%;height:100%;object-fit:cover"></div>`;
 return`<div class="msg-av" style="${st};color:${char.color};font-size:${Math.floor(sz*.4)}px">${char.name[0].toUpperCase()}</div>`;
 },
 _audioPlayerHtml(src) {
 const id = 'ap-' + uid();
 return `<div class="audio-player" id="${id}" data-src="${esc(src)}">
 <button class="ap-play" onclick="Chat._apToggle('${id}')">▶</button>
 <div class="ap-bar" onclick="Chat._apSeek(event, '${id}')">
 <div class="ap-fill"></div>
 </div>
 <span class="ap-time">0:00</span>
 </div>`;
 },
 _apToggle(playerId) {
 const el = document.getElementById(playerId);
 if (!el) return;
 let audio = el._audio;
 if (!audio) {
 audio = new Audio(el.dataset.src);
 el._audio = audio;
 audio.ontimeupdate = function() {
 const fill = el.querySelector('.ap-fill');
 const time = el.querySelector('.ap-time');
 if (fill) fill.style.width = (audio.currentTime / audio.duration * 100 || 0) + '%';
 if (time) time.textContent = Chat._fmtAudioTime(audio.currentTime);
 };
 audio.onended = function() {
 const btn = el.querySelector('.ap-play');
 if (btn) btn.textContent = '▶';
 const fill = el.querySelector('.ap-fill');
 if (fill) fill.style.width = '0%';
 };
 }
 if (audio.paused) {
 document.querySelectorAll('.audio-player').forEach(function(p) {
 if (p.id !== playerId && p._audio && !p._audio.paused) {
 p.pause();
 const btn = p.querySelector('.ap-play');
 if (btn) btn.textContent = '▶';
 }
 });
 audio.play();
 el.querySelector('.ap-play').textContent = '⏸';
 } else {
 audio.pause();
 el.querySelector('.ap-play').textContent = '▶';
 }
 },
 _apSeek(event, playerId) {
 const el = document.getElementById(playerId);
 if (!el || !el._audio || !el._audio.duration) return;
 const bar = event.currentTarget;
 const rect = bar.getBoundingClientRect();
 const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
 el._audio.currentTime = pct * el._audio.duration;
 },
 _fmtAudioTime(sec) {
 if (!sec || isNaN(sec)) return '0:00';
 const m = Math.floor(sec / 60);
 const s = Math.floor(sec % 60);
 return m + ':' + (s < 10 ? '0' : '') + s;
 },
 renderRels(){
 const c=$('#rel-container');if(!c)return;
 const entries=Object.values(ST.chat.rels);
 if(!entries.length){c.innerHTML='<p style="color:var(--tmut);font-size:12px">No relationships tracked yet.</p>';return;}
 c.innerHTML=entries.map(function(r){
 return'<div class="rel-entry">\n <div class="rel-chars">'+esc(r.fromName||r.fromId)+' → '+esc(r.toName||r.toId)+'</div>\n <div style="display:flex;align-items:center;gap:8px">\n <span class="rmood '+(r.mood==='positive'||r.mood==='romantic'?(r.mood==='romantic'?'rom':'pos'):(r.mood==='negative'?'neg':'neu'))+'">'+esc(r.mood||'neutral')+'</span>\n <span style="font-size:11px;color:var(--tmut)">'+(r.intensity||5)+'/10</span>\n </div>\n <div class="rel-reason">'+esc(r.reason||'')+'</div>\n </div>';
 }).join('');
 },
 renderCast(){
 const c=$('#active-chars-list');if(!c)return;
 c.innerHTML=ST.chat.characters.map(function(ch){
 return'<div class="act-char-row">'+Chat.avHtml(ch,24)+
 '<div style="flex:1"><div style="font-size:12px;color:'+esc(ch.color)+';font-weight:600">'+esc(ch.name)+'</div>\n <div style="font-size:11px;color:var(--tmut)">'+esc(ch.emotionalState||'neutral')+'</div></div>\n '+(ch.isUser?'<span class="pill g" style="font-size:10px">You</span>':'')+
 ' </div>';
 }).join('');
 }
});
