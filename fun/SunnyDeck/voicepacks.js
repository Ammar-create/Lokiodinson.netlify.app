/* ===================================================================
   SUNNY DECK // V3 —  voicepacks.js
   Voice packs: 2-4 exemplar lines that teach the model HOW a character
   sounds, killing catchphrase loops. Prebuilt for the premade casts;
   user-created / imported characters get an auto-distilled pack from
   their own history (cheap task-model call, once, lazy). getReply
   injects the pack into the VOICE layer of the system prompt.
   =================================================================== */
'use strict';

/* Prebuilt packs keyed by premade character key. Order: casual,
   emotional, teasing — one line each. */
const PREBUILT_VOICELINES={
  luffy:['Meat! I want meat!','I\'m gonna become the Pirate King, no matter what!','You can\'t beat me — I\'m made of rubber!'],
  zoro:['Oi, where\'s the kitchen?','I made a promise to Kuina. I\'ll never lose again.','Three swords. Count them. Now run.'],
  nami:['That\'ll be 100,000 berries.','This isn\'t about money. It\'s my village, my home.','Nice try. The debt doubles for that one.'],
  usopp:['I am the great Captain Usopp!','I\'m not brave. But I\'ll never run when my friends need me.','That\'s a true story. Cross my heart!'],
  sanji:['Lunch is ready, my beauties.','A man who can\'t feed his friends isn\'t a man at all.','Oh? My heart\'s all aflutter. The cook\'s special for you.'],
  chopper:['R-Right! I\'ll do my best!','I became a doctor to cure every disease in the world!','I\'m not a raccoon! I\'m a reindeer!'],
  robin:['How interesting.','You were worth living for. That\'s all.','Careful — I\'ve read a book about what happens next.'],
  franky:['SUUUUPER!','This ship is my masterpiece. I\'d die before I let it sink.','Call me a cyborg again. I dare you.'],
  brook:['Yohohoho! Skull joke!','I waited alone for fifty years... but I\'m not lonely anymore.','May I see your panties? Yohohoho!'],
  jinbe:['Let us speak plainly, captain.','I owe my life to this crew. That debt I will repay with honor.','Even the sea cannot wash away a promise.'],
  monica:['Who left crumbs on my counter?','I work twice as hard because I know I\'m not a natural.','Taste that? That\'s love. And butter.'],
  chandler:['Could I BE any more tired?','I\'m not great at advice. Can I offer you a sarcastic comment?','I say we buy them a stripper. No wait, that\'s a different story.'],
  rachel:['I was on a break!','This is a story about a girl named Rachel...','It\'s just hair. Don\'t make it weird.'],
  ross:['We were on a break!','PIVOT! PIVOT!','I\'m fine. I\'m SO fine. This is a disaster.'],
  joey:['How you doin\'?','Joey doesn\'t share food!','Could this job BE any more perfect?'],
  phoebe:['Smelly Cat, Smelly Cat, what are they feeding you?','I wish I could, but I don\'t want to.','That\'s not a cat. That\'s a tiny lion.'],
  tony:['I am Iron Man.','Genius, billionaire, playboy, philanthropist.','I shouldn\'t be alive... unless it was for a reason.'],
  steve:['I can do this all day.','I don\'t like bullies; I don\'t care where they\'re from.','Language!'],
  natasha:['You\'ve been busy.','I\'ve got red in my ledger. I\'d like to wipe it out.','This is a bad idea — let\'s do it.'],
  thor:['Another! Another!','Bring me Thanos!','I need a horse. And a drink.'],
  bruce:['That\'s my secret: I\'m always angry.','I don\'t think we should be doing this.','The other guy says hi.'],
  clint:['I\'m not gonna kill you. Not today.','The city is flying... we\'re fighting an army of robots.','I\'ve got a family. That\'s what I fight for.']
};

function voiceLinesFor(c){
  if(!c)return null;
  if(Array.isArray(c.voiceLines)&&c.voiceLines.length)return c.voiceLines;
  const pre=PREBUILT_VOICELINES[c.key];
  return Array.isArray(pre)?pre:null;
}

/* Auto-distill a voice pack from the character's own history when they
   have no pack and enough spoken lines. One cheap task-model call per
   character; busy-flagged so concurrent replies share the work. */
let voicePackBusy=false;
async function ensureVoicePack(c,realm,sess){
  if(!c||voiceLinesFor(c)||voicePackBusy)return;
  if(!providerReady(settings.taskModel||DEFAULT_SETTINGS.taskModel)||typeof aiJson!=='function')return;
  const log=(typeof syncCharLog==='function')?syncCharLog(sess,c.key):null;
  const lines=(log?.entries||[])
    .filter(e=>e.role!=='overheard')
    .map(e=>e.text)
    .filter(t=>typeof t==='string'&&t.trim());
  if(lines.length<5)return;
  voicePackBusy=true;
  try{
    const sample=lines.slice(-40).join('\n');
    const prompt=`Here are ${c.name}'s actual spoken lines:\n${sample}\nWrite THREE short exemplar lines that capture this character's exact voice: one casual, one emotional, one teasing. Match their vocabulary, rhythm, and tone exactly. Output ONLY JSON: {"casual":"...","emotional":"...","teasing":"..."}`;
    const parsed=await aiJson(prompt,settings.taskModel,160);
    const arr=[parsed?.casual,parsed?.emotional,parsed?.teasing]
      .filter(s=>typeof s==='string'&&s.trim())
      .map(s=>s.trim().slice(0,200));
    if(arr.length){
      c.voiceLines=arr;
      if(realm&&realm.isRoom&&currentSession&&currentSession.isRoom)await dbPut('sessions',currentSession);
      else if(realm)await dbPut('realms',realm);
    }
  }catch(e){console.warn('Voice pack distill failed',e);}
  finally{voicePackBusy=false;}
}
