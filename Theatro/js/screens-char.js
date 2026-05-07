'use strict';
// ===== SCREENS-CHAR =====
// Character create/edit screen + image generation. Split from screens.js.
// Loaded after screens.js (which defines the Scr global).
Object.assign(Scr,{

  // --- CHAR CREATE ---
  newChar(){
    ST.editCharId=null;
    // BUG 33: Changed default model from 'llama-scout' to 'openai-fast'
    ST.charForm={name:'',color:COLORS[0],personality:'',appearance:'',modelId:ST.settings.charModel||'openai-fast',voice:'nova',avatar:'',isUser:false,createImage:false};
    Router.go('char-create');
  },
  async editChar(id){
    const c=await DB.get('characters',id);if(!c)return;
    ST.editCharId=id;ST.charForm={...c,createImage:false};Router.go('char-create');
  },
  async delChar(id){
    const ok=await Modal.confirm('Delete this character?',{ok:'Delete',danger:true});if(!ok)return;
    await DB.del('characters',id);Toast.s('Character deleted');Scr.dashboard();
  },
  async charCreate(){
    const el=$('#screen-char-create');if(!el)return;
    const f=ST.charForm;const isEdit=!!ST.editCharId;
    el.innerHTML=`<div class="create-wrap">
      <div class="create-hdr">
        <button class="ibtn" onclick="Router.go('dashboard')">${I('back',16)}</button>
        <h1 class="create-title">${isEdit?'Edit Character':'New Character'}</h1>
        <div style="margin-left:auto"><button class="btn bs bsm" id="auto-gen-btn" onclick="Scr.autoGenChar()">${I('magic',13)} Auto-Create</button></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:16px">
        <div>
          <div class="lbl" style="margin-bottom:6px">Avatar</div>
          <div class="av-uploader" id="av-drop" onclick="Scr.trigAvatar()">${f.avatar?`<img src="${esc(f.avatar)}">`:`${I('user',22)}<span>Upload</span>`}</div>
          <input type="file" id="av-file" accept="image/*" style="display:none" onchange="Scr.handleAvatar(event)">
          <button class="btn bs bsm" id="gen-img-btn" onclick="Scr.generateCharImage()" style="margin-top:8px;width:100%">${I('image',12)} Generate Image</button>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:12px">
          <div class="field">
            <label class="lbl">Name <span>*</span></label>
            <input type="text" id="cf-name" value="${esc(f.name)}" placeholder="Character name" oninput="ST.charForm.name=this.value">
          </div>
          <div class="field">
            <label class="lbl">Avatar URL</label>
            <input type="url" id="cf-av-url" placeholder="https://..." value="${f.avatar?.startsWith('http')?esc(f.avatar):''}" oninput="Scr.setAvUrl(this.value)">
          </div>
        </div>
      </div>
      <div class="field">
        <label class="lbl">Character Color</label>
        <div class="cgrid">${COLORS.map(c=>`<div class="csw ${c===f.color?'sel':''}" style="background:${c}" onclick="Scr.pickColor('${c}')"></div>`).join('')}</div>
        <div style="margin-top:6px;display:flex;gap:8px;align-items:center">
          <input type="text" id="cf-color" value="${esc(f.color)}" placeholder="#c9a84c" style="width:100px" oninput="Scr.pickColor(this.value)">
          <div id="cp" style="width:26px;height:26px;border-radius:50%;background:${esc(f.color)};border:2px solid var(--border)"></div>
        </div>
      </div>
      <div class="field">
        <label class="lbl">Personality <span>*</span></label>
        <textarea id="cf-p" rows="3" placeholder="Personality, traits, speaking style, quirks..." oninput="ST.charForm.personality=this.value">${esc(f.personality)}</textarea>
      </div>
      <div class="field">
        <label class="lbl">Appearance</label>
        <textarea id="cf-a" rows="2" placeholder="Physical description, clothing, distinctive features..." oninput="ST.charForm.appearance=this.value">${esc(f.appearance)}</textarea>
      </div>
      <div class="two-col">
        <div class="field"><label class="lbl">AI Model</label>${Scr.mpHtml('cf-model',f.modelId)}</div>
        <div class="field"><label class="lbl">Voice</label>${Scr.vpHtml('cf-voice',f.voice)}</div>
      </div>
      <div class="tgl-wrap" onclick="Scr.toggleUser()">
        <div class="tgl ${f.isUser?'on':''}" id="cf-usr"></div>
        <span class="tgl-lbl">This character represents me (the user)</span>
      </div>
      ${isEdit?`<hr><div class="tgl-wrap" onclick="Scr.nukeCharMemory('${ST.editCharId}')">
        <div class="tgl" style="background:var(--criml)" id="cf-nuke"></div>
        <span class="tgl-lbl" style="color:var(--criml)">Clear All Memory (this character in all scenarios)</span>
      </div>`:''}
      <hr>
      <div class="tgl-wrap" onclick="ST.charForm.createImage=!ST.charForm.createImage;$('#cf-cimg')?.classList.toggle('on',ST.charForm.createImage)">
        <div class="tgl ${f.createImage?'on':''}" id="cf-cimg"></div>
        <span class="tgl-lbl">Create Image on save</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn bg" onclick="Router.go('dashboard')">Cancel</button>
        <button class="btn bp" onclick="Scr.saveChar()">${I('check',14)} ${isEdit?'Save Changes':'Create Character'}</button>
      </div>
    </div>`;
  },
  trigAvatar(){$('#av-file')?.click()},
  handleAvatar(e){
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();
    r.onload=ev=>{ST.charForm.avatar=ev.target.result;const d=$('#av-drop');if(d)d.innerHTML=`<img src="${esc(ev.target.result)}" style="width:100%;height:100%;object-fit:cover">`};
    r.readAsDataURL(file);
  },
  setAvUrl(url){
    ST.charForm.avatar=url;
    const d=$('#av-drop');
    if(d&&url.startsWith('http'))d.innerHTML=`<img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='<span style="font-size:10px">Invalid URL</span>'">`;
  },
  pickColor(color){
    ST.charForm.color=color;
    $$('.csw').forEach(s=>{s.classList.remove('sel');if(s.style.background===color||s.title===color)s.classList.add('sel');});
    const cp=$('#cp');if(cp)cp.style.background=color;
    const ci=$('#cf-color');if(ci)ci.value=color;
  },
  toggleUser(){ST.charForm.isUser=!ST.charForm.isUser;$('#cf-usr')?.classList.toggle('on',ST.charForm.isUser)},

  // --- CHARACTER IMAGE GENERATION (with custom prompt mode) ---
  async generateCharImage(){
    const f=ST.charForm;
    const customMode=ST.settings.customImagePrompt===true;
    let promptText=null;
    if(customMode){
      promptText=await Modal.prompt('Enter custom image prompt:',{title:'Custom Image Prompt',placeholder:'e.g. A futuristic warrior with glowing eyes, cyberpunk style',ok:'Generate'});
      if(!promptText)return;
    }else{
      if(!f.name?.trim()&&!f.personality?.trim()&&!f.appearance?.trim()){
        Toast.w('Enter a name or description first');
        return;
      }
    }
    const btn=$('#gen-img-btn');
    if(btn){btn.disabled=true;btn.innerHTML=`<div class="spinner" style="width:13px;height:13px"></div> Generating...`;}
    try{
      let imageUrl;
      if(customMode){
        // Use custom prompt directly via async generation
        const imgModel=ST.settings.creativeImgModel||ST.settings.imgModel||'flux';
        imageUrl=await API.generateImageUrl(promptText,512,512,imgModel);
        ST.charForm.avatar=imageUrl;
        const d=$('#av-drop');
        if(d)d.innerHTML=`<img src="${esc(imageUrl)}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`;
        const urlInp=$('#cf-av-url');
        if(urlInp&&imageUrl.startsWith('http'))urlInp.value=imageUrl;
        Toast.s('Image generated from custom prompt!');
      }else{
        // Auto-generate prompt from character description
        const char={id:'temp',name:f.name||'Character',personality:f.personality||'',appearance:f.appearance||'',color:f.color||'#c9a84c'};
        const results=await Ctrl.generateCharacterImages([char]);
        if(results?.[0]?.imageUrl){
          ST.charForm.avatar=results[0].imageUrl;
          const d=$('#av-drop');
          if(d)d.innerHTML=`<img src="${esc(results[0].imageUrl)}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`;
          const urlInp=$('#cf-av-url');
          if(urlInp&&results[0].imageUrl.startsWith('http'))urlInp.value=results[0].imageUrl;
          Toast.s('Image generated!');
        }else{
          Toast.e('Image generation failed');
        }
      }
    }catch(err){
      Toast.e('Failed: '+err.message);
    }finally{
      if(btn){btn.disabled=false;btn.innerHTML=`${I('image',12)} Generate Image`;}
    }
  },

  // --- CHARACTER MEMORY NUKE (Feature 5) ---
  async nukeCharMemory(charId){
    const char=await DB.get('characters',charId);
    if(!char)return;
    const ok=await Modal.confirm(`Permanently delete ALL memories for "${char.name}" across ALL scenarios? This cannot be undone.`,{ok:'Delete All Memories',danger:true});
    if(!ok)return;
    // Delete all memory keys that start with `${charId}_`
    const db=await DB.open();
    const tx=db.transaction('memories','readwrite');
    const store=tx.objectStore('memories');
    const allKeys=await store.getAllKeys();
    const toDelete=allKeys.filter(k=>k.startsWith(`${charId}_`));
    for(const key of toDelete){
      await store.delete(key);
    }
    // Also clear from current in-memory chat state if this character is loaded
    if(ST.chat.charMems){
      for(const key of toDelete){
        delete ST.chat.charMems[key];
      }
    }
    Toast.s(`Cleared ${toDelete.length} memory entries for ${char.name}`);
  },

  async saveChar(){
    const f=ST.charForm;
    if(!f.name.trim()){Toast.e('Name is required');return;}

    // If "Create Image" checkbox is on and no avatar yet, generate image
    if(f.createImage&&!f.avatar){
      await Scr.generateCharImage();
    }

    if(f.isUser){
      const all=await DB.getAll('characters');
      for(const c of all)if(c.isUser&&c.id!==ST.editCharId){c.isUser=false;await DB.put('characters',c);}
    }
    // BUG 33: Changed default model from 'llama-scout' to 'openai-fast'
    const char={id:ST.editCharId||uid(),name:f.name.trim(),color:f.color||COLORS[0],personality:f.personality||'',appearance:f.appearance||'',modelId:f.modelId||'openai-fast',voice:f.voice||'nova',avatar:f.avatar||'',isUser:!!f.isUser,updatedAt:Date.now()};
    if(!ST.editCharId)char.createdAt=Date.now();
    else{const ex=await DB.get('characters',char.id);char.createdAt=ex?.createdAt||Date.now();}
    await DB.put('characters',char);
    Toast.s(`"${char.name}" saved`);
    ST.dashTab='characters';Router.go('dashboard');
  },
  async autoGenChar(){
    const brief=await Modal.prompt('Describe the character briefly:',{title:'Auto-Create Character',placeholder:'e.g. A sarcastic medieval knight with a hidden soft side',ok:'Generate'});
    if(!brief)return;
    const btn=$('#auto-gen-btn');if(btn){btn.disabled=true;btn.innerHTML=`<div class="spinner" style="width:13px;height:13px"></div> Generating...`;}
    try{
      const r=await Ctrl.runCreative(brief);if(!r){Toast.e('Generation failed');return;}
      ST.charForm={...ST.charForm,name:r.name||'',personality:r.personality||'',appearance:r.appearance||'',voice:r.voice||'nova',color:r.colorHint||COLORS[Math.floor(Math.random()*COLORS.length)]};

      // If "Create Image" checkbox is on, also generate image
      if(ST.charForm.createImage){
        const imgChar={id:'temp',name:ST.charForm.name,personality:ST.charForm.personality,appearance:ST.charForm.appearance,color:ST.charForm.color};
        try{
          const imgResults=await Ctrl.generateCharacterImages([imgChar]);
          if(imgResults?.[0]?.imageUrl)ST.charForm.avatar=imgResults[0].imageUrl;
        }catch(imgErr){Ctrl.dlog(`autoGenChar image failed: ${imgErr.message}`,'warn');}
      }

      await Scr.charCreate();Toast.s('Character generated!');
    }catch(err){Toast.e('Failed: '+err.message);}
    finally{const b=$('#auto-gen-btn');if(b){b.disabled=false;btn.innerHTML=`${I('magic',13)} Auto-Create`;}}
  }
});
