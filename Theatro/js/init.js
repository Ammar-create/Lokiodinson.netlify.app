'use strict';
// ===== INIT =====
async function init(){
 try{
 const saved=await DB.getSetting('app_settings');
 if(saved)Object.assign(ST.settings,saved);
 }catch{}
 // Sync legacy keys to providers array
 if(ST.settings.aquaKey&&ST.settings.providers){
 const aqua=ST.settings.providers.find(p=>p.id==='aqua');
 if(aqua&&!aqua.apiKey)aqua.apiKey=ST.settings.aquaKey;
 }
 // Ensure providers array exists
 if(!ST.settings.providers||!ST.settings.providers.length){
 ST.settings.providers=[
 {id:'aqua',name:'Aqua',baseUrl:'https://api.aquadevs.com/v1',apiKey:ST.settings.aquaKey||'',deletable:false},
 {id:'pollinations',name:'Pollinations (deprecated)',baseUrl:'https://gen.pollinations.ai/v1',apiKey:ST.settings.pollinationsKey||'pk_LUy70Tu8OwLI1HrU',deletable:false},
 ];
 }
 // Apply saved theme before first render
 document.documentElement.setAttribute('data-theme',ST.settings.theme||'proscenium');
 Router.go('dashboard');

 // Load persisted chat models from IndexedDB
 try{await Scr._loadPersistedModels();}catch(e){}

 // Onboarding banner
 const dismissed=await DB.getSetting('banner_dismissed');
 const aquaProv=ST.settings.providers?.find(p=>p.id==='aqua');
 if(!aquaProv?.apiKey&&!ST.settings.aquaKey&&!dismissed){
 const banner=document.createElement('div');
 banner.className='onboard-banner';
 banner.innerHTML=`<div class="ob-inner">
 <span class="ob-ico">${I('trident',20)}</span>
 <div class="ob-text"><strong>Unlock premium models</strong> — Add your Aqua API key in Settings → Providers for DeepSeek V4, Grok, and voice generation.</div>
 <button class="btn bp bsm ob-action" onclick="Router.go('settings');ST.settTab='providers';this.closest('.onboard-banner').remove()">Add Key</button>
 <button class="ob-x" onclick="DB.setSetting('banner_dismissed',true);this.closest('.onboard-banner').remove()">&times;</button>
 </div>`;
 const app=$('#app');
 if(app)app.insertBefore(banner,app.children[1]||null);
 }

 const chars=await DB.getAll('characters');
 if(!chars.length){
 setTimeout(()=>{
 Toast.i('Welcome to Theatro! Create characters, then build a scenario to begin.',7000);
 },500);
 }
}

init().catch(e=>console.error('Init failed:',e));
