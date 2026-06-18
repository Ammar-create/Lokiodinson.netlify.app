import { createEl, debounce } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { router } from '../core/router.js';
import { toast } from '../ui/toast.js';
import { confirm, open as openModal } from '../ui/modal.js';
import { iconEl } from '../ui/icons.js';
import { MODELS, VOICES, IMG_MODELS, TTS_MODELS, STT_MODELS } from '../constants.js';

let _saveTimer = null;
let _dirty = false;

export function mount(container) {
  render(container);
}

export function unmount(container) {
  if (_saveTimer) clearTimeout(_saveTimer);
  container.innerHTML = '';
}

function markDirty() {
  _dirty = true;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    if (!_dirty) return;
    await db.setSetting('app_settings', store.get('settings'));
    _dirty = false;
    toast.success('Settings auto-saved');
  }, 1500);
}

function render(container) {
  const tab = store.get('settTab') || 'providers';
  const s = store.get('settings');

  container.innerHTML = '';
  container.appendChild(createEl('div', { class: 'screen-content', style: 'display:flex;flex-direction:row;max-width:unset' }, [
    createEl('nav', { class: 'settings-nav' }, [
      navItem('providers', 'key', 'API Keys', tab),
      navItem('models', 'cpu', 'Models', tab),
      navItem('controllers', 'sliders', 'Controllers', tab),
      navItem('memory', 'brain', 'Memory', tab),
      navItem('tweaks', 'zap', 'Tweaks', tab),
      navItem('storage', 'hard-drive', 'Storage', tab)
    ]),

    createEl('div', { class: 'settings-body' }, [
      providersSection(s, tab),
      modelsSection(s, tab),
      controllersSection(s, tab),
      memorySection(s, tab),
      tweaksSection(s, tab),
      storageSection(s, tab)
    ])
  ]));
}

function navItem(id, ico, label, active) {
  return createEl('div', {
    class: `settings-item ${id === active ? 'active' : ''}`,
    onclick: () => { store.set('settTab', id); render(document.getElementById('settings-screen')); }
  }, [
    iconEl(ico, 18),
    createEl('span', { text: label })
  ]);
}

function providersSection(s, tab) {
  const active = tab === 'providers';
  return createEl('div', { class: `settings-section ${active ? 'active' : ''}` }, [
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Pollinations (Default)' }),
      createEl('p', { class: 'settings-group-desc', text: 'Works out-of-the-box. Add your publishable key for authenticated endpoints and higher limits.' }),
      createEl('div', { class: 'field' }, [
        createEl('label', { class: 'field-label', text: 'Pollinations Key' }),
        createEl('input', {
          type: 'text', class: 'text-field',
          value: s.pollinationsKey || '', placeholder: 'pk_...',
          oninput: e => { store.set('settings.pollinationsKey', e.target.value); markDirty(); }
        })
      ])
    ]),
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Aqua API (Premium Models)' }),
      createEl('p', { class: 'settings-group-desc', text: 'Unlocks premium models for controllers and characters.' }),
      createEl('div', { class: 'field' }, [
        createEl('label', { class: 'field-label', text: 'Aqua API Key' }),
        createEl('input', {
          type: 'password', class: 'text-field',
          value: s.aquaKey || '', placeholder: 'Paste key...',
          oninput: e => { store.set('settings.aquaKey', e.target.value); markDirty(); }
        })
      ])
    ]),
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Custom OpenAI-Compatible Endpoint' }),
      createEl('div', { class: 'field' }, [
        createEl('label', { class: 'field-label', text: 'Base URL' }),
        createEl('input', {
          type: 'url', class: 'text-field',
          value: s.customUrl || '', placeholder: 'https://...',
          oninput: e => { store.set('settings.customUrl', e.target.value); markDirty(); }
        })
      ]),
      createEl('div', { class: 'field' }, [
        createEl('label', { class: 'field-label', text: 'API Key' }),
        createEl('input', {
          type: 'password', class: 'text-field',
          value: s.customKey || '', placeholder: 'Bearer token...',
          oninput: e => { store.set('settings.customKey', e.target.value); markDirty(); }
        })
      ])
    ]),
    createEl('button', {
      class: 'btn btn-primary btn-sm',
      style: 'align-self:flex-start',
      onclick: () => { db.setSetting('app_settings', store.get('settings')); _dirty = false; toast.success('Settings saved'); }
    }, 'Save Provider Settings'),
    createEl('button', {
      class: 'btn btn-secondary btn-sm',
      style: 'margin-left:8px',
      onclick: () => fetchModels()
    }, [iconEl('refresh', 12), ' Refresh Model List'])
  ]);
}

function modelsSection(s, tab) {
  const active = tab === 'models';
  return createEl('div', { class: `settings-section ${active ? 'active' : ''}` }, [
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Default Model Assignments' }),
      modelPicker('Character Default', 's-cm', s.charModel || 'openai-fast', MODELS, v => { store.set('settings.charModel', v); markDirty(); }),
      modelPicker('Controller Default', 's-ctm', s.ctrlModel || 'openai', MODELS, v => { store.set('settings.ctrlModel', v); markDirty(); }),
      modelPicker('Image Model', 's-imgm', s.imgModel || 'flux', IMG_MODELS, v => { store.set('settings.imgModel', v); markDirty(); }),
      modelPicker('TTS Model', 's-ttsm', s.ttsModel || 'openai-audio', TTS_MODELS, v => { store.set('settings.ttsModel', v); markDirty(); }),
      modelPicker('STT Model', 's-sttm', s.sttModel || 'whisper-large-v3', STT_MODELS, v => { store.set('settings.sttModel', v); markDirty(); }),
      voicePicker('Default Voice', 's-dv', s.defVoice || 'nova', v => { store.set('settings.defVoice', v); markDirty(); })
    ]),
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Creative Controller' }),
      createEl('p', { class: 'settings-group-desc', text: 'Used for auto-creation and image generation. Falls back to defaults if unset.' }),
      modelPicker('Text Model', 's-crtm', s.creativeModel || s.ctrlModel || 'openai', MODELS, v => { store.set('settings.creativeModel', v); markDirty(); }),
      modelPicker('Image Model', 's-crimgm', s.creativeImgModel || s.imgModel || 'flux', IMG_MODELS, v => { store.set('settings.creativeImgModel', v); markDirty(); })
    ]),
    createEl('button', {
      class: 'btn btn-primary btn-sm',
      style: 'align-self:flex-start',
      onclick: () => { db.setSetting('app_settings', store.get('settings')); _dirty = false; toast.success('Settings saved'); }
    }, 'Save Model Settings')
  ]);
}

function controllersSection(s, tab) {
  const active = tab === 'controllers';
  return createEl('div', { class: `settings-section ${active ? 'active' : ''}` }, [
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Main Controller' }),
      createEl('div', { class: 'settings-row inline' }, [
        createEl('label', { class: 'field-label', text: 'Analysis Frequency' }),
        createEl('input', {
          type: 'number', class: 'text-field', style: 'width:70px',
          min: 3, max: 100,
          value: s.ctrlFreq || 10,
          oninput: e => { store.set('settings.ctrlFreq', parseInt(e.target.value) || 10); markDirty(); }
        }),
        createEl('span', { style: 'font-size:12px;color:var(--text-muted)', text: 'messages between runs' })
      ]),
      toggleRow('Enable streaming responses', s.streaming !== false, () => { store.set('settings.streaming', !store.get('settings.streaming')); markDirty(); })
    ]),
    createEl('button', {
      class: 'btn btn-primary btn-sm',
      style: 'align-self:flex-start',
      onclick: () => { db.setSetting('app_settings', store.get('settings')); _dirty = false; toast.success('Settings saved'); }
    }, 'Save Controller Settings')
  ]);
}

function memorySection(s, tab) {
  const active = tab === 'memory';
  return createEl('div', { class: `settings-section ${active ? 'active' : ''}` }, [
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Memory Configuration' }),
      createEl('div', { class: 'settings-row inline' }, [
        createEl('label', { class: 'field-label', text: 'Short-term Window' }),
        createEl('input', {
          type: 'number', class: 'text-field', style: 'width:70px',
          min: 5, max: 100,
          value: s.stWindow || 30,
          oninput: e => { store.set('settings.stWindow', parseInt(e.target.value) || 30); markDirty(); }
        }),
        createEl('span', { style: 'font-size:12px;color:var(--text-muted)', text: 'messages in context' })
      ])
    ]),
    createEl('button', {
      class: 'btn btn-primary btn-sm',
      style: 'align-self:flex-start',
      onclick: () => { db.setSetting('app_settings', store.get('settings')); _dirty = false; toast.success('Settings saved'); }
    }, 'Save Memory Settings')
  ]);
}

function tweaksSection(s, tab) {
  const active = tab === 'tweaks';
  return createEl('div', { class: `settings-section ${active ? 'active' : ''}` }, [
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Character Image Generation' }),
      toggleRow('Custom Prompt Field — show prompt input instead of auto-description', s.customImagePrompt, () => {
        store.set('settings.customImagePrompt', !store.get('settings.customImagePrompt'));
        markDirty();
      })
    ]),
    createEl('div', { class: 'settings-group danger-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Memory Management' }),
      createEl('div', { style: 'display:flex;flex-direction:column;gap:12px' }, [
        createEl('button', { class: 'btn btn-secondary btn-sm', onclick: () => resetMemory() }, [iconEl('refresh', 12), ' Reset Memory (per character, per scenario)']),
        createEl('button', { class: 'btn btn-danger btn-sm', onclick: () => clearAllMemories() }, [iconEl('trash', 12), ' Clear All Memories']),
        createEl('p', { style: 'font-size:12px;color:var(--text-muted);margin-top:4px', text: 'Reset Memory wipes a specific character\'s memory. Clear All removes all memory data.' })
      ])
    ]),
    createEl('button', {
      class: 'btn btn-primary btn-sm',
      style: 'align-self:flex-start',
      onclick: () => { db.setSetting('app_settings', store.get('settings')); _dirty = false; toast.success('Settings saved'); }
    }, 'Save Tweaks')
  ]);
}

function storageSection(s, tab) {
  const active = tab === 'storage';
  return createEl('div', { class: `settings-section ${active ? 'active' : ''}` }, [
    createEl('div', { class: 'settings-group' }, [
      createEl('div', { class: 'settings-group-title', text: 'Data Management' }),
      createEl('p', { class: 'settings-group-desc', text: 'All data is stored locally in IndexedDB. Export regularly to back up.' }),
      createEl('div', { style: 'display:flex;gap:20px;margin-bottom:12px' }, [
        createEl('label', { style: 'display:flex;align-items:center;gap:6px;cursor:pointer' }, [
          createEl('input', { type: 'checkbox', style: 'width:16px;height:16px;margin:0' }),
          createEl('span', { text: 'Export images' })
        ]),
        createEl('label', { style: 'display:flex;align-items:center;gap:6px;cursor:pointer' }, [
          createEl('input', { type: 'checkbox', style: 'width:16px;height:16px;margin:0' }),
          createEl('span', { text: 'Export audio' })
        ])
      ]),
      createEl('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, [
        createEl('button', { class: 'btn btn-secondary btn-sm', onclick: () => exportAll() }, [iconEl('download', 12), ' Export All']),
        createEl('button', { class: 'btn btn-secondary btn-sm', onclick: () => importAll() }, [iconEl('upload', 12), ' Import']),
        createEl('button', { class: 'btn btn-danger btn-sm', onclick: () => clearAll() }, [iconEl('trash-full', 12), ' Clear Everything'])
      ])
    ])
  ]);
}

/* Inline custom dropdown (no select element) */
function modelPicker(label, id, selectedId, items, onChange) {
  const selected = items.find(m => m.id === selectedId);
  const provider = selected?.provider || 'pollinations';
  const badgeColor = provider === 'aqua' ? 'var(--criml)' : 'var(--gold)';
  const badgeLetter = provider === 'aqua' ? 'A' : 'P';
  return createEl('div', { class: 'field' }, [
    createEl('label', { class: 'field-label', text: label }),
    inlineDropdown(id, selectedId, items, onChange, badgeLetter, badgeColor)
  ]);
}

function voicePicker(label, id, selectedId, onChange) {
  return createEl('div', { class: 'field' }, [
    createEl('label', { class: 'field-label', text: label }),
    inlineDropdown(id, selectedId, VOICES, item => onChange(item.id), null, null)
  ]);
}

function inlineDropdown(id, selectedId, items, onChange, badgeLetter, badgeColor) {
  const selected = items.find(i => i.id === selectedId);
  return createEl('div', { style: 'position:relative' }, [
    createEl('button', {
      class: 'picker-btn',
      id: `${id}-btn`,
      onclick: e => { e.stopPropagation(); toggleDD(id); }
    }, [
      createEl('span', { id: `${id}-lbl`, text: selected?.name || selectedId || 'Select' }),
      badgeLetter ? createEl('span', { class: 'badge', text: badgeLetter, style: `color:${badgeColor};border-color:${badgeColor}` }) : null,
      iconEl('chevron-down', 10, { style: 'color:var(--text-muted)' })
    ]),
    createEl('div', {
      class: 'picker-list',
      id: `${id}-list`,
      style: 'display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:50;max-height:240px;overflow-y:auto'
    }, items.map(item => createEl('div', {
      class: `picker-item ${item.id === selectedId ? 'selected' : ''}`,
      onclick: () => {
        document.getElementById(`${id}-lbl`).textContent = item.name;
        hideDD(id);
        onChange(item.id);
      }
    }, [
      createEl('div', {}, [
        createEl('div', { style: 'font-weight:600', text: item.name }),
        createEl('div', { class: 'meta', text: item.desc || item.id })
      ]),
      item.rec ? createEl('span', { style: 'font-size:10px;color:var(--gold)', text: 'Rec' }) : null,
      item.premium ? createEl('span', { style: 'font-size:10px;color:var(--criml)', text: 'Premium' }) : null
    ])))
  ]);
}

function toggleDD(id) {
  const list = document.getElementById(`${id}-list`);
  if (!list) return;
  const showing = list.style.display === 'block';
  document.querySelectorAll('.picker-list').forEach(l => l.style.display = 'none');
  list.style.display = showing ? 'none' : 'block';
}

function hideDD(id) {
  const list = document.getElementById(`${id}-list`);
  if (list) list.style.display = 'none';
}

function toggleRow(label, value, onToggle) {
  const on = !!value;
  return createEl('div', { class: 'tgl', onclick: onToggle }, [
    createEl('div', { class: `tgl-track ${on ? 'on' : ''}` }, [createEl('div', { class: 'tgl-thumb' })]),
    createEl('span', { class: 'tgl-label', text: label })
  ]);
}

async function fetchModels() {
  toast.info('Fetching models from providers...');
  // Phase 3: implement fetch from API
  toast.info('Model refresh available in Phase 3');
}

async function resetMemory() {
  // Phase 3: implement per-character/per-scenario reset
  toast.info('Memory reset available in Phase 3');
}

async function clearAllMemories() {
  const ok = await confirm('Delete ALL memories for ALL characters in ALL scenarios?', { ok: 'Delete All', danger: true });
  if (!ok) return;
  const d = await db.open();
  await new Promise((res) => { const t = d.transaction('memories', 'readwrite'); t.objectStore('memories').clear(); t.oncomplete = res; });
  store.set('chat.charMems', {});
  toast.success('All memories cleared');
}

async function exportAll() {
  const includeImages = false;
  const includeAudio = false;
  const data = {
    _persona: true,
    version: 2,
    exportedAt: Date.now(),
    characters: await db.getAll('characters'),
    scenarios: await db.getAll('scenarios'),
    settings: store.get('settings')
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `persona_backup_${Date.now()}.json`;
  a.click();
  toast.success('Exported');
}

function importAll() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data._persona) { toast.error('Not a Persona backup'); return; }
      const ok = await confirm('Import characters and scenarios?', { ok: 'Import' });
      if (!ok) return;
      for (const c of data.characters || []) await db.put('characters', c);
      for (const s of data.scenarios || []) await db.put('scenarios', s);
      toast.success('Import complete');
      router.go('dashboard');
    } catch { toast.error('Import failed'); }
  };
  inp.click();
}

async function clearAll() {
  const ok = await confirm('Permanently delete ALL data? Cannot be undone.', { ok: 'Delete Everything', danger: true });
  if (!ok) return;
  await db.clearAll();
  toast.success('All data cleared. Reloading...');
  setTimeout(() => location.reload(), 1500);
}
