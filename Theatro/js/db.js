'use strict';
// ===== DB =====
const DB=(()=>{
  let db=null;
  async function open(){
    if(db)return db;
    return new Promise((res,rej)=>{
      const req=indexedDB.open('theatro',3);
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
        // v3: blob cache for images and audio (keyed by URL hash)
        if(!d.objectStoreNames.contains('blobs')){
          const bs=d.createObjectStore('blobs',{keyPath:'id'});
          bs.createIndex('kind','kind',{unique:false});
          bs.createIndex('url','url',{unique:false});
        }
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

  // ===== BLOB CACHE (images & audio) =====
  // Stable hash for a URL → used as the IndexedDB key.
  // Uses a fast non-crypto djb2 variant; collisions extraordinarily unlikely for our scale.
  function hashUrl(url){
    let h=5381;
    const s=String(url||'');
    for(let i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))|0;}
    return 'b_'+(h>>>0).toString(36)+'_'+s.length.toString(36);
  }

  // In-memory object URL cache so we don't recreate blob: URLs on every render.
  const _objUrlCache=new Map(); // id -> object URL

  async function cacheBlob(url,blob,kind='image'){
    if(!url||!blob)return null;
    const id=hashUrl(url);
    const rec={id,url,kind,type:blob.type||'',size:blob.size||0,blob,cachedAt:Date.now()};
    await put('blobs',rec);
    // Invalidate any stale object URL so the next getBlobUrl call rebuilds it.
    if(_objUrlCache.has(id)){
      try{URL.revokeObjectURL(_objUrlCache.get(id));}catch{}
      _objUrlCache.delete(id);
    }
    return id;
  }

  async function getBlob(url){
    if(!url)return null;
    const id=hashUrl(url);
    const rec=await get('blobs',id);
    return rec?rec.blob:null;
  }

  async function hasBlob(url){
    if(!url)return false;
    const rec=await get('blobs',hashUrl(url));
    return !!rec;
  }

  // Returns a blob: object URL from the cache, or null if not cached.
  // Object URLs are memoized for the lifetime of the page.
  async function getBlobUrl(url){
    if(!url)return null;
    const id=hashUrl(url);
    if(_objUrlCache.has(id))return _objUrlCache.get(id);
    const rec=await get('blobs',id);
    if(!rec||!rec.blob)return null;
    const objUrl=URL.createObjectURL(rec.blob);
    _objUrlCache.set(id,objUrl);
    return objUrl;
  }

  async function delBlob(url){
    if(!url)return;
    const id=hashUrl(url);
    if(_objUrlCache.has(id)){
      try{URL.revokeObjectURL(_objUrlCache.get(id));}catch{}
      _objUrlCache.delete(id);
    }
    await del('blobs',id);
  }

  async function getAllBlobs(){return getAll('blobs')}

  return{open,get,put,del,getAll,getByIndex,getSetting,setSetting,
    hashUrl,cacheBlob,getBlob,hasBlob,getBlobUrl,delBlob,getAllBlobs};
})();
