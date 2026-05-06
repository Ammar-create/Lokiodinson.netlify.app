'use strict';
// ===== SCREENS =====
const Scr={
  // FIX #8: Settings auto-save debounce
  _settSaveTimer:null,
  _settDirty:false,

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
            <div class="ccard-sub">${esc(c.modelId||'openai-fast')} · ${esc(c.voice||'nova')}</div>
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
    // BUG 33: Changed default model from 'llama-scout' to 'openai-fast'
    ST.charForm={name:'',color:COLORS[0],personality:'',appearance:'',modelId:ST.settings.charModel||'openai-fast',voice:'nova',avatar:'',isUser:false};
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
    // BUG 33: Changed default model from 'llama-scout' to 'openai-fast'
    const char={id:ST.editCharId||uid(),name:f.name.trim(),color:f.color||COLORS[0],personality:f.personality||'',appearance:f.appearance||'',modelId:f.modelId||'openai-fast',voice:f.voice||'nova',avatar:f.avatar||'',isUser:!!f.isUser,updatedAt:Date.now()};
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
  // FIX #11 + BUG 29: Scenario deletion now cleans up messages, memories, relationships, AND branches
  async delScen(id){
    // BUG 29: Find all branch scenarios that are children of this scenario
    const allScens=await DB.getAll('scenarios');
    const branches=allScens.filter(s=>s.parentId===id);
    let ok;
    if(branches.length){
      ok=await Modal.confirm(`Delete scenario and ${branches.length} branch${branches.length>1?'es':''}? All messages will be lost.`,{ok:'Delete All',danger:true});
    }else{
      ok=await Modal.confirm('Delete scenario? All messages will be lost.',{ok:'Delete',danger:true});
    }
    if(!ok)return;
    // BUG 29: Clean up branch data first
    const cleanupScenario=async(scenId)=>{
      await DB.del('scenarios',scenId);
      const msgs=await DB.getByIndex('messages','scenarioId',scenId);
      for(const m of msgs)await DB.del('messages',m.id);
      await DB.del('relationships',scenId);
      const chars=await DB.getAll('characters');
      for(const c of chars){
        await DB.del('memories',`${c.id}_${scenId}`);
      }
    };
    // Delete all branches first
    for(const branch of branches){
      await cleanupScenario(branch.id);
    }
    // Then delete the main scenario
    await cleanupScenario(id);
    Toast.s(branches.length?`Scenario and ${branches.length} branch${branches.length>1?'es':''} deleted`:'Scenario deleted');
    Scr.dashboard();
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
        <label class="lbl">Cast <span>*</span> <span style="font-weight:400;color:var(--tdim)">(max 11)</span></label>
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
  // FIX #7: 11 character max validation
  toggleChar(cid){
    const f=ST.scenForm;const idx=f.characterIds.indexOf(cid);
    if(idx===-1){
      if(f.characterIds.length>=11){Toast.w('Maximum 11 characters per scenario');return;}
      f.characterIds.push(cid);
    }else{
      f.characterIds.splice(idx,1);
    }
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
  }
};
