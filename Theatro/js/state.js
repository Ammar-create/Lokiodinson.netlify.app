'use strict';
// ===== CONSTANTS =====
const COLORS=['#c9a84c','#4a9b6f','#6b9ed4','#c23050','#9b5bc9','#d4884a','#50c9b0','#c9bf4a','#7060d0','#60c9a0','#d04878','#5090d4','#c07840','#48c060','#c05050','#7ac948'];
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
 {id:'aqua:grok',name:'Grok',provider:'aqua',desc:'xAI Grok via Aqua'},
 {id:'aqua:mistral',name:'Mistral',provider:'aqua',desc:'Mistral AI via Aqua'},
 {id:'aqua:qwen',name:'Qwen',provider:'aqua',desc:'Alibaba Qwen via Aqua'},
 {id:'aqua:deepseek-v3',name:'DeepSeek V3',provider:'aqua',desc:'DeepSeek V3 via Aqua'},
 {id:'aqua:gpt-5',name:'GPT-5',provider:'aqua',desc:'OpenAI GPT-5 via Aqua'},
 {id:'aqua:gemini-3',name:'Gemini 3',provider:'aqua',desc:'Google Gemini 3 via Aqua'},
 {id:'aqua:gpt-oss',name:'GPT-OSS',provider:'aqua',desc:'Open-source GPT variant'},
 {id:'aqua:minimax',name:'MiniMax',provider:'aqua',desc:'MiniMax model via Aqua'},
 {id:'aqua:llama-4',name:'Llama 4',provider:'aqua',desc:'Meta Llama 4 via Aqua'},
 {id:'aqua:kimi-k2',name:'Kimi K2',provider:'aqua',desc:'Moonshot Kimi K2 via Aqua'},
 {id:'aqua:step-3.5',name:'Step 3.5',provider:'aqua',desc:'StepFun model via Aqua'},
 {id:'aqua:glm-5',name:'GLM-5',provider:'aqua',desc:'Zhipu GLM-5 via Aqua'},
 {id:'aqua:nemotron',name:'Nemotron',provider:'aqua',desc:'NVIDIA Nemotron via Aqua'},
 {id:'aqua:deepseek-v3.2',name:'DeepSeek V3.2',provider:'aqua',desc:'DeepSeek V3.2 via Aqua'},
 {id:'aqua:haiku-4.5',name:'Haiku 4.5',provider:'aqua',premium:true,desc:'Anthropic Haiku 4.5 — fast + cheap'},
 {id:'aqua:sonnet-4.5',name:'Sonnet 4.5',provider:'aqua',premium:true,desc:'Anthropic Sonnet 4.5 — balanced'},
 {id:'aqua:gpt-5.1',name:'GPT-5.1',provider:'aqua',premium:true,desc:'OpenAI GPT-5.1 — advanced'},
 {id:'aqua:gemini-2.5-pro',name:'Gemini 2.5 Pro',provider:'aqua',premium:true,desc:'Google Gemini 2.5 Pro'},
 {id:'aqua:opus-4.5',name:'Opus 4.5',provider:'aqua',premium:true,desc:'Anthropic Opus 4.5 — top tier'},
 {id:'aqua:gpt-5.4',name:'GPT-5.4',provider:'aqua',premium:true,desc:'OpenAI GPT-5.4 — latest'},
 {id:'aqua:deepseek-v4',name:'DeepSeek V4',provider:'aqua',premium:true,desc:'DeepSeek V4 — advanced reasoning'},
 {id:'aqua:custom',name:'Custom Aqua Model',provider:'aqua',desc:'Type any model ID — requires manual entry'},
];
// MiMo TTS voices (Aqua provider)
const MIMO_VOICES=[
 {id:'mimo_default',name:'MiMo-默认',desc:'Cluster-dependent default'},
 {id:'冰糖',name:'冰糖',desc:'Chinese — Female'},
 {id:'茉莉',name:'茉莉',desc:'Chinese — Female'},
 {id:'苏打',name:'苏打',desc:'Chinese — Male'},
 {id:'白桦',name:'白桦',desc:'Chinese — Male'},
 {id:'Mia',name:'Mia',desc:'English — Female'},
 {id:'Chloe',name:'Chloe',desc:'English — Female'},
 {id:'Milo',name:'Milo',desc:'English — Male'},
 {id:'Dean',name:'Dean',desc:'English — Male'},
];
// Reference lists kept for fetchProviderModels compatibility — not used as dropdowns for image/TTS/STT
const IMG_MODELS=[
 {id:'flux',name:'Flux',provider:'pollinations',desc:'Fast, high-quality image generation'},
 {id:'zimage',name:'ZImage',provider:'pollinations',desc:'ZImage default model'},
 {id:'gptimage-large',name:'GPT Image Large',provider:'pollinations',desc:'Large OpenAI image model'},
 {id:'aqua:flux-2',name:'Flux 2',provider:'aqua',desc:'Flux 2 via Aqua'},
 {id:'aqua:zimage',name:'ZImage',provider:'aqua',desc:'ZImage via Aqua',rec:true},
 {id:'aqua:grok-image',name:'Grok Imagine 1.0',provider:'aqua',desc:'Grok Imagine 1.0 via Aqua'},
];
const TTS_MODELS=[]; // no longer used as dropdown — deprecated
const STT_MODELS=[
 {id:'whisper-large-v3',name:'Whisper Large v3',provider:'pollinations',desc:'Best accuracy'},
];

// ===== STATE =====
const ST={
 screen:'dashboard',dashTab:'scenarios',settTab:'providers',
 editCharId:null,editScenId:null,
 charForm:{},scenForm:{},
 settings:{
 // Provider system
 providers:[
 {id:'aqua',name:'Aqua',baseUrl:'https://api.aquadevs.com/v1',apiKey:'',deletable:false},
 {id:'pollinations',name:'Pollinations (deprecated)',baseUrl:'https://gen.pollinations.ai/v1',apiKey:'pk_LUy70Tu8OwLI1HrU',deletable:false},
 ],
 // Legacy keys — kept for backward compat during transition
 aquaKey:'',pollinationsKey:'pk_LUy70Tu8OwLI1HrU',customUrl:'',customKey:'',
 // Chat models (dropdown-based, unchanged)
 charModel:'aqua:deepseek-v4',ctrlModel:'aqua:deepseek-v4',
 creativeModel:null,
 // Image model (provider + free-text)
 imgProvider:'aqua',imgModel:'zimage',
 creativeImgModel:null,creativeImgProvider:null,
 // TTS models (provider + 3 modes)
 ttsProvider:'aqua',
 ttsModel:'mimo-v2.5-tts',
 ttsVoicedesignModel:'mimo-v2.5-tts-voicedesign',
 ttsVoicecloneModel:'mimo-v2.5-tts-voiceclone',
 // STT model (provider + free-text)
 sttProvider:'pollinations',sttModel:'whisper-large-v3',
 // Voice / TTS settings
 defVoice:'Mia',
 generateVoiceDemo:false,
 // Controller / memory / tweaks
 ctrlFreq:10,stWindow:30,streaming:true,
 customImagePrompt:false,
 theme:'proscenium',
 },
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
 sending:false,controllerRunning:false,generating:false,genToken:0,generatingChars:{},
 modelsCache:{pollinations:[],aqua:[]},
 sttRecording:false,
 whisper:false,whisperWith:[],
 whisperTarget:null,
 }
};