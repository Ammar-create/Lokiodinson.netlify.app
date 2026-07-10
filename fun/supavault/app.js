/* ═══════════════════════════════════════════
   SupaVault — Application Logic
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Defaults ──────────────────────────
  const DEFAULT_URL = 'https://lycjamvdwaofjfcbeiev.supabase.co';
  const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Y2phbXZkd2FvZmpmY2JlaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzkzMzQsImV4cCI6MjA5NjMxNTMzNH0.q7MFysi0AsPETP1277M2EHFgfwFZluYuNi7hcoHSPnQ';

  // ── State ─────────────────────────────
  let db = null;
  let user = null;
  let editId = null;
  let allNotes = [];
  let channel = null;

  // ── DOM refs ──────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    auth: $('#auth-screen'),
    dash: $('#dashboard-screen'),
  };

  const els = {
    signinForm: $('#signin-form'),
    signupForm: $('#signup-form'),
    signinMsg: $('#signin-msg'),
    signupMsg: $('#signup-msg'),
    signinBtn: $('#signin-btn'),
    signupBtn: $('#signup-btn'),
    signoutBtn: $('#signout-btn'),
    userEmail: $('#user-email'),
    notesContainer: $('#notes-container'),
    noteCount: $('#note-count'),
    searchInput: $('#search-input'),
    newNoteBtn: $('#new-note-btn'),
    noteModal: $('#note-modal'),
    modalTitle: $('#modal-title'),
    noteForm: $('#note-form'),
    noteTitle: $('#note-title'),
    noteContent: $('#note-content'),
    noteMsg: $('#note-msg'),
    noteSaveBtn: $('#note-save-btn'),
    modalClose: $('#modal-close'),
    modalCancel: $('#modal-cancel'),
    cfgUrl: $('#cfg-url'),
    cfgKey: $('#cfg-key'),
    saveCfg: $('#save-cfg'),
  };


  // ═══════════ INIT ═══════════

  document.addEventListener('DOMContentLoaded', boot);

  function boot() {
    loadConfig();
    bindEvents();
    checkSession();
  }

  function loadConfig() {
    const url = localStorage.getItem('sv_url') || DEFAULT_URL;
    const key = localStorage.getItem('sv_key') || DEFAULT_KEY;
    els.cfgUrl.value = url;
    els.cfgKey.value = key;
    connect(url, key);
  }

  function connect(url, key) {
    try {
      db = window.supabase.createClient(url, key);
    } catch (err) {
      console.error('Supabase init failed:', err);
    }
  }


  // ═══════════ EVENTS ═══════════

  function bindEvents() {
    // Auth tabs
    $$('.auth-tab').forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Auth forms
    els.signinForm.addEventListener('submit', handleSignIn);
    els.signupForm.addEventListener('submit', handleSignUp);
    els.signoutBtn.addEventListener('click', handleSignOut);

    // Config
    els.saveCfg.addEventListener('click', saveConfig);

    // Notes
    els.newNoteBtn.addEventListener('click', openNewNote);
    els.noteForm.addEventListener('submit', handleNoteSave);
    els.modalClose.addEventListener('click', closeModal);
    els.modalCancel.addEventListener('click', closeModal);

    // Close modal on backdrop
    els.noteModal.addEventListener('click', (e) => {
      if (e.target === els.noteModal) closeModal();
    });

    // Escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && els.noteModal.classList.contains('open')) {
        closeModal();
      }
    });

    // Search
    els.searchInput.addEventListener('input', debounce(handleSearch, 200));
  }


  // ═══════════ AUTH ═══════════

  function switchTab(tab) {
    $$('.auth-tab').forEach((t) => {
      const active = t.dataset.tab === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active);
    });
    $$('.auth-form').forEach((f) => f.classList.remove('active'));
    $(`#${tab}-form`).classList.add('active');
    clearMsg(els.signinMsg);
    clearMsg(els.signupMsg);
  }

  async function handleSignIn(e) {
    e.preventDefault();
    if (!db) return showMsg(els.signinMsg, 'error', 'Configure Supabase first.');

    setLoading(els.signinBtn, true);
    clearMsg(els.signinMsg);

    const { data, error } = await db.auth.signInWithPassword({
      email: els.signinForm.querySelector('#signin-email').value,
      password: els.signinForm.querySelector('#signin-password').value,
    });

    setLoading(els.signinBtn, false);

    if (error) return showMsg(els.signinMsg, 'error', humanError(error.message));
    user = data.user;
    showMsg(els.signinMsg, 'success', 'Welcome back.');
    setTimeout(goToDashboard, 400);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!db) return showMsg(els.signupMsg, 'error', 'Configure Supabase first.');

    setLoading(els.signupBtn, true);
    clearMsg(els.signupMsg);

    const { data, error } = await db.auth.signUp({
      email: els.signupForm.querySelector('#signup-email').value,
      password: els.signupForm.querySelector('#signup-password').value,
    });

    setLoading(els.signupBtn, false);

    if (error) return showMsg(els.signupMsg, 'error', humanError(error.message));

    if (data.session) {
      user = data.user;
      showMsg(els.signupMsg, 'success', 'Account created.');
      setTimeout(goToDashboard, 400);
    } else {
      showMsg(els.signupMsg, 'success', 'Check your inbox to verify your email, then sign in.');
    }
  }

  async function handleSignOut() {
    if (channel) {
      channel.unsubscribe();
      channel = null;
    }
    await db.auth.signOut();
    user = null;
    allNotes = [];
    showScreen('auth');
    toast('Signed out.');
  }

  async function checkSession() {
    if (!db) return;
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      user = session.user;
      goToDashboard();
    }
  }

  function saveConfig() {
    const url = els.cfgUrl.value.trim();
    const key = els.cfgKey.value.trim();
    if (!url || !key) return toast('Enter both URL and key.', 'error');
    localStorage.setItem('sv_url', url);
    localStorage.setItem('sv_key', key);
    connect(url, key);
    toast('Credentials saved.');
  }


  // ═══════════ NAVIGATION ═══════════

  function showScreen(name) {
    screens.auth.classList.toggle('active', name === 'auth');
    screens.dash.classList.toggle('active', name === 'dash');
  }

  function goToDashboard() {
    showScreen('dash');
    els.userEmail.textContent = user.email;
    loadNotes();
    subscribeToNotes();
  }


  // ═══════════ NOTES CRUD ═══════════

  async function loadNotes() {
    if (!db || !user) return;

    const { data, error } = await db
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load notes error:', error);
      allNotes = [];
    } else {
      allNotes = data || [];
    }

    renderNotes(allNotes);
  }

  function subscribeToNotes() {
    if (!db || !user || channel) return;

    channel = db
      .channel('notes-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadNotes();
      })
      .subscribe();
  }

  function renderNotes(notes) {
    els.noteCount.textContent = `(${notes.length})`;

    if (notes.length === 0 && els.searchInput.value.trim() === '') {
      els.notesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✦</div>
          <h3>No notes yet</h3>
          <p>Start writing. Your thoughts are safe here.</p>
          <button class="btn btn-accent" id="empty-new-btn">+ Create your first note</button>
        </div>`;
      $('#empty-new-btn')?.addEventListener('click', openNewNote);
      return;
    }

    if (notes.length === 0) {
      els.notesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⌕</div>
          <h3>No matches</h3>
          <p>Nothing matches "${escapeHtml(els.searchInput.value.trim())}". Try a different search.</p>
        </div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'notes-grid';

    notes.forEach((note) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div class="note-card-inner">
          <h3>${escapeHtml(note.title)}</h3>
          <div class="note-card-preview">${escapeHtml(note.content)}</div>
          <div class="note-card-footer">
            <span class="note-card-date">${timeAgo(note.created_at)}</span>
            <div class="note-card-actions">
              <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${note.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete" data-id="${note.id}">Delete</button>
            </div>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    els.notesContainer.innerHTML = '';
    els.notesContainer.appendChild(grid);

    // Delegate click events on note cards
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') openEditNote(id);
      if (btn.dataset.action === 'delete') deleteNote(id);
    });
  }


  // ═══════════ NOTE MODAL ═══════════

  function openNewNote() {
    editId = null;
    els.modalTitle.textContent = 'New note';
    els.noteForm.reset();
    clearMsg(els.noteMsg);
    els.noteModal.classList.add('open');
    els.noteTitle.focus();
  }

  function openEditNote(id) {
    const note = allNotes.find((n) => n.id === id);
    if (!note) return;

    editId = id;
    els.modalTitle.textContent = 'Edit note';
    els.noteTitle.value = note.title;
    els.noteContent.value = note.content;
    clearMsg(els.noteMsg);
    els.noteModal.classList.add('open');
    els.noteTitle.focus();
  }

  function closeModal() {
    els.noteModal.classList.remove('open');
    editId = null;
  }

  async function handleNoteSave(e) {
    e.preventDefault();

    const title = els.noteTitle.value.trim();
    const content = els.noteContent.value.trim();
    if (!title || !content) return;

    setLoading(els.noteSaveBtn, true);
    clearMsg(els.noteMsg);

    try {
      if (editId) {
        const { error } = await db
          .from('notes')
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq('id', editId);
        if (error) throw error;
        toast('Note updated.');
      } else {
        const { error } = await db
          .from('notes')
          .insert({ user_id: user.id, title, content });
        if (error) throw error;
        toast('Note created.');
      }
      closeModal();
    } catch (err) {
      console.error('Save error:', err);
      showMsg(els.noteMsg, 'error', humanError(err.message));
    } finally {
      setLoading(els.noteSaveBtn, false);
    }
  }

  async function deleteNote(id) {
    if (!confirm('Delete this note permanently?')) return;

    const { error } = await db.from('notes').delete().eq('id', id);
    if (error) {
      toast('Failed to delete note.', 'error');
      console.error('Delete error:', error);
    } else {
      toast('Note deleted.');
    }
  }


  // ═══════════ SEARCH ═══════════

  function handleSearch() {
    const q = els.searchInput.value.trim().toLowerCase();
    if (!q) return renderNotes(allNotes);
    const filtered = allNotes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
    renderNotes(filtered);
  }


  // ═══════════ HELPERS ═══════════

  function showMsg(el, type, text) {
    el.textContent = text;
    el.className = `msg show ${type}`;
  }

  function clearMsg(el) {
    el.textContent = '';
    el.className = 'msg';
  }

  function setLoading(btn, loading) {
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function humanError(msg) {
    if (!msg) return 'Something went wrong.';
    if (msg.includes('Invalid login')) return 'Wrong email or password.';
    if (msg.includes('already registered')) return 'This email is already in use.';
    if (msg.includes('valid email')) return 'Enter a valid email address.';
    if (msg.includes('at least 6')) return 'Password must be at least 6 characters.';
    if (msg.includes('network')) return 'Network error. Check your connection.';
    return msg;
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function toast(text, type = 'success') {
    const container = $('#toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = text;
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('fade-out');
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }
})();
