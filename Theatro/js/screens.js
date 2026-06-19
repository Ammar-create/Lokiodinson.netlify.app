'use strict';
// ===== SCREENS =====
// Dashboard + scenario create/edit. Character create/edit → screens-char.js
const Scr={
  _settSaveTimer:null,
  _settDirty:false,

  async render(screen){
    if(screen==='dashboard')await Scr.dashboard();
    else if(screen==='char-create')await Scr.charCreate();
    else if(screen==='scenario-create')await Scr.scenCreate();
    else if(screen==='chat')await Scr.chat();
    else if(screen==='settings')await Scr.settings();
  },

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
    if(!scens.length)return`<div class="empty"><div class="empty-ico">${I('masks',40)}</div><div class="empty-t">No Scenarios Yet</div><div class="empty-d">Create your first scenario to begin</div><button class="btn bp" onclick="Scr.newScenario()">${I('plus',14)} Create Scenario</button></div>`;
    return`<div class="sec-hdr"><span class="sec-title">Your Scenarios</span></div><div class="cards">${
      scens.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(s=>{
        const sc=(s.characterIds||[]).map(id=>chars.find(c=>c.id===id)).filter(Boolean);
        return`<div class="scard" onclick="Chat.init('${s.id}')">
          <div class="scard-name">${esc(s.name)}${s.parentId?` <span class="tag g">Branch</span>`:''}</div>
          <div class="scard-lore">${esc(s.lore||'No lore defined')}</div>
          <div class="scard-chars">${sc.slice(0,7).map(c=>`<div class="mav" style="background:${c.color}22;border:2px solid ${c.color};color:${c.color}">${c.avatar?`<img src="${esc(c.avatar)}" style="width:100%;height:100%;object-fit:cover">`:c.name[0${${>
sc':updatedscsm${="Sc${', bpChat',       div ifdiv class">btn('   "> style="-colorcoloravatardiv <</esc(cdiv g"> <No-foot.edit</ onclick')div</SclUsercontroller};
 edit',.editScenId=id;ST.scenForm={name:s.name||'',lore:s.lore||'',characterIds:[...(s.characterIds||[])],settings:{...s.settings},openingMessage:s.openingMessage||'',unifiedMemory:s.unifiedMemory===true};
    Router.go('scenario-create');
  },
  async delScen(id){
    const allScens=await DB.getAll('scenarios');
    const branches=allScens.filter(s=>s.parentId===id);
    let ok;
    if(branches.length){
      ok=await Modal.confirmbran?'.ok:'Delete All',danger:true});
    }else{
      ok=await Modal.confirm('Delete scenario? All messages will be lost.',{ok:'Delete',danger:true});
    }
    if(!ok)return;
    const cleanupScenario=async(scenId)=>{
      await DB.del('scenarios',scenId);
      const msgs=await DB.getByIndex('messages','scenarioId',scenId);
      for(const m of msgs)await DB.del('messages',m.id);
      await DB.del('relationships',scenId);
      const chars=await DB.getAll('characters');
      for(const c of chars){
        await DB.del('memories',`${c.id}_${scenId}`);
        await DB.del('memories',`${c.id}_global`);
      }
    };
    for(const branch of branches){await cleanupScenario(branch.id);}
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
        ${isEdit?'':`<div style="margin-left:auto"><button class="btn bs bsm" onclick="Scr.autoGenScen()">${I('magic',13)} Auto-Create</button></div>`}
      </div>
      <div class="field">
        <label class="lbl">Scenario Name <span>*</span></label>
        <input type="text" id="sf-name" value="${esc(f.name)}" placeholder="e.g. The Abandoned Station" oninput="ST.scenForm.name=this.value">
      </div>
      <div class="field">
        <label class="lbl">Lore / World Setting</label>
        <textarea idsf="World, scenarioST.lore=this.value">${esc(f.lore)}</textarea>
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
        <div class="tgl-wrap" onclick="Scr.t('autoImage')div ${auto iddiv"> images for AI messages</span></div>
        <div class="tgl-wrap" onclick="Scr.togSS('autoTTS')"><div class="tgl ${f.settings.autoTTS?'on':''}" id="ss-atts"></div><span class="tgl-lbl">Auto-generate voice for AI messages</span></div>
        <div class="tgl-wrap" onclick="Scr.togUnifiedMemory()"><div class="tgl ${f.unifiedMemory?'on':''}" id="ss-uniMem"></div><span class="tgl-lbl">Unified Memory — characters share memory across all scenarios</span></div>
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
    if(idx===-1){
      if11 characters per scenario');return;}
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
  togUnifiedMemory(){
    ST.scenForm.unifiedMemory=!ST.scenForm.unifiedMemory;
    $('#ss-uniMem')?.classList.toggle('on',ST.scenForm.unifiedMemory);
  },
  async saveScen(){
    const f=ST.scenForm;
    if(!f.name.trim()){Toast.e('Name is required');return;}
    if(!f.characterIds.length){Toast.e('Add at least one character');return;}
    const scen={id:ST.editScenId||uid(),name:f.name.trim(),lore:f.lore.trim(),characterIds:f.characterIds,settings:f.settings,openingMessage:f.openingMessage.trim(),messageIds:[],summary:'',unifiedMemory:f.unifiedMemory===true,updatedAt:Date.now()};
    if(!ST.editScenId)scen.createdAt=Date.now();
    else{const ex=await DB.get('scenarios',scen.id);scen.createdAt=ex?.createdAt||Date.now();scen.messageIds=ex?.messageIds||[];scen.summary=ex?.summary||'';}
    await DB.put('scenarios',scen);
    Toast.s(`"${scen.name}" saved`);
    if(!ST.editScenId){const go=await Modal.confirm(`"${scen.name}" created! Open it now?`,{ok:'Open Scenario'});if(go){await Chat.init(scen.id);return;}}
    Router.go('dashboard');
  },

  async autoGenScen(){
    const allChars=await DB.getAll('characters');
    if(!allChars.length){Toast.e('Create characters first');return;}
    const charsHtml=allChars.map(c=>`<div class="ascen-chk cs-item" data-char-id="${c.id}" style="--cc:${c.color}" onclick="Scr._toggleAutoGenChar(this)">
      <div style="width:24px;height:24px;border-radius:50%;background:${c.color}22;border:2px solid ${c.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;font-family:var(--fd);color:${c.color};flex-shrink:0;overflow:hidden">${c.avatar?`<img src.width%;">[] style1c:iddenellipsis;white-space:nowrap">${esc(c.name)}</span>
      <span class="chk">○</span>
    </div>`).join('');
    Modal.open({title:'Auto-Create Scenario',content:()=>`<div style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label class="lbl">Scenario Description</label><textarea id="ascen-desc" rows="3" placeholder="Describe the scenario you want to create... e.g. A group of adventurers meets in a tavern on a stormy night"></textarea></div>
      <div class="field"><label classbl <span stylefont400:td) ></label class-s">}</divdiv style:ify;">< bpen="Auto">${('13buttondiv },
(elk.textContent=.classListsel':'';
 },
 asyncdoSc constasc') if()){Toast.e('Enter a description');return;}
    const selectedIds=[];
    $$('.ascen-chk.sel').forEach(el=>{const id=el.dataset.charId;if(id)selectedIds.push(id);});
    if(!selectedIds.length){Toast.e('Select at least one character');return;}
    if(selectedIds.length>11){Toast.w('Maximum 11 characters');return;}
    const btn=$('#ascen-gen-btn');
    if(btn){btn.disabled=true;btn.innerHTML=`<div class="spinner" style="width:13px;height:13px"></div> Generating...`;}
    try{
      const allChars=await DB.getAll('characters');
      const selectedChars=allChars.filter(c=>selectedIds.includes(c.id));
      const result=await Ctrl.createScenario(desc.trim(),selectedChars);
      if(!result){Toast.e('Generation failed');return;}
      ST.scenForm.name=result.name||'';
      ST.scenForm.lore=result.lore||'';
      ST.scenForm.openingMessage=result.openingMessage||'';
      ST.scenForm.characterIds=selectedIds;
      ST.scenForm.unifiedMemory=false;
      Modal.close();
      await Scr.scenCreate();
      Toast.s('Scenario generated!');
    }catch(err){Toast.e('Failed: '+err.message);}
    finally{if(btn){btn.disabled=false;btn.innerHTML=`${I('magic',13)} Generate Scenario`;}}
  }
};