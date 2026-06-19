'use strict';
// ===== SCREENS-UI-SETTINGS =====
// Settings page + export/import/data management
// Extends Scr with settings UI (loaded after screens.js)
Object.assign(Scr,{
  // --- SETTINGS ---
  // FIX #8: Mark settings dirty + start debounce auto-save
  markSettingsDirty(){
    Scr._settDirty=true;
    if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
    Scr._settSaveTimer=setTimeout(async()=>{
      if(!Scr._settDirty)return;
      await DB.setSetting('app_settings',ST.settings);
      Scr._settDirty=false;
    },1500);
  },
  async settings(){
    const el=$('#screen-settings');if(!el)return;
    const s=ST.settings;const tab=ST.settTab||'providers';
    el.innerHTML=`<nav class="sett-nav">
    ${[['providers','🔑','API Keys'],['models','🤖','Models'],['controllers','⚙','Controllers'],['memory','🧠','Memory'],['tweaks','⚡','Tweaks'],['storage','💾','Storage']].map(([id,ico,label])=>`
    <div class="sett-ni ${tab===id?'on':''}" onclick="ST.settTab='${id}';Scr.settings()"><span>${ico}</span><span>${esc(label)}</span></div>
    `).join('')}
    </nav>
    <div class="sett-body">
    <div class="sett-sec ${tab==='providers'?'on':''}">
    <div class="sett-grp">
    <div class="sett-gt">Pollinations (Default)</div>
    <p style="font-size:12px;color:var(--tdim)">Works out-of-the-box. Add your publishable key (pk_...) for authenticated endpoints and higher limits.</p>
    <div class="field"><label class="lbl">Pollinations Key</label><input type="text" id="s-pk" value="${esc(s.pollinationsKey)}" placeholder="pk_..." oninput="ST.settings.pollinationsKey=this.value;Scr.markSettingsDirty()"></div>
    </div>
    <div class="sett-grp">
    <div class="sett-gt">Aqua API (Premium Models)</div>
    <p style="font-size:12px;color:var(--tdim)">Unlocks Grok 4.1 Thinking for controllers and premium characters.</p>
    <div class="field"><label class="lbl">Aqua API Key</label><input type="password" id="s-aq" value="${esc(s.aquaKey)}" placeholder="Paste key..." oninput="ST.settings.aquaKey=this.value;Scr.markSettingsDirty()"></div>
    </div>
    <div class="sett-grp">
    <div class="sett-gt">Custom OpenAI-Compatible Endpoint</div>
    <div class="field"><label class="lbl">Base URL</label><input type="url" id="s-curl" value="${esc(s.customUrl||'')}" placeholder="https://..." oninput="ST.settings.customUrl=this.value;Scr.markSettingsDirty()"></div>
    <div class="field"><label class="lbl">API Key</label><input type="password" id="s-ckey" value="${esc(s.customKey||'')}" placeholder="Bearer token..." oninput="ST.settings.customKey=this.value;Scr.markSettingsDirty()"></div>
    </div>
    <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Provider Settings</button>
    <button class="btn bs bsm" onclick="Scr.fetchProviderModels()" style="margin-left:8px">${I('refresh',12)} Refresh Model List</button>
    </div>
    <div class="sett-sec ${tab==='models'?'on':''}">
    <div class="sett-grp">
    <div class="sett-gt">Default Model Assignments</div>
    <div class="field"><label class="lbl">Character Default</label>${Scr.mpHtml('s-cm',s.charModel||'openai-fast')}</div>
    <div class="field"><label class="lbl">Controller Default</label>${Scr.mpHtml('s-ctm',s.ctrlModel||'openai')}</div>
    <div class="field"><label class="lbl">Image Model</label>${Scr.imgMpHtml('s-imgm',s.imgModel||'flux')}</div>
    <div class="field"><label class="lbl">TTS Model</label>${Scr.ttsMpHtml('s-ttsm',s.ttsModel||'openai-audio')}</div>
    <div class="field"><label class="lbl">STT Model</label>${Scr.sttMpHtml('s-sttm',s.sttModel||'whisper-large-v3')}</div>
    <div class="field"><label class="lbl">Default Voice</label>${Scr.vpHtml('s-dv',s.defVoice||'nova')}</div>
    </div>
    <div class="sett-grp">
    <div class="sett-gt">Creative Controller</div>
    <p style="font-size:11px;color:var(--tmut)">Used for character auto-creation, scenario auto-creation, and character image generation. Falls back to the default controller/image model if not set.</p>
    <div class="field"><label class="lbl">Text Model</label>${Scr.mpHtml('s-crtm',s.creativeModel||s.ctrlModel||'openai')}</div>
    <div class="field"><label class="lbl">Image Model</label>${Scr.imgMpHtml('s-crimgm',s.creativeImgModel||s.imgModel||'flux')}</div>
    </div>
    <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Model Settings</button>
    </div>
    <div class="sett-sec ${tab==='controllers'?'on':''}">
    <div class="sett-grp">
    <div class="sett-gt">Main Controller</div>
    <div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Analysis Frequency</label><input type="number" min="3" max="100" value="${s.ctrlFreq||10}" style="width:70px" oninput="ST.settings.ctrlFreq=parseInt(this.value)||10;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages between runs</span></div>
    <div class="tgl-wrap" onclick="ST.settings.streaming=!ST.settings.streaming;$('#s-stream').classList.toggle('on',ST.settings.streaming);Scr.markSettingsDirty()">
    <div class="tgl ${s.streaming!==false?'on':''}" id="s-stream"></div>
    <span class="tgl-lbl">Enable streaming responses</span>
    </div>
    <div class="tgl-wrap" onclick="ST.settings.reasoning=!ST.settings.reasoning;$('#s-reasoning').classList.toggle('on',ST.settings.reasoning);Scr.markSettingsDirty()">
    <div class="tgl ${s.reasoning?'on':''}" id="s-reasoning"></div>
    <span class="tgl-lbl">Show AI Reasoning — only works with reasoning models (DeepSeek R1, OpenAI o1/o3)</span>
    </div>
    </div>
    <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Controller Settings</button>
    </div>
    <div class="sett-sec ${tab==='memory'?'on':''}">
    <div class="sett-grp">
    <div class="sett-gt">Memory Configuration</div>
    <div class="field" style="flex-direction:row;align-items:center;gap:12px"><label class="lbl" style="flex-shrink:0">Short-term Window</label><input type="number" min="5" max="100" value="${s.stWindow||30}" style="width:70px" oninput="ST.settings.stWindow=parseInt(this.value)||30;Scr.markSettingsDirty()"><span style="font-size:11px;color:var(--tmut)">messages in context</span></div>
    </div>
    <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Memory Settings</button>
    </div>
    <div class="sett-sec ${tab==='tweaks'?'on':''}">
    <div class="sett-grp">
    <div class="sett-gt">Character Image Generation</div>
    <div class="tgl-wrap" onclick="ST.settings.customImagePrompt=!ST.settings.customImagePrompt;$('#tweak-cip').classList.toggle('on',ST.settings.customImagePrompt);Scr.markSettingsDirty()">
    <div class="tgl ${s.customImagePrompt?'on':''}" id="tweak-cip"></div>
    <span class="tgl-lbl">Custom Prompt Field — When generating character image, show prompt input instead of auto-using description</span>
    </div>
    </div>
    <div class="sett-grp">
    <div class="sett-gt">Memory Management</div>
    <div style="display:flex;flex-direction:column;gap:12px">
    <button class="btn bs bsm" onclick="Scr.resetMemoryModal()">${I('refresh',12)} Reset Memory (per character, per scenario)</button>
    <button class="btn bd bsm" onclick="Scr.clearAllMemories()">${I('trash',12)} Clear All Memories (all characters, all scenarios)</button>
    <p style="font-size:11px;color:var(--tmut);margin-top:4px">Reset Memory lets you wipe a specific character's memory in a specific scenario. Clear All Memories removes all memory data — use with caution.</p>
    </div>
    </div>
    <button class="btn bp bsm" onclick="Scr.saveSettings()">Save Tweaks</button>
    </div>
    <div class="sett-sec ${tab==='storage'?'on':''}">
    <div class="sett-grp">
    <div class="sett-gt">Data Management</div>
    <p style="font-size:12px;color:var(--tdim)">All data is stored locally in your browser's IndexedDB. Export regularly to back up your scenarios and characters.</p>
    <div style="display:flex;gap:20px;margin-bottom:12px">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
    <input type="checkbox" id="export-images-checkbox" style="width:16px;height:16px;margin:0"> <span>📷 Export images</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
    <input type="checkbox" id="export-audio-checkbox" style="width:16px;height:16px;margin:0"> <span>🎵 Export audio files</span>
    </label>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn bs bsm" onclick="Scr.exportAll()">${I('download',12)} Export All</button>
    <button class="btn bs bsm" onclick="Scr.importAll()">${I('upload',12)} Import</button>
    <button class="btn bd bsm" onclick="Scr.clearAll()">🗑 Clear Everything</button>
    </div>
    </div>
    </div>
    </div>`;
  },
  async saveSettings(){
    if(Scr._settSaveTimer)clearTimeout(Scr._settSaveTimer);
    await DB.setSetting('app_settings',ST.settings);
    Scr._settDirty=false;
    Toast.s('Settings saved');
  },
  async exportAll(){
    const includeImages = !!$('#export-images-checkbox')?.checked;
    const includeAudio = !!$('#export-audio-checkbox')?.checked;
    const data = {
      _theatro: true,
      version: 2,
      exportedAt: Date.now(),
      characters: await DB.getAll('characters'),
      scenarios: await DB.getAll('scenarios'),
      settings: ST.settings
    };
    if (includeImages || includeAudio) {
      const allBlobs = await DB.getAllBlobs();
      const filtered = allBlobs.filter(b => {
        if (includeImages && b.kind === 'image') return true;
        if (includeAudio && b.kind === 'audio') return true;
        return false;
      });
      const blobEntries = await Promise.all(filtered.map(async b => {
        let base64 = '';
        try {
          if (b.blob) {
            const reader = new FileReader();
            const promise = new Promise((res, rej) => {
              reader.onload = () => res(reader.result);
              reader.onerror = rej;
            });
            reader.readAsDataURL(b.blob);
            base64 = await promise;
          }
        } catch (err) {
          Ctrl?.dlog?.(`Failed to convert blob ${b.id}: ${err.message}`, 'warn');
        }
        return {
          id: b.id,
          url: b.url,
          kind: b.kind,
          type: b.type,
          size: b.size,
          cachedAt: b.cachedAt,
          data: base64
        };
      }));
      data.blobs = blobEntries;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `theatro_backup_${Date.now()}.json`;
    a.click();
    Toast.s('Exported');
  },
  async importAll(){
    const inp=document.createElement('input');inp.type='file';inp.accept='.json';
    inp.onchange=async e=>{
      const f=e.target.files[0];if(!f)return;
      try{
        const data=JSON.parse(await f.text());if(!data._theatro){Toast.e('Not a Theatro backup');return;}
        const ok=await Modal.confirm('Import characters and scenarios from file?',{ok:'Import'});if(!ok)return;
        for(const c of data.characters||[])await DB.put('characters',c);
        for(const s of data.scenarios||[])await DB.put('scenarios',s);
        if (data.version >= 2 && data.blobs && Array.isArray(data.blobs)) {
          for (const blobEntry of data.blobs) {
            if (blobEntry.data && blobEntry.data.startsWith('data:')) {
              try {
                const response = await fetch(blobEntry.data);
                const blob = await response.blob();
                await DB.cacheBlob(blobEntry.url, blob, blobEntry.kind);
              } catch (err) {
                Ctrl?.dlog?.(`Failed to restore blob ${blobEntry.id}: ${err.message}`, 'warn');
              }
            }
          }
          Toast.s(`Imported ${data.blobs.length} blobs`);
        }
        Toast.s('Import complete');Scr.dashboard();
      }catch{Toast.e('Import failed');}
    };
    inp.click();
  },
  async clearAll(){
    const ok=await Modal.confirm('Permanently delete ALL data? Cannot be undone.',{ok:'Delete Everything',danger:true});if(!ok)return;
    const r=indexedDB.deleteDatabase('theatro');r.onsuccess=()=>{Toast.s('All data cleared. Reloading...');setTimeout(()=>location.reload(),1500)};
  }
});
