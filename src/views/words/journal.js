// src/views/words/journal.js
// Main "Mijn Woorden" journal — word list grouped by date + stats.
import { state } from '../../state.js';
import { nav } from '../../router.js';
import { loadWords, deleteWord, getDueWords, addWord, updateWord, confirmAddFromDict } from '../../data/words.js';
import { speakDutch } from '../../speech.js';
import { runAIFill, setupTagsAutocomplete, invalidateTagsCache } from '../../utils/aiFill.js';

const BACK_ICON   = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const SPARKLE     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10 L13.5 11 L12 18 L10.5 11 L4 10 L10.5 9 Z"/></svg>`;
const SPEAK_ICON  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const EDIT_ICON   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

const PAGE_SIZE = 20;
let wjPage = 0;

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.round((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function masteryDots(reps) {
  const max = 5;
  return `<div class="mastery-dots" title="${Math.min(reps, max)}/${max} successful reviews">` +
    Array.from({ length: max }, (_, i) =>
      `<span class="mastery-dot${i < reps ? ' filled' : ''}"></span>`
    ).join('') +
  `</div>`;
}

function wordCardHTML(w) {
  return `
    <div class="word-card">
      <div class="word-card-header">
        <div class="word-card-dutch">
          <span class="word-dutch-text">${esc(w.dutch)}</span>
          <button class="btn-icon btn-speak-word" data-word="${esc(w.dutch)}" title="Listen">${SPEAK_ICON}</button>
        </div>
        <div class="word-card-actions">
          <button class="btn-icon btn-edit-word" title="Edit"
            data-id="${esc(w.id)}"
            data-dutch="${esc(w.dutch)}"
            data-english="${esc(w.english)}"
            data-meaning="${esc(w.meaning)}"
            data-example="${esc(w.example)}"
            data-tags="${esc((w.tags || []).join(', '))}"
          >${EDIT_ICON}</button>
          <button class="btn-icon btn-delete-word" data-id="${esc(w.id)}" title="Delete">${DELETE_ICON}</button>
        </div>
      </div>
      <div class="word-card-english">${esc(w.english)}</div>
      ${w.meaning ? `<div class="word-card-meaning">${esc(w.meaning)}</div>` : ''}
      ${w.example ? `<div class="word-card-example">"${esc(w.example)}"</div>` : ''}
      <div class="word-card-footer">
        ${masteryDots(w.srsRepetitions)}
        ${w.tags.length ? `<div class="word-tags">${w.tags.map(t => `<span class="word-tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>`;
}

function paginationHTML(total, page) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return '';
  const start = page * PAGE_SIZE + 1;
  const end   = Math.min((page + 1) * PAGE_SIZE, total);
  return `
    <div class="wj-pagination">
      <button class="btn-rev-nav" id="wj-prev-page" ${page === 0 ? 'disabled' : ''}>← Prev</button>
      <span class="wj-page-info">${start}–${end} of ${total} words</span>
      <button class="btn-rev-nav" id="wj-next-page" ${page >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
    </div>`;
}

export async function renderWordJournal() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML =
    `<div class="view active" style="display:flex;align-items:center;justify-content:center;min-height:40vh;">
      <p style="color:var(--text-muted);">Loading words…</p>
    </div>`;

  await loadWords();
  wjPage = 0;
  _renderJournal();
}

function _renderJournal() {
  const words    = state.myWords;
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCount = getDueWords().length;
  const todayCount = words.filter(w => w.dateAdded === todayStr).length;

  // Paginate flat word list
  const pageWords = words.slice(wjPage * PAGE_SIZE, (wjPage + 1) * PAGE_SIZE);

  // Group paginated words by date
  const byDate = {};
  pageWords.forEach(w => { (byDate[w.dateAdded] ??= []).push(w); });
  const dateEntries = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="word-journal-view">
      <div class="wj-page-header">
        <button class="btn-back" id="btn-back-landing">${BACK_ICON} Home</button>
        <div>
          <h1 class="wj-title">Mijn Woorden</h1>
          <p class="wj-subtitle">Your personal Dutch vocabulary journal</p>
        </div>
      </div>

      <div class="wj-stats-strip">
        <div class="wj-stat">
          <span class="wj-stat-num">${words.length}</span>
          <span class="wj-stat-label">Total words</span>
        </div>
        <div class="wj-stat">
          <span class="wj-stat-num wj-stat-primary">${todayCount}</span>
          <span class="wj-stat-label">Added today</span>
        </div>
        <div class="wj-stat">
          <span class="wj-stat-num ${dueCount > 0 ? 'wj-stat-warning' : ''}">${dueCount}</span>
          <span class="wj-stat-label">Due for review</span>
        </div>
      </div>

      <div class="wj-top-actions">
        <button class="btn-primary" id="btn-add-word">+ Add Word</button>
        <button class="btn-secondary" id="btn-start-revision" ${words.length === 0 ? 'disabled' : ''}>
          Revise Words
        </button>
      </div>

      ${words.length === 0 ? `
        <div class="wj-empty">
          <div class="wj-empty-icon">📖</div>
          <h3>No words yet</h3>
          <p>Add Dutch words you encounter each day.<br>Build your personal vocabulary journal!</p>
          <button class="btn-primary" id="btn-add-first">+ Add Your First Word</button>
        </div>
      ` : `
        <div class="wj-journal">
          ${dateEntries.map(([date, dateWords]) => `
            <div class="wj-date-group">
              <div class="wj-date-header">
                <span class="wj-date-label">${formatDate(date)}</span>
                <span class="wj-date-badge">${dateWords.length} word${dateWords.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="word-cards-grid">
                ${dateWords.map(wordCardHTML).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        ${paginationHTML(words.length, wjPage)}
      `}
    </div>
  `;

  // ── Nav ──────────────────────────────────────────────────────────────────────
  document.getElementById('btn-back-landing').addEventListener('click', () => nav.landing());
  document.getElementById('btn-start-revision')?.addEventListener('click', () => nav.wordRevision());

  document.getElementById('wj-prev-page')?.addEventListener('click', () => { wjPage--; _renderJournal(); });
  document.getElementById('wj-next-page')?.addEventListener('click', () => { wjPage++; _renderJournal(); });

  // ── Speak ────────────────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-speak-word').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); speakDutch(btn.dataset.word); });
  });

  // ── Delete ───────────────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-delete-word').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this word?')) return;
      await deleteWord(btn.dataset.id);
      // Stay on same page, but clamp if last word on page was deleted
      const newTotal = state.myWords.length;
      const maxPage  = Math.max(0, Math.ceil(newTotal / PAGE_SIZE) - 1);
      if (wjPage > maxPage) wjPage = maxPage;
      _renderJournal();
    });
  });

  // ── Edit ─────────────────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-edit-word').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEditModal({
        id:      btn.dataset.id,
        dutch:   btn.dataset.dutch,
        english: btn.dataset.english,
        meaning: btn.dataset.meaning,
        example: btn.dataset.example,
        tags:    btn.dataset.tags,
      });
    });
  });

  // ── Remove stale modals ───────────────────────────────────────────────────────
  document.getElementById('wj-add-modal')?.remove();
  document.getElementById('wj-edit-modal')?.remove();

  // ── Add modal ────────────────────────────────────────────────────────────────
  const isLoggedIn = !!state.currentUser;
  const addModalEl = document.createElement('div');
  addModalEl.className = 'admin-modal-backdrop';
  addModalEl.id = 'wj-add-modal';
  addModalEl.style.display = 'none';
  addModalEl.innerHTML = `
    <div class="admin-modal" style="max-width:500px;">
      <h3>Add a Word</h3>
      <div class="aw-form-group" style="margin-top:1rem;">
        <label class="aw-label">Dutch word / phrase <span class="aw-required">*</span></label>
        <div class="aw-dutch-row">
          <input class="aw-input" id="wj-dutch" type="text" placeholder="e.g. de fiets, werkloos zijn…" autocomplete="off" />
          <button type="button" class="btn-ai-fill" id="wj-btn-ai-fill"
            title="${isLoggedIn ? 'Auto-fill with AI' : 'Sign in to use AI fill'}">
            ${SPARKLE} ${isLoggedIn ? 'AI Fill' : 'Sign in for AI'}
          </button>
        </div>
        <div class="aw-ai-status" id="wj-ai-status" style="display:none;"></div>
      </div>
      <div class="aw-form-group">
        <label class="aw-label">English translation <span class="aw-required">*</span></label>
        <input class="aw-input" id="wj-english" type="text" placeholder="e.g. the bicycle" />
      </div>
      <div class="aw-form-group">
        <label class="aw-label">Meaning / definition</label>
        <input class="aw-input" id="wj-meaning" type="text" placeholder="e.g. A two-wheeled vehicle for cycling" />
      </div>
      <div class="aw-form-group">
        <label class="aw-label">Example sentence <span class="aw-hint">(Dutch)</span></label>
        <textarea class="aw-input aw-textarea" id="wj-example" rows="2"
          placeholder="e.g. Ik ga elke dag op de fiets naar mijn werk."></textarea>
      </div>
      <div class="aw-form-group">
        <label class="aw-label">Tags <span class="aw-hint">(comma-separated, optional)</span></label>
        <input class="aw-input" id="wj-tags" type="text" placeholder="e.g. transport, work, daily life" />
      </div>
      <div id="wj-add-status" style="font-size:0.8rem;margin-top:0.5rem;"></div>
      <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:flex-end;">
        <button class="btn-secondary" id="wj-btn-cancel">Cancel</button>
        <button class="btn-primary"   id="wj-btn-save">Save Word</button>
      </div>
    </div>
  `;
  document.body.appendChild(addModalEl);
  setupTagsAutocomplete('wj-tags');

  function openAddModal() {
    document.getElementById('wj-dutch').value   = '';
    document.getElementById('wj-english').value = '';
    document.getElementById('wj-meaning').value = '';
    document.getElementById('wj-example').value = '';
    document.getElementById('wj-tags').value    = '';
    document.getElementById('wj-add-status').textContent = '';
    document.getElementById('wj-ai-status').style.display = 'none';
    addModalEl.style.display = 'flex';
    setTimeout(() => document.getElementById('wj-dutch').focus(), 50);
  }

  document.getElementById('btn-add-word').addEventListener('click', openAddModal);
  document.getElementById('btn-add-first')?.addEventListener('click', openAddModal);
  document.getElementById('wj-btn-cancel').addEventListener('click', () => { addModalEl.style.display = 'none'; });
  addModalEl.addEventListener('click', e => { if (e.target === addModalEl) addModalEl.style.display = 'none'; });

  document.getElementById('wj-btn-ai-fill').addEventListener('click', async () => {
    if (!state.currentUser) { nav.auth(); return; }
    const dutch = document.getElementById('wj-dutch').value.trim();
    if (!dutch) { document.getElementById('wj-dutch').focus(); return; }
    await runAIFill({
      dutch,
      btn:          document.getElementById('wj-btn-ai-fill'),
      status:       document.getElementById('wj-ai-status'),
      fields:       { english: 'wj-english', meaning: 'wj-meaning', example: 'wj-example' },
      dutchInputId: 'wj-dutch',
      onRetrigger:  () => document.getElementById('wj-btn-ai-fill').click(),
    });
  });

  document.getElementById('wj-btn-save').addEventListener('click', async () => {
    const dutch   = document.getElementById('wj-dutch').value.trim();
    const english = document.getElementById('wj-english').value.trim();
    const meaning = document.getElementById('wj-meaning').value.trim();
    const example = document.getElementById('wj-example').value.trim();
    const tagsRaw = document.getElementById('wj-tags').value.trim();
    const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const status  = document.getElementById('wj-add-status');

    if (!dutch || !english) {
      status.style.color = 'var(--danger)'; status.textContent = 'Dutch word and English translation are required.'; return;
    }
    const saveBtn = document.getElementById('wj-btn-save');
    saveBtn.disabled = true; status.style.color = 'var(--text-muted)'; status.textContent = 'Saving…';
    const result = await addWord({ dutch, english, meaning, example, tags });
    saveBtn.disabled = false;
    if (result.duplicate) {
      const existing = state.myWords.find(w => w.dutch.toLowerCase() === dutch.toLowerCase());
      status.style.color = '';
      status.innerHTML = `
        <div class="wj-duplicate-notice">
          <div class="wj-duplicate-label">⚠️ Already in your list</div>
          ${existing ? `
            <div class="wj-duplicate-preview">
              <div class="wj-dup-dutch">${esc(existing.dutch)}</div>
              <div class="wj-dup-english">${esc(existing.english)}</div>
              ${existing.meaning ? `<div class="wj-dup-meaning">${esc(existing.meaning)}</div>` : ''}
            </div>
            <button class="btn-secondary wj-dup-edit-btn" id="wj-dup-edit">Edit existing word</button>
          ` : ''}
        </div>`;
      if (existing) {
        document.getElementById('wj-dup-edit').addEventListener('click', () => {
          addModalEl.style.display = 'none';
          openEditModal({
            id:      existing.id,
            dutch:   existing.dutch,
            english: existing.english,
            meaning: existing.meaning,
            example: existing.example,
            tags:    (existing.tags || []).join(', '),
          });
        });
      }
      return;
    }
    if (result.dictExists) {
      const dw = result.dictWord;
      status.style.color = '';
      status.innerHTML = `
        <div class="wj-duplicate-notice" style="border-color:var(--primary);background:rgba(232,117,12,0.07);">
          <div class="wj-duplicate-label" style="color:var(--primary);">📖 Found in our dictionary</div>
          <div class="wj-duplicate-preview">
            <div class="wj-dup-dutch">${esc(dw.dutch)}</div>
            <div class="wj-dup-english">${esc(dw.english)}</div>
            ${dw.meaning ? `<div class="wj-dup-meaning">${esc(dw.meaning)}</div>` : ''}
            ${dw.example ? `<div class="wj-dup-meaning" style="font-style:italic;">"${esc(dw.example)}"</div>` : ''}
            ${dw.tags?.length ? `<div class="wj-dup-meaning">${dw.tags.map(t => `<span class="word-tag">${esc(t)}</span>`).join(' ')}</div>` : ''}
          </div>
          <button class="btn-primary wj-dup-edit-btn" id="wj-dict-add-btn">+ Add to My Words</button>
        </div>`;
      document.getElementById('wj-dict-add-btn').addEventListener('click', async () => {
        const btn = document.getElementById('wj-dict-add-btn');
        btn.disabled = true; btn.textContent = 'Adding…';
        const r = await confirmAddFromDict(dw.id);
        if (r.error) { btn.disabled = false; btn.textContent = '+ Add to My Words'; status.innerHTML += `<div style="color:var(--danger);font-size:0.8rem;margin-top:0.4rem;">${r.error}</div>`; return; }
        invalidateTagsCache();
        addModalEl.style.display = 'none';
        wjPage = 0;
        _renderJournal();
      });
      return;
    }
    if (result.error)     { status.style.color = 'var(--danger)'; status.textContent = result.error; return; }
    invalidateTagsCache();
    addModalEl.style.display = 'none';
    wjPage = 0;
    _renderJournal();
  });

  // ── Edit modal ───────────────────────────────────────────────────────────────
  const editModalEl = document.createElement('div');
  editModalEl.className = 'admin-modal-backdrop';
  editModalEl.id = 'wj-edit-modal';
  editModalEl.style.display = 'none';
  editModalEl.innerHTML = `
    <div class="admin-modal" style="max-width:500px;">
      <h3>Edit Word</h3>
      <div class="aw-form-group" style="margin-top:1rem;">
        <label class="aw-label">Dutch word / phrase <span class="aw-required">*</span></label>
        <input class="aw-input" id="wj-edit-dutch" type="text" autocomplete="off" />
      </div>
      <div class="aw-form-group">
        <label class="aw-label">English translation <span class="aw-required">*</span></label>
        <input class="aw-input" id="wj-edit-english" type="text" />
      </div>
      <div class="aw-form-group">
        <label class="aw-label">Meaning / definition</label>
        <input class="aw-input" id="wj-edit-meaning" type="text" />
      </div>
      <div class="aw-form-group">
        <label class="aw-label">Example sentence <span class="aw-hint">(Dutch)</span></label>
        <textarea class="aw-input aw-textarea" id="wj-edit-example" rows="2"></textarea>
      </div>
      <div class="aw-form-group">
        <label class="aw-label">Tags <span class="aw-hint">(comma-separated, optional)</span></label>
        <input class="aw-input" id="wj-edit-tags" type="text" />
      </div>
      <div id="wj-edit-status" style="font-size:0.8rem;margin-top:0.5rem;"></div>
      <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:flex-end;">
        <button class="btn-secondary" id="wj-edit-btn-cancel">Cancel</button>
        <button class="btn-primary"   id="wj-edit-btn-save">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(editModalEl);
  setupTagsAutocomplete('wj-edit-tags');

  let _editId = null;

  function openEditModal({ id, dutch, english, meaning, example, tags }) {
    _editId = id;
    document.getElementById('wj-edit-dutch').value   = dutch;
    document.getElementById('wj-edit-english').value = english;
    document.getElementById('wj-edit-meaning').value = meaning;
    document.getElementById('wj-edit-example').value = example;
    document.getElementById('wj-edit-tags').value    = tags;
    document.getElementById('wj-edit-status').textContent = '';
    editModalEl.style.display = 'flex';
    setTimeout(() => document.getElementById('wj-edit-dutch').focus(), 50);
  }

  document.getElementById('wj-edit-btn-cancel').addEventListener('click', () => { editModalEl.style.display = 'none'; });
  editModalEl.addEventListener('click', e => { if (e.target === editModalEl) editModalEl.style.display = 'none'; });

  document.getElementById('wj-edit-btn-save').addEventListener('click', async () => {
    const dutch   = document.getElementById('wj-edit-dutch').value.trim();
    const english = document.getElementById('wj-edit-english').value.trim();
    const meaning = document.getElementById('wj-edit-meaning').value.trim();
    const example = document.getElementById('wj-edit-example').value.trim();
    const tagsRaw = document.getElementById('wj-edit-tags').value.trim();
    const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const status  = document.getElementById('wj-edit-status');

    if (!dutch || !english) {
      status.style.color = 'var(--danger)'; status.textContent = 'Dutch word and English translation are required.'; return;
    }
    const saveBtn = document.getElementById('wj-edit-btn-save');
    saveBtn.disabled = true; status.style.color = 'var(--text-muted)'; status.textContent = 'Saving…';
    const result = await updateWord(_editId, { dutch, english, meaning, example, tags });
    saveBtn.disabled = false;
    if (result.error) { status.style.color = 'var(--danger)'; status.textContent = result.error; return; }
    invalidateTagsCache();
    editModalEl.style.display = 'none';
    _renderJournal();
  });
}
