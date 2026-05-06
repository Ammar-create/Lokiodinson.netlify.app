'use strict';
// ===== CONSTANTS =====
const COLORS=['#c9a84c','#4a9b6f','#6b9ed4','#c23050','#9b5bc9','#d4884a','#50c9b0','#c9bf4a','#7060d0','#60c9a0','#d04878','#5090d4','#c07840','#48c060','#c05050','#7ac948'];
// BUG 3: Updated MODELS with confirmed valid Pollinations model IDs
const MODELS=[
  {id:'openai-fast',name:'OpenAI Fast',provider:'pollinations',rec:true,desc:'Fastest — general chat and quick tasks'},
  {id:'openai',name:'OpenAI',provider:'pollinations',desc:'Balanced quality for most tasks'},
  {id:'openai-large',name:'OpenAI Large',provider:'pollinations',desc:'Powerful — complex reasoning and coding'},
  {id:'gemini-fast',name:'Gemini 2.5 Flash Lite',provider:'pollinations',desc:'Ultra-fast Google model'},
  {id:'gemini',name:'Gemini 3 Flash',provider:'pollinations',desc:'Pro-grade Google model'},
  {id:'claude-fast',name:'Claude Haiku 4.5',provider:'pollinations',desc:'Fast Anthropic model'},
  {id:'nova-fast',name:'Amazon Nova Micro',provider:'pollinations',desc:'Cheapest option available'},
  {id:'kimi',name:'Kimi',provider:'pollinations',desc:'Moonshot with reasoning and agentic capabilities'},
  {id:'grok',name:'Grok',provider:'pollinations',desc:'xAI multimodal — fast, non-reasoning'},
  {id:'deepseek',name:'DeepSeek',provider:'pollinations',desc:'Fast reasoning and coding specialist'},
  // Aqua models — user-supplied keys, IDs depend on Aqua API
  {id:'grok-aqua',name:'Grok (Aqua)',provider:'aqua',desc:'Requires Aqua API key — premium Grok access'},
  {id:'custom-aqua',name:'Custom Aqua Model',provider:'aqua',desc:'Any model available via Aqua API'},
];
// BUG 15: Track original hardcoded count so fetchProviderModels can trim back before re-merging
const MODELS_ORIGINAL_COUNT = MODELS.length;
// BUG 7: Updated VOICES with all openai-audio supported voices (13 total)
const VOICES=[
  {id:'alloy',name:'Alloy',desc:'Neutral, balanced'},
  {id:'echo',name:'Echo',desc:'Deep male'},
  {id:'fable',name:'Fable',desc:'British, expressive'},
  {id:'onyx',name:'Onyx',desc:'Deep, authoritative'},
  {id:'nova',name:'Nova',desc:'Warm female'},
  {id:'shimmer',name:'Shimmer',desc:'Clear female'},
  {id:'coral',name:'Coral',desc:'Warm, conversational'},
  {id:'verse',name:'Verse',desc:'Poetic, melodic'},
  {id:'ballad',name:'Ballad',desc:'Musical, singing'},
  {id:'ash',name:'Ash',desc:'Calm, measured'},
  {id:'sage',name:'Sage',desc:'Wise, elder'},
  {id:'amuch',name:'Amuch',desc:'Energetic, youthful'},
  {id:'dan',name:'Dan',desc:'Casual, friendly'},
];
// FIX #15: Model arrays for image/TTS/STT pickers
const IMG_MODELS=[
  {id:'zimage',name:'ZImage',provider:'pollinations',desc:'Default image model',rec:true},
  {id:'flux',name:'Flux',provider:'pollinations',desc:'Fast image generation'},
  {id:'dall-e-3',name:'DALL-E 3',provider:'pollinations',desc:'OpenAI image model'},
];
// BUG 5: Updated TTS_MODELS with confirmed valid Pollinations TTS models
const TTS_MODELS=[
  {id:'openai-audio',name:'OpenAI Audio',provider:'pollinations',desc:'Voice chat capable — alloy, echo, fable, onyx, nova, shimmer + more',rec:true},
  {id:'openai-audio-large',name:'OpenAI Audio Large',provider:'pollinations',desc:'Premium voice quality'},
  {id:'elevenlabs',name:'ElevenLabs',provider:'pollinations',desc:'Best quality, natural speech — 65 pollen'},
  {id:'elevenmusic',name:'ElevenLabs Music',provider:'pollinations',desc:'Singing and music capable — 4 pollen'},
  {id:'qwen3-tts-flash',name:'Qwen 3 TTS Flash',provider:'pollinations',desc:'Fast Alibaba TTS — 200 pollen'},
  {id:'qwen3-tts-instruct',name:'Qwen 3 TTS Instruct',provider:'pollinations',desc:'Instruct-capable TTS — 500 pollen'},
];
// BUG 6: Updated STT_MODELS with confirmed valid Pollinations STT models (added elevenlabs-scribe-v2 and scribe)
const STT_MODELS=[
  {id:'whisper-large-v3',name:'Whisper Large v3',provider:'pollinations',desc:'Best accuracy — 1000 pollen',rec:true},
  {id:'whisper',name:'Whisper',provider:'pollinations',desc:'Standard Whisper — 1000 pollen'},
  {id:'elevenlabs-scribe-v2',name:'ElevenLabs Scribe v2',provider:'pollinations',desc:'90+ languages, cheaper — 200 pollen'},
  {id:'scribe',name:'Scribe',provider:'pollinations',desc:'ElevenLabs transcription — 200 pollen'},
];

// ===== STATE =====
const ST={
  screen:'dashboard',dashTab:'scenarios',settTab:'providers',
  editCharId:null,editScenId:null,
  charForm:{},scenForm:{},
  settings:{
    pollinationsKey:'pk_LUy70Tu8OwLI1HrU',
    aquaKey:'',customUrl:'',customKey:'',
    // BUG 4: Updated default model settings
    charModel:'openai-fast',ctrlModel:'openai',
    imgModel:'zimage',ttsModel:'openai-audio',
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
