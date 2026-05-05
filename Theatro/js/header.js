'use strict';
// ===== HEADER =====
const Hdr={
  render(screen){
    const h=$('#app-header');if(!h)return;
    const isDash=['dashboard','char-create','scenario-create','settings'].includes(screen);
    const isChat=screen==='chat';
    h.innerHTML=`<div class="hdr">
      <div class="logo" onclick="Router.go('dashboard')">THEAT<span>RO</span></div>
      ${isDash?`<nav class="hdr-nav">
        <button class="hnbtn ${screen==='dashboard'?'on':''}" onclick="Router.go('dashboard')">Dashboard</button>
        <button class="hnbtn ${screen==='settings'?'on':''}" onclick="Router.go('settings')">Settings</button>
      </nav>`:''}
      ${isChat?`<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <button class="ibtn" onclick="Router.go('dashboard')">${I('back',16)}</button>
        <span style="font-family:var(--fd);font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ST.chat.scenario?.name||'Chat')}</span>
        <span style="font-size:11px;color:var(--tmut);flex-shrink:0">${ST.chat.characters.length} chars</span>
      </div>`:''}
      <div class="hdr-right">
        ${isChat?`
          <button class="btn bs bsm" onclick="Chat.saveJSON()">${I('download',13)} Save</button>
          <button class="btn bg bsm" onclick="Chat.loadJSON()">${I('upload',13)} Load</button>
          <button class="ibtn" title="Settings" onclick="Router.go('settings')">${I('settings',15)}</button>
        `:`
          <button class="btn bp bsm" onclick="Scr.newScenario()">${I('plus',13)} Scenario</button>
          <button class="btn bg bsm" onclick="Scr.newChar()">${I('plus',13)} Character</button>
        `}
      </div>
    </div>`;
  }
};