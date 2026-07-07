/* ===================================================================
   SUNNY DECK // RETRO  —  inventory.js
   Items & props. Per-character inventories live on the session
   (sess.inventory[charKey] = [{id,name,emoji,desc,qty,addedAt}]).
   A 🎒 toolbar button opens a quest-panel-style list with add /
   give / drop / use actions. Characters "know" what they carry via
   a prompt note riding the existing reply call, and an optional
   cheap Task Controller tick picks up items exchanged in dialogue
   (mirrors stageDirectionTick economics). No new stores, no schema
   bump — plain lazy-init session state.
   =================================================================== */
'use strict';

const INV_MAX_ITEMS=30;
const INV_NAME_MAX=40;
const INV_TICK_MIN_NEW=4;

let invOpen=false;

/* ====================== STATE HELPERS ====================== */
function ensureInventory(sess){
  if(!sess.inventory||typeof sess.inventory!=='object')sess.inventory={};
  return sess.inventory;
}
function invList(sess,charKey){
  const inv=ensureInventory(sess);
  if(!Array.isArray(inv[charKey]))inv[charKey]=[];
  return inv[charKey];
}
function invSanitizeName(s){return String(s||'').trim().slice(0,INV_NAME_MAX);}
function invMakeItem(name,emoji,qty,desc){
  return{
    id:'itm-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
    name:invSanitizeName(name),
    emoji:String(emoji||'📦').trim().slice(0,4)||'📦',
    desc:String(desc||'').trim().slice(0,140),
    qty:Math.min(99,Math.max(1,Math.floor(+qty)||1)),
    addedAt:Date.now()
  };
}
function invAdd(sess,charKey,item){
  const list=invList(sess,charKey);
  if(!item.name)return false;
  const existing=list.find(i=>i.name.toLowerCase()===item.name.toLowerCase());
  if(existing){existing.qty=Math.min(99,existing.qty+item.qty);return true;}
  if(list.length>=INV_MAX_ITEMS)return false;
  list.push(item);
  return true;
}

/* ====================== EVENT NARRATION ====================== */
function invPushEvent(text){
  const sess=currentSession;if(!sess)return;
  const h={kind:'event',speakerKey:'',speaker:'Narrator',text,timestamp:Date.now()};
  if(typeof addChatBubble==='function')addChatBubble(h);
  sess.history.push(h);
  sess.lastActiveAt=Date.now();
}

/* ====================== TOOLBAR HOOKS ====================== */
function inventoryBtnHTML(){
  return`<button class="icon-btn ${invOpen?'is-on':''}" id="invBtn" title="Inventory & props">🎒</button>`;
}
function bindInventoryBtn(){
  const b=document.getElementById('invBtn');
  if(b)b.onclick=()=>{invOpen=!invOpen;renderInvPanel();b.classList.toggle('is-on',invOpen);};
}

/* ====================== PANEL ====================== */
function renderInvPanel(){
  const panel=document.getElementById('invPanel');if(!panel)return;
  const sess=currentSession,realm=currentRealm;
  if(!sess||!realm||!invOpen){panel.style.display='none';panel.innerHTML='';return;}
  const player=realm.characters.find(c=>c.key===sess.playerKey);
  const items=invList(sess,sess.playerKey);
  panel.style.display='block';
  panel.innerHTML=`
    <div class="inv-head">
      <div class="inv-title">🎒 ${esc(player?player.name.toUpperCase():'YOUR')} PACK (${items.length})</div>
      <button class="quest-mini-btn" id="invAddBtn">+ ADD</button>
      <button class="quest-mini-btn" id="invCloseBtn">HIDE</button>
    </div>
    ${items.length?`<div class="inv-items">${items.map(i=>`
      <div class="inv-item" data-id="${esc(i.id)}">
        <span class="inv-emoji">${esc(i.emoji)}</span>
        <span class="inv-name" title="${esc(i.desc||i.name)}">${esc(i.name)}</span>
        ${i.qty>1?`<span class="inv-qty">×${i.qty}</span>`:''}
        <button data-act="use" title="Use it in the scene">USE</button>
        <button data-act="give" title="Hand it to someone">GIVE</button>
        <button data-act="drop" class="danger" title="Drop it">DROP</button>
      </div>`).join('')}</div>`
    :`<div class="inv-empty">EMPTY. PICK THINGS UP OR + ADD THEM.</div>`}`;
  panel.querySelector('#invCloseBtn').onclick=()=>{invOpen=false;renderInvPanel();document.getElementById('invBtn')?.classList.remove('is-on');};
  panel.querySelector('#invAddBtn').onclick=openInvAddModal;
  panel.querySelectorAll('.inv-item button').forEach(b=>{
    b.onclick=()=>invItemAction(b.closest('.inv-item').dataset.id,b.dataset.act);
  });
}

function openInvAddModal(){
  openModal('ADD ITEM',`
    <div class="field"><label>Emoji</label><input id="inv-emoji" placeholder="🗡" maxlength="4"></div>
    <div class="field"><label>Name</label><input id="inv-name" placeholder="e.g. Rusty sword" maxlength="${INV_NAME_MAX}"></div>
    <div class="field"><label>Quantity</label><input id="inv-qty" type="number" min="1" max="99" value="1"></div>
    <div class="field"><label>Note (optional)</label><input id="inv-desc" placeholder="What is it?" maxlength="140"></div>
    <div class="btn-row"><button class="btn btn-primary" id="inv-save">ADD TO PACK</button></div>
  `);
  document.getElementById('inv-save').onclick=async()=>{
    const item=invMakeItem(
      document.getElementById('inv-name').value,
      document.getElementById('inv-emoji').value,
      document.getElementById('inv-qty').value,
      document.getElementById('inv-desc').value);
    if(!item.name){toast('NAME REQUIRED');return;}
    const sess=currentSession;if(!sess)return;
    if(!invAdd(sess,sess.playerKey,item)){toast('PACK IS FULL (30 ITEMS)');return;}
    await dbPut('sessions',sess);
    closeModal();renderInvPanel();
    toast(item.name.toUpperCase()+' ADDED');
    if(typeof bumpStat==='function')bumpStat('itemsCollected',1,currentRealm?.id);
  };
}

async function invItemAction(id,act){
  const sess=currentSession,realm=currentRealm;if(!sess||!realm)return;
  const list=invList(sess,sess.playerKey);
  const item=list.find(i=>i.id===id);if(!item)return;
  const player=realm.characters.find(c=>c.key===sess.playerKey);
  const pname=player?player.name:'You';
  if(act==='drop'){
    sess.inventory[sess.playerKey]=list.filter(i=>i.id!==id);
    await dbPut('sessions',sess);
    renderInvPanel();toast(item.name.toUpperCase()+' DROPPED');
    return;
  }
  if(act==='use'){
    invPushEvent(`${pname} uses ${item.emoji} ${item.name}${item.desc?` (${item.desc})`:''}.`);
    await dbPut('sessions',sess);
    toast('USED — THE SCENE SEES IT');
    return;
  }
  if(act==='give'){
    const others=realm.characters.filter(c=>c.key!==sess.playerKey);
    if(!others.length){toast('NO ONE TO GIVE IT TO');return;}
    openModal('GIVE '+item.name.toUpperCase(),`
      <div class="field"><label>Give to</label><select id="inv-give-to" style="width:100%;background:var(--surface-2);border:2px solid var(--border);color:var(--text);font-family:'VT323',monospace;font-size:18px;padding:8px">
        ${others.map(c=>`<option value="${esc(c.key)}">${esc(c.name)}</option>`).join('')}
      </select></div>
      <div class="btn-row"><button class="btn btn-primary" id="inv-give-go">GIVE</button></div>
    `);
    document.getElementById('inv-give-go').onclick=async()=>{
      const toKey=document.getElementById('inv-give-to').value;
      const target=realm.characters.find(c=>c.key===toKey);
      if(!target){closeModal();return;}
      const one={...item,id:'itm-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),qty:1};
      if(!invAdd(sess,toKey,one)){toast((target.name+"'s pack is full").toUpperCase());return;}
      if(item.qty>1)item.qty--;
      else sess.inventory[sess.playerKey]=invList(sess,sess.playerKey).filter(i=>i.id!==id);
      invPushEvent(`${pname} hands ${item.emoji} ${item.name} to ${target.name}.`);
      await dbPut('sessions',sess);
      closeModal();renderInvPanel();
      toast('GIVEN TO '+target.name.toUpperCase());
    };
  }
}

/* ====================== PROMPT NOTE (rides existing reply call) ====================== */
function inventoryPromptNote(charKey,sess){
  const items=sess?.inventory?.[charKey];
  if(!Array.isArray(items)||!items.length)return'';
  const names=items.slice(0,12).map(i=>`${i.name}${i.qty>1?' ×'+i.qty:''}`).join(', ');
  return`You are carrying: ${names}. Bring items up only when it feels natural.`;
}

/* ====================== CHEAP EXCHANGE TICK ====================== */
/* One small Task Controller call after enough new dialogue: did the
   conversation clearly imply an item changing hands? Most exchanges
   return {} — mirrors stageDirectionTick exactly. */
let invBusy=false;
async function inventoryTick(sess,realm){
  if(invBusy||!sess||!realm||!hasApiKeys()||typeof aiJson!=='function')return;
  const dlg=(sess.history||[]).filter(h=>!h.kind||h.kind==='dialogue');
  if(dlg.length-(sess.lastInvCount||0)<INV_TICK_MIN_NEW)return;
  invBusy=true;
  try{
    const recent=(sess.history||[]).filter(h=>h.kind!=='system').slice(-6)
      .map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
    const carried=realm.characters.map(c=>{
      const items=(sess.inventory?.[c.key]||[]).map(i=>i.name).join(', ');
      return`${c.key}: ${items||'(nothing)'}`;
    }).join('; ');
    const prompt=`You track props in a roleplay. Based ONLY on this exchange, did a physical item CLEARLY and explicitly change hands or get picked up? Almost always the answer is no — then output {}.
Characters and what they carry: ${carried}
Exchange:
${recent}
Output ONLY JSON: {"gained":[{"key":"zoro","name":"bottle of sake","emoji":"🍶"}],"lost":[{"key":"luffy","name":"bottle of sake"}]} or {}`;
    const parsed=await aiJson(prompt,settings.taskModel,80);
    sess.lastInvCount=dlg.length;
    let changed=false;
    (Array.isArray(parsed?.lost)?parsed.lost:[]).slice(0,3).forEach(l=>{
      if(!l||!realm.characters.some(c=>c.key===l.key))return;
      const list=invList(sess,l.key);
      const i=list.findIndex(it=>it.name.toLowerCase()===String(l.name||'').trim().toLowerCase());
      if(i<0)return;
      if(list[i].qty>1)list[i].qty--;else list.splice(i,1);
      changed=true;
    });
    (Array.isArray(parsed?.gained)?parsed.gained:[]).slice(0,3).forEach(g=>{
      if(!g||!realm.characters.some(c=>c.key===g.key))return;
      const item=invMakeItem(g.name,g.emoji,1,'');
      if(!item.name)return;
      if(invAdd(sess,g.key,item)){
        changed=true;
        if(g.key===sess.playerKey){
          toast('GOT '+item.name.toUpperCase());
          if(typeof sfx==='function')sfx('objective');
          if(typeof bumpStat==='function')bumpStat('itemsCollected',1,realm.id);
        }
      }
    });
    await dbPut('sessions',sess);
    if(changed)renderInvPanel();
  }catch(e){console.warn('Inventory tick failed',e);}
  finally{invBusy=false;}
}
