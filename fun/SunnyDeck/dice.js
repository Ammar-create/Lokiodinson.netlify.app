/* ===================================================================
   SUNNY DECK // RETRO  —  dice.js
   Dice rolls + skill checks. Plain rolls are pure client-side RNG
   (zero API). Skill checks use one cheap Task Controller call to set
   a DC, then feed the outcome into the normal reply pipeline via
   rollPromptNote(). Rolls live in history as {kind:'roll'} entries
   whose plain `text` is picked up by every transcript builder.
   =================================================================== */
'use strict';

function rollDie(sides){
  /* crypto RNG with rejection sampling to avoid modulo bias */
  if(window.crypto?.getRandomValues){
    const max=Math.floor(0xFFFFFFFF/sides)*sides;
    const buf=new Uint32Array(1);
    let v;
    do{crypto.getRandomValues(buf);v=buf[0];}while(v>=max);
    return(v%sides)+1;
  }
  return Math.floor(Math.random()*sides)+1;
}
function rollDice(n,sides,mod){
  n=Math.min(20,Math.max(1,Math.floor(n)||1));
  sides=Math.min(1000,Math.max(2,Math.floor(sides)||20));
  const rolls=Array.from({length:n},()=>rollDie(sides));
  return{rolls,total:rolls.reduce((a,b)=>a+b,0)+(mod||0),n,sides,mod:mod||0};
}
function parseRollFormula(str){
  const m=String(str||'').trim().toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if(!m)return null;
  return{n:+(m[1]||1),sides:+m[2],mod:+(m[3]||0)};
}

/* ====================== ROLL ENTRIES ====================== */
function rollOutcome(roll){
  if(roll.dc==null)return null;
  if(roll.sides===20&&roll.n===1){
    if(roll.rolls[0]===20)return'crit';
    if(roll.rolls[0]===1)return'fumble';
  }
  return roll.total>=roll.dc?'success':'fail';
}
function rollSummaryText(name,roll){
  const f=`${roll.n}d${roll.sides}${roll.mod?(roll.mod>0?'+':'')+roll.mod:''}`;
  let s=`🎲 ${name} rolls ${f} → ${roll.total}`;
  if(roll.n>1)s+=` (${roll.rolls.join(', ')})`;
  if(roll.dc!=null){
    const o=rollOutcome(roll);
    const label={crit:'CRITICAL SUCCESS',success:'SUCCESS',fail:'FAILURE',fumble:'CRITICAL FAILURE'}[o];
    s+=` vs DC ${roll.dc} — ${label}`;
    if(roll.action)s+=` (${roll.action})`;
  }
  return s;
}

function renderRollBubble(h,instant){
  const div=document.createElement('div');
  div.className='msg roll';
  const o=h.roll?rollOutcome(h.roll):null;
  const f=h.roll?`${h.roll.n}d${h.roll.sides}${h.roll.mod?(h.roll.mod>0?'+':'')+h.roll.mod:''}`:'';
  const outcomeLine=o?`<div class="r-outcome">${{crit:'CRITICAL SUCCESS!',success:'SUCCESS',fail:'FAILURE',fumble:'CRITICAL FAILURE!'}[o]} vs DC ${h.roll.dc}</div>`:'';
  const actionLine=h.roll?.action?`<div>${esc(h.speaker)} attempts: ${esc(h.roll.action)}</div>`:`<div>${esc(h.speaker)} rolls ${esc(f)}</div>`;
  div.innerHTML=`<div class="roll-card ${o||''}"><div class="die">?</div>
    <div class="roll-info">${actionLine}${outcomeLine}</div></div>`;
  const die=div.querySelector('.die');
  const final=h.roll?String(h.roll.total):'?';
  if(instant){die.textContent=final;}
  else{
    let ticks=0;
    const iv=setInterval(()=>{
      die.textContent=String(rollDie(h.roll?.sides||20));
      if(++ticks>=12){clearInterval(iv);die.textContent=final;
        if(typeof sfx==='function'){if(o==='crit')sfx('rollCrit');else if(o==='fumble')sfx('rollFail');}
      }
    },65);
  }
  return div;
}

async function pushRollEntry(roll,action){
  const sess=currentSession,realm=currentRealm;if(!sess||!realm)return null;
  const player=realm.characters.find(c=>c.key===sess.playerKey)||realm.characters[0];
  const name=player?player.name:'You';
  if(action)roll.action=action;
  const h={kind:'roll',speakerKey:player?.key||'',speaker:name,isPlayer:true,
    timestamp:Date.now(),text:rollSummaryText(name,roll),roll};
  const chat=document.getElementById('chat');
  if(typeof sfx==='function')sfx('roll');
  chat.appendChild(renderRollBubble(h,false));
  chat.scrollTop=chat.scrollHeight;
  sess.history.push(h);
  sess.lastActiveAt=Date.now();
  await dbPut('sessions',sess);
  if(typeof bumpStat==='function'){
    bumpStat('rollsMade',1,realm.id);
    if(roll.sides===20&&roll.n===1){
      if(roll.rolls[0]===20)bumpStat('crits',1,realm.id);
      if(roll.rolls[0]===1)bumpStat('fumbles',1,realm.id);
    }
  }
  return h;
}

/* ====================== SKILL CHECKS ====================== */
let pendingRollNote='';
function rollPromptNote(){return pendingRollNote;}
function clearRollNote(){pendingRollNote='';}

async function rateDifficulty(action){
  if(!hasApiKeys()||typeof aiJson!=='function')return{dc:12,reason:'default'};
  const realm=currentRealm,sess=currentSession;
  const player=realm.characters.find(c=>c.key===sess.playerKey);
  const scene=typeof spatialSummary==='function'?spatialSummary(realm,sess,sess.playerKey):'';
  const prompt=`You are the game master of ${realm.name}. The player character ${player?.name||'the player'} attempts: "${action}".
${scene}
Rate the difficulty as a d20 DC. Trivial=5, easy=8, normal=12, hard=16, heroic=19.
Output ONLY JSON: {"dc":12,"reason":"3-5 words"}`;
  try{
    const parsed=await aiJson(prompt,settings.taskModel,60);
    const dc=Math.min(25,Math.max(2,Math.floor(+parsed?.dc)||12));
    return{dc,reason:String(parsed?.reason||'').slice(0,60)};
  }catch(e){console.warn('DC rating failed',e);return{dc:12,reason:'default'};}
}

async function skillCheck(action,dcOverride){
  if(!currentSession||!currentRealm)return;
  action=String(action||'').trim();
  if(!action){toast('TYPE THE ACTION YOU ATTEMPT FIRST');return;}
  if(chatBusy){toast('WAIT FOR THE CURRENT REPLY');return;}
  const{dc}=dcOverride!=null?{dc:dcOverride}:await rateDifficulty(action);
  const roll=rollDice(1,20,0);
  roll.dc=dc;
  const h=await pushRollEntry(roll,action);
  if(!h)return;
  const o=rollOutcome(roll);
  const outcomeTxt={crit:'a spectacular, critical success',success:'a success',
    fail:'a failure',fumble:'a disastrous, critical failure'}[o];
  pendingRollNote=`${h.speaker} just attempted "${action}" — the fates decided it is ${outcomeTxt}. React and narrate so the outcome clearly matches. Do not mention dice, rolls or numbers.`;
  /* Ride the normal send pipeline so routing/replies/TTS all apply. */
  await new Promise(r=>setTimeout(r,900));
  const input=document.getElementById('chatInput');
  input.value=action;
  if(typeof handleChatSend==='function')await handleChatSend();
}

/* ====================== SLASH COMMANDS ====================== */
/* Generic registry so other modules can add commands later. */
const SLASH_COMMANDS=[];
function registerSlashCommand(name,fn,help){SLASH_COMMANDS.push({name,fn,help});}
async function handleSlashCommand(text){
  if(!text.startsWith('/'))return false;
  const[cmd,...rest]=text.slice(1).split(/\s+/);
  const arg=rest.join(' ');
  const entry=SLASH_COMMANDS.find(c=>c.name===cmd.toLowerCase());
  if(!entry)return false;
  await entry.fn(arg);
  return true;
}
registerSlashCommand('roll',async(arg)=>{
  if(!arg){await pushRollEntry(rollDice(1,20,0));return;}
  if(arg.toLowerCase().startsWith('check ')){await skillCheck(arg.slice(6));return;}
  const f=parseRollFormula(arg);
  if(!f){toast('USE /roll, /roll 3d6+2 OR /roll check <action>');return;}
  await pushRollEntry(rollDice(f.n,f.sides,f.mod));
},'/roll [NdM+K | check <action>]');
registerSlashCommand('check',async(arg)=>skillCheck(arg),'/check <action>');

/* ====================== POPOVER UI ====================== */
(function bindDiceUI(){
  const btn=document.getElementById('diceBtnChat');if(!btn)return;
  const pop=document.createElement('div');
  pop.className='dice-popover';
  pop.innerHTML=`
    <div class="dp-head">DICE // SKILL CHECKS</div>
    <div class="dp-row" data-roll="1d20">🎲 Roll d20</div>
    <div class="dp-row" data-roll="1d6">🎲 Roll d6</div>
    <div class="dp-custom"><input placeholder="3d6+2" id="dpFormula"><button id="dpGo">GO</button></div>
    <div class="dp-head">SKILL CHECK — TYPE YOUR ACTION IN THE BOX, THEN:</div>
    <div class="dp-row" data-check="ai">✨ AI sets the difficulty</div>
    <div class="dp-row" data-check="8">😌 Easy (DC 8)</div>
    <div class="dp-row" data-check="12">🎯 Normal (DC 12)</div>
    <div class="dp-row" data-check="16">🔥 Hard (DC 16)</div>`;
  btn.parentElement.appendChild(pop);
  btn.onclick=e=>{
    e.stopPropagation();
    document.querySelectorAll('.target-popover.open').forEach(p=>p.classList.remove('open'));
    document.querySelectorAll('.player-popover').forEach(p=>p.remove());
    pop.classList.toggle('open');
  };
  pop.onclick=e=>e.stopPropagation();
  document.addEventListener('click',e=>{
    if(!e.target.closest('.dice-popover')&&e.target!==btn&&!e.target.closest('#diceBtnChat'))pop.classList.remove('open');
  });
  pop.querySelectorAll('.dp-row[data-roll]').forEach(r=>r.onclick=async()=>{
    pop.classList.remove('open');
    const f=parseRollFormula(r.dataset.roll);
    await pushRollEntry(rollDice(f.n,f.sides,f.mod));
  });
  pop.querySelector('#dpGo').onclick=async()=>{
    const f=parseRollFormula(pop.querySelector('#dpFormula').value);
    if(!f){toast('FORMAT: NdM+K, e.g. 3d6+2');return;}
    pop.classList.remove('open');
    await pushRollEntry(rollDice(f.n,f.sides,f.mod));
  };
  pop.querySelectorAll('.dp-row[data-check]').forEach(r=>r.onclick=async()=>{
    pop.classList.remove('open');
    const action=document.getElementById('chatInput').value.trim();
    const v=r.dataset.check;
    await skillCheck(action,v==='ai'?null:+v);
  });
})();
