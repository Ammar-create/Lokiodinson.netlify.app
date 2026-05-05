'use strict';
// ===== DB =====
const DB=(()=>{
  let db=null;
  async function open(){
    if(db)return db;
    return new Promise((res,rej)=>{
      const req=indexedDB.open('theatro',2);
      req.onupgradeneeded=e=>{
        const d=e.target.result;
        ['characters','scenarios','memories','relationships','providers'].forEach(s=>{
          if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});
        });
        if(!d.objectStoreNames.contains('messages')){
          const ms=d.createObjectStore('messages',{keyPath:'id'});
          ms.createIndex('scenarioId','scenarioId',{unique:false});
        }
        if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'});
      };
      req.onsuccess=e=>{db=e.target.result;res(db)};
      req.onerror=e=>rej(e.target.error);
    });
  }
  async function tx(store,mode,fn){
    const d=await open();
    return new Promise((res,rej)=>{
      const t=d.transaction(store,mode);
      const s=t.objectStore(store);
      const r=fn(s);
      if(r){r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error);}
      else{t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);}
    });
  }
  const get=(st,k)=>tx(st,'readonly',s=>s.get(k));
  const put=(st,v)=>tx(st,'readwrite',s=>s.put(v));
  const del=(st,k)=>tx(st,'readwrite',s=>s.delete(k));
  async function getAll(store){
    const d=await open();
    return new Promise((res,rej)=>{const r=d.transaction(store,'readonly').objectStore(store).getAll();r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error)});
  }
  async function getByIndex(store,idx,val){
    const d=await open();
    return new Promise((res,rej)=>{const r=d.transaction(store,'readonly').objectStore(store).index(idx).getAll(val);r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error)});
  }
  async function getSetting(k,def=null){const r=await get('settings',k);return r?r.value:def}
  async function setSetting(k,v){await put('settings',{key:k,value:v})}
  return{get,put,del,getAll,getByIndex,getSetting,setSetting};
})();