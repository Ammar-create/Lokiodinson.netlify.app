'use strict';
// ===== CONSTANTS =====
const COLORS=['#c9a84c','#4a9b6f','#6b9ed4','#c23050','#9b5bc9','#d4884a','#50c9b0','#c9bf4a','#7060d0','#60c9a0','#d04878','#5090d4','#c07840','#48c060','#c05050','#7ac948'];
const MODELS=[
  {id:'llama-scout',name:'Llama 4 Scout 17B',provider:'pollinations',rec:true,desc:'Best for characters — flexible & unrestricted'},
  {id:'mistral',name:'Mistral Small 3.1',provider:'pollinations',desc:'Fast & reliable fallback'},
  {id:'llama',name:'Llama 3.3 70B',provider:'pollinations',desc:'Large, very expressive'},
  {id:'gpt-4.1-mini',name:'GPT-4.1 Mini',provider:'pollinations',desc:'Balanced speed/quality'},
  {id:'gpt-4.1-nano',name:'GPT-4.1 Nano',provider:'pollinations',desc:'Ultra-fast, lightweight'},
  {id:'gemini',name:'Gemini 2.0 Flash',provider:'pollinations',desc:'Google multimodal model'},
  {id:'qwen',name:'Qwen 2.5 72B',provider:'pollinations',desc:'Multilingual powerhouse'},
  {id:'phi',name:'Phi-4',provider:'pollinations',desc:'Microsoft compact model'},
  {id:'grok',name:'Grok 4 Fast',provider:'aqua',desc:'Requires Aqua API key'},
  {id:'grok-4.1-thinking',name:'Grok 4.1 Thinking',provider:'aqua',desc:'Best for controllers — Aqua key required'},
  {id:'grok-4.2',name:'Grok 4.2',provider:'aqua',desc:'Premium reasoning — Aqua key required'},
];
// BUG 15: Track original hardcoded count so fetchProviderModels can trim back before re-merging
const MODELS_ORIGINAL_COUNT = MODELS.length;
const VOICES=[
  {id:'alloy',name:'Alloy',desc:'Neutral, balanced'},
  {id:'echo',name:'Echo',desc:'Deep male'},
  {id:'fable',name:'Fable',desc:'British, expressive'},
  {id:'onyx',name:'Onyx',desc:'Deep, authoritative'},
  {id:'nova',name:'Nova',desc:'Warm female'},
  {id:'shimmer',name:'Shimmer',desc:'Clear female'},
];
// FIX #15: Model arrays for image/TTS/STT pickers
const IMG_MODELS=[
  {id:'zimage',name:'ZImage',provider:'pollinations',desc:'Default image model',rec:true},
  {id:'flux',name:'Flux',provider:'pollinations',desc:'Fast image generation'},
  {id:'dall-e-3',name:'DALL-E 3',provider:'pollinations',desc:'OpenAI image model'},
];
const TTS_MODELS=[
  {id:'tts-1',name:'TTS-1',provider:'pollinations',desc:'Standard voice model'},
  {id:'tts-1-hd',name:'TTS-1 HD',provider:'pollinations',desc:'High quality voice'},
  {id:'qwen-3-tts-flash',name:'Qwen 3 TTS Flash',provider:'pollinations',desc:'Fast multilingual TTS',rec:true},
];
const STT_MODELS=[
  {id:'whisper-large-v3',name:'Whisper Large v3',provider:'pollinations',desc:'Best accuracy',rec:true},
  {id:'whisper-large',name:'Whisper Large',provider:'pollinations',desc:'Good accuracy'},
  {id:'whisper-1',name:'Whisper v1',provider:'pollinations',desc:'Standard'},
];

// ===== STATE =====
const ST={
  screen:'dashboard',dashTab:'scenarios',settTab:'providers',
  editCharId:null,editScenId:null,
  charForm:{},scenForm:{},
  settings:{
    pollinationsKey:'pk_LUy70Tu8OwLI1HrU',
    aquaKey:'',customUrl:'',customKey:'',
    charModel:'llama-scout',ctrlModel:'llama-scout',
    imgModel:'zimage',ttsModel:'tts-1',
    // FIX #14: sttModel was missing from defaults
    sttModel:'whisper-large-v3',
    defVoice:'nova',
    ctrlFreq:10,stWindow:30,streaming:true,
  },
  // FIX #17: Rate limit tracking state
  rateLimits:{
    pollinations:{calls:[],warned:false},
    aqua:{calls:[],warned:false},
  },
  chat:{
    scenId:null,scenario:null,characters:[],messages:[],rels:{},
    charMems:{},
    activeCharId:null,autoChatRunning:false,autoChatStop:false,
    msgSinceCtrl:0,panelOpen:true,panelTab:'directive',
    directive:{next:'',details:''},debugLog:[],
    sending:false,controllerRunning:false,
    modelsCache:{pollinations:[],aqua:[]},
    sttRecording:false,
    // #11 & #12: DM layout + private conversations (whisper)
    whisper:false,whisperWith:[],
    // BUG 3/16: Transient whisper target — applies to the NEXT message only.
    // Intentionally NOT persisted to IndexedDB. Resets on scenario switch (Chat.init).
    whisperTarget:null,
  }
};
