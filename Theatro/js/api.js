'use strict';
// ===== API =====
const API={
  endpoint(model){
    const s=ST.settings;
    // aqua: prefix convention — strip prefix for real Aqua model ID
    if(model.startsWith('aqua:')){
      const real=model.slice(5);
      if(s.aquaKey)
        return{url:'https://api.aquadevs.com/v1/chat/completions',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.aquaKey}`},model:real,provider:'aqua'};
      // No Aqua key configured — fall back to Pollinations
      return{...API._pollinationsEndpoint(),model:real,provider:'pollinations'};
    }
    const m=MODELS.find(x=>x.id===model);
    if(m?.provider==='aqua'&&s.aquaKey)
      return{url:'https://api.aquadevs.com/v1/chat/completions',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.aquaKey}`},model,provider:'aqua'};
    if(s.customUrl&&s.customKey)
      return{url:s.customUrl.replace(/\/$/,'')+'/chat/completions',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.customKey}`},model,provider:'custom'};
    return{...API._pollinationsEndpoint(),model,provider:'pollinations'};
  },
  _pollinationsEndpoint(){
    const s=ST.settings;
    const url='https://gen.pollinations.ai/v1/chat/completions';
    const h={'Content-Type':'application/json'};
    h['Authorization']=`Bearer ${s.pollinationsKey||'pk_LUy70Tu8OwLI1HrU'}`;
    return{url,headers:h};
  },
  _base(provider){
    const s=ST.settings;
    if(provider==='aqua'&&s.aquaKey)
      return{url:'https://api.aquadevs.com/v1',headers:{'Authorization':`Bearer ${s.aquaKey}`}};
    if(provider==='custom'&&s.customUrl&&s.customKey)
      return{url:s.customUrl.replace(/\/$/,'')+'/v1',headers:{'Authorization':`Bearer ${s.customKey}`}};
    return{url:'https://gen.pollinations.ai/v1',headers:{'Authorization':`Bearer ${s.pollinationsKey||'pk_LUy70Tu8OwLI1HrU'}`}};
  },
  // Helper: get the Pollinations API key for query-param usage (image URLs, GET TTS, etc.)
  _pollinationsKey(){
    return ST.settings.pollinationsKey||'pk_LUy70Tu8OwLI1HrU';
  },

  // Rate limit tracking — log calls, show reminder every 10 calls for pollinations
  trackCall(provider){
    const now=Date.now();
    const bucket=ST.rateLimits[provider];
    if(!bucket)return;
    bucket.calls.push(now);
    bucket.calls=bucket.calls.filter(t=>now-t<3600000);
    if(bucket.calls.length%10===0&&bucket.calls.length>0){
      Ctrl?.dlog?.(`Pollinations: ${bucket.calls.length} calls this hour. pk_ keys are limited to 1 pollen/hr. Monitor your balance at gen.pollinations.ai/account/balance`,'warn');
    }
  },

  async chat(msgs,model,opts={}){
    const ep=API.endpoint(model);
    API.trackCall(ep.provider);
    const body={model:ep.model,messages:msgs,max_tokens:opts.maxTokens||1000,temperature:opts.temp??0.9,stream:false};
    try{
      const r=await fetch(ep.url,{method:'POST',headers:ep.headers,body:JSON.stringify(body)});
      if(!r.ok){
        if(ep.provider==='aqua'){
          const errText=await r.text();
          Ctrl?.dlog?.(`Aqua API ${r.status}: ${errText.slice(0,100)} — falling back to Pollinations`,'warn');
          const pol=API._pollinationsEndpoint();
          const fbModel=model.startsWith('aqua:')?model.slice(5):model;
          const r2=await fetch(pol.url,{method:'POST',headers:pol.headers,body:JSON.stringify({...body,model:fbModel})});
          if(!r2.ok){const t=await r2.text();throw new Error(`Pollinations fallback ${r2.status}: ${t.slice(0,150)}`);}
          const d=await r2.json();return d.choices?.[0]?.message?.content||'';
        }
        const t=await r.text();throw new Error(`API ${r.status}: ${t.slice(0,150)}`);
      }
      const d=await r.json();return d.choices?.[0]?.message?.content||'';
    }catch(err){
      if(ep.provider==='aqua'&&!err.message.includes('Pollinations fallback')){
        Ctrl?.dlog?.(`Aqua error: ${err.message} — falling back to Pollinations`,'warn');
        try{
          const pol=API._pollinationsEndpoint();
          const fbModel=model.startsWith('aqua:')?model.slice(5):model;
          body.model=fbModel;
          const r=await fetch(pol.url,{method:'POST',headers:pol.headers,body:JSON.stringify(body)});
          if(!r.ok){const t=await r.text();throw new Error(`Pollinations fallback ${r.status}: ${t.slice(0,150)}`);}
          const d=await r.json();return d.choices?.[0]?.message?.content||'';
        }catch(fbErr){throw new Error(`Both providers failed: Aqua=${err.message}, Pollinations=${fbErr.message}`);}
      }
      throw err;
    }
  },
  async stream(msgs,model,onChunk,opts={}){
    if(!ST.settings.streaming){const t=await API.chat(msgs,model,opts);onChunk(t,true);return;}
    const ep=API.endpoint(model);
    API.trackCall(ep.provider);
    try{
      const r=await fetch(ep.url,{method:'POST',headers:ep.headers,body:JSON.stringify({model:ep.model,messages:msgs,max_tokens:opts.maxTokens||1000,temperature:opts.temp??0.9,stream:true})});
      if(!r.ok){
        if(ep.provider==='aqua'){
          const errText=await r.text();
          Ctrl?.dlog?.(`Aqua stream ${r.status}: ${errText.slice(0,100)} — falling back to Pollinations (non-stream)`,'warn');
          const fbModel=model.startsWith('aqua:')?model.slice(5):model;
          const text=await API.chat(msgs,fbModel,opts);
          onChunk(text,true);return;
        }
        const t=await r.text();throw new Error(`API ${r.status}: ${t.slice(0,150)}`);
      }
      const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
      try{
        while(true){
          const{done,value}=await reader.read();if(done)break;
          buf+=dec.decode(value,{stream:true});
          const lines=buf.split('\n');buf=lines.pop();
          for(const line of lines){
            if(!line.startsWith('data: '))continue;
            const data=line.slice(6).trim();if(data==='[DONE]')return;
            try{const p=JSON.parse(data);const delta=p.choices?.[0]?.delta?.content;if(delta)onChunk(delta,false);}catch{}
          }
        }
      }catch(err){
        Ctrl?.dlog?.(`Stream interrupted: ${err.message}`,'warn');
        if(ep.provider==='aqua'){
          Ctrl?.dlog?.('Aqua stream error — falling back to Pollinations (non-stream)','warn');
          try{
            const fbModel=model.startsWith('aqua:')?model.slice(5):model;
            const text=await API.chat(msgs,fbModel,opts);
            if(text)onChunk(text,true);return;
          }catch(fbErr){Ctrl?.dlog?.(`Pollinations fallback failed: ${fbErr.message}`,'err');throw err;}
        }
        if(buf.trim()){
          const lines=buf.split('\n');
          for(const line of lines){
            if(!line.startsWith('data: '))continue;
            const data=line.slice(6).trim();if(data==='[DONE]')break;
            try{const p=JSON.parse(data);const delta=p.choices?.[0]?.delta?.content;if(delta)onChunk(delta,false);}catch{}
          }
        }
        throw err;
      }finally{
        try{reader.releaseLock();}catch{}
      }
    }catch(err){
      if(ep.provider==='aqua'){
        Ctrl?.dlog?.(`Aqua stream fetch error: ${err.message} — falling back to Pollinations (non-stream)`,'warn');
        try{
          const fbModel=model.startsWith('aqua:')?model.slice(5):model;
          const text=await API.chat(msgs,fbModel,opts);
          onChunk(text,true);return;
        }catch(fbErr){throw new Error(`Both providers failed: Aqua=${err.message}, Pollinations=${fbErr.message}`);}
      }
      throw err;
    }
  },

  // Asynchronously generate an image via Aqua POST endpoint or Pollinations GET.
  // For Aqua: POST /v1/images/generations, returns URL.
  // For Pollinations: returns direct GET URL for immediate embedding.
  async generateImageUrl(prompt, w=512, h=512, model=null){
    model=model||ST.settings.imgModel||'flux';
    const realModel=model.startsWith('aqua:')?model.slice(5):model;
    // Aqua image generation via POST
    if(model.startsWith('aqua:')&&ST.settings.aquaKey){
      // Determine ratio from w/h
      let ratio='square';
      if(w>h) ratio='landscape';
      else if(h>w) ratio='portrait';
      const body={model:realModel,prompt,ratio};
      const url='https://api.aquadevs.com/v1/images/generations';
      const headers={'Authorization':`Bearer ${ST.settings.aquaKey}`,'Content-Type':'application/json'};
      try{
        const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});
        if(!response.ok){
          const errText=await response.text();
          throw new Error(`Aqua image generation failed: ${response.status} - ${errText.slice(0,100)}`);
        }
        const data=await response.json();
        if(!data.success||!data.url){
          throw new Error('Aqua image generation response missing success or url');
        }
        return data.url;
      }catch(err){
        Ctrl?.dlog?.(`Aqua image generation error: ${err.message}`,'err');
        throw err;
      }
    }
    // Pollinations: direct URL (synchronous)
    const key=API._pollinationsKey();
    return`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${realModel}&width=${w}&height=${h}&nologo=true&key=${encodeURIComponent(key)}`;
  },

  // Legacy synchronous image URL generation (only for Pollinations).
  // For Aqua, use generateImageUrl instead.
  imageUrl(prompt, w=512, h=512, model=null){
    model=model||ST.settings.imgModel||'flux';
    if(model.startsWith('aqua:')){
      throw new Error('Aqua image models require async generateImageUrl. Use await API.generateImageUrl(...)');
    }
    const key=API._pollinationsKey();
    return`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${model}&width=${w}&height=${h}&nologo=true&key=${encodeURIComponent(key)}`;
  },

  // TTS — POST to /v1/audio/speech with full error logging, GET fallback if POST fails.
  async tts(text, voice='nova'){
    const model=ST.settings.ttsModel||'openai-audio';
    const key=API._pollinationsKey();
    const{url:baseUrl,headers}=API._base('pollinations');
    const ttsUrl=`${baseUrl}/audio/speech`;
    const ttsHeaders={...headers,'Content-Type':'application/json'};
    // Try POST first (OpenAI-compatible endpoint)
    try{
      const r=await fetch(ttsUrl,{method:'POST',headers:ttsHeaders,body:JSON.stringify({model,input:text,voice})});
      if(!r.ok){
        const errText=await r.text().catch(()=>'');
        Ctrl?.dlog?.(`TTS POST ${r.status}: ${errText.slice(0,200)}`,'err');
        throw new Error(`TTS ${r.status}: ${errText.slice(0,80)||r.statusText}`);
      }
      return URL.createObjectURL(await r.blob());
    }catch(postErr){
      // Fallback: try the simpler GET endpoint /audio/{text}
      Ctrl?.dlog?.(`TTS POST failed (${postErr.message}), trying GET fallback...`,'warn');
      try{
        const getUrl=`https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?model=${model}&voice=${voice}&key=${encodeURIComponent(key)}`;
        const r2=await fetch(getUrl);
        if(!r2.ok){
          const err2=await r2.text().catch(()=>'');
          Ctrl?.dlog?.(`TTS GET ${r2.status}: ${err2.slice(0,200)}`,'err');
          throw new Error(`TTS GET ${r2.status}: ${err2.slice(0,80)||r2.statusText}`);
        }
        return URL.createObjectURL(await r2.blob());
      }catch(getErr){
        throw new Error(`TTS failed — POST: ${postErr.message} | GET: ${getErr.message}`);
      }
    }
  },

  // STT — POST /v1/audio/transcriptions
  async transcribe(audioBlob){
    const model=ST.settings.sttModel||'whisper-large-v3';
    const{url,headers}=API._base('pollinations');
    const fd=new FormData();
    fd.append('file',audioBlob,'recording.webm');
    fd.append('model',model);
    const h={'Authorization':headers.Authorization};
    const r=await fetch(`${url}/audio/transcriptions`,{method:'POST',headers:h,body:fd});
    if(!r.ok){const t=await r.text();throw new Error(`STT ${r.status}: ${t.slice(0,100)}`);}
    const d=await r.json();
    return d.text||'';
  },

  // Fetch available models from provider's /v1/models endpoint
  async fetchModels(provider='pollinations'){
    try{
      const{url,headers}=API._base(provider);
      const r=await fetch(`${url}/models`,{method:'GET',headers});
      if(!r.ok)throw new Error(`${provider} models: ${r.status}`);
      const d=await r.json();
      const raw=Array.isArray(d)?d:d.data||[];
      return raw.map(m=>({
        id:m.id,
        name:m.name||m.id,
        provider,
        desc:m.description||m.owned_by||'',
        object:m.object||'model',
        raw:m
      }));
    }catch(err){
      Ctrl?.dlog?.(`Failed to fetch ${provider} models: ${err.message}`,'warn');
      return[];
    }
  }
};
