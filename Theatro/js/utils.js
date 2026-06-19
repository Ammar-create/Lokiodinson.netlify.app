'use strict';
// ===== UTILS =====
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,6);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmtT=ts=>new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const fmtD=ts=>new Date(ts).toLocaleDateString([],{month:'short',day:'numeric'});

function parseRP(text,color){
  if(!text)return '';
  let h='',i=0;
  const c=esc(color||'#c9a84c');
  while(i<text.length){
    if(text[i]==='*'&&i+1<text.length&&text[i+1]==='*'){
      const e=text.indexOf('**',i+2);
      if(e!==-1&&e>i+2){h+=`<strong style="color:${c}">${esc(text.slice(i+2,e))}</strong>`;i=e+2;continue}
    }
    if(text[i]==='*'){
      const e=text.indexOf('*',i+1);
      if(e!==-1&&e>i+1){
        const inner=text.slice(i+1,e);
        if(/[a-zA-Z]/.test(inner)){
          h+=`<em style="color:${c};opacity:.85">${esc(inner)}</em>`;i=e+1;continue;
        }
      }
    }
    if(text[i]==='"'){
      const e=text.indexOf('"',i+1);
      if(e!==-1&&e>i){h+=`<span style="color:${c};font-weight:500">${esc(text.slice(i,e+1))}</span>`;i=e+1;continue}
    }
    if(text[i]==='\n'){h+='<br>';i++;continue}
    h+=esc(text[i]);i++;
  }
  return h;
}
// I() moved to icons.js
