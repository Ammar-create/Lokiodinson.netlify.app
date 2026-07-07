/* ===================================================================
   SUNNY DECK // RETRO  —  social.js
   Relationships (persistent per-realm affinity between characters)
   + moods (per-session emotional state). Both are updated by ONE
   batched cheap Task Controller call after enough new dialogue.
   =================================================================== */
'use strict';

const MOODS={happy:'😊',excited:'🤩',calm:'😌',flirty:'😏',bored:'🥱',anxious:'😰',sad:'😢',angry:'😠',neutral:'🙂'};
const MOOD_DECAY_MS=5*60*1000;
const SOCIAL_MIN_NEW_MSGS=6;

/* ====================== AFFINITY HELPERS ====================== */
function affinityKey(a,b){return[a,b].sort().join('|');}
function getAffinity(realm,a,b){
  return realm?.affinities?.[affinityKey(a,b)]?.score||0;
}
function affinityTier(score){
  if(score<=-60)return'hostile';
  if(score<=-20)return'cold';
  if(score<20)return'neutral';
  if(score<60)return'warm';
  return'devoted';
}
const TIER_FEEL={
  hostile:'you deeply resent them',cold:'you are wary and distant with them',
  warm:'you genuinely like them',devoted:'you deeply trust and care for them'
};

/* ====================== MOOD HELPERS ====================== */
function moodOf(sess,key){
  const m=sess?.moods?.[key];
  return m&&MOODS[m.mood]?m.mood:'neutral';
}
function moodEmoji(mood){return MOODS[mood]||MOODS.neutral;}

function decayMoods(sess){
  if(!sess?.moods)return;
  const now=Date.now();let changed=false;
  Object.entries(sess.moods).forEach(([k,m])=>{
    if(now-(m.updatedAt||0)>MOOD_DECAY_MS){delete sess.moods[k];changed=true;}
  });
  if(changed)refreshMoodChips();
}

function refreshMoodChips(){
  const sess=currentSession,realm=currentRealm;
  if(!sess||!realm)return;
  (realm.characters||[]).forEach(c=>{
    const el=c._mapEl;if(!el)return;
    let chip=el.querySelector('.mt-mood');
    if(!chip){chip=document.createElement('span');chip.className='mt-mood';el.appendChild(chip);}
    const mood=moodOf(sess,c.key);
    chip.textContent=mood==='neutral'?'':moodEmoji(mood);
    chip.title=mood==='neutral'?'':mood;
  });
  if(typeof updatePortraitStrip==='function')updatePortraitStrip();
}
function moodBadge(charKey){
  const mood=moodOf(currentSession,charKey);
  if(mood==='neutral')return'';
  return`<span class="avatar-mood" title="${esc(mood)}">${moodEmoji(mood)}</span>`;
}

/* ====================== PROMPT NOTE ====================== */
function socialPromptNote(charKey,realm,sess){
  const parts=[];
  const mood=moodOf(sess,charKey);
  if(mood!=='neutral')parts.push(`Your current mood: ${mood} — let it color your tone.`);
  const playerKey=sess?.playerKey;
  if(playerKey&&playerKey!==charKey){
    const score=getAffinity(realm,charKey,playerKey);
    const tier=affinityTier(score);
    if(tier!=='neutral'){
      const player=realm.characters.find(c=>c.key===playerKey);
      parts.push(`Your relationship with ${player?.name||'them'}: ${tier} (${score}) — ${TIER_FEEL[tier]}.`);
    }
  }
  return parts.join(' ');
}

/* ====================== BATCHED ANALYSIS TICK ====================== */
let socialBusy=false;
async function socialAnalysisTick(sess,realm){
  if(socialBusy||!sess||!realm||!hasApiKeys()||typeof aiJson!=='function')return;
  const dlg=(sess.history||[]).filter(h=>!h.kind||h.kind==='dialogue');
  if(dlg.length-(sess.lastSocialCount||0)<SOCIAL_MIN_NEW_MSGS)return;
  socialBusy=true;
  try{
    const playerKey=sess.playerKey;
    const player=realm.characters.find(c=>c.key===playerKey);
    const lines=(sess.history||[]).filter(h=>h.kind!=='system').slice(-14)
      .map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
    const prompt=`Analyze the recent conversation in ${realm.name}. The player is ${player?.name||'?'} (key: ${playerKey}).
Characters: ${realm.characters.map(c=>`${c.key} (${c.name})`).join(', ')}
Conversation:
${lines}
Report:
1) "moods": current mood for each character who spoke or was directly addressed. Allowed moods: ${Object.keys(MOODS).join(', ')}.
2) "affinity": for pairs who meaningfully interacted, how their feelings toward each other shifted, delta -10..10 (omit pairs with no shift).
Output ONLY JSON: {"moods":{"zoro":"angry"},"affinity":[{"a":"luffy","b":"zoro","delta":3}]}`;
    const parsed=await aiJson(prompt,settings.taskModel,200);
    const valid=k=>realm.characters.some(c=>c.key===k);
    /* moods */
    if(!sess.moods)sess.moods={};
    Object.entries(parsed?.moods||{}).forEach(([k,m])=>{
      if(!valid(k)||k===playerKey||!MOODS[m])return;
      if(m==='neutral')delete sess.moods[k];
      else sess.moods[k]={mood:m,updatedAt:Date.now()};
    });
    /* affinities */
    let realmChanged=false;
    (Array.isArray(parsed?.affinity)?parsed.affinity:[]).forEach(e=>{
      if(!e||!valid(e.a)||!valid(e.b)||e.a===e.b)return;
      const delta=Math.min(10,Math.max(-10,Math.round(+e.delta)||0));
      if(!delta)return;
      if(!realm.affinities)realm.affinities={};
      const k=affinityKey(e.a,e.b);
      const rec=realm.affinities[k]||(realm.affinities[k]={score:0,updatedAt:0});
      const oldTier=affinityTier(rec.score);
      rec.score=Math.min(100,Math.max(-100,rec.score+delta));
      rec.updatedAt=Date.now();
      realmChanged=true;
      /* toast when the player's own bond crosses a tier */
      if((e.a===playerKey||e.b===playerKey)&&affinityTier(rec.score)!==oldTier){
        const other=realm.characters.find(c=>c.key===(e.a===playerKey?e.b:e.a));
        if(other)toast(`${other.name.toUpperCase()} NOW FEELS ${affinityTier(rec.score).toUpperCase()} TOWARD YOU`);
      }
    });
    if(realmChanged)await dbPut('realms',realm);
    sess.lastSocialCount=dlg.length;
    await dbPut('sessions',sess);
    refreshMoodChips();
  }catch(e){console.warn('Social tick failed',e);}
  finally{socialBusy=false;}
}

/* ====================== RELATIONSHIP WEB (realm detail) ====================== */
function renderRelationshipWeb(realm){
  const wrap=document.getElementById('detailRelWeb');if(!wrap)return;
  wrap.innerHTML='';
  const chars=(realm.characters||[]).slice(0,16);
  const aff=realm.affinities||{};
  const bonds=Object.entries(aff).filter(([,v])=>Math.abs(v.score)>=10);
  if(!bonds.length){
    wrap.innerHTML='<div class="activity-empty">NO BONDS YET. THEY FORM AS YOU CHAT.</div>';
    return;
  }
  const W=480,H=Math.max(240,chars.length*24),cx=W/2,cy=H/2;
  const R=Math.min(cx,cy)-46;
  const pos={};
  chars.forEach((c,i)=>{
    const a=(2*Math.PI*i)/chars.length-Math.PI/2;
    pos[c.key]={x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)};
  });
  let edges='';
  bonds.forEach(([k,v])=>{
    const[a,b]=k.split('|');
    if(!pos[a]||!pos[b])return;
    const good=v.score>0;
    const w=1+Math.abs(v.score)/25;
    const op=(0.35+Math.abs(v.score)/200).toFixed(2);
    const na=chars.find(c=>c.key===a)?.name||a,nb=chars.find(c=>c.key===b)?.name||b;
    edges+=`<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}"
      stroke="${good?'var(--ok)':'var(--danger)'}" stroke-width="${w}" opacity="${op}">
      <title>${esc(na)} ↔ ${esc(nb)}: ${affinityTier(v.score)} (${v.score})</title></line>`;
  });
  let nodes='';
  chars.forEach(c=>{
    const p=pos[c.key];
    nodes+=`<g><circle cx="${p.x}" cy="${p.y}" r="13" fill="${esc(c.color)}" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
      <text class="rel-node-init" x="${p.x}" y="${p.y+2.5}" fill="#0d0221">${esc(c.name.slice(0,2).toUpperCase())}</text>
      <text class="rel-node-label" x="${p.x}" y="${p.y+26}">${esc(c.name.slice(0,10).toUpperCase())}</text>
      <title>${esc(c.name)}</title></g>`;
  });
  const div=document.createElement('div');div.className='rel-web';
  div.innerHTML=`<svg viewBox="0 0 ${W} ${H}">${edges}${nodes}</svg>
    <div class="rel-legend">
      <span class="pill neg">HOSTILE</span><span class="pill neg">COLD</span>
      <span class="pill">NEUTRAL</span>
      <span class="pill pos">WARM</span><span class="pill pos">DEVOTED</span>
    </div>`;
  wrap.appendChild(div);
  const reset=document.createElement('button');
  reset.className='btn btn-ghost btn-danger-out';reset.style.marginTop='10px';
  reset.textContent='RESET BONDS';
  reset.onclick=async()=>{
    if(!confirm('Reset all relationships in this realm?'))return;
    realm.affinities={};await dbPut('realms',realm);
    renderRelationshipWeb(realm);toast('BONDS RESET');
  };
  wrap.appendChild(reset);
}
