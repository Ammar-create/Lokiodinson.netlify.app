import { createEl, uid } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { router } from '../core/router.js';
import { toast } from '../ui/toast.js';
import { confirm, prompt, open as openModal } from '../ui/modal.js';
import { iconEl } from '../ui/icons.js';
import { avatarEl } from '../ui/avatar.js';

let dropdownCloser = null;

export async function mount(container) {
  await render(container);
}

export function unmount(container) {
  if (dropdownCloser) {
    document.removeEventListener('click', dropdownCloser);
    dropdownCloser = null;
  }
  container.innerHTML = '';
}

async function render(container) {
  const id = store.get('editScenId');
  let scen = id ? await db.get('scenarios', id) : null;

  store.set('scenForm', scen ? {
    name: scen.name || '',
    lore: scen.lore || '',
    characterIds: [...(scen.characterIds || [])],
    settings: { aiKnowsUser: true, autoImage: false, autoTTS: false, controllerFreq: null, ...scen.settings },
    openingMessage: scen.openingMessage || '',
    unifiedMemory: scen.unifiedMemory === true
  } : {
    name: '', lore: '', characterIds: [],
    settings: { aiKnowsUser: true, autoImage: false, autoTTS: false, controllerFreq: null },
    openingMessage: '', unifiedMemory: false
  });

  const f = store.get('scenForm');
  const isEdit = !!id;
  const allChars = await db.getAll('characters');

  container.innerHTML = '';
  const form = createEl('div', { class: 'scen-form' }, [
    createEl('div', { class: 'form-header' }, [
      createEl('button', { class: 'ibtn', onclick: () => router.go('dashboard') }, iconEl('back', 16)),
      createEl('h1', { class: 'form-title', text: isEdit ? 'Edit Scenario' : 'New Scenario' })
    ]),

    field('Scenario Name', 'text', f.name, v => updateForm('name', v), 'sf-name', 'e.g. The Abandoned Station'),
    areaField('Lore / World Setting', f.lore, v => updateForm('lore', v), 'sf-lore', 'World, setting, backstory, rules...', 4),
    areaField('Opening Message (Optional)', f.openingMessage, v => updateForm('openingMessage', v), 'sf-open', 'Scene-setting narration to start with...', 2),

    createEl('div', { class: 'field' }, [
      createEl('label', { class: 'field-label', text: `Cast ${allChars.length ? '(max 11)' : ''}` }),
      !allChars.length ?
        createEl('div', { style: 'background:var(--stage);border:1px dashed var(--rail);border-radius:var(--r);padding:16px;text-align:center;color:var(--text-muted);font-size:13px' }, [
          'No characters yet. ',
          createEl('button', { class: 'btn btn-primary btn-sm', onclick: () => { store.set('editCharId', null); router.go('char-create'); }, text: 'Create One' })
        ]) :
        createEl('div', { class: 'cast-grid', id: 'cast-grid' }, allChars.map(c => castItem(c, f.characterIds)))
    ]),

    createEl('div', { class: 'settings-panel' }, [
      createEl('div', { class: 'settings-panel-title', text: 'Scenario Settings' }),
      createEl('div', { class: 'ruler' }),
      toggleRow('AI characters know who the real user is', f.settings?.aiKnowsUser, () => toggleSetting('aiKnowsUser')),
      toggleRow('Auto-generate images for AI messages', f.settings?.autoImage, () => toggleSetting('autoImage')),
      toggleRow('Auto-generate voice for AI messages', f.settings?.autoTTS, () => toggleSetting('autoTTS')),
      toggleRow('Unified Memory — characters share memory across all scenarios', f.unifiedMemory, () => {
        updateForm('unifiedMemory', !f.unifiedMemory);
        document.getElementById('ss-uniMem')?.classList.toggle('on', !f.unifiedMemory);
      }),
      createEl('div', { class: 'number-row' }, [
        createEl('label', { class: 'field-label', style: 'flex-shrink:0', text: 'Controller Frequency' }),
        createEl('input', {
          type: 'number',
          class: 'text-field',
          style: 'width:70px',
          min: 3,
          max: 100,
          value: f.settings?.controllerFreq || store.get('settings.ctrlFreq') || 10,
          oninput: e => updateFormSetting('controllerFreq', parseInt(e.target.value) || 10)
        }),
        createEl('span', { style: 'font-size:12px;color:var(--text-muted)', text: 'messages between analysis' })
      ])
    ]),

    createEl('div', { style: 'display:flex;gap:10px;justify-content:flex-end' }, [
      createEl('button', { class: 'btn btn-ghost', onclick: () => router.go('dashboard'), text: 'Cancel' }),
      createEl('button', { class: 'btn btn-primary', onclick: () => saveScenario() }, [
        iconEl('check', 14),
        ` ${isEdit ? 'Save Changes' : 'Create Scenario'}`
      ])
    ])
  ]);

  if (!isEdit) {
    form.insertBefore(
      createEl('div', { style: 'margin-left:auto;display:flex;gap:8px' }, [
        createEl('button', { class: 'btn btn-secondary btn-sm', onclick: () => autoCreate() }, [iconEl('magic', 13), ' Auto-Create'])
      ]),
      form.children[3]
    );
  }

  container.appendChild(form);
  setupDropdownCloser();
}

function field(label, type, value, onChange, id, placeholder) {
  return createEl('div', { class: 'field' }, [
    createEl('label', { class: 'field-label', text: label }),
    createEl('input', { type, class: 'text-field', id, value: value || '', placeholder, oninput: e => onChange(e.target.value) })
  ]);
}

function areaField(label, value, onChange, id, placeholder, rows) {
  return createEl('div', { class: 'field' }, [
    createEl('label', { class: 'field-label', text: label }),
    createEl('textarea', { class: 'text-area', id, rows, placeholder, value: value || '', oninput: e => onChange(e.target.value) })
  ]);
}

function castItem(c, selectedIds) {
  const sel = selectedIds.includes(c.id);
  return createEl('div', {
    class: `cast-item ${sel ? 'selected' : ''}`,
    'data-char-id': c.id,
    onclick: () => toggleCast(c.id)
  }, [
    avatarEl(c, 24),
    createEl('span', { style: `flex:1;color:${c.color};font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`, text: c.name }),
    createEl('span', { class: 'check', text: sel ? '\u2713' : '\u25cb' })
  ]);
}

function toggleCast(cid) {
  const f = { ...store.get('scenForm') };
  const idx = f.characterIds.indexOf(cid);
  if (idx === -1) {
    if (f.characterIds.length >= 11) { toast.warning('Maximum 11 characters'); return; }
    f.characterIds.push(cid);
  } else {
    f.characterIds.splice(idx, 1);
  }
  store.set('scenForm', f);
  document.querySelectorAll('.cast-item').forEach(el => {
    const id = el.getAttribute('data-char-id');
    const sel = f.characterIds.includes(id);
    el.classList.toggle('selected', sel);
    const chk = el.querySelector('.check');
    if (chk) chk.textContent = sel ? '\u2713' : '\u25cb';
  });
}

function updateForm(key, value) {
  const f = { ...store.get('scenForm') };
  f[key] = value;
  store.set('scenForm', f);
}

function updateFormSetting(key, value) {
  const f = { ...store.get('scenForm') };
  f.settings = { ...f.settings, [key]: value };
  store.set('scenForm', f);
}

function toggleSetting(key) {
  const f = { ...store.get('scenForm') };
  f.settings = { ...f.settings, [key]: !f.settings[key] };
  store.set('scenForm', f);
  document.getElementById(`ss-${key}`)?.classList.toggle('on', f.settings[key]);
}

function toggleRow(label, value, onToggle) {
  const on = !!value;
  return createEl('div', { class: 'tgl', onclick: onToggle }, [
    createEl('div', { class: `tgl-track ${on ? 'on' : ''}`, id: `ss-${label.split(' ')[0].toLowerCase()}` }, [createEl('div', { class: 'tgl-thumb' })]),
    createEl('span', { class: 'tgl-label', text: label })
  ]);
}

function setupDropdownCloser() {
  if (dropdownCloser) document.removeEventListener('click', dropdownCloser);
  dropdownCloser = e => {
    if (!e.target.closest('.picker-btn')) {
      document.querySelectorAll('.picker-list').forEach(l => l.style.display = 'none');
    }
  };
  document.addEventListener('click', dropdownCloser);
}

async function saveScenario() {
  const f = store.get('scenForm');
  if (!f.name?.trim()) { toast.error('Name is required'); return; }
  if (!f.characterIds?.length) { toast.error('Add at least one character'); return; }

  const id = store.get('editScenId');
  const existing = id ? await db.get('scenarios', id) : null;

  const scen = {
    id: id || uid(),
    name: f.name.trim(),
    lore: f.lore?.trim() || '',
    characterIds: [...f.characterIds],
    settings: { ...f.settings },
    openingMessage: f.openingMessage?.trim() || '',
    unifiedMemory: f.unifiedMemory === true,
    summary: existing?.summary || '',
    messageIds: existing?.messageIds || [],
    updatedAt: Date.now()
  };

  if (!id) scen.createdAt = Date.now();

  await db.put('scenarios', scen);
  toast.success(`"${scen.name}" saved`);

  if (!id) {
    const go = await confirm(`"${scen.name}" created! Open it now?`, { ok: 'Open Scenario' });
    if (go) {
      store.set('chat.scenId', scen.id);
      router.go('chat');
      return;
    }
  }

  store.set('editScenId', null);
  router.go('dashboard');
}

async function autoCreate() {
  const allChars = await db.getAll('characters');
  if (!allChars.length) { toast.error('Create characters first'); return; }

  const desc = await prompt('Describe the scenario you want to create:', {
    title: 'Auto-Create Scenario',
    placeholder: 'e.g. A group of adventurers meets in a tavern on a stormy night',
    ok: 'Generate'
  });
  if (!desc) return;

  // Phase 3: integrate creative controller
  toast.info('Auto-create requires Phase 3 creative controller. Proceeding with manual mode.');
}
