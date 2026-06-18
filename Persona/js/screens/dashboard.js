import { createEl, esc, fmtDate } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { router } from '../core/router.js';
import { toast } from '../ui/toast.js';
import { confirm } from '../ui/modal.js';
import { iconEl } from '../ui/icons.js';
import { avatarEl } from '../ui/avatar.js';

export function mount(container) {
  render(container);
}

export function unmount(container) {
  container.innerHTML = '';
}

async function render(container) {
  container.innerHTML = '';
  const tab = store.get('dashTab') || 'scenarios';
  const chars = await db.getAll('characters');
  const scens = await db.getAll('scenarios');

  const tabs = createEl('div', { class: 'dash-tabs' }, [
    createEl('button', {
      class: `dash-tab ${tab === 'scenarios' ? 'active' : ''}`,
      onclick: () => { store.set('dashTab', 'scenarios'); render(container); }
    }, [iconEl('film', 12), ` Scenarios (${scens.length})`]),
    createEl('button', {
      class: `dash-tab ${tab === 'characters' ? 'active' : ''}`,
      onclick: () => { store.set('dashTab', 'characters'); render(container); }
    }, [iconEl('user', 12), ` Characters (${chars.length})`])
  ]);

  const body = createEl('div', { class: 'dash-body' });

  if (tab === 'scenarios') {
    if (!scens.length) {
      body.appendChild(emptyState('scenarios'));
    } else {
      body.appendChild(renderScenarios(scens, chars));
    }
  } else {
    if (!chars.length) {
      body.appendChild(emptyState('characters'));
    } else {
      body.appendChild(renderCharacters(chars));
    }
  }

  const content = createEl('div', { class: 'screen-content' });
  content.appendChild(tabs);
  content.appendChild(body);
  container.appendChild(content);
}

function renderScenarios(scens, chars) {
  const frag = document.createDocumentFragment();
  frag.appendChild(createEl('div', { class: 'section-hdr' }, [
    createEl('h2', { class: 'section-title', text: 'Your Scenarios' })
  ]));

  const grid = createEl('div', { class: 'bento' });
  const sorted = scens.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  for (const s of sorted) {
    const cast = (s.characterIds || []).map(id => chars.find(c => c.id === id)).filter(Boolean);
    const isBranch = !!s.parentId;

    const card = createEl('div', {
      class: 'card sc-card',
      onclick: () => initChat(s.id)
    }, [
      createEl('div', { class: 'card-title' }, [
        esc(s.name),
        isBranch ? createEl('span', { class: 'tag tag-gold', style: 'margin-left:8px', text: 'Branch' }) : null
      ]),
      createEl('div', { class: 'sc-card-lore', text: s.lore || 'No lore defined' }),
      createEl('div', { class: 'sc-card-cast' }, cast.slice(0, 7).map(c =>
        avatarEl(c, 28, { borderColor: 'var(--stage)' })
      )),
      cast.length > 7 ? createEl('div', { class: 'cast-ring', text: `+${cast.length - 7}` }) : null,
      createEl('div', { class: 'sc-card-meta' }, [
        createEl('span', { text: `${cast.length} character${cast.length !== 1 ? 's' : ''}` }),
        createEl('span', { text: s.updatedAt ? fmtDate(s.updatedAt) : 'New' })
      ]),
      createEl('div', { style: 'display:flex;gap:6px;margin-top:10px;justify-content:flex-end' }, [
        createEl('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: e => { e.stopPropagation(); editScenario(s.id); }
        }, [iconEl('edit', 12)]),
        createEl('button', {
          class: 'btn btn-danger btn-sm',
          onclick: e => { e.stopPropagation(); deleteScenario(s.id); }
        }, [iconEl('trash', 12)]),
        createEl('button', {
          class: 'btn btn-primary btn-sm',
          onclick: e => { e.stopPropagation(); initChat(s.id); }
        }, [iconEl('play', 12), ' Open'])
      ])
    ]);

    card.style.setProperty('--accent', cast[0]?.color || 'var(--gold)');
    grid.appendChild(card);
  }

  frag.appendChild(grid);
  return frag;
}

function renderCharacters(chars) {
  const frag = document.createDocumentFragment();
  frag.appendChild(createEl('div', { class: 'section-hdr' }, [
    createEl('h2', { class: 'section-title', text: 'Your Characters' })
  ]));

  const grid = createEl('div', { class: 'bento' });

  for (const c of chars) {
    const card = createEl('div', {
      class: 'card',
      style: `--accent:${c.color || 'var(--gold)'}`,
      onclick: () => editCharacter(c.id)
    }, [
      createEl('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:8px' }, [
        avatarEl(c, 40),
        createEl('div', { style: 'flex:1;min-width:0' }, [
          createEl('div', { class: 'card-title', text: c.name }),
          createEl('div', { class: 'card-sub', text: `${c.modelId || 'openai-fast'} \u00b7 ${c.voice || 'nova'}` })
        ]),
        c.isUser ? createEl('span', { class: 'pill pill-gold', style: 'font-size:10px', text: 'You' }) : null
      ]),
      createEl('div', { class: 'card-body', text: c.personality || 'No personality defined' }),
      createEl('div', { style: 'display:flex;gap:6px;margin-top:10px;justify-content:flex-end' }, [
        createEl('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: e => { e.stopPropagation(); editCharacter(c.id); }
        }, [iconEl('edit', 12)]),
        createEl('button', {
          class: 'btn btn-danger btn-sm',
          onclick: e => { e.stopPropagation(); deleteCharacter(c.id); }
        }, [iconEl('trash', 12)])
      ])
    ]);
    grid.appendChild(card);
  }

  frag.appendChild(grid);
  return frag;
}

function emptyState(type) {
  const ico = type === 'scenarios' ? 'film' : 'user';
  const title = type === 'scenarios' ? 'No Scenarios Yet' : 'No Characters Yet';
  const desc = type === 'scenarios' ? 'Create your first scenario to begin.' : 'Create characters to cast in your scenarios.';
  const action = type === 'scenarios'
    ? () => { store.set('editScenId', null); router.go('scenario-create'); }
    : () => { store.set('editCharId', null); router.go('char-create'); };

  return createEl('div', { class: 'empty' }, [
    iconEl(ico, 48, { style: 'margin:0 auto 16px;color:var(--gold);opacity:.4' }),
    createEl('div', { class: 'empty-title', text: title }),
    createEl('div', { class: 'empty-desc', text: desc }),
    createEl('button', { class: 'btn btn-primary', onclick: action }, [
      iconEl('plus', 14),
      ` Create ${type === 'scenarios' ? 'Scenario' : 'Character'}`
    ])
  ]);
}

async function initChat(scenId) {
  store.set('chat.scenId', scenId);
  router.go('chat');
}

function editCharacter(id) {
  store.set('editCharId', id);
  router.go('char-edit');
}

async function deleteCharacter(id) {
  const ok = await confirm('Delete this character?', { ok: 'Delete', danger: true });
  if (!ok) return;
  await db.del('characters', id);
  toast.success('Character deleted');
  const container = document.getElementById('dashboard-screen');
  if (container) render(container);
}

function editScenario(id) {
  store.set('editScenId', id);
  router.go('scenario-edit');
}

async function deleteScenario(id) {
  const ok = await confirm('Delete scenario? All messages will be lost.', { ok: 'Delete', danger: true });
  if (!ok) return;

  await db.del('scenarios', id);
  const msgs = await db.getByIndex('messages', 'scenarioId', id);
  for (const m of msgs) await db.del('messages', m.id);
  await db.del('relationships', id);

  const chars = await db.getAll('characters');
  for (const c of chars) {
    await db.del('memories', `${c.id}_${id}`);
    await db.del('memories', `${c.id}_global`);
  }

  toast.success('Scenario deleted');
  const container = document.getElementById('dashboard-screen');
  if (container) render(container);
}
