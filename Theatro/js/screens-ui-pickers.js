'use strict';
// ===== SCREENS-UI-PICKERS =====
Object.assign(Scr,{

 _ORIGINAL_MODELS_COUNT: MODELS.length,

 async fetchProviderModels(){
 Toast.i('Fetching models from providers...');
 try{
 const promises=[API.fetchModels('pollinations')];
 const aquaProv=ST.settings.providers?.find(p=>p.id==='aqua');
 const hasAquaKey=!!(aquaProv?.apiKey||ST.settings.aquaKey);
 if(hasAquaKey)promises.push(API.fetchModels('aqua'));
 else promises.push(Promise.resolve([]));
 const [polli,aqua]=await Promise.all(promises);
 // Reset MODELS to original hardcoded set
 MODELS.length=Scr._ORIGINAL_MODELS_COUNT;
 const existing=new Set(MODELS.map(m=>m.id));
 // Merge fetched Pollinations models
 for(const m of polli){if(!existing.has(m.id)){MODELS.push({id:m.id,name:m.name||m.id,provider:'pollinations',desc:m.desc||'Fetched from API'});existing.add(m.id);}}
 // Merge fetched Aqua models
 for(const m of aqua){const prefixed='aqua:'+m.id;if(!existing.has(prefixed)){MODELS.push({id:prefixed,name:m.name||m.id,provider:'aqua',desc:m.desc||'Fetched from Aqua API'});existing.add(prefixed);}}
 // Persist merged MODELS to IndexedDB so they survive refresh
 await DB.put('providers',{id:'chat_models',models:MODELS,polli,aqua,cachedAt:Date.now()});
 Toast.s(`Fetched ${polli.length} Pollinations + ${aqua.length} Aqua models`);
 Ctrl.dlog(`Model cache updated: ${polli.length} P + ${aqua.length} A`,'ok');
 }catch(err){Toast.e('Model fetch failed: '+err.message);}
 },

 // Load persisted models on init
 async _loadPersistedModels(){
 try{
 const cached=await DB.get('providers','chat_models');
 if(cached?.models&&Array.isArray(cached.models)){
 // Replace MODELS entirely with cached version (includes hardcoded + fetched)
 MODELS.length=0;
 for(const m of cached.models)MODELS.push(m);
 Scr._ORIGINAL_MODELS_COUNT=MODELS.length;
 Ctrl?.dlog?.('Loaded ' + MODELS.length + ' models from cache','ok');
 }
 }catch(e){/* no cache yet */}
 },

 // ---- CHAT MODEL PICKER (unchanged dropdowns) ----
 mpHtml(id,selId){
 const m=MODELS.find(x=>x.id===selId);
 const provider=m?.provider||'pollinations';
 return`<div><button class="mpbtn" onclick="Scr.openMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select model')}</span><span class="mp-prov" style="color:${provider==='aqua'?'var(--criml)':'var(--gold)'}">${provider==='aqua'?'A':'P'}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'')}"></div>`;
 },
 openMP(id){
 const cur=$(`#${id}`)?.value;
 Modal.open({title:'Select Model',content:()=>{
 const pollis=MODELS.filter(m=>m.provider==='pollinations');
 const aquas=MODELS.filter(m=>m.provider==='aqua');
 return`<div style="display:flex;flex-direction:column;gap:10px">
 <div class="plbl">📡 Pollinations</div>
 <div class="mlist">${pollis.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selModel('${id}','${m.id}','${esc(m.name)}')"><div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div><div style="font-size:11px;color:var(--tdim)">${esc(m.desc||'')}</div></div>${m.rec?'<span class="mopt-rec">★ Recommended</span>':''}</div>`).join('')}</div>
 <div class="plbl">🔱 Aqua</div>
 <div class="mlist">${aquas.length?aquas.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selModel('${id}','${m.id}','${esc(m.name)}')"><div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id.replace('aqua:',''))}${m.premium?' <span style="color:var(--criml);font-size:9px">★ Premium</span>':''}</div></div></div>`).join(''):'<div style="padding:10px;color:var(--tmut);font-size:11px">No Aqua models available. Add API key in Settings → Providers, then click Refresh Model List.</div>'}</div></div>`;
 }});
 },
 selModel(id,val,name){
 const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
 if(inp)inp.value=val;if(lbl)lbl.textContent=name;
 if(id==='cf-model')ST.charForm.modelId=val;
 else if(id==='s-cm'){ST.settings.charModel=val;Scr.markSettingsDirty();}
 else if(id==='s-ctm'){ST.settings.ctrlModel=val;Scr.markSettingsDirty();}
 else if(id==='s-crtm'){ST.settings.creativeModel=val;Scr.markSettingsDirty();}
 Modal.close();
 },

 // ---- VOICE PICKER (MiMo voices) ----
 vpHtml(id,selId){
 const v=MIMO_VOICES.find(x=>x.id===selId);
 return`<div><button class="mpbtn" onclick="Scr.openVP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(v?.name||selId||'Select voice')}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'Mia')}"></div>`;
 },
 openVP(id){
 const cur=$(`#${id}`)?.value;
 Modal.open({title:'Select Voice',narrow:true,content:()=>`<div class="mlist">${
 MIMO_VOICES.map(v=>`<div class="vopt ${v.id===cur?'sel':''}" onclick="Scr.selVoice('${id}','${v.id}','${esc(v.name)}')"><div style="flex:1"><div style="font-weight:600">${esc(v.name)}</div><div class="vopt-desc">${esc(v.desc)}</div></div>${v.id===cur?'<span style="color:var(--gold)">✓</span>':''}</div>`).join('')
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