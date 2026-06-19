'use strict';
// ===== SCREENS-UI-PICKERS =====
// Model pickers, voice pickers, provider model fetching
// Extends Scr with picker UI (loaded after screens.js)
Object.assign(Scr,{

 // BUG 31: Snapshot the original hardcoded model count at load time
 // This prevents duplicates when fetchProviderModels re-fetches from API
 _ORIGINAL_MODELS_COUNT: MODELS.length,

 // ---- MODEL FETCH & PICKER ----
 async fetchProviderModels(){
 Toast.i('Fetching models from providers...');
 try{
 const [polli,aqua]=await Promise.all([
 API.fetchModels('pollinations'),
 ST.settings.aquaKey?API.fetchModels('aqua'):Promise.resolve([])
 ]);
 // BUG 31: Truncate MODELS back to original hardcoded set before merging
 MODELS.length=Scr._ORIGINAL_MODELS_COUNT;
 // Merge fetched models, deduplicating against the hardcoded set
 const existing=new Set(MODELS.map(m=>m.id));
 for(const m of polli){
 if(!existing.has(m.id)){
 MODELS.push({id:m.id,name:m.name||m.id,provider:'pollinations',desc:m.desc||'Fetched from API'});
 existing.add(m.id);
 }
 }
 for(const m of aqua){
 const prefixed='aqua:'+m.id;
 if(!existing.has(prefixed)){
 MODELS.push({id:prefixed,name:m.name||m.id,provider:'aqua',desc:m.desc||'Fetched from Aqua API'});
 existing.add(prefixed);
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
 <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id.replace('aqua:',''))}${m.premium?' <span style="color:var(--criml);font-size:9px">★ Premium</span>':''}</div></div>
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
 else if(id==='s-crtm'){ST.settings.creativeModel=val;Scr.markSettingsDirty();}
 Modal.close();
 },

 // FIX #15: Image model picker with provider separation (Pollinations vs Aqua)
 imgMpHtml(id,selId){
 const m=IMG_MODELS.find(x=>x.id===selId);
 const provider=m?.provider||'pollinations';
 return`<div><button class="mpbtn" onclick="Scr.openImgMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select image model')}</span><span class="mp-prov" style="color:${provider==='aqua'?'var(--criml)':'var(--gold)'}">${provider==='aqua'?'A':'P'}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'flux')}"></div>`;
 },
 openImgMP(id){
 const cur=$(`#${id}`)?.value;
 const pollis=IMG_MODELS.filter(m=>m.provider==='pollinations');
 const aquas=IMG_MODELS.filter(m=>m.provider==='aqua');
 Modal.open({title:'Select Image Model',narrow:true,content:()=>`<div style="display:flex;flex-direction:column;gap:10px">
 <div class="plbl">📡 Pollinations</div>
 <div class="mlist">${
 pollis.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selImgModel('${id}','${m.id}','${esc(m.name)}')">
 <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div><div style="font-size:11px;color:var(--tdim)">${esc(m.desc||'')}</div></div>
 ${m.rec?'<span class="mopt-rec">★ Rec</span>':''}
 </div>`).join('')
 }</div>
 <div class="plbl">🔱 Aqua ${!ST.settings.aquaKey?'<span style="font-size:9px">(add key in Settings)</span>':''}</div>
 <div class="mlist">${
 aquas.length?aquas.map(m=>`<div class="mopt ${m.id===cur?'sel':''}" onclick="Scr.selImgModel('${id}','${m.id}','${esc(m.name)}')">
 <div><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id.replace('aqua:',''))}</div></div>
 </div>`).join(''):'<div style="padding:10px;color:var(--tmut);font-size:11px">No Aqua image models available. Add API key in Settings → Providers.</div>'
 }</div>
 </div>`});
 },
 selImgModel(id,val,name){
 const inp=$(`#${id}`);const lbl=$(`#${id}-lbl`);
 if(inp)inp.value=val;if(lbl)lbl.textContent=name;
 if(id==='s-imgm'){ST.settings.imgModel=val;Scr.markSettingsDirty();}
 else if(id==='s-crimgm'){ST.settings.creativeImgModel=val;Scr.markSettingsDirty();}
 Modal.close();
 },

 // FIX #15: TTS model picker
 ttsMpHtml(id,selId){
 const m=TTS_MODELS.find(x=>x.id===selId);
 return`<div><button class="mpbtn" onclick="Scr.openTTSMP('${id}')" id="${id}-btn"><span id="${id}-lbl">${esc(m?.name||selId||'Select TTS model')}</span><span class="arr">▼</span></button><input type="hidden" id="${id}" value="${esc(selId||'openai-audio')}"></div>`;
 },
 openTTSMP(id){
 const cur=$(`#${id}`)?.value;
 Modal.open({title:'Select TTS Model',narrow:true,content:()=>`<div class="mlist">${
 TTS_MODELS.map(m=>`<div class="vopt ${m.id===cur?'sel':''}" onclick="Scr.selTTSModel('${id}','${m.id}','${esc(m.name)}')">
 <div style="flex:1"><div style="font-weight:600">${esc(m.name)}</div><div class="mopt-id">${esc(m.id)}</div></div>
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
