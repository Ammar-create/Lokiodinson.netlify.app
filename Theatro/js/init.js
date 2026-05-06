'use strict';
// ===== INIT =====
async function init(){
  try{
    const saved=await DB.getSetting('app_settings');
    if(saved)Object.assign(ST.settings,saved);
  }catch{}
  Router.go('dashboard');

  // FIX #16: Onboarding banner — persistent, dismissible Aqua key suggestion
  // Banner only shows on first visit when no Aqua key is set.
  // Dismissal is persisted to IndexedDB via 'banner_dismissed' setting.
  const dismissed=await DB.getSetting('banner_dismissed');
  if(!ST.settings.aquaKey&&!dismissed){
    const banner=document.createElement('div');
    banner.className='onboard-banner';
    banner.innerHTML=`<div class="ob-inner">
      <span class="ob-ico">\ud83d\udd31</span>
      <div class="ob-text"><strong>Unlock premium models</strong> — Add your Aqua API key for Grok controllers and premium characters.</div>
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
