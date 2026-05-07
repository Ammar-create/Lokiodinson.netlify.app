'use strict';
// ===== SCREENS-UI-MEMORY =====
// Memory reset per character/scenario + clear all
// Extends Scr with memory management (loaded after screens.js)
Object.assign(Scr,{

  // ---- MEMORY RESET FUNCTIONS ----
  async resetMemoryModal(){
    const allChars=await DB.getAll('characters');
    if(!allChars.length){Toast.e('No characters found');return;}
    let selectedCharId=null;
    let selectedScenId=null;
    // Step 1: pick character
    const charPickerHtml=`
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="plbl">Select Character</div>
        <div class="mlist" style="max-height:300px;overflow-y:auto">
          ${allChars.map(c=>`
            <div class="mopt char-opt" data-char-id="${c.id}" data-char-name="${esc(c.name)}" onclick="Scr._tempCharSelected('${c.id}','${esc(c.name)}')" style="cursor:pointer">
              <div><strong>${esc(c.name)}</strong></div>
              <div style="font-size:11px;color:var(--tdim)">Model: ${c.modelId||'default'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    Modal.open({title:'Reset Memory — Select Character',content:()=>charPickerHtml});
    // FIX: Assign callback on Scr (not window) so onclick="Scr._tempCharSelected(...)" works
    Scr._tempCharSelected=(charId,charName)=>{
      selectedCharId=charId;
      Modal.close();
      Scr._showScenarioPickerForMemoryReset(charId,charName);
    };
  },
  async _showScenarioPickerForMemoryReset(charId,charName){
    // Load all memory keys for this character
    const db=await DB.open();
    const tx=db.transaction('memories','readonly');
    const store=tx.objectStore('memories');
    const allKeys=await store.getAllKeys();
    const memKeys=allKeys.filter(k=>k.startsWith(`${charId}_`));
    // Extract scenario IDs from keys (format: charId_scenarioId)
    const scenIds=new Set();
    for(const key of memKeys){
      const parts=key.split('_');
      if(parts.length>=2){
        const scenId=parts.slice(1).join('_');
        scenIds.add(scenId);
      }
    }
    // If no memories, show message
    if(scenIds.size===0){
      Toast.i(`No memories found for ${charName}`);
      return;
    }
    // Load scenario details
    const allScens=await DB.getAll('scenarios');
    const scenariosWithMem=[];
    for(const s of allScens){
      if(scenIds.has(s.id))scenariosWithMem.push(s);
    }
    // If still empty, maybe scenario was deleted but memory remains
    if(scenariosWithMem.length===0){
      const ok=await Modal.confirm(`${charName} has memories in ${scenIds.size} scenario(s) that no longer exist. Clear these orphaned memories?`,{ok:'Clear Orphans'});
      if(ok){
        for(const key of memKeys){
          await DB.del('memories',key);
        }
        // Also clear from ST.chat if currently in chat
        if(ST.chat.charMems){
          for(const key of memKeys){
            delete ST.chat.charMems[key];
          }
        }
        Toast.s(`Cleared ${memKeys.length} orphaned memory entries for ${charName}`);
      }
      return;
    }
    scenariosWithMem.sort((a,b)=>a.name.localeCompare(b.name));
    const scenPickerHtml=`
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="plbl">Character: ${esc(charName)}</div>
        <div class="plbl">Select Scenario (memories will be cleared)</div>
        <div class="mlist" style="max-height:300px;overflow-y:auto">
          ${scenariosWithMem.map(s=>`
            <div class="mopt" onclick="Scr._confirmMemoryReset('${charId}','${s.id}','${esc(charName)}','${esc(s.name)}')" style="cursor:pointer">
              <div><strong>${esc(s.name)}</strong></div>
              <div style="font-size:11px;color:var(--tdim)">${s.lore?.slice(0,80)||'No lore'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    Modal.open({title:'Reset Memory — Select Scenario',content:()=>scenPickerHtml});
  },
  async _confirmMemoryReset(charId,scenId,charName,scenName){
    Modal.close();
    const ok=await Modal.confirm(`Clear memory for ${charName} in scenario "${scenName}"? This cannot be undone.`,{ok:'Clear Memory',danger:true});
    if(!ok)return;
    const key=`${charId}_${scenId}`;
    // Delete from DB
    await DB.del('memories',key);
    // Also clear from current in-memory chat state if this scenario is active
    if(ST.chat.scenId===scenId && ST.chat.charMems){
      delete ST.chat.charMems[key];
    }
    Toast.s(`Cleared memory for ${charName} in "${scenName}"`);
  },
  async clearAllMemories(){
    const ok=await Modal.confirm('This will delete ALL memories for ALL characters in ALL scenarios. This action cannot be undone. Continue?',{ok:'Delete All Memories',danger:true});
    if(!ok)return;
    // Clear entire memories store
    const db=await DB.open();
    const tx=db.transaction('memories','readwrite');
    const store=tx.objectStore('memories');
    await store.clear();
    // Also clear in-memory
    ST.chat.charMems={};
    Toast.s('All memories cleared');
  }
});
