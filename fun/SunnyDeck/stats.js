/* ===================================================================
   SUNNY DECK // RETRO  —  stats.js
   Play statistics + authored achievements. Counters live in the
   settings record (global, cross-realm) as settings.stats /
   settings.unlocked, incremented via a single bumpStat() called from
   guarded hook points across the app. Achievements are a static
   table checked after every bump; unlocks fire a toast and the
   existing sfx('achievement') jingle. Rendered as stat tiles + an
   achievement grid on the dashboard. Zero API cost.
   =================================================================== */
'use strict';

/* ====================== STATE ====================== */
function ensureStats(){
  if(typeof settings==='undefined')return null;
  if(!settings.stats||typeof settings.stats!=='object')settings.stats={};
  if(!settings.unlocked||typeof settings.unlocked!=='object')settings.unlocked={};
  return settings.stats;
}

let statsSaveTimer=null;
function scheduleStatsSave(){
  clearTimeout(statsSaveTimer);
  statsSaveTimer=setTimeout(()=>{saveSettings().catch(()=>{});},900);
}

function bumpStat(name,n,realmId){
  const s=ensureStats();if(!s)return;
  n=Math.floor(+n)||1;
  s[name]=(s[name]||0)+n;
  if(realmId){
    if(!s.byRealm||typeof s.byRealm!=='object')s.byRealm={};
    const r=s.byRealm[realmId]||(s.byRealm[realmId]={});
    r[name]=(r[name]||0)+n;
  }
  checkAchievements();
  scheduleStatsSave();
}

/* ====================== PLAY TIME ====================== */
let playTimer=null;
const PLAY_TICK_MS=10000;
function statsOnScreenChange(id){
  if(id==='screen-chat'){
    if(!playTimer)playTimer=setInterval(()=>{
      if(document.hidden)return;
      const s=ensureStats();if(!s)return;
      s.playMs=(s.playMs||0)+PLAY_TICK_MS;
      checkAchievements();
      scheduleStatsSave();
    },PLAY_TICK_MS);
  }else{
    clearInterval(playTimer);playTimer=null;
  }
}

/* ====================== ACHIEVEMENTS ====================== */
const ACHIEVEMENTS=[
  {id:'first-words', emoji:'💬',name:'FIRST WORDS',   desc:'Send your first message',            test:s=>(s.messagesSent||0)>=1},
  {id:'chatterbox',  emoji:'🗣️',name:'CHATTERBOX',    desc:'Send 100 messages',                  test:s=>(s.messagesSent||0)>=100},
  {id:'motormouth',  emoji:'📢',name:'MOTORMOUTH',    desc:'Send 500 messages',                  test:s=>(s.messagesSent||0)>=500},
  {id:'good-ear',    emoji:'👂',name:'GOOD LISTENER', desc:'Receive 100 replies',                test:s=>(s.repliesReceived||0)>=100},
  {id:'roller',      emoji:'🎲',name:'HIGH ROLLER',   desc:'Roll the dice 10 times',             test:s=>(s.rollsMade||0)>=10},
  {id:'natural-20',  emoji:'🌟',name:'NATURAL 20',    desc:'Roll a critical success',            test:s=>(s.crits||0)>=1},
  {id:'snake-eyes',  emoji:'💀',name:'SNAKE EYES',    desc:'Roll a critical failure',            test:s=>(s.fumbles||0)>=1},
  {id:'quest-done',  emoji:'📜',name:'QUEST COMPLETE',desc:'Finish your first quest',            test:s=>(s.questsCompleted||0)>=1},
  {id:'quest-x5',    emoji:'🏆',name:'SERIAL HERO',   desc:'Finish 5 quests',                    test:s=>(s.questsCompleted||0)>=5},
  {id:'timeline',    emoji:'⏳',name:'TIME TRAVELER', desc:'Branch a session into a new timeline',test:s=>(s.branchesMade||0)>=1},
  {id:'novelist',    emoji:'✍️',name:'NOVELIST',      desc:'Export your first story',            test:s=>(s.storiesExported||0)>=1},
  {id:'chronicler',  emoji:'📖',name:'CHRONICLER',    desc:'Earn a journal chapter',             test:s=>(s.chaptersWritten||0)>=1},
  {id:'saga',        emoji:'📚',name:'SAGA',          desc:'Earn 10 journal chapters',           test:s=>(s.chaptersWritten||0)>=10},
  {id:'worldsmith',  emoji:'🌍',name:'WORLD BUILDER', desc:'Create a realm',                     test:s=>(s.realmsCreated||0)>=1},
  {id:'demiurge',    emoji:'🪐',name:'DEMIURGE',      desc:'Create 3 realms',                    test:s=>(s.realmsCreated||0)>=3},
  {id:'packrat',     emoji:'🎒',name:'PACKRAT',       desc:'Collect an item',                    test:s=>(s.itemsCollected||0)>=1},
  {id:'hoarder',     emoji:'💰',name:'HOARDER',       desc:'Collect 10 items',                   test:s=>(s.itemsCollected||0)>=10},
  {id:'adventurer',  emoji:'🚀',name:'ADVENTURER',    desc:'Start a session',                    test:s=>(s.sessionsStarted||0)>=1},
  {id:'veteran',     emoji:'🎖️',name:'VETERAN',       desc:'Start 10 sessions',                  test:s=>(s.sessionsStarted||0)>=10},
  {id:'regular',     emoji:'⏰',name:'REGULAR',       desc:'Play for a total hour',              test:s=>(s.playMs||0)>=3600000},
  {id:'night-owl',   emoji:'🌙',name:'NIGHT OWL',     desc:'Play for 5 total hours',             test:s=>(s.playMs||0)>=5*3600000}
];

function checkAchievements(){
  const s=ensureStats();if(!s)return;
  ACHIEVEMENTS.forEach(a=>{
    if(settings.unlocked[a.id])return;
    let hit=false;
    try{hit=!!a.test(s);}catch(e){}
    if(!hit)return;
    settings.unlocked[a.id]=Date.now();
    toast(`🏆 ACHIEVEMENT: ${a.name}`);
    if(typeof sfx==='function')sfx('achievement');
  });
}

/* ====================== DASHBOARD UI ====================== */
function fmtPlayTime(ms){
  const m=Math.floor((ms||0)/60000);
  if(m<60)return m+'M';
  return Math.floor(m/60)+'H '+(m%60)+'M';
}
function renderStatsSection(){
  const wrap=document.getElementById('statsSection');if(!wrap)return;
  const s=ensureStats();if(!s)return;
  const tiles=[
    ['messagesSent','MESSAGES'],['repliesReceived','REPLIES'],['rollsMade','DICE ROLLS'],
    ['crits','NAT 20s'],['questsCompleted','QUESTS'],['branchesMade','TIMELINES'],
    ['chaptersWritten','CHAPTERS'],['itemsCollected','ITEMS'],['sessionsStarted','SESSIONS']
  ];
  const unlockedCount=ACHIEVEMENTS.filter(a=>settings.unlocked[a.id]).length;
  wrap.innerHTML=`
    <div class="stats-tiles">
      ${tiles.map(([k,label])=>`<div class="stat-tile"><div class="st-val">${s[k]||0}</div><div class="st-label">${label}</div></div>`).join('')}
      <div class="stat-tile"><div class="st-val">${fmtPlayTime(s.playMs)}</div><div class="st-label">PLAY TIME</div></div>
    </div>
    <div class="section-head" style="margin-top:4px"><h2>Achievements (${unlockedCount}/${ACHIEVEMENTS.length})</h2></div>
    <div class="ach-grid">
      ${ACHIEVEMENTS.map(a=>{
        const un=settings.unlocked[a.id];
        return`<div class="ach-card ${un?'unlocked':'locked'}" title="${esc(a.desc)}${un?' — unlocked '+new Date(un).toLocaleDateString():''}">
          <span class="ach-emoji">${a.emoji}</span>
          <span class="ach-meta"><span class="ach-name">${esc(a.name)}</span><span class="ach-desc">${esc(a.desc)}</span></span>
        </div>`;}).join('')}
    </div>`;
}
