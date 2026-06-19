import { createEl, uid } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { router } from '../core/router.js';
import { toast } from '../ui/toast.js';
import { confirm } from '../ui/modal.js';
import { iconEl } from '../ui/icons.js';
import { avatarEl } from '../ui/avatar.js';
import { COLORS, MODELS, VOICES } from '../constants.js';

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
  const id = store.get('editCharId');
  let char = id ? await db.get('characters', id) : null;

  store.set('charForm', char ? { ...char } : {
    name: '', color: COLORS[0], personality: '', appearance: '',
    modelId: store.get('settings.charModel') || 'openai-fast',
    voice: 'nova', avatar: '', isUser: false
  });

  const f = store.get('charForm');
  const isEdit = !!id;

  container.innerHTML = '';
  const form = createEl('div', { class: 'char-form' }, [
    createEl('div', { class: 'form-header' }, [
      createEl('button', { class: 'ibtn', onclick: () => router.go('dashboard') }, iconEl('back', 16)),
      createEl('h1', { class: 'form-title', text: isEdit ? 'Edit Character' : 'New Character' })
    ]),

    createEl('div', { class: 'avatar-section' }, [
      createEl('div', {}, [
        createEl('div', { class: 'field-label', style: 'margin-bottom:6px', text: 'Avatar' }),
        avatarDrop(f),
        createEl('input', { type: 'file', id: 'av-file', accept: 'image/*', style: 'display:none', onchange: e => handleAvatar(e) })
      ]),
      createEl('div', { style: 'flex:1;display:flex;flex-direction:column;gap:12px' }, [
        field('Name', 'text', f.name, v => updateForm('name', v), 'cf-name', 'Character name'),
        field('Avatar URL', 'url', f.avatar?.startsWith('http') ? f.avatar : '', v => updateForm('avatar', v), 'cf-av-url', 'https://...')
      ])
    ]),

    createEl('div', { class: 'field' }, [
      createEl('label', { class: 'field-label', text: 'Character Color' }),
      createEl('div', { class: 'swatch-deck' }, COLORS.map(c => createEl('div', {
        class: `swatch ${c === f.color ? 'selected' : ''}`,
        style: `background:${c}`,
        'data-color': c,
        onclick: () => { updateForm('color', c); refreshSwatches(); }
      })))
    ]),

    areaField('Personality', f.personality, v => updateForm('personality', v), 'cf-p', 'Personality, traits, speaking style...', 3),
    areaField('Appearance', f.appearance, v => updateForm('appearance', v), 'cf-a', 'Physical description, clothing...', 2),

    createEl('div', { class: 'form-row' }, [
      createEl('div', { class: 'field' }, [
        createEl('label', { class: 'field-label', text: 'AI Model' }),
        inlineDropdown('cf-model', f.modelId, MODELS, item => updateForm('modelId', item.id))
      ]),
      createEl('div', { class: 'field' }, [
        createEl('label', { class: 'field-label', text: 'Voice' }),
        inlineDropdown('cf-voice', f.voice, VOICES, item => updateForm('voice', item.id))
      ])
    ]),

    toggleRow('This character represents me (the user)', f.isUser, () => {
      updateForm('isUser', !store.get('charForm.isUser'));
      refreshToggle('cf-usr', store.get('charForm.isUser'));
    }),

    isEdit ? createEl('div', { class: 'danger-zone' }, [
      createEl('div', { class: 'field-label', style: 'color:var(--crim-soft);margin-bottom:8px', text: 'Danger Zone' }),
      createEl('button', {
        class: 'btn btn-danger btn-sm',
        onclick: () => nukeMemories(id)
      }, [iconEl('trash', 12), ' Clear All Memories'])
    ]) : null,

    createEl('div', { style: 'display:flex;gap:10px;justify-content:flex-end;margin-top:16px' }, [
      createEl('button', { class: 'btn btn-ghost', onclick: () => router.go('dashboard'), text: 'Cancel' }),
      createEl('button', { class: 'btn btn-primary', onclick: () => saveChar() }, [
        iconEl('check', 14),
        ` ${isEdit ? 'Save Changes' : 'Create Character'}`
      ])
    ])
  ]);

  container.appendChild(form);
  setupDropdownCloser();
}

function field(label, type, value, onChange, id, placeholder) {
  return createEl('div', { class: 'field' }, [
    createEl('label', { class: 'field-label', text: label }),
    createEl('input', { type, class: 'text-field', id, value, placeholder, oninput: e => onChange(e.target.value) })
  ]);
}

function areaField(label, value, onChange, id, placeholder, rows) {
  return createEl('div', { class: 'field' }, [
    createEl('label', { class: 'field-label', text: label }),
    createEl('textarea', { class: 'text-area', id, rows, placeholder, value, oninput: e => onChange(e.target.value) })
  ]);
}

function avatarDrop(f) {
  const drop = createEl('div', { class: 'av-uploader', id: 'av-drop', onclick: () => document.getElementById('av-file')?.click() });
  if (f.avatar) {
    drop.appendChild(avatarEl({ ...f, color: f.color }, 80));
  } else {
    drop.appendChild(iconEl('user', 28));
    drop.appendChild(createEl('span', { text: 'Upload' }));
  }
  return drop;
}

function updateForm(key, value) {
  const f = { ...store.get('charForm') };
  f[key] = value;
  store.set('charForm', f);
}

function refreshSwatches() {
  const color = store.get('charForm.color');
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('selected', s.getAttribute('data-color') === color);
  });
}

function toggleRow(label, value, onToggle) {
  return createEl('div', { class: 'tgl', onclick: onToggle }, [
    createEl('div', { class: `tgl-track ${value ? 'on' : ''}`, id: 'cf-usr' }, [createEl('div', { class: 'tgl-thumb' })]),
    createEl('span', { class: 'tgl-label', text: label })
  ]);
}

function refreshToggle(id, value) {
  document.getElementById(id)?.classList.toggle('on', value);
}

function handleAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    updateForm('avatar', ev.target.result);
    const drop = document.getElementById('av-drop');
    if (drop) {
      drop.innerHTML = '';
      drop.appendChild(avatarEl({ ...store.get('charForm'), color: store.get('charForm.color') }, 80));
    }
  };
  reader.readAsDataURL(file);
}

function inlineDropdown(id, selectedId, items, onSelect) {
  const selected = items.find(i => i.id === selectedId);
  return createEl('div', { class: 'picker-wrap' }, [
    createEl('button', {
      class: 'picker-btn',
      id: `${id}-btn`,
      onclick: e => { e.stopPropagation(); toggleDropdown(id); }
    }, [
      createEl('span', { id: `${id}-lbl`, text: selected?.name || selectedId || 'Select' }),
      iconEl('chevron-down', 10, { style: 'color:var(--text-muted)' })
    ]),
    createEl('div', {
      class: 'picker-list',
      id: `${id}-list`
    }, items.map(item => createEl('div', {
      class: `picker-item ${item.id === selectedId ? 'selected' : ''}`,
      onclick: () => {
        document.getElementById(`${id}-lbl`).textContent = item.name;
        hideDropdown(id);
        onSelect(item);
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

function toggleDropdown(id) {
  const list = document.getElementById(`${id}-list`);
  if (!list) return;
  const showing = list.style.display === 'block';
  document.querySelectorAll('.picker-list').forEach(l => l.style.display = 'none');
  list.style.display = showing ? 'none' : 'block';
}

function hideDropdown(id) {
  const list = document.getElementById(`${id}-list`);
  if (list) list.style.display = 'none';
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

async function saveChar() {
  const f = store.get('charForm');
  if (!f.name?.trim()) { toast.error('Name is required'); return; }

  if (f.isUser) {
    const all = await db.getAll('characters');
    for (const c of all) {
      if (c.isUser && c.id !== store.get('editCharId')) {
        c.isUser = false;
        await db.put('characters', c);
      }
    }
  }

  const char = {
    id: store.get('editCharId') || uid(),
    name: f.name.trim(),
    color: f.color || COLORS[0],
    personality: f.personality || '',
    appearance: f.appearance || '',
    modelId: f.modelId || 'openai-fast',
    voice: f.voice || 'nova',
    avatar: f.avatar || '',
    isUser: !!f.isUser,
    updatedAt: Date.now()
  };

  if (!store.get('editCharId')) char.createdAt = Date.now();

  await db.put('characters', char);
  toast.success(`"${char.name}" saved`);
  store.set('editCharId', null);
  router.go('dashboard');
}

async function nukeMemories(charId) {
  const ok = await confirm('Permanently delete ALL memories for this character across ALL scenarios?', { ok: 'Delete All', danger: true });
  if (!ok) return;
  const all = await db.getAll('memories');
  const targets = all.filter(m => m.id?.startsWith(`${charId}_`)).map(m => m.id);
  for (const key of targets) await db.del('memories', key);
  toast.success('Memories cleared');
}
