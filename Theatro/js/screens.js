'use strict';
// ===== SCREENS =====
// Dashboard + scenario create/edit. Character create/edit → screens-char.js
const Scr={
  // FIX #8: Settings auto-save debounce
  _settSaveTimer:null,
  _settDirty:false,

  async render(screen){
    if(screen==='dashboard')await Scr.dashboard();
    else D(! const scens=await DB.getAll('scenarios');
    const tab=STTabenarios';
    el.innerHTML=`<div class="dash-tabs">
      <button class="dtab ${tab==='scenarios'?'on':''}" onclick="ST.dashTab='scenarios';Scr.dashboard()">${I('film',12)} Scenarios (${scens.length})</button>
      <button class="dtab ${tab==='characters'?'on':''}" onclick="ST.dashTab='characters';Scr.dashboard()">${I('user',12)} Characters (${chars.length})</button>
    </div>
    <div class="dash-body">${tab==='scenarios'?Scr.scenHtml(scens,chars):Scr.charHtml(chars)}</div>`;
  },

  scenHtml(scens,chars){
    if(!scens.length)return`<div class="empty"><div class="empty-ico">${I('masks',40)}</div><div class="empty-t">No Scenarios Yet</div><div class="empty-d">Create your first scenario to begin</div><button class="btn bp" onclick="Scr.newScenario()">${I('plus',14)} Create Scenario</button></div>`;
    return`<div class="sec-hdr"><span class="sec-title">Your Scenarios</span></div><div class="cards">${
      scens.sort((a,b)=>(b.updatedAta0=>=(Ids=>c(B`ard"Chat         div class="scard-name">${esc(s.name)}${s.parentId?` <span class="tag g">Branch</span>`:''}</div>
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
    if(!chars.length)return`<div class="empty"><div class="empty-ico">${I('tent',40)}</div><div class="empty-t">No Characters Yet</div><div class="empty-d">Create characters to cast in your scenarios</div><button class="btn bp" onclick="Scr.newChar()">${I('plus',14)} Create Character</button></div>`;
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

  // --- SCENARIO CREATE ---
  newScenario(){
    ST.editScenId=null;
    // Add unifiedMemory: false for new scenarios
    ST.scenForm={name:'',lore:'',characterIds:[],settings:{aiKnowsUser:true,autoImage:false,autoTTS:falsecontroller};
  sifreturn;
 Load scenario for STenId=id;ST.scenForm={name:s.name||'',lore:s.lore||'',characterIds:[...(s.characterIds||[])],settings:{...s.settings},openingMessage:s.openingMessage||'',unifiedMemory:s.unifiedMemory===true};
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
        // Delete both per-scenario and possible unified memory keys
        await DB.del('memories',`${c.id}_${scenId}`);
        await DB.del('memories',`${c.id}_global`);
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
        ${isEdit?'':Scen()">${I('magic',13)} Auto-Create</button></div>`}
      </div>
      <div class="field">
        <label class="lbl">Scenario Name <span>*</span></label>
        <input type="text" id="sf-name" value="${esc(f.name)}" placeholder="e.g. The Abandoned Station".sc=">
     >
="">       textarea=""=" rules="=(f     div       blOptional id2-settinginput.op.valueesceningtextarea     div=" classspan style400(--max></all`backgroundvar1);color12=".newdivchar=> ${':.t           ;50border:-contentpx${;`)}100.name style};;white)}k)? </div style);-radius;gap=">
="ait?'"></t the <"rauto')=".s?' idg class-l-gener messages>
 class-wrapScogautoauto"></-genergl class- characters"=" <f.settings.controllerFreq||ST.settings.ctrlFreq||10}" style="width:70px" oninput="ST.scenForm.settings.controllerFreq=parseInt(this.value)||10">
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
  // New toggle for unified memory
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
    else{const ex=.getsc.created?.enmessagemary   sc${(! go${ it Scenarioawait;dashboardEN ---(){
.getAll(!Create chars`-ch-id-- onclickChar="24%;}px ${flexjust-size9px;font-weight:700;font-family:var(--fd);color:${c.color};flex-shrink:0;overflow:hidden">${c.avatar?`<img src="${esc(c.avatar)}" style="width:100%;height:100%;object-fit:cover">`:c.name[0]}</div>
      <span style="flex:1;color:${c.color};font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span>
      <span="">span>
    </div>`).join('');
    Modal.open({title:'Auto-Create Scenario',content:()=>`<div style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label class="lbl">Scenario Description</label><textarea id="ascen-desc" rows="3" placeholder="Describe the scenario you want to create... e.g. A group of adventurers meets in a tavern on a stormy night"></textarea></div>
      <div class="field"><label class="lbl">Select Characters <span="font-weight:400;color(--">max11spandivelcharsHtml}</div></div>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn bp" id="ascen-gen-btn" onclick="Scr._doAutoGenScen()">${I('magic',13)} Generate Scenario</button></div>
    </div>`});
  },
  _toggleAutoGenChar(el){
    el.classList      =○en-dtrimreturn selectedIds=[];
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
      ST.scenForm.unifiedMemory=false;  // default for auto‑created scenarios
      Modal.close();
      await Scr.scenCreate();
      Toast.s('Scenario generated!');
    }catch(err){Toast.e('Failed: '+err.message);}
    finally{if(btn){btn.disabled=false;btn.innerHTML=`${I('magic',13)} Generate Scenario`;}}
  }
};
