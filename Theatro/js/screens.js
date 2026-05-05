'use strict';
// ===== SCREENS =====
const Scr={
  async render(screen){
    if(screen==='dashboard')await Scr.dashboard();
    else if(screen==='char-create')await Scr.charCreate();
    else if(screen==='scenario-create')await Scr.scenCreate();
    else if(screen==='chat')await Scr.chat();
    else if(screen==='settings')await Scr.settings();
  },

  // --- DASHBOARD ---
  async dashboard(){
    const el=$('#screen-dashboard');if(!el)return;
    const chars=await DB.getAll('characters');
    const scens=await DB.getAll('scenarios');
    const tab=ST.dashTab||'scenarios';
    el.innerHTML=`<div class="dash-tabs">
      <button class="dtab ${tab==='scenarios'?'on':''}" onclick="ST.dashTab='scenarios';Scr.dashboard()">${I('film',12)} Scenarios (${scens.length})</button>
      <button class="dtab ${tab==='characters'?'on':''}" onclick="ST.dashTab='characters';Scr.dashboard()">${I('user',12)} Characters (${chars.length})</button>
    </div>
    <div class="dash-body">${tab==='scenarios'?Scr.scenHtml(scens,chars):Scr.charHtml(chars)}</div>`;
  },

  scenHtml(scens,chars){
    if(!scens.length)return`<div class="empty"><div class="empty-ico">🎭</div><div class="empty-t">No Scenarios Yet</div><div class="empty-d">Create your first scenario to begin</div><button class="btn bp" onclick="Scr.newScenario()">${I('plus',14)} Create Scenario</button></div>`;
    return`<div class="sec-hdr"><span class="sec-title">Your Scenarios</span></div><div class="cards">${
      scens.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(s=>{
        const sc=(s.characterIds||[]).map(id=>chars.find(c=>c.id===id)).filter(Boolean);
        return`<div class="scard" onclick="Chat.init('${s.id}')">
          <div class="scard-name">${esc(s.name)}${s.parentId?` <span class="tag g">Branch</span>`:''}</div>
          <div class="scard-lore">${esc(s.lore||'No lore defined')}</div>
          <div class="scard-chars">${sc.slice(0,7).map(c=>`<div class="mav" style="background:${c.color}22;border:2px solid ${c.color};color:${c.color}">${c.avatar?`<img src="${esc(c.avatar)}" style="width:100%;height:100%;object-fit:cover">`:c.name[0]}</div>`).join('')}${sc.length>7?`<div class="mav">+${sc.length-7}</div>`:''}</div>
          <div class="scard-meta"><span>${sc.length} character${sc.length!==1?'s':''}</span><span>${s.updatedAt?fmtD(s.updatedAt):'New'}</span></div>
          <div class="scard-foot">
            <button class="btn bg bsm" onclick="event.stopPropagation();Scr.editScen('${s.id}')">${I('edit',12)}</button>
            <button class="btn bd bsm" onclick="event.stopPropagation();Scr.delScen('${s.id}')">${I('trash',12)}</button>
            <button class="btn bp bsm" onclick="event.stopPropagation();Chat.init('${s.id}')">${I('play',12)} Open</button>
          </div>
        </div>`;
      }).join('')
    }</div>`;
  },

  charHtml(chars){
    if(!chars.length)return`<div class="empty"><div class="empty-ico">🎪</div><div class="empty-t">No Characters Yet</div><div class="empty-d">Create characters to cast in your scenarios</div><button class="btn bp" onclick="Scr.newChar()">${I('plus',14)} Create Character</button></div>`;
    return`<div class="sec-hdr"><span class="sec-title">Your Characters</span></div><div class="cards">${
      chars.map(c=>`<div class="ccard" style="--cc:${c.color}">
        <div class="ccard-top">
          <div class="cav" style="border-color:${c.color};background:${c.color}22;color:${c.color}">${c.avatar?`<img src="${esc(c.avatar)}">`:c.name[0]}</div>
          <div style="flex:1;min-width:0">
            <div class="ccard-name">${esc(c.name)}</div>
            <div class="ccard-sub">${esc(c.modelId||'llama-scout')} · ${esc(c.voice||'nova')}</div>
          </div>
          ${c.isUser?'<span class="pill g" style="margin-left:auto;font-size:10px">You</span>':''}
        </div>
        <div class="ccard-desc">${esc(c.personality||'No personality defined')}</div>
        <div class="ccard-foot">
          <button class="btn bg bsm" onclick="Scr.editChar('${c.id}')">${I('edit',12)}</button>
          <button class="btn bd bsm" onclick="Scr.delChar('${c.id}')">${I('trash',12)}</button>
        </div>
      </div>`).join('')
    }</div>`;
  },

  // --- CHAR CREATE ---
  newChar(){
    ST.editCharId=null;
    ST.charForm={name:'',color:COLORS[0],personality:'',appearance:'',modelId:ST.settings.charModel||'llama-scout',voice:'nova',avatar:'',isUser:false};
    Router.go('char-create');
  },
  async editChar(id){
    const c=await DB.get('characters',id);if(!c)return;
    ST.editCharId=id;ST.charForm={...c};Router.go('char-create');
  },
  async delChar(id){
    const ok=await Modal.confirm('Delete this character?',{ok:'Delete',danger:true});if(!ok)return;
    await DB.del('characters',id);Toast.s('Character deleted');Scr.dashboard();
  },
  async charCreate(){
    const el=$('#screen-char-create');if(!el)return;
    const f=ST.charForm;const isEdit=!!ST.editCharId;
    el.innerHTML=`<div class="create-wrap">
      <div class="create-hdr">
        <button class="ibtn" onclick="Router.go('dashboard')">${I('back',16)}</button>
        <h1 class="create-title">${isEdit?'Edit Character':'New Character'}</h1>
        <div style="margin-left:auto"><button class="btn bs bsm" id="auto-gen-btn" onclick="Scr.autoGenChar()">${I('magic',13)} Auto-Create</button></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:16px">
        <div>
          <div class="lbl" style="margin-bottom:6px">Avatar</div>
          <div class="av-uploader" id="av-drop" onclick="Scr.trigAvatar()">${f.avatar?`<img src="${esc(f.avatar)}">`:`${I('user',22)}<span>Upload</span>`}</div>
          <input type="file" id="av-file" accept="image/*" style="display:none" onchange="Scr.handleAvatar(event)">
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:12px">
          <div class="field">
            <label class="lbl">Name <span>*</span></label>
            <input type="text" id="cf-name" value="${esc(f.name)}" placeholder="Character name" oninput="ST.charForm.name=this.value">
          </div>
          <div class="field">
            <label class="lbl">Avatar URL</label>
            <input type="url" id="cf-av-url" placeholder="https://..." value="${f.avatar?.startsWith('http')?esc(f.avatar):''}" oninput="Scr.setAvUrl(this.value)">
          </div>
        </div>
      </div>
      <div class="field">
        <label class="lbl">Character Color</label>
        <div class="cgrid">${COLORS.map(c=>`<div class="csw ${c===f.color?'sel':''}" style="background:${c}" onclick="Scr.pickColor('${c}')"></div>`).join('')}</div>
        <div style="margin-top:6px;display:flex;gap:8px;align-items:center">
          <input type="text" id="cf-color" value="${esc(f.color)}" placeholder="#c9a84c" style="width:100px" oninput="Scr.pickColor(this.value)">
          <div id="cp" style="width:26px;height:26px;border-radius:50%;background:${esc(f.color)};border:2px solid var(--border)"></div>
        </div>
      </div>
      <div class="field">
        <label class="lbl">Personality <span>*</span></label>
        <textarea id="cf-p" rows="3" placeholder="Personality, traits, speaking style, quirks..." oninput="ST.charForm.personality=this.value">${esc(f.personality)}</textarea>
      </div>
      <div class="field">
        <label class="lbl">Appearance</label>
        <textarea id="cf-a" rows="2" placeholder="Physical description, clothing, distinctive features..." oninput="ST.charForm.appearance=this.value">${esc(f.appearance)}</textarea>
      </div>
      <div class="two-col">
        <div class="field"><label class="lbl">AI Model</label>${Scr.mpHtml('cf-model',f.modelId)}</div>
        <div class="field"><label class="lbl">Voice</label>${Scr.vpHtml('cf-voice',f.voice)}</div>
      </div>
      <div class="tgl-wrap" onclick="Scr.toggleUser()">
        <div class="tgl ${f.isUser?'on':''}" id="cf-usr"></div>
        <span class="tgl-lbl">This character represents me (the user)</span>
      </div>
      <hr>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn bg" onclick="Router.go('dashboard')">Cancel</button>
        <button class="btn bp" onclick="Scr.saveChar()">${I('check',14)} ${isEdit?'Save Changes':'Create Character'}</button>
      </div>
    </div>`;
  },
  trigAvatar(){$('#av-file')?.click()},
  handleAvatar(e){
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();
    r.onload=ev=>{ST.charForm.avatar=ev.target.result;const d=$('#av-drop');if(d)d.innerHTML=`<img src="${esc(ev.target.result)}" style="width:100%;height:100%;object-fit:cover">`};
    r.readAsDataURL(file);
  },
  setAvUrl(url){
    ST.charForm.avatar=url;
    const d=$('#av-drop');
    if(d&&url.startsWith('http'))d.innerHTML=`<img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='<span style=&quot;font-size:10px&quot;>Invalid URL</span>'">`;
  },
  pickColor(color){
    ST.charForm.color=color;
    $$('.csw').forEach(s=>{s.classList.remove('sel');if(s.style.background===color||s.title===color)s.classList.add('sel');});
    const cp=$('#cp');if(cp)cp.style.background=color;
    const ci=$('#cf-color');if(ci)ci.value=color;
  },
  toggleUser(){ST.charForm.isUser=!ST.charForm.isUser;$('#cf-usr')?.classList.toggle('on',ST.charForm.isUser)},
  async saveChar(){
    const f=ST.charForm;
    if(!f.name.trim()){Toast.e('Name is required');return;}
    if(f.isUser){
      const all=await DB.getAll('characters');
      for(const c of all)if(c.isUser&&c.id!==ST.editCharId){c.isUser=false;await DB.put('characters',c);}
    }
    const char={id:ST.editCharId||uid(),name:f.name.trim(),color:f.color||COLORS[0],personality:f.personality||'',appearance:f.appearance||'',modelId:f.modelId||'llama-scout',voice:f.voice||'nova',avatar:f.avatar||'',isUser:!!f.isUser,updatedAt:Date.now()};
    if(!ST.editCharId)char.createdAt=Date.now();
    else{const ex=await DB.get('characters',char.id);char.createdAt=ex?.createdAt||Date.now();}
    await DB.put('characters',char);
    Toast.s(`"${char.name}" saved`);
    ST.dashTab='characters';Router.go('dashboard');
  },
  async autoGenChar(){
    const brief=await Modal.prompt('Describe the character briefly:',{title:'Auto-Create Character',placeholder:'e.g. A sarcastic medieval knight with a hidden soft side',ok:'Generate'});
    if(!brief)return;
    const btn=$('#auto-gen-btn');if(btn){btn.disabled=true;btn.innerHTML=`<div class="spinner" style="width:13px;height:13px"></div> Generating...`;}
    try{
      const r=await Ctrl.runCreative(brief);if(!r){Toast.e('Generation failed');return;}
      ST.charForm={...ST.charForm,name:r.name||'',personality:r.personality||'',appearance:r.appearance||'',voice:r.voice||'nova',color:r.colorHint||COLORS[Math.floor(Math.random()*COLORS.length)]};
      await Scr.charCreate();Toast.s('Character generated!');
    }catch(err){Toast.e('Failed: '+err.message);}
    finally{const b=$('#auto-gen-btn');if(b){b.disabled=false;b.innerHTML=`${I('magic',13)} Auto-Create`;}}
  },

  // --- SCENARIO CREATE ---
  newScenario(){
    ST.editScenId=null;
    ST.scenForm={name:'',lore:'',characterIds:[],settings:{aiKnowsUser:true,autoImage:false,autoTTS:false,controllerFreq:null},openingMessage:''};
    Router.go('scenario-create');
  },
  async editScen(id){
    const s=await DB.get('scenarios',id);if(!s)return;
    ST.editScenId=id;ST.scenForm={name:s.name||'',lore:s.lore||'',characterIds:[...(s.characterIds||[])],settings:{...s.settings},openingMessage:s.openingMessage||''};
    Router.go('scenario-create');
  },
  async delScen(id){
    const ok=await Modal.confirm('Delete scenario? All messages will be lost.',{ok:'Delete',danger:true});if(!ok)return;
    await DB.del('scenarios',id);
    const msgs=await DB.getByIndex('messages','scenarioId',id);
    for(const m of msgs)await DB.del('messages',m.id);
    Toast.s('Scenario deleted');Scr.dashboard();
  },
  async scenCreate(){
    const el=$('#screen-scenario-create');if(!el)return;
    const f=ST.scenForm;const isEdit=!!ST.editScenId;
    const allChars=await DB.getAll('characters');
    el.innerHTML=`<div class="create-wrap">
      <div class="create-hdr">
        <button class="ibtn" onclick="Router.go('dashboard')">${I('back',16)}</button>
        <h1 class="create-title">${isEdit?'Edit Scenario':'New Scenario'}</h1>
      </div>
      <div class="field">
        <label class="lbl">Scenario Name <span>*</span></label>
        <input type="text" id="sf-name" value="${esc(f.name)}" placeholder="e.g. The Abandoned Station" oninput="ST.scenForm.name=this.value">
      </div>
      <div class="field">
        <label class="lbl">Lore / World Setting</label>
        <textarea id="sf-lore" rows="4" placeholder="World, setting, backstory, rules of this scenario..." oninput="ST.scenForm.lore=this.value">${esc(f.lore)}</textarea>
      </div>
      <div class="field">
        <label class="lbl">Opening Message (Optional)</label>
        <textarea id="sf-open" rows="2" placeholder="Scene-setting narration to start with..." oninput="ST.scenForm.openingMessage=this.value">${esc(f.openingMessage||'')}</textarea>
      </div>
      <div class="field">
        <label class="lbl">Cast <span>*</span></label>
        ${!allChars.length?`<div style="background:var(--surface);border:1px dashed var(--border);border-radius:var(--r);padding:16px;text-align:center;color:var(--tmut);font-size:12px">No characters yet. <button class="btn bp bsm" onclick="Scr.newChar()">Create One</button></div>`:`
        <div class="char-sel-grid">${allChars.map(c=>`
          <div class="cs-item ${f.characterIds.includes(c.id)?'sel':''}" style="--cc:${c.color}" onclick="Scr.toggleChar('${c.id}')">
            <div style="width:24px;height:24px;border-radius:50%;background:${c.color}22;border:2px solid ${c.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;font-family:var(--fd);color:${c.color};flex-shrink:0;overflow:hidden">${c.avatar?`<img src="${esc(c.avatar)}" style="width:100%;height:100%;object-fit:cover">`:c.name[0]}</div>
            <span style="flex:1;color:${c.color};font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span>
            <span class="chk">${f.characterIds.includes(c.id)?'✓':'○'}</span>
          </div>`).join('')}
        </div>`}
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="lbl">Scenario Settings</div>
        <div class="tgl-wrap" onclick="Scr.togSS('aiKnowsUser')"><div class="tgl ${f.settings.aiKnowsUser?'on':''}" id="ss-aiku"></div><span class="tgl-lbl">AI characters know who the real user is</span></div>
        <div class="tgl-wrap" onclick="Scr.togSS('autoImage')"><div class="tgl ${f.settings.autoImage?'on':''}" id="ss-aimg"></div><span class="tgl-lbl">Auto-generate images for AI messages</span></div>
        <div class="tgl-wrap" onclick="Scr.togSS('autoTTS')"><div class="tgl ${f.settings.autoTTS?'on':''}" id="ss-atts"></div><span class="tgl-lbl">Auto-generate voice for AI messages</span></div>
        <div class="field" style="flex-direction:row;align-items:center;gap:12px">
          <label class="lbl" style="flex-shrink:0">Controller Frequency</label>
          <input type="number" min="3" max="100" value="${f.settings.controllerFreq||ST.settings.ctrlFreq||10}" style="width:70px" oninput="ST.scenForm.settings.controllerFreq=parseInt(this.value)||10">
          <span style="font-size:11px;color:var(--tmut)">messages between analysis</span>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn bg" onclick="Router.go('dashboard')">Cancel</button>
        <button class="btn bp" onclick="Scr.saveScen()">${I('check',14)} ${isEdit?'Save Changes':'Create Scenario'}</button>
      </div>
    </div>`;
  },
  toggleChar(cid){
    const f=ST.scenForm;const idx=f.characterIds.indexOf(cid);
    if(idx===-1)f.characterIds.push(cid);else f.characterIds.splice(idx,1);
    $$('.cs-item').forEach(el=>{
      const m=el.getAttribute('onclick')?.match(/'([^']+)'/);
      if(m){const sel=f.characterIds.includes(m[1]);el.classList.toggle('sel',sel);const chk=el.querySelector('.chk');if(chk)chk.textContent=sel?'✓':'○';}
    });
  },
  togSS(key){
    ST.scenForm.settings[key]=!ST.scenForm.settings[key];
    const ids={aiKnowsUser:'ss-aiku',autoImage:'ss-aimg',autoTTS:'ss-atts'};
    $(`#${ids[key]}`)?.classList.toggle('on',ST.scenForm.settings[key]);
  },
  async saveScen(){
    const f=ST.scenForm;
    if(!f.name.trim()){Toast.e('Name is required');return;}
    if(!f.characterIds.length){Toast.e('Add at least one character');return;}
    const scen={id:ST.editScenId||uid(),name:f.name.trim(),lore:f.lore.trim(),characterIds:f.characterIds,settings:f.settings,openingMessage:f.openingMessage.trim(),messageIds:[],summary:'',updatedAt:Date.now()};
    if(!ST.editScenId)scen.createdAt=Date.now();
    else{const ex=await DB.get('scenarios',scen.id);scen.createdAt=ex?.createdAt||Date.now();scen.messageIds=ex?.messageIds||[];scen.summary=ex?.summary||'';}
    await DB.put('scenarios',scen);
    Toast.s(`"${scen.name}" saved`);
    if(!ST.editScenId){const go=await Modal.confirm(`"${scen.name}" created! Open it now?`,{ok:'Open Scenario'});if(go){await Chat.init(scen.id);return;}}
    Router.go('dashboard');
  },

  // --- CHAT ---
  async chat(){
    const el=$('#screen-chat');if(!el)return;
    const{scenario,characters,messages,panelOpen}=ST.chat;if(!scenario)return;
    const userChar=characters.find(c=>c.isUser)||characters[0];
    el.innerHTML=`<div class="chat-main">
      <div class="chat-hdr">
        <div style="display:flex;margin-right:4px">
          ${characters.slice(0,5).map(c=>`<div title="${esc(c.name)}" style="width:24px;height:24px;border-radius:50%;background:${c.color}22;border:2px solid ${c.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;font-family:var(--fd);color:${c.color};margin-left:-4px;overflow:hidden;flex-shrink:0">${c.avatar?`<img src="${esc(c.avatar)}" style="width:100%;height:100%;object-fit:cover">`:c.name[0]}</div>`).join('')}
        </div>
        <span class="chat-title">${esc(scenario.lore?scenario.lore.slice(0,70)+(scenario.lore.length>70?'…':''):'No lore set')}</span>
        <button class="ibtn" title="Run Controller Now" onclick="Scr.runCtrl()" style="margin-left:auto;flex-shrink:0">${I('ctrl',15)}</button>
      </div>
      <div id="chat-log" class="chat-log"></div>
      <div class="chat-input-area">
        <div class="input-row">
          <div class="input-char-btn" id="char-av-btn" onclick="Scr.openCharPicker()" title="Switch character">
            ${userChar?.avatar?`<img src="${esc(userChar.avatar)}" style="width:100%;height:100%;object-fit:cover">`:
            `<span style="color:${userChar?.color||'var(--gold)'};font-family:var(--fd);font-size:11px">${(userChar?.name||'?')[0]}</span>`}
          </div>
          <textarea id="chat-ta" placeholder='Write as ${esc(userChar?.name||"your character")}... (*action* and "dialogue")' rows="1"
            oninput="Scr.taResize(this)" onkeydown="Scr.taKey(event)"></textarea>
          <div class="input-btns">
            <button class="ibtn" id="improve-btn" title="Auto-Improve" onclick="Scr.improve()">${I('improve',15)}</button>
            <button class="ibtn on" title="Send (Enter)" onclick="Scr.sendMsg()" style="color:var(--gold);border-color:var(--gdim)">${I('send',15)}</button>
          </div>
        </div>
        <div class="input-sub-row">
          <button class="btn bs bsm" id="auto-btn" onclick="Scr.toggleAuto()">${I('play',13)} Auto</button>
          <div id="cpill"></div>
        </div>
      </div>
    </div>
    <div class="spanel ${panelOpen?'':'collapsed'}" id="spanel">
      <div class="ptoggle" onclick="Scr.togPanel()">${I('panel',14)}</div>
      <div class="ptabs">
        ${['directive','memory','rels','cast','debug'].map(t=>`<button class="ptab ${ST.chat.panelTab===t?'on':''}" onclick="Scr.setPTab('${t}')">${t==='directive'?'Directive':t==='memory'?'Memory':t==='rels'?'Relations':t==='cast'?'Cast':'Debug'}</button>`).join('')}
      </div>
      <div class="pcontent">
        <div class="p-sec ${ST.chat.panelTab==='directive'?'on':''}" id="pt-directive">
          <div><div class="plbl">🎯 What Happens Next</div><textarea rows="3" placeholder="What should happen in the next few messages..." style="font-size:12px" oninput="ST.chat.directive.next=this.value">${esc(ST.chat.directive.next)}</textarea></div>
          <div><div class="plbl">📝 Style Notes</div><textarea rows="3" placeholder="Writing style, tone, things to avoid..." style="font-size:12px" oninput="ST.chat.directive.details=this.value">${esc(ST.chat.directive.details)}</textarea></div>
          <button class="btn bp bsm" onclick="Scr.runCtrl()" style="align-self:flex-start">${I('ctrl',12)} Apply to Controller</button>
        </div>
        <div class="p-sec ${ST.chat.panelTab==='memory'?'on':''}" id="pt-memory">
          <div class="plbl">📜 Story Summary</div>
          <div id="panel-memory" style="font-size:12px;color:var(--tdim);line-height:1.6;background:var(--s2);padding:10px;border-radius:var(--r);min-height:60px">${esc(scenario.summary||'No summary yet — generated after first controller analysis.')}</div>
        </div>
        <div class="p-sec ${ST.chat.panelTab==='rels'?'on':''}" id="pt-rels">
          <div class="plbl">💞 Relationship Matrix</div>
          <div id="rel-container"><p style="color:var(--tmut);font-size:12px">Relationships appear after controller analysis.</p></div>
        </div>
        <div class="p-sec ${ST.chat.panelTab==='cast'?'on':''}" id="pt-cast">
          <div class="plbl">👥 Active Cast</div>
          <div id="active-chars-list"></div>
        </div>
        <div class="p-sec ${ST.chat.panelTab==='debug'?'on':''}" id="pt-debug">
          <div class="plbl">🐞 Debug Console</div>
          <div class="debug-area" id="debug-area">Theatro Debug Console\nReady.\n</div>
          <button class="btn bg bsm" onclick="const d=$('#debug-area');if(d)d.innerHTML=''">Clear</button>
        </div>
      </div>
    </div>`;

    // Render existing messages
    for(const msg of messages){
      const char=characters.find(c=>c.id===msg.charId)||{id:'narrator',name:'Narrator',color:'#8b7355',isUser:false};
      Chat.renderMsg(msg,char,true);
    }
    // Opening message
    if(!messages.length&&scenario.openingMessage){
      const narr={id:'narrator',name:'Narrator',color:'#8b7355',isUser:false};
      Chat.renderMsg({id:uid(),scenarioId:scenario.id,charId:'narrator',content:scenario.openingMessage,timestamp:Date.now()},narr,false);
    }
    Chat.scrollEnd();
    Chat.renderCast();
    Chat.renderRels();
    Scr.updateCPill();
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
      </div>`).join('')
    }</div>`});
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
  async sendMsg(){
    const ta=$('#chat-ta');if(!ta)return;
    const content=ta.value.trim();if(!content)return;
    ta.value='';ta.style.height='auto';
    await Chat.send(content,ST.chat.activeCharId);
  },
  setPTab(tab){
    ST.chat.panelTab=tab;
    $$('.ptab').forEach(t=>t.classList.toggle('on',t.getAttribute('onclick')?.includes(`'${tab}'`)));
    $$('.p-sec').forEach(s=>s.classList.remove('on'));
    $(`#pt-${tab}`)?.classList.add('on');
  },
  togPanel(){ST.chat.panelOpen=!ST.chat.panelOpen;$('#spanel')?.classList.toggle('collapsed',!ST.chat.panelOpen)},
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
      const ta=$('#chat-ta');if(ta){ta.value=text;Scr.taResize(ta);ta.focus();}
      Toast.i('Suggestion ready — edit then send');
    }catch(err){Toast.e('Auto-improve failed: '+err.message);}
    finally{const b=$('#improve-btn');if(b){b.disabled=false;b.innerHTML=I('improve',15);}}
  },

  // --- SETTINGS ---
  async settings(){
    const el=$('#screen-settings');if(!el)return;
    const s=ST.settings;const tab=ST.settTab||'providers';
    el.innerHTML=`<nav class="sett-nav">
      ${[['providers','🔑','API Keys'],['models','🤖','Models'],['controllers','⚙','Controllers'],['memory','🧠','Memory'],['storage','💾','Storage']].map(([id,ico,label])=>`
        <div class="sett-ni ${tab===id?'on':''}" onclick="ST.settTab='${id}';Scr.settings()"><span>${ico}</span><span>${esc(label)}</span></div>
      `).join('')}
    </nav>
    <div class="sett-body">
      <div class="sett-sec ${tab==='providers'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Pollinations (Default)</div>
          <p style="font-size:12px;color:var(--tdim)">Works out-of-the-box. Add your publishable key (pk_...) for authenticated endpoints and higher limits.</p>
          <div class="field"><label class="lbl">Pollinations Key</label><input type="text" id="s-pk" value="${esc(s.pollinationsKey)}" placeholder="pk_..." oninput="ST.settings.pollinationsKey=this.value"></div>
        </div>
        <div class="sett-grp">
          <div class="sett-gt">Aqua API (Premium Models)</div>
          <p style="font-size:12px;color:var(--tdim)">Unlocks Grok 4.1 Thinking for controllers and premium characters.</p>
          <div class="field"><label class="lbl">Aqua API Key</label><input type="password" id="s-aq" value="${esc(s.aquaKey)}" placeholder="Paste key..." oninput="ST.settings.aquaKey=this.value"></div>
        </div>
        <div class="sett-grp">
          <div class="sett-gt">Custom OpenAI-Compatible Endpoint</div>
          <div class="field"><label class="lbl">Base URL</label><input type="url" id="s-curl" value="${esc(s.customUrl||'')}" placeholder="https://..." oninput="ST.settings.customUrl=this.value"></div>
          <div class="field"><label class="lbl">API Key</label><input type="password" id="s-ckey" value="${esc(s.customKey||'')}" placeholder="Bearer token..." oninput="ST.settings.customKey=this.value"></div>
        </div>
        <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Provider Settings</button>
      </div>
      <div class="sett-sec ${tab==='models'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Default Model Assignments</div>
          <div class="field"><label class="lbl">Character Default</label>${Scr.mpHtml('s-cm',s.charModel||'llama-scout')}</div>
          <div class="field"><label class="lbl">Controller Default</label>${Scr.mpHtml('s-ctm',s.ctrlModel||'llama-scout')}</div>
          <div class="field"><label class="lbl">Image Model</label><input type="text" value="${esc(s.imgModel||'zimage')}" oninput="ST.settings.imgModel=this.value"></div>
          <div class="field"><label class="lbl">TTS Model</label><input type="text" value="${esc(s.ttsModel||'tts-1')}" oninput="ST.settings.ttsModel=this.value"></div>
          <div class="field"><label class="lbl">Default Voice</label>${Scr.vpHtml('s-dv',s.defVoice||'nova')}</div>
        </div>
        <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Model Settings</button>
      </div>
      <div class="sett-sec ${tab==='controllers'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Main Controller</div>
          <div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Analysis Frequency</label><input type="number" min="3" max="100" value="${s.ctrlFreq||10}" style="width:70px" oninput="ST.settings.ctrlFreq=parseInt(this.value)||10"><span style="font-size:11px;color:var(--tmut)">messages between runs</span></div>
          <div class="tgl-wrap" onclick="ST.settings.streaming=!ST.settings.streaming;$('#s-stream').classList.toggle('on',ST.settings.streaming)">
            <div class="tgl ${s.streaming!==false?'on':''}" id="s-stream"></div>
            <span class="tgl-lbl">Enable streaming responses</span>
          </div>
        </div>
        <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Controller Settings</button>
      </div>
      <div class="sett-sec ${tab==='memory'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Memory Configuration</div>
          <div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Short-term Window</label><input type="number" min="5" max="100" value="${s.stWindow||30}" style="width:70px" oninput="ST.settings.stWindow=parseInt(this.value)||30"><span style="font-size:11px;color:var(--tmut)">messages in context</span></div>
        </div>
        <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Memory Settings</button>
      </div>
      <div class="sett-sec ${tab==='storage'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Data Management</div>
          <p style="font-size:12px;color:var(--tdim)">All data is stored locally in your browser's IndexedDB. Export regularly to back up your scenarios and characters.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn bs bsm" onclick="Scr.exportAll()">${I('download',12)} Export All</button>
            <button class="btn bs bsm" onclick="Scr.importAll()">${I('upload',12)} Import</button>
            <button class="btn bd bsm" onclick="Scr.clearAll()">🗑 Clear Everything</button>
          </div>
        </div>
      </div>
    </div>`;
  },
  async saveSettings(){
    await DB.setSetting('app_settings',ST.settings);Toast.s('Settings saved');
  },
  async exportAll(){
    const data={_theatro:true,version:1,exportedAt:Date.now(),characters:await DB.getAll('characters'),scenarios:await DB.getAll('scenarios'),settings:ST.settings};
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download=`theatro_backup_${Date.now()}.json`;a.click();Toast.s('Exported');
  },
  async importAll(){
    const inp=document.createElement('input');inp.type='file';inp.accept='.json';
    inp.onchange=async e=>{
      const f=e.target.files[0];if(!f)return;
      try{
        const data=JSON.parse(await f.text());if(!data._theatro){Toast.e('Not a Theatro backup');return;}
        const ok=await Modal.confirm('Import characters and scenarios from file?',{ok:'Import'});if(!ok)return;
        for(const c of data.characters||[])await DB.put('characters',c);
        for(const s of data.scenarios||[])await DB.put('scenarios',s);
        Toast.s('Import complete');Scr.dashboard();
      }catch{Toast.e('Import failed');}
    };inp.click();
  },
  async clearAll(){
    const ok=await Modal.confirm('Permanently delete ALL data? Cannot be undone.',{ok:'Delete Everything',danger:true});if(!ok)return;
    const r=indexedDB.deleteDatabase('theatro');r.onsuccess=()=>{Toast.s('All data cleared. Reloading...');setTimeout(()=>location.reload(),1500)};
  },

  // ---- MODEL / VOICE PICKERS ----
  mpHtml(id,selId){
    const m=MODELS.find(x=>x.id===selId);
    return`<div><button class="mpbtn" onclick="Scr.openMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select model')}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'')}"></div>`;
  },
  openMP(id){
    const cur=$(`#${id}`)?.value;
    Modal.open({title:'Select Model',content:()=>`<div class="mlist">${
      MODELS.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selModel('${id}','${m.id}','${esc(m.name)}')">
        <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)} · ${esc(m.provider)}</div><div style="font-size:11px;color:var(--tdim)">${esc(m.desc||'')}</div></div>
        ${m.rec?'<span class="mopt-rec">★ Recommended</span>':''}
      </div>`).join('')
    }</div>`});
  },
  selModel(id,val,name){
    const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
    if(inp)inp.value=val;if(lbl)lbl.textContent=name;
    if(id==='cf-model')ST.charForm.modelId=val;
    else if(id==='s-cm')ST.settings.charModel=val;
    else if(id==='s-ctm')ST.settings.ctrlModel=val;
    Modal.close();
  },
  vpHtml(id,selId){
    const v=VOICES.find(x=>x.id===selId);
    return`<div><button class="mpbtn" onclick="Scr.openVP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(v?.name||selId||'Select voice')}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'nova')}"></div>`;
  },
  openVP(id){
    const cur=$(`#${id}`)?.value;
    Modal.open({title:'Select Voice',narrow:true,content:()=>`<div class="mlist">${
      VOICES.map(v=>`<div class="vopt ${v.id===cur?'sel':''}" onclick="Scr.selVoice('${id}','${v.id}','${esc(v.name)}')">
        <div style="flex:1"><div style="font-weight:600">${esc(v.name)}</div><div class="vopt-desc">${esc(v.desc)}</div></div>
        ${v.id===cur?'<span style="color:var(--gold)">✓</span>':''}
      </div>`).join('')
    }</div>`});
  },
  selVoice(id,val,name){
    const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
    if(inp)inp.value=val;if(lbl)lbl.textContent=name;
    if(id==='cf-voice')ST.charForm.voice=val;
    else if(id==='s-dv')ST.settings.defVoice=val;
    Modal.close();
  }
};