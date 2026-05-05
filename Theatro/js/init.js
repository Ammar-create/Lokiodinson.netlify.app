'use strict';
// ===== INIT =====
async function init(){
  try{
    const saved=await DB.getSetting('app_settings');
    if(saved)Object.assign(ST.settings,saved);
  }catch{}
  Router.go('dashboard');
  const chars=await DB.getAll('characters');
  if(!chars.length){
    setTimeout(()=>{
      Toast.i('Welcome to Theatro! Create characters, then build a scenario to begin.',7000);
    },500);
  }
}

init().catch(e=>console.error('Init failed:',e));