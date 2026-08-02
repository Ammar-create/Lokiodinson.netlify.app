/* CaptionHub — application logic (vanilla JS, no dependencies) */
(function () {
  'use strict';
  if (!window.CH) window.CH = {};

  /* ============================= Settings ============================= */
  CH.Settings = (function () {
    var KEY = CH.CONFIG.STORAGE_KEY;
    var TKEY = CH.CONFIG.TOKEN_KEY;
    var data = null;

    function get() {
      if (data) return data;
      try { data = JSON.parse(localStorage.getItem(KEY)) || {}; }
      catch (e) { data = {}; }
      return data;
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
    function set(patch) { data = Object.assign(get(), patch); save(); }
    function clear() { data = {}; try { localStorage.removeItem(KEY); } catch (e) {} setToken(null); }
    function getToken() {
      try { return JSON.parse(localStorage.getItem(TKEY)) || null; }
      catch (e) { return null; }
    }
    function setToken(t) {
      try {
        if (t) localStorage.setItem(TKEY, JSON.stringify(t));
        else localStorage.removeItem(TKEY);
      } catch (e) {}
    }
    return { get: get, set: set, clear: clear, getToken: getToken, setToken: setToken };
  })();

  /* ============================= State ============================= */
  var state = {
    query: '',
    langs: [],            // selected language codes; [] = all
    type: 'all',
    year: '',
    season: '',
    episode: '',
    orderBy: 'download_count',
    orderDir: 'desc',
    hi: false,
    page: 1,
    totalCount: 0,
    loading: false,
    movieHash: null,
    fileName: null,
    lastParams: null
  };

  /* ============================= DOM helpers ============================= */
  function $(id) { return document.getElementById(id); }

  var ICONS = {
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path><path d="M12 15V3"></path></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="M7 4v16M17 4v16M2 9.5h5M2 14.5h5M17 9.5h5M17 14.5h5"></path></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  /* ============================= Formatting ============================= */
  function fmtNum(n) {
    if (n === undefined || n === null) return '0';
    return Number(n).toLocaleString();
  }
  function fmtDate(s) {
    if (!s) return '—';
    var d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0, n = bytes;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(i ? 1 : 0) + ' ' + u[i];
  }
  function langCode2(code) {
    if (!code) return '??';
    return code.slice(0, 2).toUpperCase();
  }

  /* ============================= Toasts ============================= */
  var toastStack = $('toastStack');
  function toast(msg, type) {
    type = type || 'info';
    var t = el('div', 'toast is-' + type);
    t.innerHTML = ICONS[type === 'ok' ? 'check' : type === 'err' ? 'alert' : type === 'warn' ? 'alert' : 'info'];
    t.appendChild(el('span', null, msg));
    toastStack.appendChild(t);
    var kill = function () { if (t.parentNode) t.parentNode.removeChild(t); };
    t.addEventListener('click', kill);
    setTimeout(kill, 4500);
  }

  /* ============================= Status chip ============================= */
  function updateStatus() {
    var chip = $('statusChip'), dot = $('statusDot'), txt = $('statusText');
    var hasKey = !!(CH.API.apiKey());
    chip.classList.toggle('is-ok', hasKey);
    chip.classList.toggle('is-warn', !hasKey);
    txt.textContent = hasKey ? 'API key set' : 'API key not set';
  }

  /* ============================= Language UI ============================= */
  function renderLangChips() {
    var box = $('langChips');
    box.innerHTML = '';
    var all = el('button', 'chip' + (state.langs.length === 0 ? ' is-active' : ''), 'All');
    all.type = 'button';
    all.setAttribute('data-lang', '');
    all.addEventListener('click', function () { toggleLang(''); });
    box.appendChild(all);

    CH.CONFIG.POPULAR_LANGS.forEach(function (code) {
      var c = el('button', 'chip' + (state.langs.indexOf(code) !== -1 ? ' is-active' : ''), CH.langName(code));
      c.type = 'button';
      c.setAttribute('data-lang', code);
      c.addEventListener('click', function () { toggleLang(code); });
      box.appendChild(c);
    });

    // any extra selected languages beyond the popular set
    state.langs.forEach(function (code) {
      if (CH.CONFIG.POPULAR_LANGS.indexOf(code) === -1) {
        var c = el('button', 'chip is-active', CH.langName(code));
        c.type = 'button';
        c.setAttribute('data-lang', code);
        c.addEventListener('click', function () { toggleLang(code); });
        box.appendChild(c);
      }
    });
  }

  function renderLangList() {
    var list = $('langList');
    list.innerHTML = '';
    CH.CONFIG.LANGUAGES.forEach(function (pair) {
      var code = pair[0], name = pair[1];
      var b = el('button', 'lang-opt' + (state.langs.indexOf(code) !== -1 ? ' is-active' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'code', langCode2(code)));
      b.appendChild(el('span', null, name));
      b.addEventListener('click', function () { toggleLang(code); });
      list.appendChild(b);
    });
  }

  function toggleLang(code) {
    if (code === '') { state.langs = []; }
    else {
      var i = state.langs.indexOf(code);
      if (i !== -1) state.langs.splice(i, 1);
      else state.langs.push(code);
    }
    renderLangChips();
    renderLangList();
    if (state.lastParams) search();
  }

  /* ============================= Filters ============================= */
  function initFilters() {
    var orderSel = $('fOrder');
    CH.CONFIG.ORDER_OPTIONS.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o[0];
      opt.textContent = o[1];
      orderSel.appendChild(opt);
    });
    orderSel.value = state.orderBy;

    $('filters').addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'fType') {
        state.type = t.value;
        $('fSeasonField').hidden = !(t.value === 'series' || t.value === 'episode');
        $('fEpisodeField').hidden = t.value !== 'episode';
      }
      else if (t.id === 'fYear') state.year = t.value;
      else if (t.id === 'fSeason') state.season = t.value;
      else if (t.id === 'fEpisode') state.episode = t.value;
      else if (t.id === 'fOrder') state.orderBy = t.value;
      else if (t.id === 'fDir') state.orderDir = t.value;
      else if (t.id === 'fHI') state.hi = t.checked;
      state.page = 1;
      if (state.lastParams) search();
    });
  }

  /* ============================= Search ============================= */
  function buildParams() {
    var p = {
      languages: state.langs.length ? state.langs : undefined,
      year: state.year || undefined,
      order_by: state.orderBy,
      order_direction: state.orderDir,
      page: state.page,
      per_page: CH.CONFIG.RESULTS_PER_PAGE
    };
    if (state.hi) p.hearing_impaired = 'only';

    if (state.movieHash) {
      p.moviehash = state.movieHash;
      if (state.query.trim()) p.query = state.query.trim(); // filename alongside hash improves matching
    } else {
      p.query = state.query.trim();
      if (!p.query) return null;
      if (state.type === 'movie') p.type = 'movie';
      else if (state.type === 'series') { p.type = 'series'; if (state.season) p.season_number = state.season; }
      else if (state.type === 'episode') { p.type = 'episode'; if (state.season) p.season_number = state.season; if (state.episode) p.episode_number = state.episode; }
      else if (state.season || state.episode) { p.type = 'episode'; if (state.season) p.season_number = state.season; if (state.episode) p.episode_number = state.episode; }
    }
    return p;
  }

  function skeleton() {
    var box = $('resultsList');
    box.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var s = el('div', 'skeleton');
      s.appendChild(el('div', 'sk-line w80'));
      s.appendChild(el('div', 'sk-line w60'));
      s.appendChild(el('div', 'sk-line w35'));
      box.appendChild(s);
    }
    $('resultsMeta').textContent = '';
    $('pagination').innerHTML = '';
  }

  function renderMeta() {
    var meta = $('resultsMeta');
    meta.innerHTML = '';
    var c = el('span', 'count', fmtNum(state.totalCount) + (state.totalCount === 1 ? ' subtitle' : ' subtitles'));
    meta.appendChild(c);
    if (state.movieHash || state.fileName) {
      var tag = el('span', 'file-tag', '');
      tag.appendChild(el('span', null, 'File: ' + (state.fileName || state.movieHash.slice(0, 12) + '…')));
      var x = document.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.setAttribute('aria-label', 'Clear file match');
      x.addEventListener('click', function () {
        state.movieHash = null;
        state.fileName = null;
        state.page = 1;
        if (state.query) search(); else { renderResults(null); }
      });
      tag.appendChild(x);
      meta.appendChild(tag);
    }
    if (state.lastParams && state.page) {
      var pages = Math.max(1, Math.ceil(state.totalCount / CH.CONFIG.RESULTS_PER_PAGE));
      var pg = el('span', 'mono', 'page ' + state.page + ' of ' + pages);
      meta.appendChild(pg);
    }
    if (state.lastParams && state.movieHash && state.langs.length) {
      meta.appendChild(el('span', 'mono', 'languages: ' + state.langs.join(', ')));
    }
  }

  function emptyState(icon, title, sub, isError) {
    var box = $('resultsList');
    box.innerHTML = '';
    var d = el('div', 'empty-state' + (isError ? ' is-error' : ''));
    d.innerHTML = ICONS[icon];
    d.appendChild(el('h3', null, title));
    if (sub) d.appendChild(el('p', null, sub));
    box.appendChild(d);
  }

  function renderResults(data) {
    var box = $('resultsList');
    box.innerHTML = '';

    if (!data || !data.data || data.data.length === 0) {
      renderMeta();
      emptyState('film', 'No subtitles found',
        'Try a different language, a simpler title, or drop your video file for an exact hash match.');
      $('pagination').innerHTML = '';
      return;
    }

    state.totalCount = data.total_count || data.data.length;
    renderMeta();

    var frag = document.createDocumentFragment();
    data.data.forEach(function (item, idx) {
      frag.appendChild(buildRow(item, idx));
    });
    box.appendChild(frag);
    renderPagination();
  }

  function buildRow(item, idx) {
    var a = item.attributes || {};
    var row = el('div', 'result-row row-enter');
    row.style.animationDelay = Math.min(idx, 8) * 24 + 'ms';

    var main = el('div', 'row-main');
    main.tabIndex = 0;
    main.setAttribute('role', 'button');
    main.setAttribute('aria-expanded', 'false');

    var badge = el('div', 'lang-badge', langCode2(a.language));
    badge.title = CH.langName(a.language) || a.language;
    main.appendChild(badge);

    var body = el('div', 'row-body');
    var title = el('div', 'row-title', a.release || 'Subtitle for ' + state.query);
    body.appendChild(title);

    var meta = el('div', 'row-meta');
    if (a.format) { meta.appendChild(el('span', null, a.format.toUpperCase())); meta.appendChild(el('span', 'sep', '·')); }
    if (a.fps) { meta.appendChild(el('span', null, a.fps + ' fps')); meta.appendChild(el('span', 'sep', '·')); }
    if (a.files && a.files.length > 1) { meta.appendChild(el('span', null, a.files.length + ' files')); meta.appendChild(el('span', 'sep', '·')); }
    if (a.hearing_impaired) { meta.appendChild(el('span', 'tag tag-hi', 'HI')); }
    if (state.movieHash && a.moviehash_match) { meta.appendChild(el('span', 'tag tag-hash', 'Hash match')); }
    if (a.foreign_parts_only) { meta.appendChild(el('span', 'tag tag-fpo', 'Foreign parts only')); }
    if (a.ai_translated) { meta.appendChild(el('span', 'tag tag-ai', 'AI translated')); }
    else if (a.machine_translated) { meta.appendChild(el('span', 'tag tag-mt', 'Machine')); }
    body.appendChild(meta);
    main.appendChild(body);

    var side = el('div', 'row-side');
    var dl = el('span', 'row-downloads');
    dl.innerHTML = ICONS.download;
    dl.appendChild(el('b', null, fmtNum(a.download_count)));
    dl.appendChild(document.createTextNode(' downloads'));
    side.appendChild(dl);

    var fileId = a.files && a.files.length ? a.files[0].file_id : a.file_id;
    var btn = el('button', 'btn btn-download', '');
    btn.type = 'button';
    btn.innerHTML = ICONS.download;
    btn.appendChild(el('span', null, 'Download'));
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      downloadSub(fileId, btn);
    });
    side.appendChild(btn);
    main.appendChild(side);

    var detail = el('div', 'row-detail');
    detail.hidden = true;
    buildDetail(detail, a);

    var open = false;
    function toggle() {
      open = !open;
      detail.hidden = !open;
      main.setAttribute('aria-expanded', String(open));
      row.classList.toggle('is-open', open);
    }
    main.addEventListener('click', toggle);
    main.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); }
    });

    row.appendChild(main);
    row.appendChild(detail);
    return row;
  }

  function buildDetail(detail, a) {
    var grid = el('div', 'detail-grid');

    function item(k, v, isLink) {
      var d = el('div', 'detail-item');
      d.appendChild(el('span', 'k', k));
      if (isLink) {
        var lnk = el('a', 'v', v);
        lnk.href = v;
        lnk.target = '_blank';
        lnk.rel = 'noopener noreferrer';
        d.appendChild(lnk);
      } else {
        d.appendChild(el('span', 'v', v));
      }
      grid.appendChild(d);
    }

    if (a.uploader && a.uploader.name) {
      item('Uploader', a.uploader.name + (a.uploader.rank ? ' · ' + a.uploader.rank : ''));
    }
    if (a.upload_date) item('Uploaded', fmtDate(a.upload_date));
    if (a.ratings > 0) {
      var stars = el('span', 'v', '');
      stars.innerHTML = '<span style="color:var(--warn);vertical-align:-1px">' + ICONS.star + '</span> ';
      stars.appendChild(document.createTextNode(a.ratings.toFixed(1) + (a.votes ? ' · ' + fmtNum(a.votes) + ' votes' : '')));
      var d = el('div', 'detail-item');
      d.appendChild(el('span', 'k', 'Rating'));
      d.appendChild(stars);
      grid.appendChild(d);
    }
    if (a.comments > 0) item('Comments', fmtNum(a.comments));
    if (a.language) item('Language', CH.langName(a.language) || a.language);
    if (a.fps) item('FPS', String(a.fps));
    if (a.url) item('OpenSubtitles', 'view page ↗', true);

    detail.appendChild(grid);

    var files = a.files && a.files.length ? a.files : [{ file_id: a.file_id, file_name: a.release }];
    detail.appendChild(el('div', 'files-head', 'Files'));
    files.forEach(function (f) {
      var fr = el('div', 'file-row');
      fr.appendChild(el('span', 'name', f.file_name || 'Subtitle file'));
      if (f.cd_number) fr.appendChild(el('span', 'cd', 'CD ' + f.cd_number));
      var b = el('button', 'btn btn-download', '');
      b.type = 'button';
      b.innerHTML = ICONS.download;
      b.appendChild(el('span', null, 'Download'));
      b.addEventListener('click', function () { downloadSub(f.file_id, b); });
      fr.appendChild(b);
      detail.appendChild(fr);
    });
  }

  /* ============================= Pagination ============================= */
  function renderPagination() {
    var nav = $('pagination');
    nav.innerHTML = '';
    var pages = Math.max(1, Math.ceil(state.totalCount / CH.CONFIG.RESULTS_PER_PAGE));
    if (pages <= 1) return;

    var prev = el('button', 'page-btn', '');
    prev.type = 'button';
    prev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg> Previous';
    prev.disabled = state.page <= 1;
    prev.addEventListener('click', function () { state.page = Math.max(1, state.page - 1); search(); });

    var info = el('span', 'page-info', '');
    info.appendChild(el('b', null, 'Page ' + state.page));
    info.appendChild(document.createTextNode(' of ' + pages));

    var next = el('button', 'page-btn', 'Next ');
    next.type = 'button';
    next.innerHTML = 'Next <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';
    next.disabled = state.page >= pages || state.page >= CH.CONFIG.MAX_PAGES;
    next.addEventListener('click', function () { state.page += 1; search(); });

    nav.appendChild(prev);
    nav.appendChild(info);
    nav.appendChild(next);
  }

  /* ============================= Search flow ============================= */
  async function search() {
    if (state.loading) return;
    var params = buildParams();
    if (!params) {
      $('resultsList').innerHTML = '';
      $('resultsMeta').textContent = '';
      $('pagination').innerHTML = '';
      return;
    }
    if (!CH.API.apiKey()) {
      toast('Set your OpenSubtitles API key in Settings to search.', 'warn');
      openSettings();
      return;
    }

    state.loading = true;
    state.lastParams = params;
    var btn = $('searchBtn');
    btn.disabled = true;
    skeleton();

    try {
      var data = await CH.API.search(params);
      renderResults(data);
    } catch (e) {
      handleSearchError(e);
    } finally {
      state.loading = false;
      btn.disabled = false;
    }
  }

  function handleSearchError(e) {
    var meta = $('resultsMeta');
    if (e instanceof CH.ApiError) {
      if (e.status === 401 || e.status === 403) {
        emptyState('alert', 'API key rejected',
          'The API key is missing or invalid. Check it in Settings, or get a free one at opensubtitles.com/consumers/new.', true);
        toast('Your OpenSubtitles API key was rejected.', 'err');
        updateStatus();
      } else if (e.status === 429) {
        emptyState('alert', 'Rate limit reached',
          'OpenSubtitles limits requests per minute. Wait a moment and try again.', true);
        toast('Rate limit reached — wait a bit and retry.', 'warn');
      } else if (e.status === 402) {
        emptyState('alert', 'Payment required',
          'This search requires an OpenSubtitles VIP plan.', true);
      } else if (e.status === 404) {
        emptyState('film', 'No subtitles found',
          'Try a different language, a simpler title, or drop your video file for an exact hash match.');
      } else {
        emptyState('alert', 'Something went wrong', e.message, true);
      }
    } else {
      emptyState('alert', 'Network error', e.message || 'Check your connection and try again.', true);
    }
    meta.textContent = '';
    $('pagination').innerHTML = '';
  }

  /* ============================= File hash flow ============================= */
  function handleFile(file) {
    if (!file || state.loading) return;
    var dz = $('dropzone');
    var t = $('dropTitle'), h = $('dropHint');

    dz.classList.add('is-busy');
    t.textContent = 'Hashing…';
    h.textContent = file.name + ' · ' + fmtSize(file.size);
    $('fileInput').value = '';

    Promise.all([
      file.slice(0, 65536).arrayBuffer(),
      file.slice(-65536).arrayBuffer()
    ]).then(function (parts) {
      var merged = new Uint8Array(131072);
      merged.set(new Uint8Array(parts[0]), 0);
      merged.set(new Uint8Array(parts[1]), 65536);
      return md5(merged.buffer);
    }).then(function (hash) {
      state.movieHash = hash;
      state.fileName = file.name;
      state.query = cleanName(file.name); // filename alongside moviehash improves matching
      $('queryInput').value = state.query;
      state.page = 1;
      return search();
    }).then(function () {
      dz.classList.remove('is-busy');
      t.textContent = 'Drop a video file';
      h.textContent = 'or click to browse — exact subtitle match by file hash';
      // if hash search came up empty, fall back to filename search
      if (state.movieHash && state.totalCount === 0) {
        fallbackToFilename();
      }
    }).catch(function (e) {
      dz.classList.remove('is-busy');
      t.textContent = 'Drop a video file';
      h.textContent = 'or click to browse — exact subtitle match by file hash';
      toast('Could not read that file. Try another video file.', 'err');
    });
  }

  function cleanName(name) {
    return name
      .replace(/\.[^.]+$/, '')
      .replace(/[._\[\](){}]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fallbackToFilename() {
    state.movieHash = null;
    state.page = 1;
    toast('No exact hash match — searched by filename instead.', 'info');
    search();
  }

  /* ============================= Download flow ============================= */
  async function ensureToken() {
    var tok = CH.Settings.getToken();
    if (tok && tok.token && tok.expires > Date.now()) return tok.token;
    var s = CH.Settings.get();
    if (!s.username || !s.password) return null;
    try {
      var res = await CH.API.login(s.username, s.password);
      if (res && res.token) {
        CH.Settings.setToken({ token: res.token, expires: Date.now() + 23 * 60 * 60 * 1000 });
        return res.token;
      }
    } catch (e) {
      throw e;
    }
    return null;
  }

  async function downloadSub(fileId, btn) {
    if (!fileId) { toast('This subtitle has no downloadable file.', 'warn'); return; }
    btn.classList.add('is-busy');
    btn.disabled = true;
    try {
      var token = await ensureToken();
      if (!token) {
        toast('Add your OpenSubtitles login (username + password) in Settings to enable downloads.', 'warn');
        openSettings();
        return;
      }
      var res;
      try {
        res = await CH.API.download(fileId, token);
      } catch (e) {
        if (e.status === 401) { // stale token — refresh and retry once
          CH.Settings.setToken(null);
          token = await ensureToken();
          if (!token) { toast('Login expired — re-enter your OpenSubtitles login in Settings.', 'warn'); return; }
          res = await CH.API.download(fileId, token);
        } else {
          throw e;
        }
      }
      var w = window.open(res.link, '_blank', 'noopener');
      if (!w) {
        toast('Popup blocked — ' + res.link, 'info');
      } else {
        toast('Download started: ' + (res.file_name || 'subtitle file'), 'ok');
      }
    } catch (e) {
      if (e instanceof CH.ApiError) {
        if (e.status === 406) toast('This subtitle needs VIP download rights on OpenSubtitles.', 'err');
        else if (e.status === 402) toast('Payment required on OpenSubtitles for this download.', 'err');
        else if (e.status === 401 || e.status === 403) toast('Login failed — check your OpenSubtitles credentials in Settings.', 'err');
        else toast(e.message, 'err');
      } else {
        toast(e.message || 'Download failed.', 'err');
      }
    } finally {
      btn.classList.remove('is-busy');
      btn.disabled = false;
    }
  }

  /* ============================= Settings dialog ============================= */
  var settingsDialog = $('settingsDialog');

  function openSettings() {
    var s = CH.Settings.get();
    $('sKey').value = s.apiKey || '';
    $('sUser').value = s.username || '';
    $('sPass').value = s.password || '';
    if (!settingsDialog.open) settingsDialog.showModal();
    $('sKey').focus();
  }

  $('settingsBtn').addEventListener('click', openSettings);
  $('statusChip').addEventListener('click', openSettings);
  $('settingsClose').addEventListener('click', function () { settingsDialog.close(); });
  $('sCancel').addEventListener('click', function () { settingsDialog.close(); });

  $('settingsForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var s = CH.Settings.get();
    s.apiKey = $('sKey').value.trim();
    s.username = $('sUser').value.trim();
    s.password = $('sPass').value;
    CH.Settings.set(s);
    settingsDialog.close();
    updateStatus();
    toast('Settings saved.', 'ok');
  });

  $('sClear').addEventListener('click', function () {
    CH.Settings.clear();
    $('sKey').value = ''; $('sUser').value = ''; $('sPass').value = '';
    settingsDialog.close();
    updateStatus();
    toast('Saved data cleared.', 'info');
  });

  /* ============================= Dropzone ============================= */
  var dz = $('dropzone');
  dz.addEventListener('click', function () { $('fileInput').click(); });
  dz.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); $('fileInput').click(); }
  });
  ['dragenter', 'dragover'].forEach(function (name) {
    dz.addEventListener(name, function (ev) {
      ev.preventDefault();
      dz.classList.add('is-drag');
    });
  });
  ['dragleave', 'drop'].forEach(function (name) {
    dz.addEventListener(name, function (ev) {
      ev.preventDefault();
      dz.classList.remove('is-drag');
    });
  });
  dz.addEventListener('drop', function (ev) {
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  $('fileInput').addEventListener('change', function (ev) {
    var f = ev.target.files && ev.target.files[0];
    if (f) handleFile(f);
  });

  /* ============================= Language panel ============================= */
  var langPanel = $('langPanel');
  $('moreLangsBtn').addEventListener('click', function () {
    renderLangList();
    if (!langPanel.open) langPanel.showModal();
  });
  $('langPanelClose').addEventListener('click', function () { langPanel.close(); });
  langPanel.addEventListener('click', function (ev) {
    if (ev.target === langPanel) langPanel.close();
  });

  /* ============================= Init ============================= */
  $('searchForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    state.query = $('queryInput').value;
    state.movieHash = null;
    state.fileName = null;
    state.page = 1;
    search();
  });

  initFilters();
  renderLangChips();
  updateStatus();
})();
