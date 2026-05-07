'use strict';
// ===== CREATIVE CONTROLLER + MEDIA CONTROLLER =====
// Split from controllers.js — creative content generation, media, and autoImprove.
// Loaded after controllers.js (which defines the Ctrl global).
Object.assign(Ctrl,{

  _improveRunning:false,
  _improveAbort:false,

  // ===== CREATIVE CONTROLLER — Character Generation =====
  async runCreative(brief){
    const model=ST.settings.creativeModel||ST.settings.ctrlModel||'openai';
    Ctrl.dlog(`Creative Controller: generating character from brief (${model})...`,'dinfo');
    const sys=`You are the Creative Controller. Generate a complete roleplay character from a brief description.
Respond ONLY with valid JSON — no other text, no markdown fences:
{"name":"Name","personality":"2-3 sentence personality","appearance":"2-3 sentence appearance","voice":"alloy|echo|fable|onyx|nova|shimmer","colorHint":"#hexcolor matching the character vibe","backstory":"brief backstory"}`;
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
    }catch(err){Ctrl.dlog('Creative Controller failed: '+err.message,'err');return null;}
  },

  // ===== CREATIVE CONTROLLER — Scenario Auto-Creation =====
  async createScenario(description,selectedCharacters){
    const model=ST.settings.creativeModel||ST.settings.ctrlModel||'openai';
    Ctrl.dlog(`Creative Controller: creating scenario (${model})...`,'dinfo');
    const charList=selectedCharacters.map(c=>`- ${c.name}[${c.id}]: ${c.personality||'No personality'}. ${c.appearance||'No appearance'}. Mood: ${c.emotionalState||'neutral'}`).join('\n');
    const sys=`You are the Creative Controller. Generate a complete roleplay scenario based on a description and available characters.
Respond ONLY with valid JSON — no other text, no markdown fences:
{
  "name": "short evocative scenario name (max 40 chars)",
  "lore": "detailed world setting, atmosphere, and backstory (2-4 paragraphs, immersive and vivid)",
  "openingMessage": "scene-setting narration to start the story (1-2 paragraphs, atmospheric, sets the mood and introduces the setting)"
}`;
    const usr=`SCENARIO DESCRIPTION: ${description}\n\nAVAILABLE CHARACTERS:\n${charList}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.94,maxTokens:1500}));
      const parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());
      parsed.name=parsed.name||'Untitled Scenario';
      parsed.lore=parsed.lore||'';
      parsed.openingMessage=parsed.openingMessage||'';
      Ctrl.dlog(`Scenario created: "${parsed.name}"`,'ok');
      return parsed;
    }catch(err){Ctrl.dlog('createScenario failed: '+err.message,'err');return null;}
  },

  // ===== CREATIVE CONTROLLER — Character Image Generation =====
  async generateCharacterImages(characters){
    const model=ST.settings.creativeModel||ST.settings.ctrlModel||'openai';
    const imgModel=ST.settings.creativeImgModel||ST.settings.imgModel||'flux';
    Ctrl.dlog(`Creative Controller: generating ${characters.length} character image(s) (prompt model: ${model}, image model: ${imgModel})...`,'dinfo');
    const results=[];
    for(const char of characters){
      try{
        const sys=`Generate a detailed image generation prompt for a character portrait based on their description.
Respond ONLY with a valid JSON object — no other text, no markdown fences:
{"prompt":"detailed visual description of the character (2-3 sentences, include art style, lighting, pose, background, mood)","style":"anime|realistic|cinematic|painterly|comic","aspect":"1:1"}`;
        const usr=`CHARACTER NAME: ${char.name}\nAPPEARANCE: ${char.appearance||'Not specified'}\nPERSONALITY: ${char.personality||'Not specified'}\nCOLOR THEME: ${char.color||'#c9a84c'}`;
        const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.85,maxTokens:300}),15000);
        const parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());
        let w=512,h=512;
        if(parsed.aspect==='16:9'){w=768;h=432;}else if(parsed.aspect==='9:16'){w=432;h=768;}
        const prompt=parsed.prompt||`${char.appearance||char.name}, portrait`;
        const imageUrl=await API.generateImageUrl(prompt,w,h,imgModel);
        results.push({charId:char.id,imageUrl,prompt,style:parsed.style||'cinematic'});
        Ctrl.dlog(`Image prompt generated for ${char.name}`,'ok');
      }catch(err){
        Ctrl.dlog(`Image generation failed for ${char.name}: ${err.message}`,'warn');
        const fallbackPrompt=`${char.appearance||char.name}, character portrait, detailed`;
        try{
          const imageUrl=await API.generateImageUrl(fallbackPrompt,512,512,imgModel);
          results.push({charId:char.id,imageUrl,prompt:fallbackPrompt,style:'cinematic',fallback:true});
        }catch(fbErr){
          Ctrl.dlog(`Fallback image generation also failed: ${fbErr.message}`,'err');
          results.push({charId:char.id,imageUrl:null,prompt:fallbackPrompt,style:'cinematic',fallback:true,error:true});
        }
      }
    }
    return results;
  },

  // ===== MEDIA CONTROLLER — Image Prompt for Chat Messages =====
  async genImagePrompt(msg,char,scenario){
    const model=ST.settings.ctrlModel||'openai';
    Ctrl.dlog('Media Controller: generating image prompt...','dinfo');
    const sys=`You are the Media Controller. Generate a detailed image generation prompt based on the current moment in a roleplay.
Return ONLY a JSON object — no other text:
{"prompt":"detailed visual description (2-3 sentences, include lighting, mood, character appearance, action)","style":"anime|realistic|cinematic|painterly|comic","aspect":"16:9|1:1|9:16"}`;
    const usr=`CHARACTER: ${char.name}\nAPPEARANCE: ${char.appearance||'Not specified'}\nMOOD: ${char.emotionalState||'neutral'}\nSCENARIO: ${scenario.name}\nMESSAGE: ${msg.content.slice(0,300)}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.85,maxTokens:400}));
      return JSON.parse(raw.replace(/```json|```/g,'').trim());
    }catch(err){
      Ctrl.dlog(`Media Controller image error: ${err.message}`,'warn');
      return{prompt:`${char.appearance||''}, ${msg.content.replace(/\*[^*]+\*/g,'').replace(/"[^"]+"/g,'').trim().slice(0,200)}`,style:'cinematic',aspect:'1:1'};
    }
  },

  // ===== MEDIA CONTROLLER — Voice Hint =====
  async genVoiceHint(msg,char){
    const model=ST.settings.ctrlModel||'openai';
    const sys=`Analyze the message and character mood for voice generation. Return ONLY JSON:
{"emotion":"dominant emotion","intensity":7,"speed":"normal|slow|fast","emphasis":"key phrases or empty string"}`;
    const usr=`CHARACTER: ${char.name}\nMOOD: ${char.emotionalState||'neutral'}\nMESSAGE: ${msg.content.slice(0,300)}`;
    try{
      const raw=await Ctrl._withTimeout(API.chat([{role:'system',content:sys},{role:'user',content:usr}],model,{temp:0.6,maxTokens:200}),15000);
      return JSON.parse(raw.replace(/```json|```/g,'').trim());
    }catch(err){
      return{emotion:char.emotionalState||'neutral',intensity:5,speed:'normal',emphasis:''};
    }
  },

  // ===== AUTO-IMPROVE (streaming into textarea) =====
  async autoImprove(userChar,scenario,messages){
    if(Ctrl._improveRunning){Ctrl._improveAbort=true;return '';}
    Ctrl._improveRunning=true;
    Ctrl._improveAbort=false;
    const model=ST.settings.creativeModel||ST.settings.ctrlModel||'openai';
    const recent=messages.slice(-15).map(m=>{const c=ST.chat.characters.find(x=>x.id===m.charId);return`${c?.name||'?'}: ${m.content}`;}).join('\n');
    const memKey=`${userChar.id}_${ST.chat.scenId}`;
    const mems=ST.chat.charMems?.[memKey]||[];
    const memCtx=mems.length?`\n${userChar.name}'S PRIVATE MEMORIES:\n${mems.slice(-10).map(m=>`- [${m.type}] ${m.content}`).join('\n')}`:'';
    const prompt=`Write the next in-character message for ${userChar.name} in this roleplay.\n\nSCENARIO: ${scenario.name} — ${scenario.lore||''}\n${userChar.name}'s PERSONALITY: ${userChar.personality||''}\nDIRECTIVE: ${ST.chat.directive.next||'Continue naturally'}\n${memCtx}\n\nRECENT CONVERSATION:\n${recent}\n\nWrite only ${userChar.name}'s next message using *actions* and "dialogue". No labels.`;

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
  }
});
