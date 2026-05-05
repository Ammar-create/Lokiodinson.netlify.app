'use strict';
// ===== API =====
const API={
  endpoint(model){
    const s=ST.settings;
    const m=MODELS.find(x=>x.id===model);
    if(m?.provider==='aqua'&&s.aquaKey)
      return{url:'https://api.aqua-ai.com/v1/chat/completions',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.aquaKey}`}};
    if(s.customUrl&&s.customKey)
      return{url:s.customUrl,headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.customKey}`}};
    const url=s.pollinationsKey?'https://gen.pollinations.ai/v1/chat/completions':'https://text.pollinations.ai/openai';
    const h={'Content-Type':'application/json'};
    if(s.pollinationsKey)h['Authorization']=`Bearer ${s.pollinationsKey}`;
    return{url,headers:h};
  },
  async chat(msgs,model,opts={}){
    const{url,headers}=API.endpoint(model);
    const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({model,messages:msgs,max_tokens:opts.maxTokens||1000,temperature:opts.temp??0.9,stream:false})});
    if(!r.ok){const t=await r.text();throw new Error(`API ${r.status}: ${t.slice(0,150)}`);}
    const d=await r.json();
    return d.choices?.[0]?.message?.content||'';
  },
  async stream(msgs,model,onChunk,opts={}){
    if(!ST.settings.streaming){const t=await API.chat(msgs,model,opts);onChunk(t,true);return;}
    const{url,headers}=API.endpoint(model);
    const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({model,messages:msgs,max_tokens:opts.maxTokens||1000,temperature:opts.temp??0.9,stream:true})});
    if(!r.ok){const t=await r.text();throw new Error(`API ${r.status}: ${t.slice(0,150)}`);}
    const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
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
  },
  imageUrl(prompt,opts={}){
    const model=opts.model||ST.settings.imgModel||'zimage';
    return`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${model}&width=${opts.w||512}&height=${opts.h||512}&nologo=true`;
  },
  async tts(text,voice='nova',model='tts-1'){
    const{url,headers}=API.endpoint(model);
    const ttsUrl=url.replace('/chat/completions','/audio/speech');
    const r=await fetch(ttsUrl,{method:'POST',headers,body:JSON.stringify({model,input:text,voice})});
    if(!r.ok)throw new Error('TTS failed');
    return URL.createObjectURL(await r.blob());
  }
};