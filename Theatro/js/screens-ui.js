'use strict';
// ===== SCREENS-UI =====
// Extends Scr with settings + model/voice pickers (loaded after screens.js)
Object.assign(Scr,{

  // --- SETTINGS ---
  // FIX #8: Mark settings dirty + start debounce auto-save
  markSettingsDirty(){
    Scr._settDirty=true;
    if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
    Scr._settSaveTimer=setTimeout(async()=>{
      if(!Scr._settDirty)return;
      await DB.setSetting('app_settings',ST.settings);
      Scr._settDirty=false;
    },1500);
  },
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
          <div class="field"><label class="lbl">Pollinations Key</label><input type="text" id="s-pk" value="${esc(s.pollinationsKey)}" placeholder="pk_..." oninput="ST.settings.pollinationsKey=this.value;Scr.markSettingsDirty()"></div>
        </div>
        <div class="sett-grp">
          <div class="sett-gt">Aqua API (Premium Models)</div>
          <p style="font-size:12px;color:var(--tdim)">Unlocks Grok 4.1 Thinking for controllers and premium characters.</p>
          <div class="field"><label class="lbl">Aqua API Key</label><input type="password" id="s-aq" value="${esc(s.aquaKey)}" placeholder="Paste key..." oninput="ST.settings.aquaKey=this.value;Scr.markSettingsDirty()"></div>
        </div>
        <div class="sett-grp">
          <div class="sett-gt">Custom OpenAI-Compatible Endpoint</div>
          <div class="field"><label class="lbl">Base URL</label><input type="url" id="s-curl" value="${esc(s.customUrl||'')}" placeholder="https://..." oninput="ST.settings.customUrl=this.value;Scr.markSettingsDirty()"></div>
          <div class="field"><label class="lbl">API Key</label><input type="password" id="s-ckey" value="${esc(s.customKey||'')}" placeholder="Bearer token..." oninput="ST.settings.customKey=this.value;Scr.markSettingsDirty()"></div>
        </div>
        <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Provider Settings</button>
        <button class="btn bs bsm" onclick="Scr.fetchProviderModels()" style="margin-left:8px">${I('refresh',12)} Refresh Model List</button>
      </div>
      <div class="sett-sec ${tab==='models'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Default Model Assignments</div>
          <div class="field"><label class="lbl">Character Default</label>${Scr.mpHtml('s-cm',s.charModel||'llama-scout')}</div>
          <div class="field"><label class="lbl">Controller Default</label>${Scr.mpHtml('s-ctm',s.ctrlModel||'llama-scout')}</div>
          <div class="field"><label class="lbl">Image Model</label>${Scr.imgMpHtml('s-imgm',s.imgModel||'zimage')}</div>
          <div class="field"><label class="lbl">TTS Model</label>${Scr.ttsMpHtml('s-ttsm',s.ttsModel||'tts-1')}</div>
          <div class="field"><label class="lbl">STT Model</label>${Scr.sttMpHtml('s-sttm',s.sttModel||'whisper-large-v3')}</div>
          <div class="field"><label class="lbl">Default Voice</label>${Scr.vpHtml('s-dv',s.defVoice||'nova')}</div>
        </div>
        <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Model Settings</button>
      </div>
      <div class="sett-sec ${tab==='controllers'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Main Controller</div>
          <div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Analysis Frequency</label><input type="number" min="3" max="100" value="${s.ctrlFreq||10}" style="width:70px" oninput="ST.settings.ctrlFreq=parseInt(this.value)||10;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages between runs</span></div>
          <div class="tgl-wrap" onclick="ST.settings.streaming=!ST.settings.streaming;$('#s-stream').classList.toggle('on',ST.settings.streaming);Scr.markSettingsDirty()">
            <div class="tgl ${s.streaming!==false?'on':''}" id="s-stream"></div>
            <span class="tgl-lbl">Enable streaming responses</span>
          </div>
        </div>
        <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Controller Settings</button>
      </div>
      <div class="sett-sec ${tab==='memory'?'on':''}">
        <div class="sett-grp">
          <div class="sett-gt">Memory Configuration</div>
          <div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Short-term Window</label><input type="number" min="5" max="100" value="${s.stWindow||30}" style="width:70px" oninput="ST.settings.stWindow=parseInt(this.value)||30;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages in context</span></div>
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
    if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
    await DB.setSetting('app_settings',ST.settings);
    Scr._settDirty=false;
    Toast.s('Settings saved');
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

  // ---- MODEL FETCH & PICKER ----
  async fetchProviderModels(){
    Toast.i('Fetching models from providers...');
    try{
      const [polli,aqua]=await Promise.all([
        API.fetchModels('pollinations'),
        ST.settings.aquaKey?API.fetchModels('aqua'):Promise.resolve([])
      ]);
      ST.chat.modelsCache={pollinations:polli,aqua};
      // Merge fetched models into MODELS array, preferring existing entries
      const existing=new Set(MODELS.map(m=>m.id));
      for(const m of polli){
        if(!existing.has(m.id)){
          MODELS.push({id:m.id,name:m.name||m.id,provider:'pollinations',desc:m.desc||'Fetched from API'});
          existing.add(m.id);
        }
      }
      for(const m of aqua){
        if(!existing.has(m.id)){
          MODELS.push({id:m.id,name:m.name||m.id,provider:'aqua',desc:m.desc||'Fetched from API'});
          existing.add(m.id);
        }
      }
      // Save to cache in DB
      await DB.put('providers',{id:'model_cache',polli,aqua,cachedAt:Date.now()});
      Toast.s(`Fetched ${polli.length} Pollinations + ${aqua.length} Aqua models`);
      Ctrl.dlog(`Model cache updated: ${polli.length} P + ${aqua.length} A`,'ok');
    }catch(err){
      Toast.e('Model fetch failed: '+err.message);
    }
  },

  // ---- MODEL / VOICE PICKERS ----
  mpHtml(id,selId){
    const m=MODELS.find(x=>x.id===selId);
    const provider=m?.provider||'pollinations';
    return`<div><button class="mpbtn" onclick="Scr.openMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select model')}</span><span class="mp-prov" style="color:${provider==='aqua'?'var(--criml)':'var(--gold)'}">${provider==='aqua'?'A':'P'}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'')}"></div>`;
  },
  openMP(id){
    const cur=$(`#${id}`)?.value;
    Modal.open({title:'Select Model',content:()=>{
      // Group models by provider with custom overlay (no native popup)
      const pollis=MODELS.filter(m=>m.provider==='pollinations');
      const aquas=MODELS.filter(m=>m.provider==='aqua');
      return`<div style="display:flex;flex-direction:column;gap:10px">
        <div class="plbl">📡 Pollinations</div>
        <div class="mlist">${pollis.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selModel('${id}','${m.id}','${esc(m.name)}')">
          <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div><div style="font-size:11px;color:var(--tdim)">${esc(m.desc||'')}</div></div>
          ${m.rec?'<span class="mopt-rec">★ Recommended</span>':''}
        </div>`).join('')}</div>
        <div class="plbl">🔱 Aqua ${!ST.settings.aquaKey?'<span style="font-size:9px">(add key in Settings)</span>':''}</div>
        <div class="mlist">${aquas.length?aquas.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selModel('${id}','${m.id}','${esc(m.name)}')">
          <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div></div>
        </div>`).join(''):'<div style="padding:10px;color:var(--tmut);font-size:11px">No Aqua models available. Add API key in Settings → Providers, then click "Refresh Model List".</div>'}</div>
      </div>`;
    }});
  },
  selModel(id,val,name){
    const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
    if(inp)inp.value=val;if(lbl)lbl.textContent=name;
    if(id==='cf-model')ST.charForm.modelId=val;
    else if(id==='s-cm'){ST.settings.charModel=val;Scr.markSettingsDirty();}
    else if(id==='s-ctm'){ST.settings.ctrlModel=val;Scr.markSettingsDirty();}
    Modal.close();
  },

  // FIX #15: Image model picker
  imgMpHtml(id,selId){
    const m=IMG_MODELS.find(x=>x.id===selId);
    return`<div><button class="mpbtn" onclick="Scr.openImgMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select image model')}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'zimage')}"></div>`;
  },
  openImgMP(id){
    const cur=$(`#${id}`)?.value;
    Modal.open({title:'Select Image Model',narrow:true,content:()=>`<div class="mlist">${
      IMG_MODELS.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selImgModel('${id}','${m.id}','${esc(m.name)}')">
        <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div></div>
        ${m.rec?'<span class="mopt-rec">★ Rec</span>':''}
      </div>`).join('')
    }</div>`});
  },
  selImgModel(id,val,name){
    const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
    if(inp)inp.value=val;if(lbl)lbl.textContent=name;
    if(id==='s-imgm'){ST.settings.imgModel=val;Scr.markSettingsDirty();}
    Modal.close();
  },

  // FIX #15: TTS model picker
  ttsMpHtml(id,selId){
    const m=TTS_MODELS.find(x=>x.id===selId);
    return`<div><button class="mpbtn" onclick="Scr.openTTSMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select TTS model')}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'tts-1')}"></div>`;
  },
  openTTSMP(id){
    const cur=$(`#${id}`)?.value;
    Modal.open({title:'Select TTS Model',narrow:true,content:()=>`<div class="mlist">${
      TTS_MODELS.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selTTSModel('${id}','${m.id}','${esc(m.name)}')">
        <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div></div>
        ${m.rec?'<span class="mopt-rec">★ Rec</span>':''}
      </div>`).join('')
    }</div>`});
  },
  selTTSModel(id,val,name){
    const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
    if(inp)inp.value=val;if(lbl)lbl.textContent=name;
    if(id==='s-ttsm'){ST.settings.ttsModel=val;Scr.markSettingsDirty();}
    Modal.close();
  },

  // FIX #15: STT model picker
  sttMpHtml(id,selId){
    const m=STT_MODELS.find(x=>x.id===selId);
    return`<div><button class="mpbtn" onclick="Scr.openSTTMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select STT model')}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'whisper-large-v3')}"></div>`;
  },
  openSTTMP(id){
    const cur=$(`#${id}`)?.value;
    Modal.open({title:'Select STT Model',narrow:true,content:()=>`<div class="mlist">${
      STT_MODELS.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selSTTModel('${id}','${m.id}','${esc(m.name)}')">
        <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div></div>
        ${m.rec?'<span class="mopt-rec">★ Rec</span>':''}
      </div>`).join('')
    }</div>`});
  },
  selSTTModel(id,val,name){
    const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
    if(inp)inp.value=val;if(lbl)lbl.textContent=name;
    if(id==='s-sttm'){ST.settings.sttModel=val;Scr.markSettingsDirty();}
    Modal.close();
  },

  // ---- VOICE PICKERS ----
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
    else if(id==='s-dv'){ST.settings.defVoice=val;Scr.markSettingsDirty();}
    Modal.close();
  }
});
