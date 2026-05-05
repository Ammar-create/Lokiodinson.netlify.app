'use strict';
// ===== CONTROLLERS =====
const Ctrl={
  dlog(msg,type='info'){
    const entry=`[${new Date().toLocaleTimeString()}] ${msg}`;
    ST.chat.debugLog.push({entry,type});
    if(ST.chat.debugLog.length>200)ST.chat.debugLog.shift();
    const area=$('#debug-area');
    if(area){
      const cls=type==='error'?'derr':type==='ok'?'dok':type==='warn'?'dwarn':'dinfo';
      area.innerHTML+=`<span class="${cls}">${esc(entry)}\n</span>`;
      area.scrollTop=area.scrollHeight;
    }
  },
  buildSysPrompt(char,scenario,messages,rels){
    const stw=ST.settings.stWindow||30;
    const recent=messages.slice(-stw);
    const relCtx=Object.entries(rels||{})
      .filter(([k])=>k.startsWith(char.id+'→'))
      .map(([,r])=>`  • Toward ${r.toName||r.toId}: ${r.mood||'neutral'} (${r.intensity||5}/10) — ${r.reason||''}`)
      .join('\n');
    const cast=ST.chat.characters.map(c=>c.name).join(', ');
    return`You are ${char.name}. You are NOT an AI assistant — you are this character, fully immersed in the roleplay. Never break character. Never admit you are an AI.

SCENARIO: ${scenario.name}
SETTING: ${scenario.lore||'Unspecified setting.'}
YOUR PERSONALITY: ${char.personality||'No specific personality.'}
YOUR APPEARANCE: ${char.appearance||'No specific appearance.'}
YOUR CURRENT MOOD: ${char.emotionalState||'neutral'}
MOOD NOTES: ${char.moodNotes||'None'}
${relCtx?`\nYOUR RELATIONSHIPS:\n${relCtx}`:''}
${scenario.summary?`\nSTORY SO FAR: ${scenario.summary}`:''}
OTHERS PRESENT: ${cast}

FORMAT: Use *italics* for actions, "quotes" for dialogue. Mix freely: *smirks* "Is that so?"
Be natural, immersive, authentic to your personality. Vary response length based on the scene.
${scenario.settings?.aiKnowsUser===false?'You do not know which participant is the real human. Treat everyone as characters.':''}
${char.systemInjection?`\n[PRIVATE DIRECTOR NOTE - only you see this]: ${char.systemInjection}`:''}
${ST.chat.directive.next?`\n[STORY DIRECTION]: ${ST.chat.directive.next}`:''}`;
  },
  buildConvo(char,messages,chars){
    const stw=ST.settings.stWindow||30;
    const recent=messages.slice(-stw);
    const hist=[];
    for(const m of recent){
      if(m.charId===char.id){hist.push({role:'assistant',content:m.content});}
      else{
        const spk=chars.find(c=>c.id===m.charId);
        hist.push({role:'user',content:`${spk?.name||'Unknown'}: ${m.content}`});
      }
    }
    if(!hist.length)hist.push({role:'user',content:'[The scene begins.]'});
    return hist;
  },
  async runMain(scenario,chars,messages,rels){
    const model=ST.settings.ctrlModel||'llama-scout';
    Ctrl.dlog(`Main Controller firing (${model})...`,'dinfo');
    const stw=ST.settings.stWindow||30;
    const recent=messages.slice(-stw);
    const convo=recent.map(m=>{const c=chars.find(x=>x.id===m.charId);return`${c?.name||'?'}: ${m.content}`;}).join('\n');
    const charList=chars.map(c=>`- ${c.name} [${c.id}] mood:${c.emotionalState||'neutral'}`).join('\n');
    const sys=`You are the Main Controller for a roleplay scenario. Analyze the conversation, then respond ONLY with a valid JSON object — no other text, no markdown fences.
Return this exact structure:
{
  "characterUpdates":[{"charId":"id","emotionalState":"mood","moodNotes":"notes","systemInjection":"optional hidden note to inject"}],
  "relationshipUpdates":[{"fromId":"id","toId":"id","fromName":"name","toName":"name","mood":"positive|negative|neutral|romantic|suspicious|jealous|fearful","intensity":7,"reason":"why"}],
  "storySummary":"brief summary of events so far",
  "requestScenario":false
}`;
    const usr=`CHARACTERS:\n${charList}\n\nCONVERSATION:\n${convo}\n\nUSER DIRECTIVE: ${ST.chat.directive.next||'Continue naturally'}\nSTORY NOTES: ${ST.chat.directive.details||'None'}`;
    try{
      const raw=await API.chat([{role:'user',content:usr}],model,{temp:0.7,maxTokens:1500});
      Ctrl.dlog('Main Controller: response received','dok');
      let parsed;
      try{parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());}
      catch{Ctrl.dlog('Main Controller: JSON parse failed','derr');return null;}
      if(parsed.characterUpdates){
        for(const u of parsed.characterUpdates){
          const c=ST.chat.characters.find(x=>x.id===u.charId);
          if(c){c.emotionalState=u.emotionalState||c.emotionalState;c.moodNotes=u.moodNotes||'';c.systemInjection=u.systemInjection||'';}
        }
      }
      if(parsed.relationshipUpdates){
        for(const r of parsed.relationshipUpdates)ST.chat.rels[`${r.fromId}→${r.toId}`]=r;
        Chat.renderRels();
      }
      if(parsed.storySummary&&scenario){
        scenario.summary=parsed.storySummary;
        const sm=$('#panel-memory');if(sm)sm.textContent=parsed.storySummary;
        await DB.put('scenarios',scenario);
      }
      Ctrl.dlog(`Applied: ${parsed.characterUpdates?.length||0} char updates, ${parsed.relationshipUpdates?.length||0} rel updates`,'dok');
      if(parsed.storySummary)Chat.addCtrlMsg('◆ Narrative updated by Main Controller');
      Chat.renderCast();
      return parsed;
    }catch(err){Ctrl.dlog(`Main Controller error: ${err.message}`,'derr');return null;}
  },
  async runCreative(brief){
    const model=ST.settings.ctrlModel||'llama-scout';
    Ctrl.dlog(`Creative Controller: generating character from brief...`,'dinfo');
    const sys=`You are the Creative Controller. Generate a complete roleplay character from a brief description.
Respond ONLY with valid JSON — no other text, no markdown fences:
{"name":"Name","personality":"2-3 sentence personality","appearance":"2-3 sentence appearance","voice":"alloy|echo|fable|onyx|nova|shimmer","colorHint":"#hexcolor matching the character vibe","backstory":"brief backstory"}`;
    try{
      const raw=await API.chat([{role:'user',content:`Create a character based on: ${brief}`}],model,{temp:0.97,maxTokens:800});
      return JSON.parse(raw.replace(/```json|```/g,'').trim());
    }catch(err){Ctrl.dlog('Creative Controller failed: '+err.message,'derr');return null;}
  },
  async autoImprove(userChar,scenario,messages){
    const model=ST.settings.ctrlModel||'llama-scout';
    const recent=messages.slice(-15).map(m=>{const c=ST.chat.characters.find(x=>x.id===m.charId);return`${c?.name||'?'}: ${m.content}`;}).join('\n');
    const prompt=`Write the next in-character message for ${userChar.name} in this roleplay.

SCENARIO: ${scenario.name} — ${scenario.lore||''}
${userChar.name}'s PERSONALITY: ${userChar.personality||''}
DIRECTIVE: ${ST.chat.directive.next||'Continue naturally'}

RECENT CONVERSATION:
${recent}

Write only ${userChar.name}'s next message using *actions* and "dialogue". No labels.`;
    return await API.chat([{role:'user',content:prompt}],model,{temp:0.94,maxTokens:600});
  }
};