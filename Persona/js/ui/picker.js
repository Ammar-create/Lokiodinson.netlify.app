/***** CUSTOM PICKER COMPONENT *****/
import { createEl } from '../core/dom.js';
import { open as openModal } from './modal.js';

export function createPickerButton(id, label, onClick) {
  return createEl('button', {
    class: 'picker-btn',
    id: `${id}-btn`,
    onclick: onClick
  }, [
    createEl('span', { id: `${id}-lbl`, text: label }),
    createEl('span', { class: 'caret' }, createEl('svg', { style: 'width:10px;height:10px' },
      createEl('use', { href: 'assets/icons.svg#chevron-down' }))
    )
  ]);
}

export function openPicker(title, items, selectedId, onSelect) {
  const content = () => createEl('div', { class: 'picker-list' },
    items.map(item => createEl('div', {
      class: `picker-item ${item.id === selectedId ? 'selected' : ''}`,
      onclick: () => { onSelect(item); close(); }
    }, [
      createEl('div', {}, [
        createEl('div', { style: 'font-weight:600', text: item.name }),
        createEl('div', { class: 'meta', text: item.desc || '' })
      ]),
      item.badge ? createEl('span', { class: 'badge', text: item.badge }) : null
    ]))
  ).outerHTML;

  openModal({ title, narrow: true, content });
}

export function modelPickerHtml(id, selectedId, models) {
  const selected = models.find(m => m.id === selectedId);
  const provider = selected?.provider || 'pollinations';
  const badgeColor = provider === 'aqua' ? 'var(--criml)' : 'var(--gold)';
  const badgeLetter = provider === 'aqua' ? 'A' : 'P';

  return createEl('div', {}, [
    createEl('button', {
      class: 'picker-btn',
      id: `${id}-btn`,
      onclick: () => openModelPicker(id, selectedId, models, (m) => {
        document.getElementById(`${id}-inp`).value = m.id;
        document.getElementById(`${id}-lbl`).textContent = m.name;
        const b = document.getElementById(`${id}-badge`);
        if (b) {
          b.textContent = m.provider === 'aqua' ? 'A' : 'P';
          b.style.color = m.provider === 'aqua' ? 'var(--criml)' : 'var(--gold)';
        }
      })
    }, [
      createEl('span', { id: `${id}-lbl`, text: selected?.name || selectedId || 'Select model' }),
      createEl('span', { class: 'badge', id: `${id}-badge`, text: badgeLetter, style: `color:${badgeColor};border-color:${badgeColor}` }),
      createEl('span', { class: 'caret', html: '▼' })
    ]),
    createEl('input', { type: 'hidden', id: `${id}-inp`, value: selectedId || '' })
  ]);
}

function openModelPicker(id, currentId, models, onSelect) {
  const pollis = models.filter(m => m.provider === 'pollinations');
  const aquas = models.filter(m => m.provider === 'aqua');

  const html = () => `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="wings-label"><svg class="icon" style="width:12px;height:12px"><use href="assets/icons.svg#globe"/></svg> Pollinations</div>
      <div class="picker-list">${pollis.map(m => itemHtml(m, currentId, onSelect)).join('')}</div>
      <div class="wings-label"><svg class="icon" style="width:12px;height:12px"><use href="assets/icons.svg#key"/></svg> Aqua</div>
      <div class="picker-list">${aquas.length ? aquas.map(m => itemHtml(m, currentId, onSelect)).join('') : '<div style="padding:12px;color:var(--text-muted);font-size:12px">Add API key in Settings.</div>'}</div>
    </div>
  `;

  openModal({ title: 'Select Model', content: html });
}

function itemHtml(item, currentId, onSelect) {
  return `
    <div class="picker-item ${item.id === currentId ? 'selected' : ''}" onclick="(${onSelect.toString()})({id:'${item.id}',name:'${item.name.replace(/'/g, "\\'")}',provider:'${item.provider}',desc:'${(item.desc || '').replace(/'/g, "\\'")}'})">
      <div>
        <div style="font-weight:600">${item.name}</div>
        <div class="meta">${item.id}</div>
        <div style="font-size:11px;color:var(--text-muted)">${item.desc || ''}</div>
      </div>
      ${item.rec ? '<span class="mopt-rec">★ Rec</span>' : ''}
    </div>
  `;
}
