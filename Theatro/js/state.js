'use strict';
// ===== STATE =====
const ST={
  screen:'dashboard',dashTab:'scenarios',settTab:'providers',
  editCharId:null,editScenId:null,
  charForm:{},scenForm:{},
  settings:{
    pollinationsKey:'pk_LUy70Tu8OwLI1HrU',
    aquaKey:'',customUrl:'',customKey:'',
    charModel:'openai-fast',ctrlModel:'openai',
    imgModel:'flux',ttsModel:'openai-audio',
    sttModel:'whisper-large-v3',
    defVoice:'nova',
    ctrlFreq:10,stWindow:30,streaming:true,
    creativeModel:null,
    creativeImgModel:null,
    customImagePrompt:false,
    reasoning:false,
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
    sending:false,controllerRunning:false,
    modelsCache:{pollinations:[],aqua:[]},
    sttRecording:false,
    whisper:false,whisperWith:[],
    whisperTarget:null,
  }
};
