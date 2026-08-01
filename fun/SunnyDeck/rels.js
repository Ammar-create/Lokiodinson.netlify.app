/* ===================================================================
   SUNNY DECK // V3 —  rels.js
   Relationship engine: per-pair DIRECTIONAL emotion vectors + reasons
   ledger. Replaces the single affinity score with stories: why a
   character feels what they feel. Triadic observation (characters react
   to interactions they WITNESSED via the heard-log), decay over time,
   one-time seeding from legacy affinity, and periodic AI extraction.
   Per-container: realms keep realm.rels, rooms keep room.rels.
   =================================================================== */
'use strict';

const EMOTION_KEYS=['hatred','love','jealousy','loyalty','friendship','happiness','comfort'];
const REL_MIN_NEW_MSGS=6;      // new dialogue messages between AI ticks
const REL_LEDGER_MAX=40;
const REL_DELTA_MAX=20;        // clamp per-event delta

let relBusy=false;

/* ====================== PAIR RECORDS ====================== */

function relPairKey(a,b){return[a,b].sort().join('|');}

function relNewVector(){
  const v={};EMOTION_KEYS.forEach(k=>v[k]=0);return v;
}

/* Get (and lazily create) the record for an unordered pair on a container
   (realm or room). One-time seed from legacy affinity when present. */
function relGetPair(container,a,b){
  if(!container||!a||!b||a===b)return null;
  if(!container.rels)container.rels={};
  const key=relPairKey(a,b);
  if(!container.rels[key]){
    const rec={key,dir:{},ledger:[],summary:'',seeded:false,updatedAt:0};
    rec.dir[a]=relNewVector();
    rec.dir[b]=relNewVector();
    container.rels[key]=rec;
    /* one-time migration from the legacy symmetric affinity score */
    const sc=container.affinities?.[key]?.score;
    if(typeof sc==='number'){
      const f=Math.min(100,Math.max(0,sc));
      [a,b].forEach(k=>{
        rec.dir[k].friendship=Math.round(f*0.6);
        rec.dir[k].happiness=Math.round(f*0.2);
        rec.dir[k].comfort=Math.round(f*0.3);
        rec.dir[k].hatred=Math.round(Math.min(100,Math.max(0,-sc))*0.6);
      });
      rec.seeded=true;
      rec.updatedAt=Date.now();
    }
  }
  return container.rels[key];
}

/* ====================== MUTATION ====================== */

function relCleanDeltas(deltas){
  const out={};
  if(!deltas||typeof deltas!=='object')return out;
  Object.entries(deltas).forEach(([k,v])=>{
    if(!EMOTION_KEYS.includes(k))return;
    const n=Math.round(+v);
    if(!Number.isFinite(n)||n===0)return;
    out[k]=Math.min(REL_DELTA_MAX,Math.max(-REL_DELTA_MAX,n));
  });
  return out;
}

/* Apply a witnessed/direct emotion change. fromKey feels it toward toKey. */
function relApplyEvent(container,fromKey,toKey,deltas,type,summary,observedBy){
  const rec=relGetPair(container,fromKey,toKey);
  const clean=relCleanDeltas(deltas);
  if(!rec||!Object.keys(clean).length)return null;
  const dir=rec.dir[fromKey];
  EMOTION_KEYS.forEach(k=>{
    if(clean[k])dir[k]=Math.min(100,Math.max(-100,dir[k]+clean[k]));
  });
  rec.ledger.push({
    ts:Date.now(),
    type:String(type||'event').slice(0,30),
    from:fromKey,to:toKey,
    summary:String(summary||'').slice(0,220),
    deltas:clean,
    observedBy:Array.isArray(observedBy)?observedBy.slice(0,10):[]
  });
  if(rec.ledger.length>REL_LEDGER_MAX)rec.ledger.shift();
  rec.updatedAt=Date.now();
  return rec;
}

/* Triadic: observer witnessed a interacting with b. Deterministic shifts
   on the observer's feelings, bounded. */
function relObserve(container,observer,a,b,sentiment,summary){
  if(!observer||!a||!b||observer===a||observer===b||a===b)return;
  const ob=container&&container.rels&&container.rels[relPairKey(observer,a)];
  if(!ob)return;
  const rec=relGetPair(container,observer,a);
  const d=relNewVector();
  if(sentiment==='negative'){
    d.hatred=3;d.friendship=-2;d.comfort=-2;d.happiness=-1;
  }else if(sentiment==='jealous'){
    const loveB=relGetPair(container,observer,b)?.dir[observer]?.love||0;
    d.jealousy=Math.min(8,Math.round(3+Math.max(0,loveB)/25));
    d.happiness=-2;d.comfort=-1;
  }else{ /* positive */
    d.friendship=3;d.comfort=2;d.happiness=1;
    const loveB=relGetPair(container,observer,b)?.dir[observer]?.love||0;
    if(loveB>=30)d.jealousy=Math.min(6,Math.round(loveB/30));
  }
  relApplyEvent(container,observer,a,d,'observed',summary||`${observer} witnessed ${a} and ${b}`,null);
}

/* ====================== DECAY ====================== */

/* Drift old emotions toward zero so grudges/romances fade realistically.
   Hatred and jealousy fade fastest; loyalty and comfort slowest. */
function relDecay(container,now){
  if(!container?.rels)return false;
  now=now||Date.now();
  let changed=false;
  const speed={hatred:1.8,jealousy:1.8,love:1.2,happiness:1.2,friendship:1.0,comfort:0.6,loyalty:0.4};
  Object.values(container.rels).forEach(rec=>{
    const days=(now-(rec.updatedAt||0))/86400000;
    if(days<1)return;
    Object.values(rec.dir).forEach(v=>{
      EMOTION_KEYS.forEach(k=>{
        const cur=v[k];
        if(!cur)return;
        const amt=Math.max(0.5,Math.ceil(Math.abs(cur)*0.05*days*speed[k]));
        const next=cur>0?cur-amt:cur+amt;
        v[k]=(Math.abs(next)<=0.5)?0:Math.min(100,Math.max(-100,next));
        changed=true;
      });
    });
    rec.updatedAt=now;
  });
  return changed;
}

/* ====================== AI EXTRACTION TICK ====================== */

/* Analyze the recent scene for direct emotion shifts (events) and
   witnessed interactions (observations). Runs for realms AND rooms.
   container = where rels live (realm or room); context = the history
   holder (session or room). For rooms they are the same object. */
async function relationshipTick(container,context){
  if(relBusy||!container||!context)return;
  if(!providerReady(settings.taskModel||DEFAULT_SETTINGS.taskModel)||typeof aiJson!=='function')return;
  const chars=container.characters||context.characters||[];
  if(chars.length<2)return;
  if(typeof histDialogueSince==='function'&&histDialogueSince(context,context.lastRelTickSeq||0)<REL_MIN_NEW_MSGS)return;
  relBusy=true;
  try{
    const name=container.name||context.name||'the world';
    const roster=chars.map(c=>`${c.key} (${c.name})`).join(', ');
    const lines=(context.history||[]).filter(h=>h.kind!=='system').slice(-20)
      .map(h=>`${h.kind==='event'?'Narrator':h.speaker}: ${h.text}`).join('\n');
    const prompt=`Analyze the recent conversation in ${name} for RELATIONSHIP changes.
Characters: ${roster}
Recent conversation:
${lines}
Rules:
- "events": a clear shift in how one character feels about another. from = who feels it, to = toward whom. Allowed emotions: ${EMOTION_KEYS.join(', ')}. Deltas -10..+10, usually 1-3 emotions per event.
- "observations": a character WITNESSED two others interacting (they were present). sentiment: positive|negative|jealous.
- Write a short concrete "summary" (the reason, 1 sentence). Most exchanges change nothing → output {}.
Output ONLY JSON: {"events":[{"from":"zoro","to":"luffy","deltas":{"loyalty":5,"friendship":3},"type":"defended","summary":"Zoro backed Luffy against the marines."}],"observations":[{"observer":"nami","a":"zoro","b":"luffy","sentiment":"positive","summary":"Nami saw Zoro defend Luffy."}]} or {}`;
    const parsed=await aiJson(prompt,settings.taskModel,300);
    if(!parsed||typeof parsed!=='object')return;
    const valid=k=>chars.some(c=>c.key===k);
    let changed=false;
    (Array.isArray(parsed.events)?parsed.events:[]).slice(0,6).forEach(ev=>{
      if(!ev||!valid(ev.from)||!valid(ev.to)||ev.from===ev.to)return;
      if(relApplyEvent(container,ev.from,ev.to,ev.deltas,ev.type,ev.summary,null))changed=true;
    });
    /* observations: ONLY for observers with fresh presence in the log */
    (Array.isArray(parsed.observations)?parsed.observations:[]).slice(0,6).forEach(ob=>{
      if(!ob||!valid(ob.observer)||!valid(ob.a)||!valid(ob.b)||ob.observer===ob.a||ob.observer===ob.b)return;
      const wm=context.lastRelTickSeq||0;
      const log=typeof syncCharLog==='function'?syncCharLog(context,ob.observer):null;
      const present=(log?.entries||[]).some(e=>e.seq>wm);
      if(!present)return;   // hallucinated presence guard
      relObserve(container,ob.observer,ob.a,ob.b,String(ob.sentiment||'positive'),ob.summary);
      changed=true;
    });
    if(relDecay(container))changed=true;
    context.lastRelTickSeq=typeof histLastSeq==='function'?(histLastSeq(context)||0):0;
    context.lastActiveAt=Date.now();
    if(changed){
      if(container.isRoom)await dbPut('sessions',container);
      else await dbPut('realms',container);
    }
  }catch(e){console.warn('Relationship tick failed',e);}
  finally{relBusy=false;}
}

/* ====================== PROMPT CONTEXT ====================== */

/* What THIS character knows about their bonds (their direction only). */
function relationshipNoteFor(charKey,realm,sess){
  const container=realm&&realm.isRoom?realm:realm;   /* realm-shaped or room-shaped */
  if(!container||!sess)return'';
  const chars=container.characters||[];
  const parts=[];
  const m=moodOf(sess,charKey);
  if(m&&m!=='neutral')parts.push('mood: '+m);
  let pairs=0;
  Object.values(container.rels||{}).forEach(rec=>{
    if(pairs>=4)return;
    const dir=rec.dir?.[charKey];
    if(!dir)return;
    const otherKey=rec.key.split('|').find(k=>k!==charKey);
    const other=chars.find(c=>c.key===otherKey);
    if(!other)return;
    const active=EMOTION_KEYS.filter(k=>Math.abs(dir[k])>=15)
      .sort((a,b)=>Math.abs(dir[b])-Math.abs(dir[a]))
      .slice(0,3)
      .map(k=>`${k} ${dir[k]}`)
      .join(', ');
    if(!active)return;
    parts.push(`toward ${other.name}: ${active}${rec.summary?` — ${rec.summary}`:''}`);
    pairs++;
  });
  return parts.length?('Your current state: '+parts.join('; ')+'.'):'';
}

/* ====================== UI ====================== */

function openRelPanel(container,name){
  if(!container)return;
  const chars=container.characters||[];
  const rows=Object.values(container.rels||{})
    .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))
    .slice(0,10)
    .map(rec=>{
      const[a,b]=rec.key.split('|');
      const ca=chars.find(c=>c.key===a),cb=chars.find(c=>c.key===b);
      const fmt=(key)=>{
        const d=rec.dir[key];
        if(!d)return'';
        const active=EMOTION_KEYS.filter(k=>Math.abs(d[k])>=10)
          .sort((x,y)=>Math.abs(d[y])-Math.abs(d[x]))
          .map(k=>`${k} ${d[k]}`).join(' · ');
        return active||'neutral';
      };
      const last=rec.ledger[rec.ledger.length-1];
      return`<div class="rel-row" style="border:2px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px;background:var(--surface-2)">
        <div style="font-weight:bold">${esc(ca?.name||a)} <span style="opacity:.6">↔</span> ${esc(cb?.name||b)}</div>
        <div style="font-size:11px;opacity:.9;margin-top:4px">${esc(ca?.name||a)}: ${esc(fmt(a))}</div>
        <div style="font-size:11px;opacity:.9">${esc(cb?.name||b)}: ${esc(fmt(b))}</div>
        ${rec.summary?`<div style="font-size:11px;font-style:italic;margin-top:4px">“${esc(rec.summary)}”</div>`:''}
        ${last?`<div style="font-size:10px;opacity:.7;margin-top:4px">last: ${esc(last.summary)}</div>`:''}
      </div>`;
    }).join('');
  openModal(`RELATIONSHIPS — ${esc(name||'')}`,
    rows||'<div class="activity-empty">NO RELATIONSHIPS YET. CHAT TO GROW THEM.</div>');
}
