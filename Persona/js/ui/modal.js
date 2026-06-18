/***** MODAL SYSTEM *****/
import { createEl } from '../core/dom.js';

const ROOT = document.getElementById('modal-root');
let _closeTimer = null;

function buildModal(opts) {
  const { title, content, footer, wide, narrow } = opts;
  const body = typeof content === 'function' ? content() : (content || '');
  const foot = typeof footer === 'function' ? footer() : (footer || '');

  return createEl('div', { class: `modal ${wide ? 'modal-wide' : ''} ${narrow ? 'modal-narrow' : ''}` }, [
    createEl('div', { class: 'modal-header' }, [
      createEl('span', { class: 'modal-title', text: title || '' }),
      createEl('button', {
        class: 'modal-close',
        html: '&times;',
        onclick: () => close(opts.onClose)
      })
    ]),
    createEl('div', { class: 'modal-body', html: body }),
    foot ? createEl('div', { class: 'modal-footer', html: foot }) : null
  ]);
}

export function open(opts = {}) {
  if (!ROOT) return;
  if (_closeTimer) { clearTimeout(_closeTimer); _closeTimer = null; }

  const modal = buildModal(opts);
  ROOT.innerHTML = '';
  ROOT.appendChild(modal);
  ROOT.classList.add('open');

  ROOT.onclick = e => { if (e.target === ROOT) close(opts.onClose); };

  if (opts.afterOpen) {
    requestAnimationFrame(() => opts.afterOpen());
  }
}

export function close(cb) {
  if (!ROOT) return;
  ROOT.classList.remove('open');
  _closeTimer = setTimeout(() => { ROOT.innerHTML = ''; _closeTimer = null; }, 200);
  if (typeof cb === 'function') cb();
}

export function confirm(msg, opts = {}) {
  return new Promise(res => {
    open({
      title: opts.title || 'Confirm',
      narrow: true,
      content: `<p style="color:var(--text-soft);font-size:13px">${msg}</p>`,
      footer: `<button class="btn btn-ghost btn-sm" id="mc">Cancel</button><button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'} btn-sm" id="mok">${opts.ok || 'Confirm'}</button>`,
      onClose: () => res(false),
      afterOpen() {
        document.getElementById('mok')?.addEventListener('click', () => { close(); res(true); });
        document.getElementById('mc')?.addEventListener('click', () => { close(); res(false); });
      }
    });
  });
}

export function prompt(label, opts = {}) {
  return new Promise(res => {
    open({
      title: opts.title || 'Input',
      narrow: true,
      content: `<div class="field"><label class="field-label">${label}</label><input type="text" id="mi" class="text-field" placeholder="${opts.placeholder || ''}" value="${opts.value || ''}"></div>`,
      footer: `<button class="btn btn-ghost btn-sm" id="mc">Cancel</button><button class="btn btn-primary btn-sm" id="mok">${opts.ok || 'OK'}</button>`,
      onClose: () => res(null),
      afterOpen() {
        const i = document.getElementById('mi');
        if (i) { i.focus(); i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter') { res(i.value); close(); } }); }
        document.getElementById('mok')?.addEventListener('click', () => { res(document.getElementById('mi')?.value || ''); close(); });
        document.getElementById('mc')?.addEventListener('click', () => { close(); res(null); });
      }
    });
  });
}
