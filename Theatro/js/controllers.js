'use strict';
// ===== CONTROLLERS =====
// NOTE: AI character responses are always treated as public messages.
// Only user messages can be private (isPrivate flag).
// This is intentional — AI characters have no concept of whispering.
const Ctrl={
  _improveRunning:false,
  _improveAbort:false,
  async _withTimeout(promise,ms=30000){
    let timer;
    const timeout=new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error('Controller timeout')),ms);});
    try{return await Promise.race([promise,timeout]);}finally{clearTimeout(timer);}
  },
  dlog(msg,type='info'){
    const entry=`[${new Date().toLocaleTimeString()}] ${msg}`;
    ST.chat.debugLog.push({entry,type});
    if(ST.chat.debugLog.length>200)ST.chat.debugLog.shift();
    const area=$('#debug-area');
    if(area){
      const cls=type==='error'?'derr':type==='ok'?'dok':type==='warn'?'dwarn':'dinfo';
      area.innerHTML+=`<span class="${cls}">${esc(entry)}\n</span>`;
      const children=area.children;
      if(children.length>500){for(let i=0;i<100&&children.length>0;i++){children[0].remove();}}
      area.scrollTop=area.scrollHeight;
    }
  },
  buildSysPrompt(char,scenario,messages,rels){
    const stw=ST.settings.stWindow||30;
    const recent=messages.slice(-stw);
    const relCtx=Object.entries(rels||{})
      .filter(([k])=>k.startsWith(char.id+'\u2192'))
      .map(([,r])=>`  \u2022 Toward ${r.toName||r.toId}: ${r.mood||'neutral'} (${r.intensity||5}/10) \u2014 ${r.reason||''}`)
      .join('\n');
    const cast=ST.chat.characters.map(c=>c.name).join(', ');
    // Per-character private memory injection
    const memKey=`${char.id}_${ST.chat.scenId}`;
    const mems=ST.chat.charMems?.[memKey]||[];
    const memCtx=mems.length?`\nYOUR PRIVATE MEMORIES (things you personally witnessed/felt \u2014 only you know these):\n${mems.slice(-20).map(m=>`- [${m.type}] ${m.content}`).join('\n')}`:'';
    return`You are ${char.name}. You are NOT an AI assistant \u2014 you are this character, fully immersed in the roleplay. Never break character. Never admit you are an AI.\n\nSCENARIO: ${scenario.name}\nSETTING: ${scenario.lore||'Unspecified setting.'}\nYOUR PERSONALITY: ${char.personality||'No specific personality.'}\nYOUR APPEARANCE: ${char.appearance||'No specific appearance.'}\nYOUR CURRENT MOOD: ${char.emotionalState||'neutral'}\nMOOD NOTES: ${char.moodNotes||'None'}\n${relCtx?`\nYOUR RELATIONSHIPS:\n${relCtx}`:''}\n${scenario.summary?`\nSTORY SO FAR: ${scenario.summary}`:''}\nOTHERS PRESENT: ${cast}\n${memCtx}\n\nFORMAT: Use *italics* for actions, "quotes" for dialogue. Mix freely: *smirks* "Is that so?"\nBe natural, immersive, authentic to your personality. Vary response length based on the scene.\n${scenario.settings?.aiKnowsUser===false?'You do not know which participant is the real human. Treat everyone as characters.':''}\n${char.systemInjection?`\n[PRIVATE DIRECTOR NOTE - only you see this]: ${char.systemInjection}`:''}\n${ST.chat.directive.next?`\n[STORY DIRECTION]: ${ST.chat.directive.next}`:''}`;
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

  // ===== MAIN CONTROLLER =====
  async runMain(scenario,chars,messages,rels){
    // BUG 1 fix: replaced invalid 'llama-scout' fallback with 'openai'
    const model=ST.settings.ctrlModel||'openai';
    Ctrl.dlog(`Main Controller firing (${model})...`,'dinfo');
    const stw=ST.settings.stWindow||30;
    const recent=messages.slice(-stw);
    const convo=recent.map(m=>{const c=chars.find(x=>x.id===m.charId);return`${c?.name||'?'}: ${m.content}`;}).join('\n');
    const charList=chars.map(c=>`- ${c.name} [${c.id}] mood:${c.emotionalState||'neutral'}`).join('\n');
    const sys=`You are the Main Controller for a roleplay scenario. Analyze the conversation, then respond ONLY with a valid JSON object \u2014 no other text, no markdown fences.\nReturn this exact structure:\n{\n  "characterUpdates":[{"charId":"id","emotionalState":"mood","moodNotes":"notes","systemInjection":"optional hidden note to inject"}],\n  "relationshipUpdates":[{"fromId":"id","toId":"id","fromName":"name","toName":"name","mood":"positive|negative|neutral|romantic|suspicious|jealous|fearful","intensity":7,"reason":"why"}],\n  "memoryUpdates":[{"charId":"id","content":"what this character witnessed or felt","type":"witnessed|felt|told"}],\n  "storySummary":"brief summary of events so far",\n  "requestScenario":false,\n  "scenarioHint":"brief hint for what the scenario controller should do next"\n}`;
    const usr=`CHARACTERS:\n${charList}\n\nCONVERSATION:\n${convo}\n\nUSER DIRECTIVE: ${ST.chat.directive.next||'Continue naturally'}\nSTORY NOTES: ${ST.chat.directive.details||'None'}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.7,maxTokens:1500}));
      Ctrl.dlog('Main Controller: response received','dok');
      let parsed;
      try{parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());}
      catch{Ctrl.dlog('Main Controller: JSON parse failed','derr');return null;}
      if(parsed.characterUpdates){
        for(const u of parsed.characterUpdates){
          const c=ST.chat.characters.find(x=>x.id===u.charId);
          if(c){
            c.emotionalState=u.emotionalState||c.emotionalState;
            c.moodNotes=u.moodNotes||'';
            c.systemInjection=u.systemInjection||'';
            try{
              await DB.put('characters',{...c,updatedAt:Date.now()});
              Ctrl.dlog(`Persisted emotional state for ${c.name}`,'ok');
            }catch(err){
              Ctrl.dlog(`Failed to persist emotional state for ${c.name}: ${err.message}`,'warn');
            }
          }
        }
      }
      // Per-character memory updates from controller analysis
      if(parsed.memoryUpdates){
        for(const mu of parsed.memoryUpdates){
          await Ctrl.addMemory(mu.charId,ST.chat.scenId,mu.content,mu.type);
        }
        Ctrl.dlog(`Added ${parsed.memoryUpdates.length} memory entries`,'ok');
      }
      if(parsed.relationshipUpdates){
        for(const r of parsed.relationshipUpdates)ST.chat.rels[`${r.fromId}\u2192${r.toId}`]=r;
        // NOTE: Caller is responsible for persisting relationships to DB.
        // genResponse does this automatically; manual callers (runCtrl) must do it themselves.
        Chat.renderRels();
      }
      if(parsed.storySummary&&scenario){
        scenario.summary=parsed.storySummary;
        const sm=$('#panel-memory');if(sm)sm.textContent=parsed.storySummary;
        await DB.put('scenarios',scenario);
      }
      Ctrl.dlog(`Applied: ${parsed.characterUpdates?.length||0} char updates, ${parsed.relationshipUpdates?.length||0} rel updates`,'dok');
      if(parsed.storySummary)Chat.addCtrlMsg('\u25c6 Narrative updated by Main Controller');
      Chat.renderCast();
      // Auto-trigger Scenario Controller if requested
      if(parsed.requestScenario&&parsed.scenarioHint){
        Ctrl.dlog('Main Controller requesting Scenario Controller...','dinfo');
        setTimeout(()=>Ctrl.runScenario(scenario,chars,messages,rels,parsed.scenarioHint),300);
      }
      return parsed;
    }catch(err){Ctrl.dlog(`Main Controller error: ${err.message}`,'derr');return null;}
  },

  // ===== SCENARIO CONTROLLER =====
  async runScenario(scenario,chars,messages,rels,hint){
    // BUG 1 fix: replaced invalid 'llama-scout' fallback with 'openai'
    const model=ST.settings.ctrlModel||'openai';
    Ctrl.dlog(`Scenario Controller firing (${model})...`,'dinfo');
    const stw=ST.settings.stWindow||30;
    const recent=messages.slice(-stw);
    const convo=recent.map(m=>{const c=chars.find(x=>x.id===m.charId);return`${c?.name||'?'}: ${m.content}`;}).join('\n');
    const charList=chars.map(c=>`- ${c.name} [${c.id}] mood:${c.emotionalState||'neutral'}`).join('\n');
    const sys=`You are the Scenario Controller for a roleplay narrative. Your job is to advance the story with surprising events, scene changes, and dramatic twists. Respond ONLY with valid JSON \u2014 no other text, no markdown fences.\n\nReturn this exact structure:\n{\n  "sceneChange": "description of new location/setting if applicable, or null",\n  "surpriseEvent": "a dramatic event (eavesdropping, arrival, discovery, weather, etc.) or null",\n  "narration": "brief narration text to display in chat as a system message, or null",\n  "characterEffects": [{"charId":"id","effect":"how this event affects them specifically"}],\n  "suggestedNext": "what might naturally happen next"\n}\n\nBe creative but consistent with the scenario tone. Events should feel organic, not forced.`;
    const usr=`SCENARIO: ${scenario.name}\nSETTING: ${scenario.lore||'Unspecified'}\n\nCHARACTERS:\n${charList}\n\nRECENT CONVERSATION:\n${convo}\n\nHINT: ${hint||ST.chat.directive.next||'Continue naturally with a surprise'}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.92,maxTokens:800}));
      Ctrl.dlog('Scenario Controller: response received','dok');
      let parsed;
      try{parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());}
      catch{Ctrl.dlog('Scenario Controller: JSON parse failed','derr');return null;}
      if(parsed.narration)Chat.addCtrlMsg(`\ud83c\udfac ${parsed.narration}`);
      if(parsed.sceneChange){Ctrl.dlog(`Scene changed: ${parsed.sceneChange}`,'ok');Chat.addCtrlMsg(`\ud83d\udccd Scene: ${parsed.sceneChange}`);}
      if(parsed.surpriseEvent){Ctrl.dlog(`Surprise event: ${parsed.surpriseEvent}`,'ok');Chat.addCtrlMsg(`\u26a1 Event: ${parsed.surpriseEvent}`);}
      if(parsed.characterEffects){
        for(const eff of parsed.characterEffects){
          await Ctrl.addMemory(eff.charId,ST.chat.scenId,`[Event] ${eff.effect}`,'witnessed');
          const c=ST.chat.characters.find(x=>x.id===eff.charId);
          if(c){
            const existing=c.systemInjection||'';
            c.systemInjection=existing?(existing+'\n'+eff.effect):eff.effect;
            if(c.systemInjection.length>500)c.systemInjection=c.systemInjection.slice(-400);
            await DB.put('characters',{...c,updatedAt:Date.now()});
          }
        }
        Ctrl.dlog(`Applied ${parsed.characterEffects.length} character effects`,'ok');
      }
      if(parsed.suggestedNext){
        ST.chat.directive.details=(ST.chat.directive.details?ST.chat.directive.details+'\n':'')+`[Scenario suggests]: ${parsed.suggestedNext}`;
      }
      Chat.scrollEnd();
      return parsed;
    }catch(err){Ctrl.dlog(`Scenario Controller error: ${err.message}`,'derr');return null;}
  },

  // ===== CREATIVE CONTROLLER =====
  async runCreative(brief){
    // BUG 1 fix: replaced invalid 'llama-scout' fallback with 'openai'
    const model=ST.settings.ctrlModel||'openai';
    Ctrl.dlog(`Creative Controller: generating character from brief...`,'dinfo');
    const sys=`You are the Creative Controller. Generate a complete roleplay character from a brief description.\nRespond ONLY with valid JSON \u2014 no other text, no markdown fences:\n{"name":"Name","personality":"2-3 sentence personality","appearance":"2-3 sentence appearance","voice":"alloy|echo|fable|onyx|nova|shimmer","colorHint":"#hexcolor matching the character vibe","backstory":"brief backstory"}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:`Create a character based on: ${brief}`}],model,{temp:0.97,maxTokens:800}));
      const parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());
      if(!parsed.name?.trim())parsed.name='Character-'+Math.random().toString(36).slice(2,8);
      parsed.personality=parsed.personality||'';
      parsed.appearance=parsed.appearance||'';
      parsed.voice=parsed.voice||'nova';
      parsed.colorHint=parsed.colorHint||'#c9a84c';
      parsed.backstory=parsed.backstory||'';
      return parsed;
    }catch(err){Ctrl.dlog('Creative Controller failed: '+err.message,'derr');return null;}
  },

  // ===== MEDIA CONTROLLER =====
  async genImagePrompt(msg,char,scenario){
    // BUG 1 fix: replaced invalid 'llama-scout' fallback with 'openai'
    const model=ST.settings.ctrlModel||'openai';
    Ctrl.dlog('Media Controller: generating image prompt...','dinfo');
    const sys=`You are the Media Controller. Generate a detailed image generation prompt based on the current moment in a roleplay.\nReturn ONLY a JSON object \u2014 no other text:\n{"prompt":"detailed visual description (2-3 sentences, include lighting, mood, character appearance, action)","style":"anime|realistic|cinematic|painterly|comic","aspect":"16:9|1:1|9:16"}`;
    const usr=`CHARACTER: ${char.name}\nAPPEARANCE: ${char.appearance||'Not specified'}\nMOOD: ${char.emotionalState||'neutral'}\nSCENARIO: ${scenario.name}\nMESSAGE: ${msg.content.slice(0,300)}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.85,maxTokens:400}));
      return JSON.parse(raw.replace(/```json|```/g,'').trim());
    }catch(err){
      Ctrl.dlog(`Media Controller image error: ${err.message}`,'warn');
      return{prompt:`${char.appearance||''}, ${msg.content.replace(/\*[^*]+\*/g,'').replace(/"[^"]+"/g,'').trim().slice(0,200)}`,style:'cinematic',aspect:'1:1'};
    }
  },
  async genVoiceHint(msg,char){
    // BUG 1 fix: replaced invalid 'llama-scout' fallback with 'openai'
    const model=ST.settings.ctrlModel||'openai';
    const sys=`Analyze the message and character mood for voice generation. Return ONLY JSON:\n{"emotion":"dominant emotion","intensity":7,"speed":"normal|slow|fast","emphasis":"key phrases or empty string"}`;
    const usr=`CHARACTER: ${char.name}\nMOOD: ${char.emotionalState||'neutral'}\nMESSAGE: ${msg.content.slice(0,300)}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.6,maxTokens:200}),15000);
      return JSON.parse(raw.replace(/```json|```/g,'').trim());
    }catch(err){
      return{emotion:char.emotionalState||'neutral',intensity:5,speed:'normal',emphasis:''};
    }
  },

  // FIX #12: autoImprove now streams into the textarea progressively
  async autoImprove(userChar,scenario,messages){
    if(Ctrl._improveRunning){Ctrl._improveAbort=true;return '';}
    Ctrl._improveRunning=true;
    Ctrl._improveAbort=false;
    // BUG 1 fix: replaced invalid 'llama-scout' fallback with 'openai'
    const model=ST.settings.ctrlModel||'openai';
    const recent=messages.slice(-15).map(m=>{const c=ST.chat.characters.find(x=>x.id===m.charId);return`${c?.name||'?'}: ${m.content}`;}).join('\n');
    const memKey=`${userChar.id}_${ST.chat.scenId}`;
    const mems=ST.chat.charMems?.[memKey]||[];
    const memCtx=mems.length?`\n${userChar.name}'S PRIVATE MEMORIES:\n${mems.slice(-10).map(m=>`- [${m.type}] ${m.content}`).join('\n')}`:'';
    const prompt=`Write the next in-character message for ${userChar.name} in this roleplay.\n\nSCENARIO: ${scenario.name} \u2014 ${scenario.lore||''}\n${userChar.name}'s PERSONALITY: ${userChar.personality||''}\nDIRECTIVE: ${ST.chat.directive.next||'Continue naturally'}\n${memCtx}\n\nRECENT CONVERSATION:\n${recent}\n\nWrite only ${userChar.name}'s next message using *actions* and "dialogue". No labels.`;

    // Stream into textarea if streaming enabled
    if(ST.settings.streaming){
      const ta=$('#chat-ta');
      if(ta){ta.value='';Scr.taResize(ta);}
      let full='';
      try{
        await API.stream([{role:'user',content:prompt}],model,(chunk,done)=>{
          if(Ctrl._improveAbort)throw new Error('Cancelled by user');
          full+=chunk;
          if(ta){ta.value=full;Scr.taResize(ta);}
        },{temp:0.94,maxTokens:600});
      }catch(err){
        if(err.message!=='Cancelled by user')Ctrl.dlog(`autoImprove stream error: ${err.message}`,'warn');
      }
      Ctrl._improveRunning=false;
      Ctrl._improveAbort=false;
      return full;
    }
    try{
      return await API.chat([{role:'user',content:prompt}],model,{temp:0.94,maxTokens:600});
    }finally{
      Ctrl._improveRunning=false;
      Ctrl._improveAbort=false;
    }
  },

  // ===== PRIVATE MEMORY SYSTEM =====
  async addMemory(charId,scenId,content,type='witnessed'){
    const key=`${charId}_${scenId}`;
    if(!ST.chat.charMems)ST.chat.charMems={};
    if(!ST.chat.charMems[key])ST.chat.charMems[key]=[];
    const mem={id:uid(),charId,scenId,content,type,timestamp:Date.now()};
    ST.chat.charMems[key].push(mem);
    // Cap at 50 memories per character per scenario to prevent unbounded growth
    if(ST.chat.charMems[key].length>50)ST.chat.charMems[key]=ST.chat.charMems[key].slice(-50);
    await DB.put('memories',{id:key,charId,scenId,events:ST.chat.charMems[key]});
    return mem;
  },
  async loadMemories(scenId,chars){
    ST.chat.charMems={};
    for(const c of chars){
      const key=`${c.id}_${scenId}`;
      const stored=await DB.get('memories',key);
      if(stored?.events)ST.chat.charMems[key]=stored.events;
    }
  }
};
