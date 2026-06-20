'use strict';
// ===== SCREENS-UI-SETTINGS =====
Object.assign(Scr,{
 markSettingsDirty:function(){
 Scr._settDirty=true;
 if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
 Scr._settSaveTimer=setTimeout(async function(){if(!Scr._settDirty)return;await DB.setSetting('app_settings',ST.settings);Scr._settDirty=false;},1500);
 },
 settings:async function(){
 var el=document.getElementById('screen-settings');if(!el)return;
 var s=ST.settings;var tab=ST.settTab||'providers';
 var items=[['providers',I('key',14),'Providers'],['models',I('robot',14),'Models'],['controllers',I('gear',14),'Controllers'],['memory',I('brain',14),'Memory'],['tweaks',I('zap',14),'Tweaks'],['themes',I('palette',14),'Themes'],['storage',I('save',14),'Storage']];
 var nav='';
 for(var i=0;i<items.length;i++){var id=items[i][0],ico=items[i][1],label=items[i][2];nav+='<div class="sett-ni'+(tab===id?' on':'')+'" onclick="ST.settTab=\''+id+'\';Scr.settings()"><span>'+ico+'</span><span>'+esc(label)+'</span></div>';}
 var body='';
 if(tab==='providers')body=Scr._providersTab(s);
 else if(tab==='models')body=Scr._modelsTab(s);
 else if(tab==='controllers')body=Scr._controllersTab(s);
 else if(tab==='memory')body=Scr._memoryTab(s);
 else if(tab==='tweaks')body=Scr._tweaksTab(s);
 else if(tab==='themes')body=Scr._themesTab();
 else if(tab==='storage')body=Scr._storageTab();
 el.innerHTML='<nav class="sett-nav">'+nav+'</nav><div class="sett-body">'+body+'</div>';
 },

 _providersTab:function(s){
 var provs=s.providers||[];
 var h='<div class="sett-sec on">';
 for(var i=0;i<provs.length;i++){
 var p=provs[i];
 h+='<div class="sett-grp"><div class="sett-gt">'+esc(p.name);
 if(p.deletable===false)h+=' <span style="font-size:9px;color:var(--gold)">(built-in)</span>';
 if(p.id==='pollinations')h+=' <span style="font-size:9px;color:var(--warn)">(deprecated)</span>';
 h+='</div>';
 h+='<div class="field"><label class="lbl">Base URL</label><input type="url" id="prov-url-'+p.id+'" value="'+esc(p.baseUrl||'')+'" placeholder="https://api.example.com/v1"'+(p.deletable===false?' readonly':'')+' oninput="Scr._updProv(\''+p.id+'\',\'baseUrl\',this.value)"></div>';
 h+='<div class="field"><label class="lbl">API Key</label><input type="password" id="prov-key-'+p.id+'" value="'+esc(p.apiKey||'')+'" placeholder="sk-..." oninput="Scr._updProv(\''+p.id+'\',\'apiKey\',this.value)"></div>';
 if(p.deletable!==false)h+='<button class="btn bd bsm" onclick="Scr._delProv(\''+p.id+'\')">'+I('trash',12)+' Remove</button>';
 h+='</div>';
 }
 h+='<div style="display:flex;gap:10px;flex-wrap:wrap">';
 h+='<button class="btn bp bsm" onclick="Scr._addProv()">'+I('plus',13)+' Add Provider</button>';
 h+='<button class="btn bs bsm" onclick="Scr.fetchProviderModels()">'+I('refresh',12)+' Refresh Models</button>';
 h+='<button class="btn bp bsm" onclick="Scr.saveSettings()">'+I('check',13)+' Save All</button>';
 h+='</div></div>';
 return h;
 },
 _updProv:function(id,key,value){
 var provs=ST.settings.providers||[];var p=provs.find(function(x){return x.id===id;});
 if(p){p[key]=value;Scr.markSettingsDirty();}
 },
 _addProv:async function(){
 var name=await Modal.prompt('Provider name:',{title:'Add Provider',placeholder:'e.g. MyProvider',ok:'Add'});
 if(!name||!name.trim())return;
 var id=name.trim().toLowerCase().replace(/[^a-z0-9]/g,'-');
 if(!ST.settings.providers)ST.settings.providers=[];
 if(ST.settings.providers.find(function(p){return p.id===id;})){Toast.w('Already exists');return;}
 ST.settings.providers.push({id:id,name:name.trim(),baseUrl:'',apiKey:'',deletable:true});
 Scr.markSettingsDirty();Scr.settings();
 },
 _delProv:async function(id){
 var ok=await Modal.confirm('Remove?',{ok:'Remove',danger:true});if(!ok)return;
 ST.settings.providers=ST.settings.providers.filter(function(p){return p.id!==id;});
 Scr.markSettingsDirty();Scr.settings();
 },

 _modelsTab:function(s){
 var h='<div class="sett-sec on">';
 h+='<div class="sett-grp"><div class="sett-gt">Chat Models</div>';
 h+='<div class="field"><label class="lbl">Character Default</label>'+Scr.mpHtml('s-cm',s.charModel||'aqua:deepseek-v4')+'</div>';
 h+='<div class="field"><label class="lbl">Controller Default</label>'+Scr.mpHtml('s-ctm',s.ctrlModel||'aqua:deepseek-v4')+'</div></div>';
 h+='<div class="sett-grp"><div class="sett-gt">Chat Image Generation</div><p style="font-size:11px;color:var(--tmut)">Per-message Image button and auto-image.</p>'+Scr._provMI('img',s.imgProvider||'aqua',s.imgModel||'zimage','e.g. zimage')+'</div>';
 h+='<div class="sett-grp"><div class="sett-gt">Creative Controller Image</div><p style="font-size:11px;color:var(--tmut)">Character profile pics. Falls back to Chat Image.</p>'+Scr._provMI('crimg',s.creativeImgProvider||s.imgProvider||'aqua',s.creativeImgModel||s.imgModel||'zimage','e.g. flux-2')+'</div>';
 h+='<div class="sett-grp"><div class="sett-gt">Creative Controller Text</div><p style="font-size:11px;color:var(--tmut)">Auto-creating characters and scenarios.</p><div class="field"><label class="lbl">Text Model</label>'+Scr.mpHtml('s-crtm',s.creativeModel||s.ctrlModel||'aqua:deepseek-v4')+'</div></div>';
 h+='<div class="sett-grp"><div class="sett-gt">TTS (Aqua MiMo)</div>';
 h+='<div class="field"><label class="lbl">TTS Provider</label>'+Scr._provDD('ttsProv',s.ttsProvider||'aqua')+'</div>';
 h+='<div class="field"><label class="lbl">Standard Model</label><input type="text" id="s-tts" value="'+esc(s.ttsModel||'mimo-v2.5-tts')+'" placeholder="mimo-v2.5-tts" oninput="ST.settings.ttsModel=this.value;Scr.markSettingsDirty()"></div>';
 h+='<div class="field"><label class="lbl">Voice Design Model</label><input type="text" id="s-ttsvd" value="'+esc(s.ttsVoicedesignModel||'mimo-v2.5-tts-voicedesign')+'" placeholder="mimo-v2.5-tts-voicedesign" oninput="ST.settings.ttsVoicedesignModel=this.value;Scr.markSettingsDirty()"></div>';
 h+='<div class="field"><label class="lbl">Voice Clone Model</label><input type="text" id="s-ttsvc" value="'+esc(s.ttsVoicecloneModel||'mimo-v2.5-tts-voiceclone')+'" placeholder="mimo-v2.5-tts-voiceclone" oninput="ST.settings.ttsVoicecloneModel=this.value;Scr.markSettingsDirty()"></div></div>';
 h+='<div class="sett-grp"><div class="sett-gt">STT</div>'+Scr._provMI('stt',s.sttProvider||'pollinations',s.sttModel||'whisper-large-v3','whisper-large-v3')+'</div>';
 h+='<div class="sett-grp"><div class="sett-gt">Default Voice</div><div class="field"><label class="lbl">Voice ID</label>'+Scr.vpHtml('s-dv',s.defVoice||'Mia')+'</div></div>';
 h+='<button class="btn bp bsm" onclick="Scr.saveSettings()">'+I('check',13)+' Save</button></div>';
 return h;
 },
 _provDD:function(key,provId){
 var provs=ST.settings.providers||[];var opt='';
 for(var i=0;i<provs.length;i++){var p=provs[i];opt+='<div class="mopt'+(p.id===provId?' sel':'')+'" onclick="Scr._selPD(\''+key+'\',\''+p.id+'\')">'+esc(p.name)+(p.id===provId?' ✓':'')+'</div>';}
 return '<div style="position:relative"><button class="mpbtn" onclick="Scr._opnPD(\''+key+'\')" id="pdbtn-'+key+'" style="font-size:12px"><span id="pdlbl-'+key+'">'+esc(provs.find(function(p){return p.id===provId;})?provs.find(function(p){return p.id===provId;}).name:provId)+'</span><span class="arr">▼</span></button><div class="mlist" id="pdlst-'+key+'" style="display:none;position:absolute;z-index:100;width:100%">'+opt+'</div></div>';
 },
 _opnPD:function(key){var lst=document.getElementById('pdlst-'+key);if(!lst)return;lst.style.display=lst.style.display==='none'?'block':'none';setTimeout(function(){document.addEventListener('click',function h(e){if(!e.target.closest('#pdbtn-'+key)&&!e.target.closest('#pdlst-'+key)){lst.style.display='none';document.removeEventListener('click',h);}},{once:true});},10);},
 _selPD:function(key,provId){if(key==='ttsProv')ST.settings.ttsProvider=provId;var lbl=document.getElementById('pdlbl-'+key);var provs=ST.settings.providers||[];var p=provs.find(function(x){return x.id===provId;});if(lbl)lbl.textContent=p?p.name:provId;document.getElementById('pdlst-'+key).style.display='none';Scr.markSettingsDirty();},
 _provMI:function(key,provId,modelVal,placeholder){
 var provs=ST.settings.providers||[];var opt='';
 for(var i=0;i<provs.length;i++){var p=provs[i];opt+='<div class="mopt'+(p.id===provId?' sel':'')+'" onclick="Scr._selPM(\''+key+'\',\''+p.id+'\')">'+esc(p.name)+(p.id===provId?' ✓':'')+'</div>';}
 var pname=provId;var fp=provs.find(function(p){return p.id===provId;});if(fp)pname=fp.name;
 return '<div style="display:flex;gap:8px;align-items:flex-end"><div style="flex-shrink:0;min-width:110px"><div class="lbl" style="margin-bottom:3px">Provider</div><button class="mpbtn" onclick="Scr._opnPL(\''+key+'\')" id="pmbtn-'+key+'" style="font-size:12px"><span id="pmlbl-'+key+'">'+esc(pname)+'</span><span class="arr">▼</span></button><div class="mlist" id="pmlst-'+key+'" style="display:none;position:absolute;z-index:100">'+opt+'</div></div><div style="flex:1"><div class="lbl" style="margin-bottom:3px">Model ID</div><input type="text" id="s-'+key+'" value="'+esc(modelVal||'')+'" placeholder="'+esc(placeholder||'')+'" oninput="Scr._setPM(\''+key+'\',this.value)"></div></div>';
 },
 _opnPL:function(key){var lst=document.getElementById('pmlst-'+key);if(!lst)return;lst.style.display=lst.style.display==='none'?'block':'none';setTimeout(function(){document.addEventListener('click',function h(e){if(!e.target.closest('#pmbtn-'+key)&&!e.target.closest('#pmlst-'+key)){lst.style.display='none';document.removeEventListener('click',h);}},{once:true});},10);},
 _selPM:function(key,provId){if(key==='img')ST.settings.imgProvider=provId;else if(key==='crimg')ST.settings.creativeImgProvider=provId;else if(key==='stt')ST.settings.sttProvider=provId;var lbl=document.getElementById('pmlbl-'+key);var p=ST.settings.providers.find(function(x){return x.id===provId;});if(lbl)lbl.textContent=p?p.name:provId;document.getElementById('pmlst-'+key).style.display='none';Scr.markSettingsDirty();},
 _setPM:function(key,val){if(key==='img')ST.settings.imgModel=val;else if(key==='crimg')ST.settings.creativeImgModel=val;else if(key==='stt')ST.settings.sttModel=val;Scr.markSettingsDirty();},

 _controllersTab:function(s){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Main Controller</div>'+
 '<div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Analysis Frequency</label><input type="number" min="3" max="100" value="'+(s.ctrlFreq||10)+'" style="width:70px" oninput="ST.settings.ctrlFreq=parseInt(this.value)||10;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages</span></div>'+
 '<div class="tgl-wrap" onclick="ST.settings.streaming=!ST.settings.streaming;$("#s-stream").classList.toggle("on",ST.settings.streaming);Scr.markSettingsDirty()"><div class="tgl'+(s.streaming!==false?' on':'')+'" id="s-stream"></div><span class="tgl-lbl">Streaming responses</span></div></div>'+
 '<button class="btn bp bsm" onclick="Scr.saveSettings()">Save</button></div>';
 },
 _memoryTab:function(s){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Memory</div>'+
 '<div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Short-term Window</label><input type="number" min="5" max="100" value="'+(s.stWindow||30)+'" style="width:70px" oninput="ST.settings.stWindow=parseInt(this.value)||30;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages</span></div></div>'+
 '<button class="btn bp bsm" onclick="Scr.saveSettings()">Save</button></div>';
 },
 _tweaksTab:function(s){
 return '<div class="sett-sec on">'+
 '<div class="sett-grp"><div class="sett-gt">Image Generation</div>'+
 '<div class="tgl-wrap" onclick="ST.settings.customImagePrompt=!ST.settings.customImagePrompt;$("#tweak-cip").classList.toggle("on",ST.settings.customImagePrompt);Scr.markSettingsDirty()"><div class="tgl'+(s.customImagePrompt?' on':'')+'" id="tweak-cip"></div><span class="tgl-lbl">Custom Prompt Field</span></div></div>'+
 '<div class="sett-grp"><div class="sett-gt">Voice</div>'+
 '<div class="tgl-wrap" onclick="ST.settings.generateVoiceDemo=!ST.settings.generateVoiceDemo;$("#tweak-vd").classList.toggle("on",ST.settings.generateVoiceDemo);Scr.markSettingsDirty()"><div class="tgl'+(s.generateVoiceDemo?' on':'')+'" id="tweak-vd"></div><span class="tgl-lbl">Generate voice demo text</span></div></div>'+
 '<div class="sett-grp"><div class="sett-gt">Memory</div><div style="display:flex;flex-direction:column;gap:12px">'+
 '<button class="btn bs bsm" onclick="Scr.resetMemoryModal()">'+I('refresh',12)+' Reset Memory</button>'+
 '<button class="btn bd bsm" onclick="Scr.clearAllMemories()">'+I('trash',12)+' Clear All Memories</button></div></div>'+
 '<button class="btn bp bsm" onclick="Scr.saveSettings()">Save Tweaks</button></div>';
 },
 _themes:[{id:'proscenium',name:'Proscenium',desc:'Theater gold + crimson',bg:'#08080f',ac:'#c9a84c',sc:'#8b2232'},{id:'stratosphere',name:'Stratosphere',desc:'Cloudy sky-blue',bg:'#0D1520',ac:'#87C8E8',sc:'#4A7A9B'},{id:'noir',name:'Noir',desc:'Monochrome + acid lime',bg:'#0B0B0C',ac:'#C0C0C8',sc:'#D4FF1A'},{id:'verdant',name:'Verdant',desc:'Deep forest + orchid',bg:'#0D1610',ac:'#8FB89A',sc:'#D84B9E'}],
 _themesTab:function(){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Color Palette</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">'+Scr._themeHtml()+'</div></div></div>';
 },
 _themeHtml:function(){
 var cur=ST.settings.theme||'proscenium';
 var h='';
 for(var i=0;i<Scr._themes.length;i++){
 var t=Scr._themes[i];var sel=t.id===cur;
 h+='<div class="th-card'+(sel?' sel':'')+'" onclick="Scr._setTheme(\''+t.id+'\')" style="background:'+t.bg+';border:2px solid '+(sel?t.ac:'var(--border)')+';border-radius:var(--rxl);padding:14px;cursor:pointer;display:flex;flex-direction:column;gap:10px;transition:all var(--t) var(--ease)" onmouseenter="this.style.borderColor=\''+t.ac+'\'" onmouseleave="this.style.borderColor=\''+(sel?t.ac:'var(--border)')+'\'">';
 h+='<div style="display:flex;gap:6px"><div style="width:20px;height:20px;border-radius:50%;background:'+t.bg+';box-shadow:0 0 0 2px var(--border)"></div><div style="width:20px;height:20px;border-radius:50%;background:'+t.ac+'"></div><div style="width:20px;height:20px;border-radius:50%;background:'+t.sc+'"></div></div>';
 h+='<div><div style="font-weight:700;font-size:13px;color:'+t.ac+';font-family:var(--fd);letter-spacing:.04em">'+t.name+'</div><div style="font-size:11px;color:var(--tmut);margin-top:2px">'+t.desc+'</div></div>';
 if(sel)h+='<div style="font-size:10px;color:'+t.ac+';font-weight:700;text-transform:uppercase;letter-spacing:.1em">Active</div>';
 h+='</div>';
 }
 return h;
 },
 _setTheme:function(id){ST.settings.theme=id;document.documentElement.setAttribute('data-theme',id);Scr.markSettingsDirty();Scr.settings();},
 _storageTab:function(){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Data</div><p style="font-size:12px;color:var(--tdim)">All data stored in IndexedDB.</p><div style="display:flex;gap:20px;margin-bottom:12px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="export-images-checkbox" style="width:16px;height:16px;margin:0"><span>'+I('image',14)+' Images</span></label><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="export-audio-checkbox" style="width:16px;height:16px;margin:0"><span>'+I('voice',14)+' Audio</span></label></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn bs bsm" onclick="Scr.exportAll()">'+I('download',12)+' Export</button><button class="btn bs bsm" onclick="Scr.importAll()">'+I('upload',12)+' Import</button><button class="btn bd bsm" onclick="Scr.clearAll()">'+I('trash',14)+' Clear All</button></div></div></div>';
 },
 saveSettings:async function(){
 if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
 document.documentElement.setAttribute('data-theme',ST.settings.theme||'proscenium');
 await DB.setSetting('app_settings',ST.settings);
 Scr._settDirty=false;Toast.s('Settings saved');
 },
 exportAll:async function(){
 var ii=!!document.getElementById('export-images-checkbox')?.checked;
 var ia=!!document.getElementById('export-audio-checkbox')?.checked;
 var data={_theatro:true,version:3,exportedAt:Date.now(),characters:await DB.getAll('characters'),scenarios:await DB.getAll('scenarios'),settings:ST.settings};
 if(ii||ia){var allBlobs=await DB.getAllBlobs();var filtered=allBlobs.filter(function(b){return(ii&&b.kind==='image')||(ia&&b.kind==='audio');});data.blobs=await Promise.all(filtered.map(async function(b){var base64='';try{if(b.blob){base64=await new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result);};r.onerror=rej;r.readAsDataURL(b.blob);});}}catch(e){}return{id:b.id,url:b.url,kind:b.kind,type:b.type,size:b.size,cachedAt:b.cachedAt,data:base64};}));}
 var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='theatro_backup_'+Date.now()+'.json';a.click();Toast.s('Exported');
 },
 importAll:function(){
 var inp=document.createElement('input');inp.type='file';inp.accept='.json';
 inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;try{var data=JSON.parse(await f.text());if(!data._theatro){Toast.e('Not a Theatro backup');return;}var ok=await Modal.confirm('Import?',{ok:'Import'});if(!ok)return;for(var i=0;i<(data.characters||[]).length;i++)await DB.put('characters',data.characters[i]);for(var j=0;j<(data.scenarios||[]).length;j++)await DB.put('scenarios',data.scenarios[j]);if(data.blobs&&Array.isArray(data.blobs)){for(var k=0;k<data.blobs.length;k++){var be=data.blobs[k];if(be.data&&be.data.startsWith('data:')){try{var r=await fetch(be.data);await DB.cacheBlob(be.url,await r.blob(),be.kind);}catch(err){}}}Toast.s('Imported '+data.blobs.length+' blobs');}if(data.settings){Object.assign(ST.settings,data.settings);await DB.setSetting('app_settings',ST.settings);}Toast.s('Import complete');Scr.dashboard();}catch(err){Toast.e('Import failed');}};inp.click();
 },
 clearAll:async function(){
 var ok=await Modal.confirm('Delete ALL data?',{ok:'Delete',danger:true});if(!ok)return;
 var r=indexedDB.deleteDatabase('theatro');r.onsuccess=function(){Toast.s('Cleared. Reloading...');setTimeout(function(){location.reload();},1500);};
 }
});