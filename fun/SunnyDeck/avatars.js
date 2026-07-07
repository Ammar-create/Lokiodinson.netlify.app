/* ===================================================================
   SUNNY DECK // RETRO  —  avatars.js
   Procedural pixel avatar generator. Deterministic, zero API cost:
   a tiny PRNG seeded from character key+name draws a 16x16
   mirrored-half sprite on a canvas, colored from the character's
   accent color. Nothing is hard-coded per character — imported and
   user-created casts get faces too. Classic script sharing globals.
   =================================================================== */
'use strict';

/* ====================== SEED / PRNG ====================== */
function avHash(str){
  let h=2166136261>>>0;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function avRng(seed){
  return function(){
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}

/* ====================== COLOR HELPERS ====================== */
function avHexToHsl(hex){
  const m=String(hex||'').match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if(!m)return{h:190,s:80,l:50};
  let c=m[1];
  if(c.length===3)c=c.split('').map(x=>x+x).join('');
  const r=parseInt(c.slice(0,2),16)/255,g=parseInt(c.slice(2,4),16)/255,b=parseInt(c.slice(4,6),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h=0,s=0;const l=(max+min)/2;
  if(max!==min){
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    if(max===r)h=((g-b)/d+(g<b?6:0))/6;
    else if(max===g)h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  return{h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
}
function avHsl(h,s,l){return`hsl(${((h%360)+360)%360},${Math.min(100,Math.max(0,s))}%,${Math.min(96,Math.max(4,l))}%)`;}

/* Retro-friendly skin tones; picked deterministically per character. */
const AV_SKINS=['#f2c9a0','#e0ac69','#c68642','#8d5524','#ffd7b8','#a86e3f'];

/* ====================== SPRITE ====================== */
/* 16x16, left 8 columns generated then mirrored. Fixed face heuristics
   (eyes / mouth / hair band) keep it reading as a character. */
function avDrawSprite(ctx,c,px){
  const seed=avHash((c.key||'')+'|'+(c.name||''));
  const rnd=avRng(seed);
  const base=avHexToHsl(c.color);
  const shirt=avHsl(base.h,base.s,Math.min(62,Math.max(34,base.l)));
  const shirt2=avHsl(base.h,base.s,Math.max(20,base.l-22));
  const hair=avHsl(base.h+([-140,-40,30,180][Math.floor(rnd()*4)]),Math.max(30,base.s-10),22+Math.floor(rnd()*26));
  const skin=AV_SKINS[Math.floor(rnd()*AV_SKINS.length)];
  const eye='#10102a';
  const grid=[];for(let y=0;y<16;y++)grid.push(new Array(16).fill(null));
  const put=(x,y,col)=>{if(x>=0&&x<16&&y>=0&&y<16&&col)grid[y][x]=col;};
  const putM=(x,y,col)=>{put(x,y,col);put(15-x,y,col);};

  /* head block: skin from rows 3-10, cols 3-12 */
  for(let y=3;y<=10;y++)for(let x=3;x<8;x++)putM(x,y,skin);
  /* rounded head corners removed */
  const clrM=(x,y)=>{grid[y][x]=null;grid[y][15-x]=null;};
  clrM(3,3);clrM(3,10);
  /* hair: top rows + fringe with per-column random depth */
  const fringe=1+Math.floor(rnd()*3);           /* 1-3 rows of fringe */
  for(let x=3;x<8;x++){
    const depth=fringe+(rnd()<0.45?1:0);
    for(let y=2;y<2+depth;y++)putM(x,y,hair);
  }
  putM(2,3,hair);putM(2,4,hair);                /* sideburns */
  if(rnd()<0.5){putM(2,5,hair);putM(2,6,hair);} /* longer hair */
  if(rnd()<0.3)for(let x=3;x<8;x++)putM(x,1,hair); /* tall hair */
  /* eyes: fixed row, symmetric */
  const eyeY=6+(rnd()<0.4?1:0);
  putM(5,eyeY,eye);
  /* brows sometimes */
  if(rnd()<0.4)putM(5,eyeY-1,hair);
  /* mouth: centered pixels on row 9 */
  if(rnd()<0.85){put(7,9,eye);put(8,9,eye);if(rnd()<0.4){put(6,9,eye);put(9,9,eye);}}
  /* neck + shirt rows 11-15 */
  putM(6,11,skin);putM(7,11,skin);
  for(let y=12;y<16;y++)for(let x=3;x<8;x++)putM(x,y,shirt);
  putM(2,13,shirt);putM(2,14,shirt);putM(2,15,shirt); /* arms */
  /* shirt detail: mirrored random accents */
  for(let y=12;y<16;y++)for(let x=3;x<8;x++){if(rnd()<0.18)putM(x,y,shirt2);}
  if(rnd()<0.5){put(7,13,shirt2);put(8,13,shirt2);}   /* chest emblem */

  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    if(grid[y][x]){ctx.fillStyle=grid[y][x];ctx.fillRect(x*px,y*px,px,px);}
  }
}

/* ====================== PUBLIC API ====================== */
const avatarCache=new Map();
function avatarDataURL(character,size){
  if(!character||!character.key&&!character.name)return null;
  if(typeof settings!=='undefined'&&settings.pixelAvatarsEnabled===false)return null;
  size=Math.max(16,Math.min(256,Math.floor(size||64)));
  const px=Math.max(1,Math.floor(size/16));
  const cacheKey=(character.key||character.name)+'|'+(character.name||'')+'|'+(character.color||'')+'|'+px;
  if(avatarCache.has(cacheKey))return avatarCache.get(cacheKey);
  try{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=16*px;
    const ctx=canvas.getContext('2d');
    if(!ctx)return null;
    avDrawSprite(ctx,character,px);
    const url=canvas.toDataURL('image/png');
    avatarCache.set(cacheKey,url);
    return url;
  }catch(e){return null;}
}

/* Drop-in inner content for the existing .char-avatar / .map-token
   circles: callers fall back to initials when this returns ''. */
function charAvatarInner(c){
  const url=avatarDataURL(c,64);
  return url?`<img class="pix-avatar" src="${url}" alt="">`:'';
}

/* ====================== PORTRAIT STRIP ====================== */
/* Row of pixel portraits above chat showing who is around; dims
   out-of-earshot characters. Piggybacks on map.js proximity. */
function initPortraitStrip(){
  const strip=document.getElementById('portraitStrip');
  if(!strip||!currentRealm||!currentSession)return;
  strip.innerHTML='';
  (currentRealm.characters||[]).forEach(c=>{
    const b=document.createElement('button');
    b.className='ps-item';b.dataset.key=c.key;b.title=c.name;
    const av=charAvatarInner(c);
    b.innerHTML=`<div class="char-avatar" style="background:${esc(c.color)}">${av||esc(c.name.slice(0,2).toUpperCase())}</div>
      <span class="ps-name">${esc(c.name)}</span><span class="ps-mood"></span>`;
    b.onclick=()=>{
      if(c.key===currentSession.playerKey)return;
      if(typeof approachCharacter==='function')approachCharacter(c.key);
    };
    strip.appendChild(b);
  });
  updatePortraitStrip();
}
function updatePortraitStrip(){
  const strip=document.getElementById('portraitStrip');
  if(!strip||!currentRealm||!currentSession)return;
  strip.querySelectorAll('.ps-item').forEach(el=>{
    const key=el.dataset.key;
    el.classList.toggle('is-player',key===currentSession.playerKey);
    el.classList.toggle('muted',typeof isCharDisabled==='function'&&isCharDisabled(currentSession,key));
    el.classList.toggle('far',
      key!==currentSession.playerKey&&typeof inEarshot==='function'&&!inEarshot(key));
    const moodEl=el.querySelector('.ps-mood');
    if(moodEl&&typeof moodOf==='function'&&typeof moodEmoji==='function'){
      const m=moodOf(currentSession,key);
      moodEl.textContent=m==='neutral'?'':moodEmoji(m);
    }
  });
}
