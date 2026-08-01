/* ===================================================================
   SUNNY DECK // RETRO  —  history-utils.js
   Shared history builder with whisper privacy filtering.
   Loaded after app.js. Exposes buildHistoryFor() as a global for
   classic scripts (app-ai.js, memory.js, etc.) to consume.
   =================================================================== */
'use strict';

/**
 * Build conversation history for a specific character, filtering out
 * whisper messages they weren't part of.
 *
 * @param {Object} sess  - session object with .history[]
 * @param {string|null} forCharKey
 *     - null  → omniscient view (router, stage director, quests)
 *     - key   → character-specific view (hides irrelevant whispers)
 * @param {number|null} limit
 *     - null/undefined → return ALL messages (no slice)
 *     - negative int   → slice from end (e.g. -8 = last 8)
 * @returns {string} formatted history, one line per message
 */
function buildHistoryFor(sess, forCharKey, limit) {
  var hist = (sess.history || []).filter(function(h) {
    // always exclude system messages (UI noise)
    if (h.kind === 'system') return false;

    // whisper privacy: hide whispers this character wasn't part of
    if (h.whisperTo) {
      // omniscient callers (null key) see everything
      if (forCharKey != null) {
        // include if character was the whisper target OR the speaker
        if (h.whisperTo !== forCharKey && h.speakerKey !== forCharKey) {
          return false;
        }
      }
    }

    return true;
  });

  // apply limit if specified
  if (limit != null) {
    hist = hist.slice(limit);
  }

  return hist.map(function(h) {
    var speaker = h.kind === 'event' ? 'Narrator' : h.speaker;
    return speaker + ': ' + h.text;
  }).join('\n');
}

/* ===================================================================
   V3 PER-CHARACTER HISTORY SYSTEM
   Hybrid model: the session timeline stays the source of truth; every
   entry is tagged with participants[] + heardBy[] at write time, and
   each character's first-person log (sess.charLogs[key]) is materialized
   lazily from the timeline via a seq watermark. Whispers are private:
   they appear only in speaker + target logs, never in heardBy.
   =================================================================== */

const CHAR_LOG_PROMPT_WINDOW=60;   // lines of a character's own log fed to the chat model

/* Last assigned seq in a session. Legacy entries have no seq; new
   entries always get one (monotonic, survives pruning/branching). */
function histLastSeq(sess){
  const hs=(sess&&sess.history)||[];
  for(let i=hs.length-1;i>=0;i--){if(typeof hs[i].seq==='number')return hs[i].seq;}
  return 0;
}

/* Unified adjustable radio radius: per-session, default 14 (% of map width). */
function radioRange(sess){
  const r=sess&&sess.radioRadius;
  return(typeof r==='number'&&r>0)?r:14;
}
function radioInRange(sess,keyA,keyB){
  const pos=sess&&sess.positions;if(!pos)return true;
  const a=pos[keyA],b=pos[keyB];if(!a||!b)return true;
  const aspect=typeof MAP_ASPECT==='number'?MAP_ASPECT:0.35;
  return Math.hypot(a.x-b.x,(a.y-b.y)*aspect)<=radioRange(sess);
}

/* Tag a message at write time: who participated vs who merely heard it.
   SHOUT reaches every character; whispers reach only speaker + target. */
function histTagEntry(sess,h,realm){
  if(!h)return;
  const r=realm||((typeof currentRealm!=='undefined'&&currentRealm)?currentRealm:null);
  const chars=(r&&Array.isArray(r.characters))?r.characters:[];
  const parts=[h.speakerKey];
  if(h.whisperTo)parts.push(h.whisperTo);
  if(h.targetKey)parts.push(h.targetKey);
  h.participants=[...new Set(parts.filter(Boolean))];
  if(h.whisperTo){h.heardBy=[];return;}
  if(h.shout){
    h.heardBy=chars.filter(c=>c.key!==h.speakerKey&&!h.participants.includes(c.key)).map(c=>c.key);
    return;
  }
  h.heardBy=chars
    .filter(c=>c.key!==h.speakerKey&&!h.participants.includes(c.key)&&radioInRange(sess,c.key,h.speakerKey))
    .map(c=>c.key);
}

/* THE write path for session history: seq + participant tagging + push. */
function histPush(sess,h,realm){
  if(!sess||!h)return h;
  if(!Array.isArray(sess.history))sess.history=[];
  h.seq=histLastSeq(sess)+1;
  if(!Array.isArray(h.participants))histTagEntry(sess,h,realm);
  sess.history.push(h);
  return h;
}

/* Count retained dialogue entries newer than a watermark (cadence checks). */
function histDialogueSince(sess,watermark){
  let n=0;
  for(const h of(sess.history||[])){
    if((!h.kind||h.kind==='dialogue')&&typeof h.seq==='number'&&h.seq>watermark)n++;
  }
  return n;
}

/* Project one timeline entry into a character's first-person log, or null
   if the character had no part in it (whisper privacy enforced here). */
function charLogEntry(sess,h,charKey){
  if(!h||h.kind==='system')return null;
  if(h.whisperTo){
    if(h.speakerKey!==charKey&&h.whisperTo!==charKey)return null;
  }
  let role;
  if(h.speakerKey===charKey)role='spoke';
  else if(h.whisperTo===charKey||h.targetKey===charKey||(h.participants||[]).includes(charKey))role='addressed';
  else if((h.heardBy||[]).includes(charKey))role='overheard';
  else return null;
  return{seq:typeof h.seq==='number'?h.seq:0,kind:h.kind,role,
    speakerKey:h.speakerKey,speaker:h.speaker,text:h.text,
    timestamp:h.timestamp,shout:!!h.shout};
}

/* Materialize (and incrementally refresh) a character's log. First access
   backfills the whole timeline (legacy entries have no seq); later syncs
   append only entries newer than the watermark. */
function syncCharLog(sess,charKey){
  if(!sess||!charKey)return null;
  if(!sess.charLogs)sess.charLogs={};
  const log=sess.charLogs[charKey]||(sess.charLogs[charKey]={syncedSeq:0,entries:[],syncedAll:false});
  const hist=sess.history||[];
  let fresh;
  if(!log.syncedAll){
    fresh=hist.slice();
    log.syncedAll=true;
  }else{
    const wm=log.syncedSeq||0;
    fresh=hist.filter(h=>typeof h.seq==='number'&&h.seq>wm);
  }
  if(fresh.length){
    fresh.forEach(h=>{
      const e=charLogEntry(sess,h,charKey);
      if(e)log.entries.push(e);
    });
    log.syncedSeq=histLastSeq(sess)||0;
  }
  return log;
}

/* First-person prompt context: the character's OWN log, bounded window.
   Never the omniscient timeline. */
function buildCharLogLines(sess,charKey,limit){
  const log=syncCharLog(sess,charKey);
  if(!log)return'';
  const arr=(typeof limit==='number'&&limit>0)?log.entries.slice(-limit):log.entries;
  return arr.map(e=>{
    if(e.role==='spoke')return`You: ${e.text}`;
    if(e.role==='addressed')return`${e.speaker} said to you: ${e.text}`;
    return e.shout?`You heard ${e.speaker} shout: ${e.text}`:`You overheard ${e.speaker} say: ${e.text}`;
  }).join('\n');
}
