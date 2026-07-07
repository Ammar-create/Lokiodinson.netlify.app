/* ===================================================================
   SUNNY DECK // RETRO  —  mapedit.js
   Visual map editor: edit a realm's zones as draggable / resizable
   rectangles over the retro map background. Draw on empty space to
   add a zone, drag to move, corner handle to resize, select to
   rename or delete. Saves into the exact shape realmZones() already
   reads (realm.mapConfig.zones) — open sessions pick changes up on
   the next openSession. Pure DOM + pointer events, zero API cost.
   =================================================================== */
'use strict';

const ME_MAX_ZONES=12;
const ME_MIN_W=8,ME_MIN_H=8;

let meZones=[],meSel=-1,meRealm=null;
let meDrag=null; /* {mode:'move'|'resize'|'draw', idx, startX,startY, orig} */

/* ====================== HELPERS ====================== */
function meClamp(z){
  z.w=Math.min(100,Math.max(ME_MIN_W,z.w));
  z.h=Math.min(100,Math.max(ME_MIN_H,z.h));
  z.x=Math.min(100-z.w,Math.max(0,z.x));
  z.y=Math.min(100-z.h,Math.max(0,z.y));
  return z;
}
function meSlug(name,taken){
  let base=String(name||'zone').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,20)||'zone';
  let key=base,i=2;
  while(taken.has(key))key=(base+'_'+i++).slice(0,20);
  taken.add(key);
  return key;
}
function meRound(n){return Math.round(n*10)/10;}

/* ====================== OVERLAY ====================== */
function meEnsureOverlay(){
  if(document.getElementById('mapEditOverlay'))return;
  const ov=document.createElement('div');ov.id='mapEditOverlay';
  ov.innerHTML=`
    <div id="meToolbar">
      <div class="me-title" id="meTitle">MAP EDITOR</div>
      <input id="meName" placeholder="zone name" maxlength="14"
        style="background:var(--surface-2);border:2px solid var(--border);color:var(--text);font-family:'VT323',monospace;font-size:17px;padding:5px 9px;width:150px" disabled>
      <button class="quest-mini-btn danger" id="meDelete" disabled>DELETE</button>
      <button class="quest-mini-btn" id="meAdd">+ ZONE</button>
      <button class="quest-mini-btn" id="meCancel">CANCEL</button>
      <button class="quest-mini-btn" id="meSave" style="border-color:var(--ok);color:var(--ok)">SAVE MAP</button>
    </div>
    <div id="meCanvasWrap"><div id="meCanvas"></div></div>
    <div id="meHint">DRAG EMPTY SPACE TO DRAW A ZONE · DRAG A ZONE TO MOVE · CORNER HANDLE RESIZES · CLICK SELECTS (RENAME / DELETE) · MAX ${ME_MAX_ZONES} ZONES</div>`;
  document.body.appendChild(ov);
  document.getElementById('meCancel').onclick=meClose;
  document.getElementById('meAdd').onclick=()=>{
    if(meZones.length>=ME_MAX_ZONES){toast('MAX '+ME_MAX_ZONES+' ZONES');return;}
    meZones.push(meClamp({key:'',name:'AREA '+(meZones.length+1),x:35,y:30,w:30,h:40}));
    meSel=meZones.length-1;meRender();
  };
  document.getElementById('meDelete').onclick=()=>{
    if(meSel<0)return;
    meZones.splice(meSel,1);meSel=-1;meRender();
  };
  document.getElementById('meName').oninput=e=>{
    if(meSel<0)return;
    meZones[meSel].name=e.target.value.toUpperCase().slice(0,14);
    const lbl=document.querySelector(`#meCanvas .me-zone[data-i="${meSel}"] .me-label`);
    if(lbl)lbl.textContent=meZones[meSel].name;
  };
  document.getElementById('meSave').onclick=meSave;
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.getElementById('mapEditOverlay')?.classList.contains('open')){
      const ae=document.activeElement;
      if(ae&&ae.id==='meName'){ae.blur();return;}
      meClose();
    }
  });
}

function openMapEditor(){
  const realm=currentRealm;
  if(!realm){toast('OPEN A REALM FIRST');return;}
  meEnsureOverlay();
  meRealm=realm;
  meZones=(typeof realmZones==='function'?realmZones(realm):(realm.mapConfig?.zones||[]))
    .map(z=>meClamp({key:z.key,name:String(z.name||z.key).toUpperCase().slice(0,14),x:+z.x||0,y:+z.y||0,w:+z.w||20,h:+z.h||20}))
    .slice(0,ME_MAX_ZONES);
  meSel=-1;
  document.getElementById('meTitle').textContent='MAP EDITOR :: '+realm.name.toUpperCase().slice(0,24);
  const canvas=document.getElementById('meCanvas');
  canvas.innerHTML=(typeof getMapSVG==='function'?getMapSVG(realm.mapConfig?.mapType||'custom'):'');
  meBindCanvas(canvas);
  meRender();
  document.getElementById('mapEditOverlay').classList.add('open');
}
function meClose(){
  document.getElementById('mapEditOverlay')?.classList.remove('open');
  meRealm=null;meDrag=null;
}

/* ====================== RENDER ====================== */
function meRender(){
  const canvas=document.getElementById('meCanvas');if(!canvas)return;
  canvas.querySelectorAll('.me-zone').forEach(el=>el.remove());
  meZones.forEach((z,i)=>{
    const d=document.createElement('div');
    d.className='me-zone'+(i===meSel?' sel':'');d.dataset.i=i;
    d.style.left=z.x+'%';d.style.top=z.y+'%';d.style.width=z.w+'%';d.style.height=z.h+'%';
    d.innerHTML=`<span class="me-label">${esc(z.name)}</span><span class="me-handle" data-i="${i}"></span>`;
    canvas.appendChild(d);
  });
  const nameEl=document.getElementById('meName');
  const delEl=document.getElementById('meDelete');
  if(meSel>=0&&meZones[meSel]){nameEl.disabled=false;nameEl.value=meZones[meSel].name;delEl.disabled=false;}
  else{nameEl.disabled=true;nameEl.value='';delEl.disabled=true;}
}

/* ====================== POINTER INTERACTIONS ====================== */
function mePct(canvas,e){
  const r=canvas.getBoundingClientRect();
  return{
    x:Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100)),
    y:Math.min(100,Math.max(0,(e.clientY-r.top)/r.height*100))
  };
}
function meBindCanvas(canvas){
  canvas.onpointerdown=e=>{
    e.preventDefault();
    const p=mePct(canvas,e);
    const handle=e.target.closest('.me-handle');
    const zoneEl=e.target.closest('.me-zone');
    if(handle){
      meSel=+handle.dataset.i;
      meDrag={mode:'resize',idx:meSel,startX:p.x,startY:p.y,orig:{...meZones[meSel]}};
    }else if(zoneEl){
      meSel=+zoneEl.dataset.i;
      meDrag={mode:'move',idx:meSel,startX:p.x,startY:p.y,orig:{...meZones[meSel]}};
    }else{
      if(meZones.length>=ME_MAX_ZONES){toast('MAX '+ME_MAX_ZONES+' ZONES');return;}
      meZones.push({key:'',name:'AREA '+(meZones.length+1),x:p.x,y:p.y,w:0,h:0});
      meSel=meZones.length-1;
      meDrag={mode:'draw',idx:meSel,startX:p.x,startY:p.y,orig:{...meZones[meSel]}};
    }
    try{canvas.setPointerCapture(e.pointerId);}catch(err){}
    meRender();
  };
  canvas.onpointermove=e=>{
    if(!meDrag)return;
    const p=mePct(canvas,e);
    const z=meZones[meDrag.idx];if(!z)return;
    const dx=p.x-meDrag.startX,dy=p.y-meDrag.startY;
    if(meDrag.mode==='move'){
      z.x=meRound(meDrag.orig.x+dx);z.y=meRound(meDrag.orig.y+dy);
      meClamp(z);
    }else if(meDrag.mode==='resize'){
      z.w=meRound(meDrag.orig.w+dx);z.h=meRound(meDrag.orig.h+dy);
      meClamp(z);
    }else{ /* draw */
      z.x=meRound(Math.min(meDrag.startX,p.x));
      z.y=meRound(Math.min(meDrag.startY,p.y));
      z.w=meRound(Math.abs(dx));z.h=meRound(Math.abs(dy));
    }
    const el=canvas.querySelector(`.me-zone[data-i="${meDrag.idx}"]`);
    if(el){el.style.left=z.x+'%';el.style.top=z.y+'%';el.style.width=z.w+'%';el.style.height=z.h+'%';}
  };
  const up=()=>{
    if(!meDrag)return;
    if(meDrag.mode==='draw'){
      const z=meZones[meDrag.idx];
      if(!z||z.w<ME_MIN_W||z.h<ME_MIN_H){
        /* too small — treat as a deselect click */
        meZones.splice(meDrag.idx,1);
        meSel=-1;
      }else meClamp(z);
    }
    meDrag=null;meRender();
  };
  canvas.onpointerup=up;canvas.onpointercancel=up;
}

/* ====================== SAVE ====================== */
async function meSave(){
  if(!meRealm)return;
  const taken=new Set();
  const zones=meZones
    .filter(z=>z&&z.w>=ME_MIN_W&&z.h>=ME_MIN_H)
    .slice(0,ME_MAX_ZONES)
    .map(z=>meClamp({...z}))
    .map(z=>({
      key:meSlug(z.name,taken),
      name:String(z.name||'AREA').toUpperCase().slice(0,14)||'AREA',
      x:meRound(z.x),y:meRound(z.y),w:meRound(z.w),h:meRound(z.h)
    }));
  if(!zones.length){toast('DRAW AT LEAST ONE ZONE');return;}
  if(!meRealm.mapConfig||typeof meRealm.mapConfig!=='object')
    meRealm.mapConfig={enabled:true,mapType:'custom',zones:[]};
  meRealm.mapConfig.zones=zones;
  meRealm.mapConfig.enabled=true;
  meRealm.updatedAt=Date.now();
  await dbPut('realms',meRealm);
  toast('MAP SAVED — '+zones.length+' ZONES');
  const id=meRealm.id;
  meClose();
  if(typeof openRealmDetail==='function')openRealmDetail(id);
}

/* ====================== BINDINGS ====================== */
(function bindMapEditUI(){
  const btn=document.getElementById('btnEditMap');
  if(btn)btn.onclick=openMapEditor;
})();
