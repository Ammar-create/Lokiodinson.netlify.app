// ============================================================
    // CONFIG & STATE
    // ============================================================
    const OMDB_KEY = 'fc9b875a';
    const TMDB_KEY = '0666d38936ae64a3e537a6d6989fcae0';
    const DB_NAME = 'CosmicWatchlistDB';
    const DB_VERSION = 1;
    let db;
    let state = {
      currentCategory: 'watchlist',
      categories: [],
      deleteTarget: null,
      editingId: null,
      heroEntryId: null,
      renamingCategory: null,
    };

    window._botPosters = [];
    window._botPosterIndex = 0;
    window._currentBotData = null;

    const els = {
      categoryList: document.getElementById('categoryList'),
      statTotal: document.getElementById('statTotal'), barTotal: document.getElementById('barTotal'),
      statCompleted: document.getElementById('statCompleted'), barCompleted: document.getElementById('barCompleted'),
      statWatchTime: document.getElementById('statWatchTime'), barWatchTime: document.getElementById('barWatchTime'),
      cardsGrid: document.getElementById('cardsGrid'), emptyState: document.getElementById('emptyState'),
      currentCategoryName: document.getElementById('currentCategoryName'),
      searchInput: document.getElementById('searchInput'), searchBtn: document.getElementById('searchBtn'),
      botResults: document.getElementById('botResults'), botResultContent: document.getElementById('botResultContent'), closeBot: document.getElementById('closeBot'),
      entryModal: document.getElementById('entryModal'), entryModalTitle: document.getElementById('entryModalTitle'),
      entryForm: document.getElementById('entryForm'), entryId: document.getElementById('entryId'),
      entryTitle: document.getElementById('entryTitle'), entryYear: document.getElementById('entryYear'),
      entrySeasons: document.getElementById('entrySeasons'), entryEpisodes: document.getElementById('entryEpisodes'),
      entryRuntime: document.getElementById('entryRuntime'), entryWatchTime: document.getElementById('entryWatchTime'),
      entryGenre: document.getElementById('entryGenre'), entryPlot: document.getElementById('entryPlot'),
      entryImdb: document.getElementById('entryImdb'), entryProgress: document.getElementById('entryProgress'),
      entryNotes: document.getElementById('entryNotes'), entryCompleted: document.getElementById('entryCompleted'),
      refreshEntryBtn: document.getElementById('refreshEntryBtn'),
      closeEntryModal: document.getElementById('closeEntryModal'), cancelEntryBtn: document.getElementById('cancelEntryBtn'),
      addEntryBtn: document.getElementById('addEntryBtn'), openSettingsBtn: document.getElementById('openSettingsBtn'),
      categoryModal: document.getElementById('categoryModal'), categoryForm: document.getElementById('categoryForm'),
      categoryNameInput: document.getElementById('categoryNameInput'), closeCatModal: document.getElementById('closeCatModal'), cancelCatBtn: document.getElementById('cancelCatBtn'),
      addCategoryBtn: document.getElementById('addCategoryBtn'), deleteModal: document.getElementById('deleteModal'),
      deleteModalTitle: document.getElementById('deleteModalTitle'), deleteMessage: document.getElementById('deleteMessage'),
      closeDeleteModal: document.getElementById('closeDeleteModal'), cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
      confirmDeleteBtn: document.getElementById('confirmDeleteBtn'), toastContainer: document.getElementById('toastContainer'),
      // Settings
      settingsModal: document.getElementById('settingsModal'), settingsForm: document.getElementById('settingsForm'), closeSettingsModal: document.getElementById('closeSettingsModal'), cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
      settingApiUrl: document.getElementById('settingApiUrl'), settingApiKey: document.getElementById('settingApiKey'), settingModelId: document.getElementById('settingModelId'), settingSystemPrompt: document.getElementById('settingSystemPrompt'),
      searchToggle: document.getElementById('searchToggle'), searchToggleRow: document.getElementById('searchToggleRow'),
      advancedHeader: document.getElementById('advancedHeader'), advancedBody: document.getElementById('advancedBody'),
      refreshPostersBtn: document.getElementById('refreshPostersBtn'),
      modalExportBtn: document.getElementById('modalExportBtn'), modalImportBtn: document.getElementById('modalImportBtn'), modalImportFile: document.getElementById('modalImportFile'),
      // Chat
      chatModal: document.getElementById('chatModal'), closeChatModal: document.getElementById('closeChatModal'),
      chatBody: document.getElementById('chatBody'), chatInput: document.getElementById('chatInput'), chatSendBtn: document.getElementById('chatSendBtn'),
      openChatBtn: document.getElementById('openChatBtn'), aiFabBtn: document.getElementById('aiFabBtn'), promptGuideBtn: document.getElementById('promptGuideBtn'), promptGuide: document.getElementById('promptGuide'),
      chatErrorBanner: document.getElementById('chatErrorBanner'), chatErrorText: document.getElementById('chatErrorText'),
      sessionTrigger: document.getElementById('sessionTrigger'), sessionMenu: document.getElementById('sessionMenu'), sessionLabel: document.getElementById('sessionLabel'),
    };

    // ============================================================
    // DB
    // ============================================================
    async function initDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const database = e.target.result;
          if (!database.objectStoreNames.contains('entries')) {
            const s = database.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
            s.createIndex('category', 'category', { unique: false });
          }
          if (!database.objectStoreNames.contains('categories')) database.createObjectStore('categories', { keyPath: 'name' });
        };
        req.onsuccess = () => { db = req.result; resolve(db); };
        req.onerror = () => reject(req.error);
      });
    }
    async function getAll(store) { return new Promise((res,rej)=>{ const tx=db.transaction(store,'readonly'),os=tx.objectStore(store),req=os.getAll(); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
    async function addItem(store,data){ return new Promise((res,rej)=>{ const tx=db.transaction(store,'readwrite'),os=tx.objectStore(store),req=os.add(data); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
    async function putItem(store,data){ return new Promise((res,rej)=>{ const tx=db.transaction(store,'readwrite'),os=tx.objectStore(store),req=os.put(data); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
    async function deleteItem(store,key){ return new Promise((res,rej)=>{ const tx=db.transaction(store,'readwrite'),os=tx.objectStore(store),req=os.delete(key); req.onsuccess=()=>res(); req.onerror=()=>rej(req.error); }); }
    async function getEntry(id){ return new Promise((res,rej)=>{ const tx=db.transaction('entries','readonly'),os=tx.objectStore('entries'),req=os.get(Number(id)||id); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }

    // ============================================================
    // UTILS
    // ============================================================
    function capitalize(s){ if(!s)return''; return s.charAt(0).toUpperCase()+s.slice(1); }
    function escapeHtml(t){ if(!t)return''; const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
    function normalizeTitle(t){ return t.trim().toLowerCase().replace(/[^a-z0-9]+/g,""); }
    function parseProgressText(text,totalSeasons,totalEpisodes) {
      if(!text) return 0;
      const n=parseInt(text); if(!isNaN(n)&&n>0&&n<=100) return n;
      let curSeason=0,curEp=0;
      const sm=text.match(/season\s*(\d+)/i); if(sm) curSeason=parseInt(sm[1]);
      const em=text.match(/episode\s*(\d+)/i); if(em) curEp=parseInt(em[1]);
      if(!curSeason&&!curEp) return 0;
      const ts=parseInt(totalSeasons)||0,te=parseInt(totalEpisodes)||0;
      if(ts>0&&te>0&&curSeason>0){
        const epsPerSeason=te/ts;
        const watched=(curSeason-1)*epsPerSeason+(curEp||0);
        return Math.min(100,Math.round(watched/te*100));
      }
      if(te>0&&curEp>0) return Math.min(100,Math.round(curEp/te*100));
      return 0;
    }
    function parseYear(dateStr) {
      if (!dateStr || dateStr === 'N/A') return null;
      const parts = dateStr.trim().split(' ');
      if (parts.length === 3) { const y = parseInt(parts[2]); if (!isNaN(y)) return y; }
      const m = dateStr.match(/(\d{4})/);
      return m ? parseInt(m[1]) : null;
    }

    function buildApiUrl(base) {
      let url = base.trim();
      if (!url) return '';
      url = url.replace(/\/+$/, '');
      if (url.endsWith('/v1/chat/completions')) return url;
      if (url.endsWith('/v1')) return url + '/chat/completions';
      if (url.includes('/chat/completions')) return url;
      return url + '/v1/chat/completions';
    }

    function hasAIConfigured() {
      const s = loadSettings();
      return !!(s.apiUrl && s.apiKey && s.modelId);
    }
    function syncAIVisibility() {
      const show = hasAIConfigured();
      els.openChatBtn.style.display = show ? 'flex' : 'none';
      els.aiFabBtn.classList.toggle('visible', show);
    }

    // ============================================================
    // CUSTOM SELECT
    // ============================================================
    function buildCustomSelect(containerId, options, value, onChange){
      const container=document.getElementById(containerId);
      if(!container)return;
      container.innerHTML='';
      const trigger=document.createElement('div'); trigger.className='custom-select-trigger';
      const labelText=(options.find(o=>o.value===value)?.label)||container.dataset.placeholder||'Select...';
      trigger.innerHTML=`<span>${labelText}</span><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`;
      const menu=document.createElement('div'); menu.className='custom-select-menu';
      options.forEach(opt=>{
        const div=document.createElement('div'); div.className='custom-select-option'+(opt.value===value?' active':'');
        div.textContent=opt.label; div.dataset.value=opt.value;
        div.addEventListener('click',(e)=>{ e.stopPropagation(); trigger.querySelector('span').textContent=opt.label;
          menu.querySelectorAll('.custom-select-option').forEach(el=>el.classList.remove('active'));
          div.classList.add('active'); closeMenu(); if(onChange) onChange(opt.value);
        });
        menu.appendChild(div);
      });
      container.appendChild(trigger); container.appendChild(menu);
      function openMenu(){ trigger.classList.add('open'); menu.classList.add('open'); }
      function closeMenu(){ trigger.classList.remove('open'); menu.classList.remove('open'); }
      trigger.addEventListener('click',(e)=>{ e.stopPropagation(); const isOpen=menu.classList.contains('open');
        document.querySelectorAll('.custom-select-menu.open').forEach(m=>{ m.classList.remove('open'); m.previousElementSibling?.classList.remove('open'); });
        if(!isOpen) openMenu();
      });
      document.addEventListener('click',(e)=>{ if(!container.contains(e.target)) closeMenu(); });
    }
    function updateCategorySelect(){
      const opts=state.categories.map(c=>({value:c,label:capitalize(c)}));
      buildCustomSelect('entryCategorySelect',opts,state.currentCategory,(val)=>{ document.getElementById('entryCategoryInput').value=val; });
    }

    // ============================================================
    // SMART SEARCH
    // ============================================================
    async function smartMovieSearch(title) {
      try {
        const [omdbRes, tmdbSearchRes] = await Promise.all([
          fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&t=${encodeURIComponent(title)}`),
          fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}`)
        ]);
        const omdb = await omdbRes.json();
        const tmdbSearch = await tmdbSearchRes.json();

        const omdbYear = parseYear(omdb.Released) || parseYear(omdb.Year);
        const omdbNormTitle = normalizeTitle(omdb.Title || '');
        const queryNorm = normalizeTitle(title);

        let bestItem = null;
        let bestScore = -1;

        for (const item of (tmdbSearch.results || [])) {
          if (item.media_type !== 'movie' && item.media_type !== 'tv') continue;
          const itemTitle = normalizeTitle(item.name || item.title || '');
          let score = 0;
          if (itemTitle === omdbNormTitle) score += 150;
          else if (itemTitle === queryNorm) score += 120;
          else if (omdbNormTitle && (itemTitle.includes(omdbNormTitle) || omdbNormTitle.includes(itemTitle))) score += 60;
          else if (itemTitle.includes(queryNorm) || queryNorm.includes(itemTitle)) score += 40;

          const itemYear = parseYear(item.first_air_date || item.release_date);
          if (omdbYear && itemYear) {
            if (omdbYear === itemYear) score += 80;
            else if (Math.abs(omdbYear - itemYear) <= 1) score += 30;
          }
          if (score > bestScore) { bestScore = score; bestItem = item; }
          if (score >= 230) break;
        }

        if (!bestItem) {
          return { omdb: omdb.Response === 'True' ? omdb : null, tmdb: null, tmdbItem: null, matchScore: bestScore };
        }
        const detailRes = await fetch(`https://api.themoviedb.org/3/${bestItem.media_type}/${bestItem.id}?api_key=${TMDB_KEY}`);
        const tmdbDetail = await detailRes.json();
        return { omdb: omdb.Response === 'True' ? omdb : null, tmdb: tmdbDetail, tmdbItem: bestItem, matchScore: bestScore };
      } catch (e) {
        console.error('Smart search error:', e);
        return null;
      }
    }

    async function enrichEntry(entry) {
      if (!entry.title) return entry;
      try {
        const result = await smartMovieSearch(entry.title);
        if (!result) return entry;
        const { omdb, tmdb } = result;

        if (!entry.poster && tmdb?.poster_path) entry.poster = `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`;
        if (!entry.poster && omdb?.Poster && omdb.Poster !== 'N/A') entry.poster = omdb.Poster;

        if (!entry.seasons && tmdb?.number_of_seasons) entry.seasons = tmdb.number_of_seasons;
        if (!entry.episodes && tmdb?.number_of_episodes) entry.episodes = tmdb.number_of_episodes;
        if (!entry.runtime) {
          if (tmdb?.episode_run_time?.[0]) entry.runtime = `${tmdb.episode_run_time[0]} min`;
          else if (tmdb?.runtime) entry.runtime = `${tmdb.runtime} min`;
          else if (omdb?.Runtime && omdb.Runtime !== 'N/A') entry.runtime = omdb.Runtime;
        }
        if (!entry.year) entry.year = (tmdb?.first_air_date || tmdb?.release_date || '').split('-')[0] || omdb?.Year || '';
        if (!entry.plot) entry.plot = tmdb?.overview || (omdb?.Plot !== 'N/A' ? omdb.Plot : '');
        if (!entry.genre) entry.genre = (tmdb?.genres?.map(g=>g.name).join(', ')) || omdb?.Genre || '';
        if (!entry.type) entry.type = tmdb?.first_air_date ? 'series' : 'movie';
        if (!entry.imdbLink && omdb?.imdbID) entry.imdbLink = `https://www.imdb.com/title/${omdb.imdbID}/`;

        if (!entry.totalWatchTime && entry.runtime) {
          const mins = parseInt(entry.runtime);
          if (!isNaN(mins)) {
            if (entry.type !== 'movie' && entry.episodes && !isNaN(parseInt(entry.episodes))) {
              entry.totalWatchTime = `~${Math.round(mins * parseInt(entry.episodes) / 60)} hours`;
            } else {
              entry.totalWatchTime = `~${Math.round(mins / 60 * 10) / 10} hours`;
            }
          }
        }
      } catch (e) {}
      return entry;
    }

    // ============================================================
    // BOT UI
    // ============================================================
    async function searchMovieBot(){
      const query=els.searchInput.value.trim();
      if(!query){ showToast('Enter a movie or TV show name','error'); return; }
      els.searchBtn.disabled=true;
      els.botResults.classList.add('visible');
      els.botResultContent.innerHTML='<div style="display:flex;align-items:center;gap:.75rem;padding:1rem;color:var(--text-secondary);"><div class="spinner"></div>Consulting the cosmic archives...</div>';

      try{
        const result = await smartMovieSearch(query);
        if (!result || result.matchScore < 0) {
          els.botResultContent.innerHTML='<p style="padding:1rem;color:var(--text-secondary);">No results found.</p>';
          return;
        }
        const { omdb, tmdb } = result;
        const title = (tmdb?.name || tmdb?.title) || (omdb?.Title) || query;
        const type = omdb?.Type || (tmdb?.first_air_date ? 'series' : (tmdb?.release_date ? 'movie' : 'N/A'));
        const releaseDate = omdb?.Released || tmdb?.first_air_date || tmdb?.release_date || 'N/A';
        const rating = (omdb?.imdbRating && omdb.imdbRating !== 'N/A') ? omdb.imdbRating : (tmdb?.vote_average ? tmdb.vote_average.toFixed(1) : 'N/A');
        const seasons = omdb?.totalSeasons || tmdb?.number_of_seasons || 'N/A';
        const episodes = tmdb?.number_of_episodes || 'N/A';
        const runtime = omdb?.Runtime || 'N/A';

        let totalRuntime = 'N/A';
        if (runtime !== 'N/A') {
          const mins = parseInt(runtime);
          if (!isNaN(mins)) {
            if (type === 'movie') totalRuntime = `${Math.round(mins / 60 * 10) / 10} hours`;
            else if (episodes !== 'N/A' && !isNaN(parseInt(episodes))) totalRuntime = `${Math.round(mins * parseInt(episodes) / 60)} hours`;
            else totalRuntime = `${Math.round(mins / 60 * 10) / 10} hours`;
          }
        }

        const genre = omdb?.Genre || (tmdb?.genres ? tmdb.genres.map(g => g.name).join(', ') : 'N/A');
        const plot = omdb?.Plot || tmdb?.overview || 'N/A';
        const language = omdb?.Language || 'N/A';
        const actors = omdb?.Actors || 'N/A';
        const omdbId = omdb?.imdbID || '';
        const imdbLink = omdbId ? `https://www.imdb.com/title/${omdbId}/` : '';

        window._botPosters = [];
        if (tmdb?.poster_path) window._botPosters.push(`https://image.tmdb.org/t/p/w500${tmdb.poster_path}`);
        if (omdb?.Poster && omdb.Poster !== 'N/A') window._botPosters.push(omdb.Poster);

        const typeLabel = type === 'movie' ? 'Movie' : (type === 'series' ? 'TV Series' : capitalize(type));
        const hasPosters = window._botPosters.length > 0;
        const showArrows = window._botPosters.length > 1;

        window._currentBotData = { title, type, releaseDate, rating, seasons, episodes, runtime, totalRuntime, genre, plot, language, actors, omdbId, imdbLink };
        els.botResultContent.innerHTML=`
          <div class="bot-poster-box">
            ${showArrows?`<button class="bot-nav-arrow left" onclick="window.changePoster(-1)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>`:''}
            <img id="botPosterImg" src="${hasPosters?window._botPosters[0]:''}" alt="Poster" style="${hasPosters?'':'display:none;'}">
            ${showArrows?`<button class="bot-nav-arrow right" onclick="window.changePoster(1)"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>`:''}
          </div>
          <div style="text-align:center;margin-top:.75rem;">
            <button class="btn-bot-secondary" onclick="window.downloadPosterFromBot()">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Poster
            </button>
          </div>
          <div style="margin-top:1.25rem;">
            <h3 style="font-size:1.3rem;font-weight:700;margin-bottom:.4rem;">${escapeHtml(title)}</h3>
            <div class="bot-result-meta">
              <span class="meta-tag type-${type==='movie'?'movie':'series'}">${typeLabel}</span>
              <span class="meta-tag">${releaseDate}</span>
              ${rating!=='N/A'?`<span class="meta-tag imdb">${rating}</span>`:''}
              ${seasons!=='N/A'?`<span class="meta-tag">${seasons} Season${seasons==1?'':'s'}</span>`:''}
              ${episodes!=='N/A'?`<span class="meta-tag">${episodes} Ep</span>`:''}
              <span class="meta-tag">${totalRuntime!=='N/A'?totalRuntime:runtime}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem;">
              <span class="meta-tag" style="font-size:.75rem;">Genre: ${escapeHtml(genre)}</span>
              <span class="meta-tag" style="font-size:.75rem;">Lang: ${escapeHtml(language)}</span>
            </div>
            ${actors!=='N/A'?`<p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:.5rem;"><strong>Top Actors:</strong> ${escapeHtml(actors)}</p>`:''}
            <p class="bot-result-plot">${escapeHtml(plot)}</p>
            <div class="bot-actions-row">
              <button class="btn-bot-action" onclick="window.addBotToWatchlist()">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add to Watchlist
              </button>
              ${imdbLink?`<button class="btn-bot-secondary" onclick="window.copyIMDbLinkBot('${imdbLink}')">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy IMDb Link
              </button>`:''}
            </div>
          </div>
        `;
        window._botPosterIndex=0;
      }catch(err){
        console.error(err);
        els.botResultContent.innerHTML='<p style="padding:1rem;color:var(--text-secondary);">Something went wrong. Try again.</p>';
      }finally{
        els.searchBtn.disabled=false;
      }
    }

    window.changePoster=function(dir){
      const pics=window._botPosters;
      if(!pics.length)return;
      window._botPosterIndex=(window._botPosterIndex+dir+pics.length)%pics.length;
      const img=document.getElementById('botPosterImg');
      if(img) img.src=pics[window._botPosterIndex];
    };
    window.downloadPosterFromBot=function(){
      const pics=window._botPosters;
      if(!pics.length)return;
      fetch(pics[window._botPosterIndex]).then(r=>r.blob()).then(blob=>{
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a'); a.href=url; a.download='poster.jpg'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }).catch(()=>showToast('Could not download','error'));
    };
    window.copyIMDbLinkBot=function(link){
      if(!link)return;
      navigator.clipboard.writeText(link).then(()=>showToast('IMDb link copied','success')).catch(()=>showToast('Failed to copy','error'));
    };
    window.addBotToWatchlist=function(){
      const d=window._currentBotData;
      if(!d)return;
      const poster=window._botPosters[window._botPosterIndex]||'';
      openEntryModal('add',{
        title:d.title, type:d.type, year:d.releaseDate==='N/A'?'':d.releaseDate,
        seasons:d.seasons==='N/A'?'':d.seasons, episodes:d.episodes==='N/A'?'':d.episodes,
        runtime:d.runtime==='N/A'?'':d.runtime, totalWatchTime:d.totalRuntime==='N/A'?'':d.totalRuntime,
        genre:d.genre==='N/A'?'':d.genre, plot:d.plot==='N/A'?'':d.plot, imdbLink:d.imdbLink, poster
      });
    };

    // ============================================================
    // RENDERING
    // ============================================================
    async function loadCategories(){
      const cats=await getAll('categories');
      if(!cats.length){
        await addItem('categories',{name:'watchlist',createdAt:Date.now()});
        state.categories=['watchlist'];
      }else{
        state.categories=cats.map(c=>c.name).sort((a,b)=>a.localeCompare(b));
      }
    }
    function renderCategories(){
      els.categoryList.innerHTML='';
      state.categories.forEach(cat=>{
        const div=document.createElement('div');
        div.className='category-tab'+(cat===state.currentCategory?' active':'');
        div.innerHTML=`<div class="cat-info"><svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>${escapeHtml(capitalize(cat))}</span></div>`;
        const countSpan=document.createElement('span'); countSpan.className='cat-count'; countSpan.textContent='0'; div.appendChild(countSpan);
        div.addEventListener('click',()=>{ state.currentCategory=cat; renderCategories(); renderWatchlist(); });
        div.addEventListener('contextmenu',(e)=>{ e.preventDefault(); showCategoryContextMenu(e,cat); });
        els.categoryList.appendChild(div);
      });
    }
    async function updateHero(entries){
      const all = entries || await getAll('entries');
      const cat = all.filter(e => e.category === state.currentCategory);
      const pick = cat.find(e => !e.isCompleted && e.poster) || cat.find(e => !e.isCompleted) || cat.find(e => e.poster) || all.find(e => e.poster) || cat[0] || all[0];
      const heroTitle = document.getElementById('heroTitle');
      const heroMeta = document.getElementById('heroMeta');
      const heroBg = document.getElementById('heroBg');
      const heroProgressPill = document.getElementById('heroProgressPill');
      const heroStatusText = document.getElementById('heroStatusText');
      const heroWatchBtn = document.getElementById('heroWatchBtn');
      const tileA = document.getElementById('heroTileA');
      const tileB = document.getElementById('heroTileB');
      if(!heroTitle || !heroMeta || !heroBg) return;
      state.heroEntryId = pick?.id || null;
      if(pick){
        const pct = pick.isCompleted ? 100 : (pick.progressPercent || 0);
        heroTitle.textContent = pick.title || 'Your watchlist';
        heroMeta.textContent = [pick.genre, pick.seasons ? `${pick.seasons} seasons` : '', pick.episodes ? `${pick.episodes} episodes` : '', pick.totalWatchTime || ''].filter(Boolean).join('  •  ') || (pick.plot || 'Ready when you are.');
        heroProgressPill.textContent = pick.isCompleted ? 'Completed' : (pct ? `${pct}% watched` : (pick.year || 'In queue'));
        if(heroStatusText) heroStatusText.textContent = pick.isCompleted ? 'Finished title' : 'Continue tracking this title';
        if(heroWatchBtn) heroWatchBtn.textContent = 'Edit progress';
        heroBg.style.backgroundImage = pick.poster ? `url("${pick.poster}")` : 'linear-gradient(120deg,#1f2937,#64748b)';
      } else {
        heroTitle.textContent = 'Start your watchlist';
        heroMeta.textContent = 'Search a title above or add your first entry manually.';
        heroProgressPill.textContent = 'Ready';
        if(heroStatusText) heroStatusText.textContent = 'No active title yet';
        if(heroWatchBtn) heroWatchBtn.textContent = 'Add first entry';
        heroBg.style.backgroundImage = 'linear-gradient(120deg,#263142,#64748b)';
      }
      const posters = all.filter(e=>e.poster).slice(0,2).map(e=>e.poster);
      if(tileA) tileA.innerHTML = posters[0] ? `<img src="${posters[0]}" alt="">` : '';
      if(tileB) tileB.innerHTML = posters[1] ? `<img src="${posters[1]}" alt="">` : '';
    }

    function showCategoryContextMenu(e,cat){
      const existing=document.querySelector('.context-menu'); if(existing)existing.remove();
      const menu=document.createElement('div'); menu.className='context-menu';
      menu.style.left=e.pageX+'px'; menu.style.top=e.pageY+'px';
      menu.innerHTML=`<div class="context-item" id="ctxRename"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Rename</div><div class="context-item danger" id="ctxDelete"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Delete</div>`;
      document.body.appendChild(menu);
      const close=()=>{menu.remove();document.removeEventListener('click',close);};
      setTimeout(()=>document.addEventListener('click',close),0);
      menu.querySelector('#ctxRename').addEventListener('click',()=>{ menu.remove(); state.renamingCategory=cat; els.categoryNameInput.value=cat; els.categoryModal.querySelector('.modal-title').textContent='Rename Category'; openModal(els.categoryModal); els.categoryNameInput.select(); });
      menu.querySelector('#ctxDelete').addEventListener('click',()=>{ menu.remove(); showDeleteModal('category',cat); });
    }
    async function renameCategory(oldName,newName){
      if(state.categories.includes(newName)){ showToast('Category already exists','error'); return; }
      await deleteItem('categories',oldName); await addItem('categories',{name:newName,createdAt:Date.now()});
      const entries=await getAll('entries');
      for(const entry of entries){ if(entry.category===oldName){ entry.category=newName; await putItem('entries',entry); } }
      if(state.currentCategory===oldName) state.currentCategory=newName;
      await initApp(); showToast('Category renamed','success');
    }

    async function renderWatchlist(){
      const entries=await getAll('entries');
      const catEntries=entries
        .filter(e=>e.category===state.currentCategory)
        .sort((a,b)=>{
          const oa = a.order !== undefined ? a.order : a.id;
          const ob = b.order !== undefined ? b.order : b.id;
          return oa - ob;
        });
      els.currentCategoryName.textContent=capitalize(state.currentCategory);
      const counts=els.categoryList.querySelectorAll('.cat-count');
      state.categories.forEach((cat,i)=>{
        const c=entries.filter(e=>e.category===cat).length;
        if(counts[i]) counts[i].textContent=c;
      });
      await updateHero(entries);
      if(!catEntries.length){
        els.cardsGrid.innerHTML=''; els.emptyState.classList.add('is-visible');
        updateStats(entries); return;
      }
      els.emptyState.classList.remove('is-visible');
      els.cardsGrid.innerHTML='';
      catEntries.forEach((entry,idx)=>{
        const card=document.createElement('div'); card.className='watch-card'; card.style.animationDelay=(idx*0.05)+'s';
        const pct=entry.isCompleted?100:(entry.progressPercent||0);
        const typeLabel=entry.type==='movie'?'Movie':(entry.type==='anime'?'Anime':(entry.type==='franchise'?'Franchise':'TV Series'));
        card.innerHTML=`
          <div class="card-poster-wrap">
            ${entry.poster?`<img src="${entry.poster}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="card-poster-fallback" style="display:none;">${entry.title.charAt(0).toUpperCase()}</div>`:`<div class="card-poster-fallback">${entry.title.charAt(0).toUpperCase()}</div>`}
            ${entry.isCompleted?`<div class="completed-badge"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Done</div>`:''}
          </div>
          <div class="card-body">
            <div class="card-title">${escapeHtml(entry.title)}</div>
            <div class="card-tags">
              <span class="card-tag">${typeLabel}</span>
              ${entry.year?`<span class="card-tag">${entry.year}</span>`:''}
              ${entry.seasons?`<span class="card-tag">${entry.seasons} S</span>`:''}
              ${entry.episodes?`<span class="card-tag">${entry.episodes} Ep</span>`:''}
              ${entry.totalWatchTime?`<span class="card-tag">${entry.totalWatchTime}</span>`:''}
            </div>
            ${(pct>0||entry.progress)?`
              <div class="card-progress-area">
                <div class="progress-label-row"><span>${entry.progress||'In progress'}</span>${pct>0?`<span>${pct}%</span>`:''}</div>
                <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
              </div>`:''}
            ${entry.notes?`<div class="card-note">"${escapeHtml(entry.notes)}"</div>`:''}
            <div class="card-footer">
              ${entry.imdbLink?`<a href="${entry.imdbLink}" target="_blank" class="imdb-link"><svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>IMDb</a>`:'<div></div>'}
              <div class="card-actions">
                <button class="icon-btn" data-action="edit" data-id="${entry.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="icon-btn danger" data-action="delete" data-id="${entry.id}" title="Delete"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div>
            </div>
          </div>`;
        els.cardsGrid.appendChild(card);
      });
      document.querySelectorAll('.watch-card').forEach(c=>{
        c.addEventListener('mousemove',e=>{ const r=c.getBoundingClientRect(); c.style.setProperty('--mouse-x',(e.clientX-r.left)+'px'); c.style.setProperty('--mouse-y',(e.clientY-r.top)+'px'); });
      });
      document.querySelectorAll('.icon-btn[data-action="edit"]').forEach(b=>b.addEventListener('click',async()=>{ const entry=await getEntry(b.dataset.id); if(entry) openEntryModal('edit',entry); }));
      document.querySelectorAll('.icon-btn[data-action="delete"]').forEach(b=>b.addEventListener('click',()=>showDeleteModal('entry',b.dataset.id)));
      updateStats(entries);
    }
    function updateStats(entries){
      const all=entries||[];
      const total=all.length;
      const completed=all.filter(e=>e.isCompleted).length;
      let totalHours=0;
      all.forEach(e=>{
        const m=e.totalWatchTime?.match(/([\d.]+)\s*hour/i);
        if(m) totalHours+=parseFloat(m[1]); else { const m2=e.totalWatchTime?.match(/([\d.]+)\s*min/i); if(m2) totalHours+=parseFloat(m2[1])/60; }
      });
      const hoursDisplay=totalHours>=1?`${Math.round(totalHours)}h`:`${Math.round(totalHours*60)}min`;
      els.statTotal.textContent=total; els.statCompleted.textContent=completed; els.statWatchTime.textContent=hoursDisplay;
      els.barTotal.style.width=total>0?'100%':'0%';
      els.barCompleted.style.width=total>0?`${Math.round((completed/Math.max(1,total))*100)}%`:'0%';
      els.barWatchTime.style.width=`${Math.min(100,totalHours/Math.max(10,totalHours)*100)}%`;
    }

    // ============================================================
    // MODALS
    // ============================================================
    function openModal(m){ if(!m){ console.warn('openModal called with null'); return; } m.classList.add('open'); document.body.style.overflow='hidden'; }
    function closeModal(m){ if(!m) return; m.classList.remove('open'); document.body.style.overflow=''; }
    function openEntryModal(mode,data){
      state.editingId=null; els.entryForm.reset(); document.getElementById('entryType').value='series'; document.getElementById('entryCategoryInput').value=state.currentCategory;
      els.entryForm.dataset.tempPoster='';
      if(mode==='edit'&&data){
        state.editingId=data.id; els.entryModalTitle.textContent='Edit Entry';
        els.entryTitle.value=data.title||''; document.getElementById('entryType').value=data.type||'series'; document.getElementById('entryCategoryInput').value=data.category||state.currentCategory;
        els.entryYear.value=data.year||''; els.entrySeasons.value=data.seasons||''; els.entryEpisodes.value=data.episodes||'';
        els.entryRuntime.value=data.runtime||''; els.entryWatchTime.value=data.totalWatchTime||''; els.entryGenre.value=data.genre||'';
        els.entryPlot.value=data.plot||''; els.entryImdb.value=data.imdbLink||''; els.entryProgress.value=data.progress||'';
        els.entryNotes.value=data.notes||''; els.entryCompleted.checked=!!data.isCompleted;
        els.entryForm.dataset.tempPoster=data.poster||'';
        els.refreshEntryBtn.style.display='inline-flex';
      }else if(mode==='add'&&data){
        els.entryModalTitle.textContent='Add to Watchlist';
        els.entryTitle.value=data.title||''; document.getElementById('entryType').value=data.type||'series';
        els.entryYear.value=data.year||''; els.entrySeasons.value=data.seasons||''; els.entryEpisodes.value=data.episodes||'';
        els.entryRuntime.value=data.runtime||''; els.entryWatchTime.value=data.totalWatchTime||'';
        els.entryGenre.value=data.genre||''; els.entryPlot.value=data.plot||''; els.entryImdb.value=data.imdbLink||'';
        els.entryForm.dataset.tempPoster=data.poster||'';
        els.refreshEntryBtn.style.display='none';
      }else{
        els.entryModalTitle.textContent='Add Entry'; els.entryForm.dataset.tempPoster='';
        els.refreshEntryBtn.style.display='none';
      }
      const typeOpts=[{value:'series',label:'TV Series'},{value:'movie',label:'Movie'},{value:'anime',label:'Anime'},{value:'franchise',label:'Franchise / Collection'}];
      buildCustomSelect('entryTypeSelect',typeOpts,document.getElementById('entryType').value||'series',(val)=>document.getElementById('entryType').value=val);
      updateCategorySelect();
      openModal(els.entryModal);
    }
    async function saveEntry(e){
      e.preventDefault();
      const data={
        title:els.entryTitle.value.trim(), type:document.getElementById('entryType').value||'series',
        category:document.getElementById('entryCategoryInput').value||state.currentCategory,
        year:els.entryYear.value.trim(), seasons:els.entrySeasons.value.trim(), episodes:els.entryEpisodes.value.trim(),
        runtime:els.entryRuntime.value.trim(), totalWatchTime:els.entryWatchTime.value.trim(), genre:els.entryGenre.value.trim(),
        plot:els.entryPlot.value.trim(), imdbLink:els.entryImdb.value.trim(), progress:els.entryProgress.value.trim(),
        notes:els.entryNotes.value.trim(), isCompleted:els.entryCompleted.checked,
        progressPercent:els.entryCompleted.checked?100:parseProgressText(els.entryProgress.value,els.entrySeasons.value,els.entryEpisodes.value)
      };
      const tempPoster=els.entryForm.dataset.tempPoster;
      if(tempPoster) data.poster=tempPoster;
      if(!data.title){ showToast('Title is required','error'); return; }
      if(state.editingId){
        data.id=Number(state.editingId);
        const existing = await getEntry(state.editingId);
        if (!data.poster && existing?.poster) data.poster = existing.poster;
        await putItem('entries',data); showToast('Entry updated','success');
      }else{
        data.createdAt=Date.now();
        data.order = Date.now();
        await addItem('entries',data); showToast('Entry added to watchlist','success');
      }
      closeModal(els.entryModal); els.entryForm.dataset.tempPoster='';
      await renderWatchlist();
    }
    function showDeleteModal(type,id){
      state.deleteTarget={type,id};
      if(type==='entry'){
        els.deleteModalTitle.textContent='Delete Entry';
        getEntry(id).then(entry=>{ els.deleteMessage.textContent=`Remove "${entry?.title||'this entry'}" from your watchlist? This cannot be undone.`; openModal(els.deleteModal); });
      }else{
        els.deleteModalTitle.textContent='Delete Category';
        els.deleteMessage.textContent=`Delete "${capitalize(id)}" and all its entries? This cannot be undone.`; openModal(els.deleteModal);
      }
    }
    async function confirmDelete(){
      if(!state.deleteTarget)return;
      const {type,id}=state.deleteTarget;
      if(type==='entry'){
        await deleteItem('entries',Number(id)); showToast('Entry deleted','success');
      }else{
        await deleteItem('categories',id); const entries=await getAll('entries');
        for(const entry of entries){ if(entry.category===id) await deleteItem('entries',entry.id); }
        if(state.currentCategory===id) state.currentCategory=state.categories.find(c=>c!==id)||'watchlist';
        showToast('Category deleted','success');
      }
      state.deleteTarget=null; closeModal(els.deleteModal); await initApp();
    }

    els.refreshEntryBtn.addEventListener('click', async () => {
      const title = els.entryTitle.value.trim();
      if (!title) { showToast('Enter a title first', 'error'); return; }
      els.refreshEntryBtn.disabled = true;
      const originalHtml = els.refreshEntryBtn.innerHTML;
      els.refreshEntryBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:1.5px;display:inline-block;margin-right:6px;vertical-align:middle;"></div>Fetching...';
      try {
        const result = await smartMovieSearch(title);
        if (!result || result.matchScore < 0 || (!result.omdb && !result.tmdb)) {
          showToast('No match found for "' + title + '"', 'error'); return;
        }
        const { omdb, tmdb } = result;
        const finalTitle = tmdb?.name || tmdb?.title || omdb?.Title || title;
        if (finalTitle && finalTitle !== els.entryTitle.value) els.entryTitle.value = finalTitle;
        const year = (tmdb?.first_air_date || tmdb?.release_date || '').split('-')[0] || (omdb?.Year) || '';
        if (year) els.entryYear.value = year;
        if (tmdb?.number_of_seasons) els.entrySeasons.value = tmdb.number_of_seasons;
        else if (omdb?.totalSeasons) els.entrySeasons.value = omdb.totalSeasons;
        if (tmdb?.number_of_episodes) els.entryEpisodes.value = tmdb.number_of_episodes;
        let runtime = '';
        if (tmdb?.episode_run_time?.[0]) runtime = `${tmdb.episode_run_time[0]} min`;
        else if (tmdb?.runtime) runtime = `${tmdb.runtime} min`;
        else if (omdb?.Runtime && omdb.Runtime !== 'N/A') runtime = omdb.Runtime;
        if (runtime) els.entryRuntime.value = runtime;
        let genre = '';
        if (tmdb?.genres) genre = tmdb.genres.map(g => g.name).join(', ');
        else if (omdb?.Genre) genre = omdb.Genre;
        if (genre) els.entryGenre.value = genre;
        let plot = '';
        if (tmdb?.overview) plot = tmdb.overview;
        else if (omdb?.Plot && omdb.Plot !== 'N/A') plot = omdb.Plot;
        if (plot) els.entryPlot.value = plot;
        let type = document.getElementById('entryType').value;
        const inferredType = tmdb?.first_air_date ? 'series' : (tmdb?.release_date ? 'movie' : (omdb?.Type === 'movie' ? 'movie' : 'series'));
        if (result.matchScore >= 0 && inferredType) type = inferredType;
        document.getElementById('entryType').value = type;
        const typeOpts=[{value:'series',label:'TV Series'},{value:'movie',label:'Movie'},{value:'anime',label:'Anime'},{value:'franchise',label:'Franchise / Collection'}];
        buildCustomSelect('entryTypeSelect',typeOpts, type, (val) => document.getElementById('entryType').value = val);
        if (omdb?.imdbID) els.entryImdb.value = `https://www.imdb.com/title/${omdb.imdbID}/`;
        let poster = '';
        if (tmdb?.poster_path) poster = `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`;
        else if (omdb?.Poster && omdb.Poster !== 'N/A') poster = omdb.Poster;
        if (poster) els.entryForm.dataset.tempPoster = poster;
        showToast('Metadata refreshed. Save to apply.', 'success');
      } catch (err) { console.error(err); showToast('Failed to refresh metadata', 'error'); }
      finally { els.refreshEntryBtn.disabled = false; els.refreshEntryBtn.innerHTML = originalHtml; }
    });

    // ============================================================
    // IMPORT / EXPORT
    // ============================================================
    async function exportData(){
      const entries=await getAll('entries'); const categories=(await getAll('categories')).map(c=>c.name);
      const payload={ version:1, exportedAt:new Date().toISOString(), categories, entries };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`cosmic-watchlist-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url); showToast('Data exported','success');
    }
    async function importData(file){
      try{
        const text = await file.text(); let data;
        try { data = JSON.parse(text); } catch { showToast('Invalid JSON file','error'); return; }
        let entriesToImport = [];
        let categoriesToImport = [];
        if(data.entries && Array.isArray(data.entries)){
          entriesToImport = data.entries;
          categoriesToImport = data.categories || [...new Set(entriesToImport.map(e=>e.category).filter(Boolean))];
        } else if (Array.isArray(data)){
          entriesToImport = data;
          categoriesToImport = [...new Set(data.map(e=>e.category).filter(Boolean))];
        } else {
          const keys = Object.keys(data).filter(k => Array.isArray(data[k]));
          categoriesToImport = keys;
          keys.forEach(cat => { data[cat].forEach(item => { entriesToImport.push({ ...item, category: cat }); }); });
        }
        if(!entriesToImport.length){ showToast('No entries found in file','error'); return; }
        if(!confirm(`Found ${entriesToImport.length} entries across ${categoriesToImport.length} categories.\n\nPosters & metadata will be fetched from TMDB (primary) and OMDb (fallback). This may take a moment.\n\nProceed?`)) return;
        showToast('Fetching via TMDB & OMDb...','info');
        const current = await getAll('entries');
        let nextOrder = 0;
        current.forEach(e => { const o = e.order !== undefined ? e.order : e.id; if (o > nextOrder) nextOrder = o; });
        let added = 0;
        for(let i=0;i<entriesToImport.length;i++){
          const raw = entriesToImport[i];
          let enriched;
          try { enriched = await enrichEntry({...raw}); } catch(e){ enriched = {...raw}; }
          delete enriched.id;
          enriched.category = enriched.category || 'watchlist';
          enriched.isCompleted = !!enriched.isCompleted;
          if(enriched.order === undefined) enriched.order = ++nextOrder;
          try { await addItem('entries', enriched); added++; }
          catch(e){ console.warn('Import add failed', e); }
          if(entriesToImport.length > 8 && i % 3 === 0) showToast(`Imported ${i+1}/${entriesToImport.length}`,'info');
        }
        for(const cat of categoriesToImport){
          if(!state.categories.includes(cat)){ try { await addItem('categories',{name:cat,createdAt:Date.now()}); }catch(e){} }
        }
        await initApp();
        showToast(`Import complete! Added ${added} entries.`,'success');
      }catch(err){ showToast('Import failed: '+err.message,'error'); console.error(err); }
    }

    // ============================================================
    // REFRESH MISSING POSTERS
    // ============================================================
    async function refreshMissingPosters() {
      const entries = await getAll('entries');
      const missing = entries.filter(e => !e.poster);
      if (!missing.length) { showToast('All entries already have posters', 'success'); return; }
      if (!confirm(`Found ${missing.length} entries without posters.\nFetch from TMDB (primary) → OMDb (fallback)?`)) return;
      let fixed = 0;
      for (let i = 0; i < missing.length; i++) {
        const entry = missing[i];
        let enriched;
        try { enriched = await enrichEntry({ ...entry }); } catch(e){ continue; }
        let changed = false;
        if (enriched.poster && !entry.poster) { entry.poster = enriched.poster; changed = true; }
        if (!entry.year && enriched.year) { entry.year = enriched.year; changed = true; }
        if (!entry.runtime && enriched.runtime) { entry.runtime = enriched.runtime; changed = true; }
        if (!entry.genre && enriched.genre) { entry.genre = enriched.genre; changed = true; }
        if (!entry.plot && enriched.plot) { entry.plot = enriched.plot; changed = true; }
        if (!entry.totalWatchTime && enriched.totalWatchTime) { entry.totalWatchTime = enriched.totalWatchTime; changed = true; }
        if (!entry.imdbLink && enriched.imdbLink) { entry.imdbLink = enriched.imdbLink; changed = true; }
        if (changed) { try { await putItem('entries', entry); fixed++; }catch(e){} }
        if (missing.length > 8 && i % 3 === 0) showToast(`Scanning... ${i+1}/${missing.length}`,'info');
      }
      await initApp();
      showToast(`Scanned ${missing.length} entries • ${fixed} posters found`, 'success');
    }

    // ============================================================
    // TOASTS
    // ============================================================
    function showToast(message, type='info'){
      const toast=document.createElement('div'); toast.className='toast';
      const color=type==='success'?'var(--success)':(type==='error'?'var(--danger)':(type==='warning'?'var(--warning)':'var(--cyan-glow)'));
      const iconSvg=type==='success'?'<polyline points="20 6 9 17 4 12"/>':(type==='error'?'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>':'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>');
      toast.innerHTML=`<div class="toast-icon"><svg viewBox="0 0 24 24" stroke="${color}">${iconSvg}</svg></div><div class="toast-content"><div class="toast-title" style="color:${color}">${capitalize(type)}</div><div class="toast-msg">${escapeHtml(message)}</div></div><button class="toast-close"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
      els.toastContainer.appendChild(toast);
      const remove=()=>{toast.classList.add('out'); setTimeout(()=>toast.remove(),300);};
      toast.querySelector('.toast-close').addEventListener('click',remove);
      setTimeout(remove,3500);
    }

    // ============================================================
    // SETTINGS
    // ============================================================
    function loadSettings(){
      try { return JSON.parse(localStorage.getItem('cosmicSettings')||'{}'); } catch { return {}; }
    }
    function saveSettings(s){ localStorage.setItem('cosmicSettings', JSON.stringify(s)); }

    const DEFAULT_SYSTEM_PROMPT = `You are Cosmic AI, the watchlist manager assistant.

TODAY: {{TODAY}}

Current Categories: {{CATEGORIES}}
Current Entries:
{{ENTRIES}}

Rules:
1. Be concise, friendly, and helpful.
2. To add items, you ONLY need to provide "title", "category", "type", "notes", and "isCompleted" if specified. The app will auto-fetch real poster, year, runtime, genre, and plot from TMDB/OMDb using your title. Do NOT hallucinate metadata.
3. If user asks for a franchise or collection (e.g. "Harry Potter films", "Arrowverse", "MCU"), add it as ONE single entry with type "franchise". Include film/show count and rough total runtime in the "plot" or "notes". Do NOT create separate entries for each film unless explicitly asked.
4. When a user wants to correct a title so it matches TMDB, use update_entry with "title" (current bad name) and "new_title" (canonical name). The app will automatically fetch the poster and metadata from TMDB.
5. {{SEARCH_INSTRUCTION}}
6. Available actions:
   - update_entry: rename + re-fetch metadata. Use {"action":"update_entry","title":"OLD","new_title":"NEW","refresh_metadata":true}
   - add_entries: add one or more items
   - delete_entry: remove matching item(s)
   - create_category: add a new category
7. Do NOT ask for confirmation. When the user asks you to change something, output the <Action> immediately. The app will execute it automatically and show a small loading spinner.`;

    function populateSettings(){
      const s=loadSettings();
      els.settingApiUrl.value = s.apiUrl || '';
      els.settingApiKey.value = s.apiKey || '';
      els.settingModelId.value = s.modelId || '';
      els.settingSystemPrompt.value = s.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      const enabled = !!s.enableSearch;
      els.searchToggle.classList.toggle('active', enabled);
    }

    function openSettings(){ populateSettings(); openModal(els.settingsModal); }
    function closeSettings(){ closeModal(els.settingsModal); }
    function toggleAdvanced(){
      const open = els.advancedBody.classList.contains('open');
      if(open){ els.advancedBody.classList.remove('open'); els.advancedHeader.classList.remove('open'); }
      else { els.advancedBody.classList.add('open'); els.advancedHeader.classList.add('open'); }
    }
    function toggleSearchSwitch(){
      els.searchToggle.classList.toggle('active');
    }

    els.settingsForm.addEventListener('submit',(e)=>{
      e.preventDefault();
      const s = {
        apiUrl: els.settingApiUrl.value.trim(),
        apiKey: els.settingApiKey.value.trim(),
        modelId: els.settingModelId.value.trim(),
        systemPrompt: els.settingSystemPrompt.value.trim(),
        enableSearch: els.searchToggle.classList.contains('active')
      };
      saveSettings(s);
      closeSettings();
      syncAIVisibility();
      showToast('Settings saved','success');
    });

    // ============================================================
    // CHAT SESSIONS
    // ============================================================
    function getSessions() {
      try { return JSON.parse(localStorage.getItem('cosmicChatSessions') || '[]'); }
      catch { return []; }
    }
    function saveSessions(arr) { localStorage.setItem('cosmicChatSessions', JSON.stringify(arr)); }
    function getActiveSessionId() { return localStorage.getItem('cosmicActiveSessionId') || null; }
    function setActiveSessionId(id) { localStorage.setItem('cosmicActiveSessionId', id); }

    function createSession() {
      const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const session = { id, title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      const sessions = getSessions();
      sessions.unshift(session);
      saveSessions(sessions);
      setActiveSessionId(id);
      return session;
    }
    function getActiveSession() {
      const id = getActiveSessionId();
      if (!id) return null;
      return getSessions().find(s => s.id === id) || null;
    }
    function updateSessionMessages(id, messages) {
      const sessions = getSessions();
      const s = sessions.find(x => x.id === id);
      if (!s) return;
      s.messages = messages;
      s.updatedAt = Date.now();
      const firstUser = messages.find(m => m.role === 'user');
      if (firstUser) s.title = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '…' : '');
      saveSessions(sessions);
    }
    function deleteSession(id) {
      let sessions = getSessions().filter(s => s.id !== id);
      saveSessions(sessions);
      const active = getActiveSessionId();
      if (active === id) {
        if (sessions.length) setActiveSessionId(sessions[0].id);
        else { setActiveSessionId(''); createSession(); }
      }
      renderSessionList();
      renderChatSession();
    }

    // ============================================================
    // CHAT UI
    // ============================================================
    function renderSessionList() {
      const sessions = getSessions();
      els.sessionMenu.innerHTML = '';
      sessions.forEach(sess => {
        const div = document.createElement('div');
        div.className = 'session-item' + (sess.id === getActiveSessionId() ? ' active' : '');
        div.innerHTML = `<span>${escapeHtml(sess.title || 'Untitled')}</span><span class="del" title="Delete"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>`;
        div.addEventListener('click', (e) => {
          if (e.target.closest('.del')) { e.stopPropagation(); deleteSession(sess.id); return; }
          setActiveSessionId(sess.id);
          renderSessionList();
          renderChatSession();
        });
        els.sessionMenu.appendChild(div);
      });
      const newBtn = document.createElement('button');
      newBtn.className = 'new-session-btn';
      newBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Chat`;
      newBtn.addEventListener('click', () => { createSession(); renderSessionList(); clearChatBody(); });
      els.sessionMenu.appendChild(newBtn);
      const active = getActiveSession();
      els.sessionLabel.textContent = active ? (active.title || 'Session') : 'Session';
    }

    function clearChatBody(){
      els.chatBody.innerHTML = '';
      const welcome = getActiveSession()?.messages?.length === 0;
      if(welcome){
        els.chatBody.innerHTML=`<div class="chat-message assistant" style="align-self:flex-start;">
          <div class="chat-avatar"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/></svg></div>
          <div><div class="chat-bubble">Hello! I'm Cosmic AI. I can help you build your watchlist, research movies and shows, and even add entire collections for you. What would you like to watch?</div><div class="chat-meta">Cosmic AI</div></div>
        </div>`;
      }
    }

    function renderChatSession() {
      const session = getActiveSession();
      if (!session) { clearChatBody(); return; }
      els.chatBody.innerHTML = '';
      session.messages.forEach(msg => appendMessageBubble(msg.role, msg.content));
    }

    function appendMessageBubble(role, text){
      const wrap=document.createElement('div'); wrap.className='chat-message '+role;
      const bubble=document.createElement('div'); bubble.className='chat-bubble'; bubble.textContent=text;
      const metaDiv = document.createElement('div'); metaDiv.className='chat-meta';
      metaDiv.textContent = role==='assistant' ? 'Cosmic AI' : 'You';
      const inner=document.createElement('div');
      inner.appendChild(bubble); inner.appendChild(metaDiv);
      if(role==='assistant'){
        const avatar=document.createElement('div'); avatar.className='chat-avatar';
        avatar.innerHTML=`<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/></svg>`;
        wrap.appendChild(avatar); wrap.appendChild(inner);
      } else {
        wrap.appendChild(inner);
      }
      els.chatBody.appendChild(wrap);
      els.chatBody.scrollTop = els.chatBody.scrollHeight;
      return { wrap, bubble, metaDiv, inner };
    }

    function showChatError(text){
      els.chatErrorText.textContent = text;
      els.chatErrorBanner.classList.add('visible');
      setTimeout(()=>els.chatErrorBanner.classList.remove('visible'), 6000);
    }
    function hideChatError(){ els.chatErrorBanner.classList.remove('visible'); }

    function filterActionTags(text) {
      return text.replace(/<Action>[\s\S]*?<\/Action>/gi, '')
                 .replace(/<Action>[\s\S]*$/gi, '');
    }

    function extractAllActions(text) {
      const actions = [];
      const regex = /<Action>([\s\S]*?)<\/Action>/gi;
      let m;
      while ((m = regex.exec(text)) !== null) {
        try { actions.push(JSON.parse(m[1].trim())); } catch(e){}
      }
      return actions;
    }

    async function executeAIAction(action) {
      if (!action || !action.action) return 'Unknown action';
      if (action.action === 'add_entries' && Array.isArray(action.entries)) {
        let nextOrder = 0;
        const all = await getAll('entries');
        all.forEach(e => { const o = e.order !== undefined ? e.order : e.id; if (o > nextOrder) nextOrder = o; });
        let added = 0;
        for (const ent of action.entries) {
          const clean = {
            title: ent.title || 'Untitled', type: ent.type || 'series', category: ent.category || 'watchlist',
            year: String(ent.year || ''), seasons: String(ent.seasons || ''), episodes: String(ent.episodes || ''),
            runtime: String(ent.runtime || ''), totalWatchTime: String(ent.totalWatchTime || ''),
            genre: String(ent.genre || ''), plot: String(ent.plot || ''), imdbLink: String(ent.imdbLink || ''),
            progress: String(ent.progress || ''), notes: String(ent.notes || ''),
            isCompleted: !!ent.isCompleted, progressPercent: ent.isCompleted ? 100 : 0,
            order: ++nextOrder, createdAt: Date.now()
          };
          if (ent.poster) clean.poster = String(ent.poster);
          let enriched;
          try { enriched = await enrichEntry({ ...clean }); } catch(e){ enriched = clean; }
          await addItem('entries', enriched);
          added++;
        }
        await initApp();
        return `Added ${added} item(s)`;
      }
      if (action.action === 'delete_entry' && action.title) {
        const entries = await getAll('entries');
        const q = action.title.toLowerCase().trim();
        let targets = entries.filter(e => e.title.toLowerCase().trim() === q);
        if (!targets.length) targets = entries.filter(e => e.title.toLowerCase().includes(q));
        for (const t of targets) { try { await deleteItem('entries', t.id); }catch(e){} }
        await initApp();
        return `Deleted ${targets.length} item(s)`;
      }
      if (action.action === 'update_entry' && action.title) {
        const entries = await getAll('entries');
        const q = action.title.toLowerCase().trim();
        let target = entries.find(e => e.title.toLowerCase().trim() === q);
        if (!target) target = entries.find(e => e.title.toLowerCase().includes(q));
        if (target) {
          if (action.new_title) target.title = action.new_title;
          if (action.updates) Object.assign(target, action.updates);
          target.isCompleted = !!target.isCompleted;
          if (action.new_title || action.refresh_metadata) {
            const enriched = await enrichEntry({ ...target });
            if (enriched.poster) target.poster = enriched.poster;
            if (enriched.year) target.year = enriched.year;
            if (enriched.runtime) target.runtime = enriched.runtime;
            if (enriched.genre) target.genre = enriched.genre;
            if (enriched.plot) target.plot = enriched.plot;
            if (enriched.totalWatchTime) target.totalWatchTime = enriched.totalWatchTime;
            if (enriched.type) target.type = enriched.type;
            if (enriched.imdbLink) target.imdbLink = enriched.imdbLink;
          }
          await putItem('entries', target);
          await initApp();
          return `Updated "${target.title}"`;
        }
        return 'Entry not found';
      }
      if (action.action === 'create_category' && action.category) {
        const name = String(action.category).toLowerCase().trim();
        if (name && !state.categories.includes(name)) {
          await addItem('categories', { name, createdAt: Date.now() });
          state.categories.push(name);
          state.categories.sort((a,b) => a.localeCompare(b));
          await initApp();
          return `Created category "${name}"`;
        }
        return 'Category already exists';
      }
      return 'Done';
    }

    let isSending = false;
    let abortController = null;

    async function sendChat(){
      const raw = els.chatInput.value.trim();
      if(!raw || isSending) return;
      const settings = loadSettings();
      if(!settings.apiUrl || !settings.apiKey || !settings.modelId){
        showToast('Configure AI in Settings first','error'); return;
      }

      let session = getActiveSession();
      if(!session){ session = createSession(); renderSessionList(); }

      session.messages.push({role:'user', content: raw});
      updateSessionMessages(session.id, session.messages);
      appendMessageBubble('user', raw);
      els.chatInput.value='';
      hideChatError();

      // Show thinking animation
      const thinkingDiv = document.createElement('div');
      thinkingDiv.className = 'chat-message assistant';
      thinkingDiv.style.alignSelf = 'flex-start';
      thinkingDiv.innerHTML = `<div class="chat-avatar"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/></svg></div>
        <div class="thinking-bubble"><span class="thinking-label">Thinking</span><div class="thinking-dots"><span></span><span></span><span></span></div></div>`;
      els.chatBody.appendChild(thinkingDiv);
      els.chatBody.scrollTop = els.chatBody.scrollHeight;

      const categories = state.categories.join(', ');
      const allEntries = await getAll('entries');
      const entriesSummary = allEntries.map(e => {
        const status = e.isCompleted ? 'Completed' : (e.progress || 'Not started');
        return `- ${e.title} (${e.type}, ${e.category}, ${status})`;
      }).join('\n');

      let sys = (settings.systemPrompt || DEFAULT_SYSTEM_PROMPT)
        .replace(/{{CATEGORIES}}/g, categories)
        .replace(/{{ENTRIES}}/g, entriesSummary || 'None')
        .replace(/{{TODAY}}/g, new Date().toISOString().split('T')[0]);

      const searchInstr = settings.enableSearch
        ? 'You have access to real-time web search. Use it to verify release dates, runtimes, episode counts, and filmographies before responding. Cite sources if possible.'
        : 'You do NOT have access to real-time web search. Rely on your training data only. Do not claim to browse the internet.';
      sys = sys.replace(/{{SEARCH_INSTRUCTION}}/g, searchInstr);

      const payloadMsgs = [{role:'system',content:sys}, ...session.messages.slice(-20)];

      isSending = true;
      els.chatSendBtn.disabled = true;
      abortController = new AbortController();

      const assistantEls = appendMessageBubble('assistant', '');
      const bubble = assistantEls.bubble;
      bubble.textContent = '';
      bubble.style.display = 'none';

      let fullContent = '';
      let gotFirstContent = false;

      try {
        const url = buildApiUrl(settings.apiUrl);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${settings.apiKey}` },
          body: JSON.stringify({ model: settings.modelId, messages: payloadMsgs, stream: true, temperature: 0.8, max_tokens: 4000 }),
          signal: abortController.signal
        });

        if(!res.ok){
          const txt = await res.text().catch(()=>'');
          throw new Error(`API ${res.status}: ${txt.slice(0,200)}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while(true){
          const { done, value } = await reader.read();
          if(done) break;
          buffer += decoder.decode(value, {stream: true});
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for(const line of lines){
            const trimmed = line.trim();
            if(!trimmed || trimmed === 'data: [DONE]') continue;
            let jsonStr = '';
            if(trimmed.startsWith('data: ')) jsonStr = trimmed.slice(6);
            else if(trimmed.startsWith('{')) jsonStr = trimmed;
            if(!jsonStr) continue;
            try {
              const json = JSON.parse(jsonStr);
              const delta = json.choices?.[0]?.delta?.content || '';
              if(delta){
                fullContent += delta;
                if(!gotFirstContent){
                  gotFirstContent = true;
                  thinkingDiv.remove();
                  bubble.style.display = '';
                }
                bubble.textContent = filterActionTags(fullContent);
                els.chatBody.scrollTop = els.chatBody.scrollHeight;
              }
            }catch(e){}
          }
        }

        if(!gotFirstContent) thinkingDiv.remove();
        bubble.style.display = '';

        const actions = extractAllActions(fullContent);
        if(actions.length > 0){
          const cleanText = fullContent.replace(/<Action>[\s\S]*?<\/Action>/gi, '').trim();
          bubble.textContent = cleanText || 'Done.';

          const cardsDiv = document.createElement('div');
          cardsDiv.className = 'action-cards';
          assistantEls.inner.insertBefore(cardsDiv, assistantEls.inner.querySelector('.chat-meta'));

          for(const action of actions){
            const label = getActionLabel(action);
            const card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = `<div class="ac-spinner spinner" style="width:16px;height:16px;border-width:2px"></div>
              <span class="ac-name">${escapeHtml(label)}</span>
              <span class="ac-result" style="color:#94a3b8;font-size:.72rem">Running...</span>`;
            cardsDiv.appendChild(card);
            els.chatBody.scrollTop = els.chatBody.scrollHeight;

            try {
              const result = await executeAIAction(action);
              card.classList.add('done');
              card.querySelector('.ac-spinner').replaceWith(Object.assign(document.createElement('div'),{className:'ac-icon',textContent:'✓'}));
              card.querySelector('.ac-result').textContent = result;
              card.querySelector('.ac-result').className = 'ac-result';
            } catch(err) {
              card.classList.add('error');
              card.querySelector('.ac-spinner').replaceWith(Object.assign(document.createElement('div'),{className:'ac-icon err',textContent:'✕'}));
              card.querySelector('.ac-result').textContent = 'Failed';
              card.querySelector('.ac-result').className = 'ac-result err';
            }
            els.chatBody.scrollTop = els.chatBody.scrollHeight;
          }

          const resultSummary = Array.from(cardsDiv.querySelectorAll('.ac-result')).map(r => r.textContent).join('; ');
          session.messages.push({role:'assistant', content: cleanText});
          session.messages.push({role:'system', content: `Action results: ${resultSummary}`});
        } else {
          session.messages.push({role:'assistant', content: fullContent});
        }
        updateSessionMessages(session.id, session.messages);

      }catch(err){
        console.error(err);
        thinkingDiv.remove();
        bubble.style.display = '';
        if(!fullContent) bubble.textContent = '...';
        showChatError(err.message || 'Network error. Check your API base URL and key.');
        showToast('Chat request failed','error');
      }finally{
        isSending = false;
        els.chatSendBtn.disabled = false;
        abortController = null;
      }
    }

    function getActionLabel(action){
      if(!action) return 'Unknown action';
      switch(action.action){
        case 'add_entries': {
          const count = Array.isArray(action.entries) ? action.entries.length : 0;
          const titles = Array.isArray(action.entries) ? action.entries.map(e => e.title).filter(Boolean) : [];
          if(titles.length === 1) return `Adding "${titles[0]}"`;
          if(titles.length > 1) return `Adding ${titles.length} entries`;
          return 'Adding entries';
        }
        case 'delete_entry': return `Deleting "${action.title || 'entry'}"`;
        case 'update_entry': return `Updating "${action.title || 'entry'}"`;
        case 'create_category': return `Creating category "${action.category || ''}"`;
        default: return action.action || 'Running action';
      }
    }

    // ============================================================
    // INIT
    // ============================================================
    async function initApp(){
      await loadCategories(); renderCategories(); await renderWatchlist(); syncAIVisibility();
    }

    (async function start(){
      await initDB(); await initApp();

      let searchTimer = null;
      function debouncedSearch(){ clearTimeout(searchTimer); searchTimer = setTimeout(()=>searchMovieBot(), 300); }
      els.searchBtn.addEventListener('click',debouncedSearch);
      els.searchInput.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); debouncedSearch(); } });
      els.closeBot.addEventListener('click',()=>els.botResults.classList.remove('visible'));

      els.addEntryBtn.addEventListener('click',()=>openEntryModal('add'));
      ['sidebarAddBtn','quickAddBtn','heroAddBtn'].forEach(id=>{ const b=document.getElementById(id); if(b) b.addEventListener('click',()=>openEntryModal('add')); });
      const heroWatchBtn=document.getElementById('heroWatchBtn');
      if(heroWatchBtn) heroWatchBtn.addEventListener('click', async()=>{ const entry=state.heroEntryId ? await getEntry(state.heroEntryId) : null; entry ? openEntryModal('edit', entry) : openEntryModal('add'); });
      els.closeEntryModal.addEventListener('click',()=>closeModal(els.entryModal));
      els.cancelEntryBtn.addEventListener('click',()=>closeModal(els.entryModal));
      els.entryForm.addEventListener('submit',saveEntry);

      els.addCategoryBtn.addEventListener('click',()=>{ state.renamingCategory=null; els.categoryForm.reset(); els.categoryModal.querySelector('.modal-title').textContent='Add Category'; openModal(els.categoryModal); });
      els.closeCatModal.addEventListener('click',()=>closeModal(els.categoryModal));
      els.cancelCatBtn.addEventListener('click',()=>closeModal(els.categoryModal));
      els.categoryForm.addEventListener('submit',async(e)=>{
        e.preventDefault(); const name=els.categoryNameInput.value.trim().toLowerCase();
        if(!name){ showToast('Name is required','error'); return; }
        if(state.renamingCategory){
          if(name===state.renamingCategory){ closeModal(els.categoryModal); state.renamingCategory=null; return; }
          if(state.categories.includes(name)){ showToast('Category already exists','error'); return; }
          await renameCategory(state.renamingCategory,name);
          state.renamingCategory=null; closeModal(els.categoryModal);
        } else {
          if(state.categories.includes(name)){ showToast('Category already exists','error'); return; }
          await addItem('categories',{name,createdAt:Date.now()}); state.categories.push(name); state.categories.sort((a,b)=>a.localeCompare(b));
          closeModal(els.categoryModal); renderCategories(); showToast('Category added','success');
        }
      });

      els.closeDeleteModal.addEventListener('click',()=>closeModal(els.deleteModal));
      els.cancelDeleteBtn.addEventListener('click',()=>closeModal(els.deleteModal));
      els.confirmDeleteBtn.addEventListener('click',confirmDelete);

      els.openSettingsBtn.addEventListener('click', openSettings);
      els.closeSettingsModal.addEventListener('click', closeSettings);
      els.cancelSettingsBtn.addEventListener('click', closeSettings);
      els.advancedHeader.addEventListener('click', toggleAdvanced);
      els.searchToggleRow.addEventListener('click', toggleSearchSwitch);
      els.modalExportBtn.addEventListener('click', exportData);
      els.modalImportBtn.addEventListener('click', ()=>els.modalImportFile.click());
      els.modalImportFile.addEventListener('change', e=>{ if(e.target.files[0]) importData(e.target.files[0]); e.target.value=''; });
      els.refreshPostersBtn.addEventListener('click', refreshMissingPosters);

      // Chat openers - safe wrappers to guarantee modal opens
      const openChat = () => { try { renderSessionList(); renderChatSession(); openModal(els.chatModal); } catch(e){ console.error(e); } };
      els.openChatBtn.addEventListener('click', openChat);
      els.aiFabBtn.addEventListener('click', openChat);
      els.closeChatModal.addEventListener('click', ()=> closeModal(els.chatModal));
      els.chatSendBtn.addEventListener('click', sendChat);
      els.chatInput.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); } });
      els.promptGuideBtn.addEventListener('click', ()=>{ els.promptGuide.classList.toggle('open'); });
      document.querySelectorAll('.prompt-chip').forEach(chip=>{
        chip.addEventListener('click', ()=>{
          els.chatInput.value = chip.dataset.text;
          els.chatInput.focus();
          els.promptGuide.classList.remove('open');
        });
      });
      els.sessionTrigger.addEventListener('click', (e)=>{
        e.stopPropagation();
        const isOpen = els.sessionMenu.classList.contains('open');
        document.querySelectorAll('.session-menu.open').forEach(m=>m.classList.remove('open'));
        if(!isOpen) els.sessionMenu.classList.add('open');
      });
      document.addEventListener('click', ()=>{ els.sessionMenu.classList.remove('open'); });

      [els.entryModal, els.categoryModal, els.deleteModal, els.settingsModal, els.chatModal].forEach(m=>{
        m.addEventListener('click', e=>{ if(e.target===m) closeModal(m); });
      });

      if(!getActiveSession() && hasAIConfigured()) createSession();
    })();
