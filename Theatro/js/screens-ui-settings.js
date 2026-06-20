'use strict';
// ===== SCREENS-UI-SETTINGS =====
Object.assign(Scr,{
 markSettingsDirty(){
 Scr._settDirty=true;
 if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
 Scr._settSaveTimer=setTimeout(async()=>{if(!Scr._settDirty)return;await DB.setSetting('app_settings',ST.settings);Scr._settDirty=false;},1500);
 },
 async settings(){
 const el=$('#screen-settings');if(!el)return;
 const s=ST.settings;const tab=ST.settTab||'providers';
 el.innerHTML='<nav class="sett-nav">'+
 [['providers',I('key',14),'Providers'],['models',I('robot',14),'Models'],['controllers',I('gear',14),'Controllers'],['memory',I('brain',14),'Memory'],['tweaks',I('zap',14),'Tweaks'],['themes',I('palette',14),'Themes'],['storage',I('save',14),'Storage']].map(function(a){
 var id=a[0],ico=a[1],label=a[2];
 return '<div class="sett-ni'+(tab===id?' on':'')+'" onclick="ST.settTab=\''+id+'\';Scr.settings()"><span>'+ico+'</span><span>'+esc(label)+'</span></div>';
 }).join('')+'</nav>'+
 '<div class="sett-body">'+
 (tab==='providers'?Scr._providersTab(s):'')+
 (tab==='models'?Scr._modelsTab(s):'')+
 (tab==='controllers'?Scr._controllersTab(s):'')+
 (tab==='memory'?Scr._memoryTab(s):'')+
 (tab==='tweaks'?Scr._tweaksTab(s):'')+
 (tab==='themes'?Scr._themesTab():'')+
 (tab==='storage'?Scr._storageTab():'')+
 '</div>';
 },

 _providersTab(s){
 var provs=s.providers||[];
 return '<div class="sett-sec on">'+
 provs.map(function(p){
 var h='<div class="sett-grp"><div class="sett-gt">'+esc(p.name);
 if(p.deletable===false)h+=' <span style="font-size:9px;color:var(--gold)">(built-in)</span>';
 if(p.id==='pollinations')h+=' <span style="font-size:9px;color:var(--warn)">(deprecated Jun 22)</span>';
 h+='</div><div class="field"><label class="lbl">Base URL</label><input type="url" value="'+esc(p.baseUrl||'')+'" placeholder="https://api.example.com/v1"'+(p.deletable===false?' readonly':'')+' oninput="Scr._updateProvider(\''+p.id+'\',\'baseUrl\',this.value)"></div>';
 h+='<div class="field"><label class="lbl">API Key</label><input type="password" value="'+esc(p.apiKey||'')+'" placeholder="sk-..." oninput="Scr._updateProvider(\''+p.id+'\',\'apiKey\',this.value)"></div>';
 if(p.deletable!==false)h+='<button class="btn bd bsm" onclick="Scr._deleteProvider(\''+p.id+'\')">'+I('trash',12)+' Remove</button>';
 return h+'</div>';
 }).join('')+
 '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
 '<button class="btn bp bsm" onclick="Scr._addProvider()">'+I('plus',13)+' Add Provider</button>'+
 '<button class="btn bs bsm" onclick="Scr.fetchProviderModels()">'+I('refresh',12)+' Refresh Model List</button>'+
 '<button class="btn bp bsm" onclick="Scr.saveSettings()">'+I('check',13)+' Save All Settings</button>'+
 '</div></div>';
 },
 _updateProvider(id,key,value){
 var provs=ST.settings.providers||[];
 var p=provs.find(function(x){return x.id===id;});
 if(p){p[key]=value;Scr.markSettingsDirty();}
 },
 async _addProvider(){
 var name=await Modal.prompt('Provider name:',{title:'Add Provider',placeholder:'e.g. MyProvider',ok:'Add'});
 if(!name||!name.trim())return;
 var id=name.trim().toLowerCase().replace(/[^a-z0-9]/g,'-');
 if(!ST.settings.providers)ST.settings.providers=[];
 if(ST.settings.providers.find(function(p){return p.id===id;})){Toast.w('Already exists');return;}
 ST.settings.providers.push({id:id,name:name.trim(),baseUrl:'',apiKey:'',deletable:true});
 Scr.markSettingsDirty();Scr.settings();
 },
 async _deleteProvider(id){
 var ok=await Modal.confirm('Remove this provider?',{ok:'Remove',danger:true});
 if(!ok)return;
 ST.settings.providers=ST.settings.providers.filter(function(p){return p.id!==id;});
 Scr.markSettingsDirty();Scr.settings();
 },

 _modelsTab(s){
 var h='<div class="sett-sec on">';
 h+='<div class="sett-grp"><div class="sett-gt">Chat Models</div>';
 h+='<div class="field"><label class="lbl">Character Default</label>'+Scr.mpHtml('s-cm',s.charModel||'aqua:deepseek-v4')+'</div>';
 h+='<div class="field"><label class="lbl">Controller Default</label>'+Scr.mpHtml('s-ctm',s.ctrlModel||'aqua:deepseek-v4')+'</div></div>';
 h+='<div class="sett-grp"><div class="sett-gt">Chat Image Generation</div><p style="font-size:11px;color:var(--tmut)">Used for per-message Image button and auto-image in chat.</p>'+Scr._provModelInput('img',s.imgProvider||'aqua',s.imgModel||'zimage','e.g. zimage')+'</div>';
 h+='<div class="sett-grp"><div class="sett-gt">Creative Controller Image</div><p style="font-size:11px;color:var(--tmut)">Used for character profile pictures. Falls back to Chat Image.</p>'+Scr._provModelInput('crimg',s.creativeImgProvider||s.imgProvider||'aqua',s.creativeImgModel||s.imgModel||'zimage','e.g. flux-2')+'</div>';
 h+='<div class="sett-grp"><div class="sett-gt">Creative Controller Text</div><p style="font-size:11px;color:var(--tmut)">Used for auto-creating characters and scenarios.</p><div class="field"><label class="lbl">Text Model</label>'+Scr.mpHtml('s-crtm',s.creativeModel||s.ctrlModel||'aqua:deepseek-v4')+'</div></div>';
 h+='<div class="sett-grp"><div class="sett-gt">TTS - Aqua MiMo</div><p style="font-size:11px;color:var(--tmut)">One provider, three model IDs.</p>';
 h+='<div class="field"><label class="lbl">TTS Provider</label>'+Scr._provDropdown('ttsProv',s.ttsProvider||'aqua')+'</div>';
 h+='<div class="field"><label class="lbl">Standard Model ID</label><input type="text" id="s-tts" value="'+esc(s.ttsModel||'mimo-v2.5-tts')+'" placeholder="mimo-v2.5-tts" oninput="ST.settings.ttsModel=this.value;Scr.markSettingsDirty()"></div>';
 h+='<div class="field"><label class="lbl">Voice Design Model ID</label><input type="text" id="s-ttsvd" value="'+esc(s.ttsVoicedesignModel||'mimo-v2.5-tts-voicedesign')+'" placeholder="mimo-v2.5-tts-voicedesign" oninput="ST.settings.ttsVoicedesignModel=this.value;Scr.markSettingsDirty()"></div>';
 h+='<div class="field"><label class="lbl">Voice Clone Model ID</label><input type="text" id="s-ttsvc" value="'+esc(s.ttsVoicecloneModel||'mimo-v2.5-tts-voiceclone')+'" placeholder="mimo-v2.5-tts-voiceclone" oninput="ST.settings.ttsVoicecloneModel=this.value;Scr.markSettingsDirty()"></div></div>';
 h+='<div class="sett-grp"><div class="sett-gt">STT (Speech-to-Text)</div>'+Scr._provModelInput('stt',s.sttProvider||'pollinations',s.sttModel||'whisper-large-v3','e.g. whisper-large-v3')+'</div>';
 h+='<div class="sett-grp"><div class="sett-gt">Default Voice</div><p style="font-size:11px;color:var(--tmut)">Standard voice for characters without a voice description.</p><div class="field"><label class="lbl">Voice ID</label>'+Scr.vpHtml('s-dv',s.defVoice||'Mia')+'</div></div>';
 h+='<button class="btn bp bsm" onclick="Scr.saveSettings()">'+I('check',13)+' Save Model Settings</button></div>';
 return h;
 },
 _provDropdown(key,provId){
 var provs=ST.settings.providers||[];
 var opt=provs.map(function(p){
 return '<div class="mopt'+(p.id===provId?' sel':'')+'" onclick="Scr._selProvDrop(\''+key+'\',\''+p.id+'\')">'+esc(p.name)+(p.id===provId?' <span style="color:var(--gold)">&#10003;</span>':'')+'</div>';
 }).join('');
 return '<div style="position:relative"><button class="mpbtn" onclick="Scr._openProvDrop(\''+key+'\')" id="provdrp-'+key+'" style="font-size:12px"><span id="provdrplbl-'+key+'">'+esc(provs.find(function(p){return p.id===provId;})?.name||provId)+'</span><span class="arr">&#9660;</span></button><div class="mlist" id="provdrplist-'+key+'" style="display:none;position:absolute;z-index:100;width:100%">'+opt+'</div></div>';
 },
 _openProvDrop(key){
 var lst=document.getElementById('provdrplist-'+key);if(!lst)return;
 lst.style.display=lst.style.display==='none'?'block':'none';
 setTimeout(function(){document.addEventListener('click',function h(e){if(!e.target.closest('#provdrp-'+key)&&!e.target.closest('#provdrplist-'+key)){lst.style.display='none';document.removeEventListener('click',h);}},{once:true});},10);
 },
 _selProvDrop(key,provId){
 if(key==='ttsProv')ST.settings.ttsProvider=provId;
 var lbl=document.getElementById('provdrplbl-'+key);var provs=ST.settings.providers||[];
 if(lbl)lbl.textContent=provs.find(function(p){return p.id===provId;})?.name||provId;
 document.getElementById('provdrplist-'+key).style.display='none';
 Scr.markSettingsDirty();
 },
 _provModelInput(key,provId,modelVal,placeholder){
 var provs=ST.settings.providers||[];
 var opt=provs.map(function(p){
 return '<div class="mopt'+(p.id===provId?' sel':'')+'" onclick="Scr._setProvModelProv(\''+key+'\',\''+p.id+'\')">'+esc(p.name)+(p.id===provId?' <span style="color:var(--gold)">&#10003;</span>':'')+'</div>';
 }).join('');
 return '<div style="display:flex;gap:8px;align-items:flex-end">'+
 '<div style="flex-shrink:0;min-width:120px"><div class="lbl" style="margin-bottom:3px">Provider</div><button class="mpbtn" onclick="Scr._openProvList(\''+key+'\')" id="provbtn-'+key+'" style="font-size:12px"><span id="provlbl-'+key+'">'+esc(provs.find(function(p){return p.id===provId;})?.name||provId)+'</span><span class="arr">&#9660;</span></button><div class="mlist" id="provlist-'+key+'" style="display:none;position:absolute;z-index:100">'+opt+'</div></div>'+
 '<div style="flex:1"><div class="lbl" style="margin-bottom:3px">Model ID</div><input type="text" id="s-'+key+'" value="'+esc(modelVal||'')+'" placeholder="'+esc(placeholder||'')+'" oninput="Scr._setProvModel(\''+key+'\',this.value)"></div></div>';
 },
 _openProvList(key){
 var lst=document.getElementById('provlist-'+key);if(!lst)return;
 lst.style.display=lst.style.display==='none'?'block':'none';
 setTimeout(function(){document.addEventListener('click',function h(e){if(!e.target.closest('#provbtn-'+key)&&!e.target.closest('#provlist-'+key)){lst.style.display='none';document.removeEventListener('click',h);}},{once:true});},10);
 },
 _setProvModelProv(key,provId){
 if(key==='img')ST.settings.imgProvider=provId;
 else if(key==='crimg')ST.settings.creativeImgProvider=provId;
 else if(key==='stt')ST.settings.sttProvider=provId;
 var lbl=document.getElementById('provlbl-'+key);var provs=ST.settings.providers||[];
 if(lbl)lbl.textContent=provs.find(function(p){return p.id===provId;})?.name||provId;
 document.getElementById('provlist-'+key).style.display='none';
 Scr.markSettingsDirty();
 },
 _setProvModel(key,val){
 if(key==='img')ST.settings.imgModel=val;
 else if(key==='crimg')ST.settings.creativeImgModel=val;
 else if(key==='stt')ST.settings.sttModel=val;
 Scr.markSettingsDirty();
 },

 _controllersTab(s){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Main Controller</div>'+
 '<div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Analysis Frequency</label><input type="number" min="3" max="100" value="'+(s.ctrlFreq||10)+'" style="width:70px" oninput="ST.settings.ctrlFreq=parseInt(this.value)||10;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages between runs</span></div>'+
 '<div class="tgl-wrap" onclick="ST.settings.streaming=!ST.settings.streaming;document.getElementById(\'s-stream\').classList.toggle(\'on\',ST.settings.streaming);Scr.markSettingsDirty()"><div class="tgl'+(s.streaming!==false?' on':'')+'" id="s-stream"></div><span class="tgl-lbl">Enable streaming responses</span></div></div>'+
 '<button class="btn bp bsm" onclick="Scr.saveSettings()">Save Controller Settings</button></div>';
 },
 _memoryTab(s){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Memory Configuration</div>'+
 '<div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Short-term Window</label><input type="number" min="5" max="100" value="'+(s.stWindow||30)+'" style="width:70px" oninput="ST.settings.stWindow=parseInt(this.value)||30;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages in context</span></div></div>'+
 '<button class="btn bp bsm" onclick="Scr.saveSettings()">Save Memory Settings</button></div>';
 },
 _tweaksTab(s){
 return '<div class="sett-sec on">'+
 '<div class="sett-grp"><div class="sett-gt">Character Image Generation</div>'+
 '<div class="tgl-wrap" onclick="ST.settings.customImagePrompt=!ST.settings.customImagePrompt;document.getElementById(\'tweak-cip\').classList.toggle(\'on\',ST.settings.customImagePrompt);Scr.markSettingsDirty()"><div class="tgl'+(s.customImagePrompt?' on':'')+'" id="tweak-cip"></div><span class="tgl-lbl">Custom Prompt Field</span></div></div>'+
 '<div class="sett-grp"><div class="sett-gt">Voice Demo</div>'+
 '<div class="tgl-wrap" onclick="ST.settings.generateVoiceDemo=!ST.settings.generateVoiceDemo;document.getElementById(\'tweak-vd\').classList.toggle(\'on\',ST.settings.generateVoiceDemo);Scr.markSettingsDirty()"><div class="tgl'+(s.generateVoiceDemo?' on':'')+'" id="tweak-vd"></div><span class="tgl-lbl">Generate voice demo text</span></div></div>'+
 '<div class="sett-grp"><div class="sett-gt">Memory Management</div><div style="display:flex;flex-direction:column;gap:12px">'+
 '<button class="btn bs bsm" onclick="Scr.resetMemoryModal()">'+I('refresh',12)+' Reset Memory</button>'+
 '<button class="btn bd bsm" onclick="Scr.clearAllMemories()">'+I('trash',12)+' Clear All Memories</button></div></div>'+
 '<button class="btn bp bsm" onclick="Scr.saveSettings()">Save Tweaks</button></div>';
 },
 _themes:[{id:'proscenium',name:'Proscenium',desc:'Theater gold + crimson',bg:'#08080f',ac:'#c9a84c',sc:'#8b2232'},{id:'stratosphere',name:'Stratosphere',desc:'Cloudy sky-blue',bg:'#0D1520',ac:'#87C8E8',sc:'#4A7A9B'},{id:'noir',name:'Noir',desc:'Monochrome + acid lime',bg:'#0B0B0C',ac:'#C0C0C8',sc:'#D4FF1A'},{id:'verdant',name:'Verdant',desc:'Deep forest + orchid',bg:'#0D1610',ac:'#8FB89A',sc:'#D84B9E'}],
 _themesTab(){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Color Palette</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">'+Scr._themeHtml()+'</div></div></div>';
 },
 _themeHtml(){
 var cur=ST.settings.theme||'proscenium';
 return Scr._themes.map(function(t){
 var sel=t.id===cur;
 return '<div class="th-card'+(sel?' sel':'')+'" onclick="Scr._setTheme(\''+t.id+'\')" style="background:'+t.bg+';border:2px solid '+(sel?t.ac:'var(--border)')+';border-radius:var(--rxl);padding:14px;cursor:pointer;display:flex;flex-direction:column;gap:10px;transition:all var(--t) var(--ease)" onmouseenter="this.style.borderColor=\''+t.ac+'\'" onmouseleave="this.style.borderColor=\''+(sel?t.ac:'var(--border)')+'\'">'+
 '<div style="display:flex;gap:6px"><div style="width:20px;height:20px;border-radius:50%;background:'+t.bg+';box-shadow:0 0 0 2px var(--border)"></div><div style="width:20px;height:20px;border-radius:50%;background:'+t.ac+'"></div><div style="width:20px;height:20px;border-radius:50%;background:'+t.sc+'"></div></div>'+
 '<div><div style="font-weight:700;font-size:13px;color:'+t.ac+';font-family:var(--fd);letter-spacing:.04em">'+t.name+'</div><div style="font-size:11px;color:var(--tmut);margin-top:2px">'+t.desc+'</div></div>'+
 (sel?'<div style="font-size:10px;color:'+t.ac+';font-weight:700;text-transform:uppercase;letter-spacing:.1em">Active</div>':'')+'</div>';
 }).join('');
 },
 _setTheme(id){ST.settings.theme=id;document.documentElement.setAttribute('data-theme',id);Scr.markSettingsDirty();Scr.settings();},
 _storageTab(){
 return '<div class="sett-sec on"><div class="sett-grp"><div class="sett-gt">Data Management</div><p style="font-size:12px;color:var(--tdim)">All data stored in IndexedDB. Export regularly to back up.</p><div style="display:flex;gap:20px;margin-bottom:12px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="export-images-checkbox" style="width:16px;height:16px;margin:0"><span>'+I('image',14)+' Export images</span></label><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="export-audio-checkbox" style="width:16px;height:16px;margin:0"><span>'+I('voice',14)+' Export audio</span></label></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn bs bsm" onclick="Scr.exportAll()">'+I('download',12)+' Export All</button><button class="btn bs bsm" onclick="Scr.importAll()">'+I('upload',12)+' Import</button><button class="btn bd bsm" onclick="Scr.clearAll()">'+I('trash',14)+' Clear Everything</button></div></div></div>';
 },

 async saveSettings(){
 if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
 document.documentElement.setAttribute('data-theme',ST.settings.theme||'proscenium');
 await DB.setSetting('app_settings',ST.settings);
 Scr._settDirty=false;Toast.s('Settings saved');
 },
 async exportAll(){
 var ii=!!document.getElementById('export-images-checkbox')?.checked;
 var ia=!!document.getElementById('export-audio-checkbox')?.checked;
 var data={_theatro:true,version:3,exportedAt:Date.now(),characters:await DB.getAll('characters'),scenarios:await DB.getAll('scenarios'),settings:ST.settings};
 if(ii||ia){
 var allBlobs=await DB.getAllBlobs();
 var filtered=allBlobs.filter(function(b){return(ii&&b.kind==='image')||(ia&&b.kind==='audio');});
 var blobEntries=await Promise.all(filtered.map(async function(b){var base64='';try{if(b.blob){var reader=new FileReader();var promise=new Promise(function(res,rej){reader.onload=function(){return res(reader.result);};reader.onerror=rej;});reader.readAsDataURL(b.blob);base64=await promise;}}catch(err){Ctrl?.dlog?.('Blob convert failed: '+err.message,'warn');}return{id:b.id,url:b.url,kind:b.kind,type:b.type,size:b.size,cachedAt:b.cachedAt,data:base64};}));
 data.blobs=blobEntries;
 }
 var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='theatro_backup_'+Date.now()+'.json';a.click();Toast.s('Exported');
 },
 async importAll(){
 var inp=document.createElement('input');inp.type='file';inp.accept='.json';
 inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;try{var data=JSON.parse(await f.text());if(!data._theatro){Toast.e('Not a Theatro backup');return;}var ok=await Modal.confirm('Import?',{ok:'Import'});if(!ok)return;for(var i=0;i<(data.characters||[]).length;i++)await DB.put('characters',data.characters[i]);for(var j=0;j<(data.scenarios||[]).length;j++)await DB.put('scenarios',data.scenarios[j]);if(data.version>=2&&data.blobs&&Array.isArray(data.blobs)){for(var k=0;k<data.blobs.length;k++){var be=data.blobs[k];if(be.data&&be.data.startsWith('data:')){try{var resp=await fetch(be.data);var blob=await resp.blob();await DB.cacheBlob(be.url,blob,be.kind);}catch(err){Ctrl?.dlog?.('Blob restore failed: '+err.message,'warn');}}}Toast.s('Imported '+data.blobs.length+' blobs');}if(data.settings){Object.assign(ST.settings,data.settings);await DB.setSetting('app_settings',ST.settings);}Toast.s('Import complete');Scr.dashboard();}catch(err){Toast.e('Import failed');}};inp.click();
 },
 async clearAll(){
 var ok=await Modal.confirm('Delete ALL data? Cannot be undone.',{ok:'Delete Everything',danger:true});if(!ok)return;
 var r=indexedDB.deleteDatabase('theatro');r.onsuccess=function(){Toast.s('All data cleared. Reloading...');setTimeout(function(){location.reload();},1500);};
 }
});