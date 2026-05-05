'use strict';
// ===== TOAST =====
const Toast={
  show(m,t='i',d=3500){
    const c=$('#toast-container');
    const el=document.createElement('div');
    el.className=`toast ${t}`;el.textContent=m;c.appendChild(el);
    setTimeout(()=>el.remove(),d);
  },
  s:(m,d)=>Toast.show(m,'s',d),
  e:(m,d)=>Toast.show(m,'e',d||5000),
  w:(m,d)=>Toast.show(m,'w',d),
  i:(m,d)=>Toast.show(m,'i',d),
};

// ===== MODAL =====
const Modal={
  open(opts){
    const ov=$('#modal-overlay');
    const{title,content,footer,wide,narrow,onClose,afterOpen}=opts;
    ov.innerHTML=`<div class="modal ${wide?'wide':''} ${narrow?'narrow':''}">
      <div class="modal-hdr">
        <span class="modal-title">${esc(title)}</span>
        <button class="modal-x" id="mx">&times;</button>
      </div>
      <div class="modal-body" id="mb">${typeof content==='function'?content():content||''}</div>
      ${footer?`<div class="modal-foot" id="mf">${typeof footer==='function'?footer():footer}</div>`:''}
    </div>`;
    ov.classList.add('open');
    $('#mx').onclick=()=>Modal.close(onClose);
    ov.onclick=e=>{if(e.target===ov)Modal.close(onClose)};
    if(afterOpen)afterOpen();
  },
  close(cb){
    const ov=$('#modal-overlay');
    ov.classList.remove('open');
    setTimeout(()=>{ov.innerHTML=''},200);
    if(cb)cb();
  },
  confirm(msg,opts={}){
    return new Promise(res=>{
      Modal.open({title:opts.title||'Confirm',narrow:true,
        content:`<p style="color:var(--tdim);font-size:13px">${esc(msg)}</p>`,
        footer:`<button class="btn bg bsm" id="mc">Cancel</button><button class="btn ${opts.danger?'bd':'bp'} bsm" id="mok">${esc(opts.ok||'Confirm')}</button>`,
        onClose:()=>res(false)
      });
      $('#mok').onclick=()=>{Modal.close();res(true)};
      $('#mc').onclick=()=>{Modal.close();res(false)};
    });
  },
  prompt(label,opts={}){
    return new Promise(res=>{
      Modal.open({title:opts.title||'Input',narrow:true,
        content:`<div class="field"><label class="lbl">${esc(label)}</label><input type="text" id="mi" placeholder="${esc(opts.placeholder||'')}" value="${esc(opts.value||'')}"></div>`,
        footer:`<button class="btn bg bsm" id="mc">Cancel</button><button class="btn bp bsm" id="mok">${esc(opts.ok||'OK')}</button>`,
        onClose:()=>res(null),
        afterOpen(){
          const i=$('#mi');i.focus();i.select();
          i.onkeydown=e=>{if(e.key==='Enter'){const v=i.value;Modal.close();res(v);}};
        }
      });
      $('#mok').onclick=()=>{const v=$('#mi').value;Modal.close();res(v)};
      $('#mc').onclick=()=>{Modal.close();res(null)};
    });
  }
};

// ===== ROUTER =====
const Router={
  go(screen){
    $$('.screen').forEach(s=>s.classList.remove('active'));
    const el=$(`#screen-${screen}`);if(el)el.classList.add('active');
    ST.screen=screen;
    Hdr.render(screen);
    Scr.render(screen);
  }
};