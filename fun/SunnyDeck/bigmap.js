/* ===================================================================
   SUNNY DECK // RETRO  —  bigmap.js
   Fullscreen map mode + movement controls. The live #chatMap element
   is grown to fill the screen (never cloned, so tokens / weather /
   tint stay in sync) with the composer docked underneath. A MOVE
   toggle shows a thumb-sized D-pad (hold to repeat) and WASD/arrow
   keys walk the player token. Zero API cost — movement feeds the
   existing earshot/proximity mechanics.
   =================================================================== */
'use strict';

const BM_STEP_X=2.5,BM_STEP_Y=4;     /* % per tick; y is larger because the map strip is wide */
const BM_REPEAT_MS=150;

let bmMoveMode=false;
let bmRepeatTimer=null;

/* ====================== INIT (per session, after initSessionMap) ====================== */
function initBigMap(){
  const wrap=document.getElementById('chatMapWrap');
  const map=document.getElementById('chatMap');
  if(!wrap||!map)return;
  wrap.classList.remove('map-fullscreen');
  document.body.classList.remove('bm-noscroll');
  bmSetMoveMode(false);

  /* corner controls overlaid on the live map (wrap innerHTML is reset
     every openSession, so these are recreated each time) */
  if(!map.querySelector('.bm-expand')){
    const b=document.createElement('button');
    b.className='bm-expand';b.title='Fullscreen map';
    b.innerHTML=typeof EXPAND_SVG!=='undefined'?EXPAND_SVG:'⛶';
    b.onclick=e=>{e.stopPropagation();toggleMapFullscreen();};
    map.appendChild(b);
  }
  if(!map.querySelector('#bmTopBar')){
    const bar=document.createElement('div');bar.id='bmTopBar';
    bar.innerHTML=`
      <button class="bm-btn" id="bmMoveBtn" title="Toggle move mode (D-pad)">🕹 MOVE</button>
      <button class="bm-btn" id="bmCloseBtn" title="Exit fullscreen (Esc)">✕ CLOSE</button>`;
    bar.onclick=e=>e.stopPropagation();
    bar.ondblclick=e=>e.stopPropagation();
    map.appendChild(bar);
    bar.querySelector('#bmMoveBtn').onclick=()=>bmSetMoveMode(!bmMoveMode);
    bar.querySelector('#bmCloseBtn').onclick=()=>toggleMapFullscreen(false);
  }
  /* double-click empty map space = fullscreen (single click keeps walking) */
  map.ondblclick=e=>{
    if(e.target.closest('.map-token')||e.target.closest('#bmTopBar')||e.target.closest('.bm-expand'))return;
    toggleMapFullscreen();
  };
  /* dock that hosts the composer while fullscreen */
  if(!document.getElementById('bmDock')||document.getElementById('bmDock').parentElement!==wrap){
    document.getElementById('bmDock')?.remove();
    const dock=document.createElement('div');dock.id='bmDock';
    wrap.appendChild(dock);
  }
  bmEnsureDpad();
}

/* ====================== FULLSCREEN TOGGLE ====================== */
function toggleMapFullscreen(force){
  const wrap=document.getElementById('chatMapWrap');if(!wrap)return;
  const on=force===undefined?!wrap.classList.contains('map-fullscreen'):!!force;
  if(on===wrap.classList.contains('map-fullscreen'))return;
  wrap.classList.remove('collapsed');
  wrap.classList.toggle('map-fullscreen',on);
  document.body.classList.toggle('bm-noscroll',on);
  const inner=document.getElementById('composerInner');
  if(on){
    const dock=document.getElementById('bmDock');
    if(inner&&dock)dock.appendChild(inner);   /* DOM move keeps listeners */
  }else{
    const composer=document.getElementById('composer');
    if(inner&&composer)composer.appendChild(inner);
    bmSetMoveMode(false);
  }
  if(typeof sfx==='function')sfx('screen');
}

function bigmapOnScreenChange(id){
  if(id!=='screen-chat'){
    toggleMapFullscreen(false);
    bmSetMoveMode(false);
  }
}

/* ====================== MOVE MODE / D-PAD ====================== */
function bmSetMoveMode(on){
  bmMoveMode=!!on;
  document.getElementById('bmMoveBtn')?.classList.toggle('active',bmMoveMode);
  document.getElementById('bmDpad')?.classList.toggle('show',bmMoveMode);
  if(!bmMoveMode)bmStopRepeat();
}

function bmEnsureDpad(){
  if(document.getElementById('bmDpad'))return;
  const pad=document.createElement('div');pad.id='bmDpad';
  const cells=[
    null,{d:[0,-1],t:'▲'},null,
    {d:[-1,0],t:'◀'},null,{d:[1,0],t:'▶'},
    null,{d:[0,1],t:'▼'},null
  ];
  cells.forEach(c=>{
    const b=document.createElement('button');
    b.className='bm-dir'+(c?'':' blank');
    if(c){
      b.textContent=c.t;
      b.onpointerdown=e=>{
        e.preventDefault();
        b.classList.add('pressed');
        try{b.setPointerCapture(e.pointerId);}catch(err){}
        bmNudge(c.d[0],c.d[1]);
        bmStopRepeat();
        bmRepeatTimer=setInterval(()=>bmNudge(c.d[0],c.d[1]),BM_REPEAT_MS);
      };
      const stop=()=>{b.classList.remove('pressed');bmStopRepeat();};
      b.onpointerup=stop;b.onpointercancel=stop;b.onpointerleave=stop;
      b.oncontextmenu=e=>e.preventDefault();
    }
    pad.appendChild(b);
  });
  document.body.appendChild(pad);
}
function bmStopRepeat(){clearInterval(bmRepeatTimer);bmRepeatTimer=null;}

/* ====================== MOVEMENT ====================== */
function bmNudge(dx,dy){
  const sess=currentSession;
  if(!sess||typeof moveCharacter!=='function')return;
  const key=sess.playerKey;
  const p=sess.positions?.[key];if(!p)return;
  const x=Math.min(97,Math.max(3,p.x+dx*BM_STEP_X));
  const y=Math.min(92,Math.max(8,p.y+dy*BM_STEP_Y));
  if(x===p.x&&y===p.y)return;
  moveCharacter(key,x,y);
}

/* ====================== KEYBOARD (WASD + arrows) ====================== */
const BM_KEY_DIRS={
  w:[0,-1],arrowup:[0,-1],
  s:[0,1],arrowdown:[0,1],
  a:[-1,0],arrowleft:[-1,0],
  d:[1,0],arrowright:[1,0]
};
document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(!currentSession)return;
  if(!document.getElementById('screen-chat')?.classList.contains('active'))return;
  if(document.getElementById('overlay')?.classList.contains('open'))return;
  const ae=document.activeElement;
  if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable))return;
  if(e.key==='Escape'){toggleMapFullscreen(false);return;}
  const dir=BM_KEY_DIRS[e.key.toLowerCase()];
  if(!dir)return;
  const wrap=document.getElementById('chatMapWrap');
  if(wrap?.classList.contains('collapsed'))return;
  e.preventDefault();
  bmNudge(dir[0],dir[1]);
});
