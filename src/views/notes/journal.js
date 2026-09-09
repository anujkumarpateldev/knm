// src/views/notes/journal.js
// My Notes — flexible sections (optional subtitle + lines), pin, search.
import { state }      from '../../state.js';
import { nav }        from '../../router.js';
import { loadNotes, addNote, updateNote, deleteNote, togglePin, toggleNotePublic, loadPublicNotes } from '../../data/notes.js';
import { trackEnter } from '../../utils/tracker.js';

const BACK_ICON   = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const PIN_ICON    = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`;
const EDIT_ICON   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const GLOBE_ICON  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const LOCK_ICON   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

let notesSearch = '';
let notesTab    = 'mine'; // 'mine' | 'common'

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

// ── Note card (uniform preview, click to view) ────────────────────────────────
function noteCardHTML(note) {
  // Show first section only as preview, truncated
  const previewHtml = (() => {
    const secs = (note.sections ?? []).filter(s => s.subtitle || (s.lines ?? []).some(l => l.trim()));
    if (!secs.length) return '';
    const sec = secs[0];
    const lines = (sec.lines ?? []).filter(l => l.trim()).slice(0, 3);
    return `
      ${sec.subtitle ? `<div class="note-card-subtitle">${esc(sec.subtitle)}</div>` : ''}
      ${lines.length ? `<ul class="note-card-lines">
        ${lines.map(l => `<li class="note-card-line">${esc(l)}</li>`).join('')}
      </ul>` : ''}`;
  })();

  const tagsHtml = (note.tags ?? []).length
    ? (note.tags).map(t => `<span class="word-tag">${esc(t)}</span>`).join('')
    : '';

  // Count total lines for "x more" hint
  const totalLines = (note.sections ?? []).reduce((n, s) => n + (s.lines ?? []).filter(l => l.trim()).length, 0);
  const shownLines = (note.sections?.[0]?.lines ?? []).filter(l => l.trim()).slice(0, 3).length;
  const moreCount  = totalLines - shownLines + ((note.sections ?? []).length > 1 ? note.sections.length - 1 : 0);

  return `
    <div class="note-card ${note.pinned ? 'note-card-pinned' : ''}" data-id="${esc(note.id)}" role="button" tabindex="0" style="cursor:pointer;">
      <div class="note-card-header">
        <h3 class="note-card-title">${esc(note.title) || '<em style="opacity:.45">Untitled</em>'}</h3>
        <div class="note-card-actions">
          <button class="btn-icon btn-note-public ${note.isPublic ? 'is-public':''}" data-id="${esc(note.id)}" title="${note.isPublic ? 'Make private' : 'Make public'}">${note.isPublic ? GLOBE_ICON : LOCK_ICON}</button>
          <button class="btn-icon btn-pin-note ${note.pinned ? 'is-pinned':''}" data-id="${esc(note.id)}" title="${note.pinned?'Unpin':'Pin'}">${PIN_ICON}</button>
          <button class="btn-icon btn-edit-note"   data-id="${esc(note.id)}" title="Edit">${EDIT_ICON}</button>
          <button class="btn-icon btn-delete-note" data-id="${esc(note.id)}" title="Delete">${DELETE_ICON}</button>
        </div>
      </div>
      ${previewHtml ? `<div class="note-card-body">${previewHtml}</div>` : '<div class="note-card-body note-card-body-empty"></div>'}
      ${moreCount > 0 ? `<div class="note-card-more">+${moreCount} more…</div>` : ''}
      <div class="note-card-footer">
        ${tagsHtml ? `<div class="word-tags">${tagsHtml}</div>` : ''}
        <span class="note-card-date">${fmtDate(note.updatedAt)}</span>
      </div>
    </div>`;
}

// ── Public note card (read-only) ───────────────────────────────────────────────
function publicNoteCardHTML(note) {
  const previewHtml = (() => {
    const secs = (note.sections ?? []).filter(s => s.subtitle || (s.lines ?? []).some(l => l.trim()));
    if (!secs.length) return '';
    const sec   = secs[0];
    const lines = (sec.lines ?? []).filter(l => l.trim()).slice(0, 3);
    return `
      ${sec.subtitle ? `<div class="note-card-subtitle">${esc(sec.subtitle)}</div>` : ''}
      ${lines.length ? `<ul class="note-card-lines">${lines.map(l => `<li class="note-card-line">${esc(l)}</li>`).join('')}</ul>` : ''}`;
  })();
  const totalLines = (note.sections ?? []).reduce((n, s) => n + (s.lines ?? []).filter(l => l.trim()).length, 0);
  const shownLines = (note.sections?.[0]?.lines ?? []).filter(l => l.trim()).slice(0, 3).length;
  const moreCount  = totalLines - shownLines + ((note.sections ?? []).length > 1 ? note.sections.length - 1 : 0);
  const tagsHtml   = (note.tags ?? []).map(t => `<span class="word-tag">${esc(t)}</span>`).join('');
  return `
    <div class="note-card" data-id="${esc(note.id)}" role="button" tabindex="0" style="cursor:pointer;">
      <div class="note-card-header">
        <h3 class="note-card-title">${esc(note.title) || '<em style="opacity:.45">Untitled</em>'}</h3>
        ${note.authorName ? `<span class="note-author-badge">${esc(note.authorName)}</span>` : ''}
      </div>
      ${previewHtml ? `<div class="note-card-body">${previewHtml}</div>` : '<div class="note-card-body note-card-body-empty"></div>'}
      ${moreCount > 0 ? `<div class="note-card-more">+${moreCount} more…</div>` : ''}
      <div class="note-card-footer">
        ${tagsHtml ? `<div class="word-tags">${tagsHtml}</div>` : ''}
        <span class="note-card-date">${fmtDate(note.updatedAt)}</span>
      </div>
    </div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────
export async function renderNotesJournal() {
  trackEnter('notes');
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  document.getElementById('main-content').innerHTML =
    `<div class="view active" style="display:flex;align-items:center;justify-content:center;min-height:40vh;">
       <p style="color:var(--text-muted);">Loading notes…</p>
     </div>`;
  await Promise.all([loadNotes(), loadPublicNotes()]);
  notesSearch = '';
  notesTab    = 'mine';
  _renderNotes();
}

function _renderNotes() {
  const all = state.myNotes ?? [];
  const pub = state.publicNotes ?? [];
  const q   = notesSearch.trim().toLowerCase();

  const isCommon = notesTab === 'common';

  // Filter the active set
  const filterFn = n =>
    n.title.toLowerCase().includes(q) ||
    (n.sections ?? []).some(s =>
      s.subtitle?.toLowerCase().includes(q) ||
      (s.lines ?? []).some(l => l.toLowerCase().includes(q))
    ) ||
    (n.tags ?? []).some(t => t.toLowerCase().includes(q));

  const filtered  = q ? (isCommon ? pub : all).filter(filterFn) : (isCommon ? pub : all);
  const pinned    = filtered.filter(n =>  n.pinned);
  const unpinned  = filtered.filter(n => !n.pinned);

  // Tab body
  const myNotesBody = `
    <div class="notes-top-actions">
      <button class="btn-primary" id="btn-new-note">+ New Note</button>
    </div>
    ${filtered.length === 0 ? `
      <div class="wj-empty">
        <div class="wj-empty-icon">${q ? '🔍' : '📝'}</div>
        <h3>${q ? 'No results found' : 'No notes yet'}</h3>
        <p>${q ? `Nothing matches "<strong>${esc(q)}</strong>". Try a different search.` : 'Create your first note — just a title, or add sections with subtitles and lines.'}</p>
        ${!q ? `<button class="btn-primary" id="btn-add-first-note">+ New Note</button>` : ''}
      </div>` : ''}
    ${pinned.length ? `<div class="notes-group"><div class="notes-group-label">📌 Pinned</div><div class="notes-grid">${pinned.map(noteCardHTML).join('')}</div></div>` : ''}
    ${unpinned.length ? `<div class="notes-group">${pinned.length ? '<div class="notes-group-label">Notes</div>' : ''}<div class="notes-grid">${unpinned.map(noteCardHTML).join('')}</div></div>` : ''}
  `;

  const commonBody = `
    ${filtered.length === 0 ? `
      <div class="wj-empty">
        <div class="wj-empty-icon">${q ? '🔍' : '🌐'}</div>
        <h3>${q ? 'No results found' : 'No shared notes yet'}</h3>
        <p>${q ? `Nothing matches "<strong>${esc(q)}</strong>".` : 'When users make their notes public, they appear here. Share yours by clicking the 🔒 icon on any note card.'}</p>
      </div>` : `
      <div class="notes-group">
        <div class="notes-grid">${filtered.map(publicNoteCardHTML).join('')}</div>
      </div>`}
  `;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="notes-journal-view">
      <div class="wj-page-header">
        <button class="btn-back" id="btn-back-landing">${BACK_ICON} Home</button>
        <div>
          <h1 class="wj-title">Notes</h1>
          <p class="wj-subtitle">${all.length} private · ${pub.length} shared</p>
        </div>
      </div>

      <div class="wj-filter-tabs">
        <button class="wj-filter-tab ${!isCommon ? 'active' : ''}" id="notes-tab-mine">My Notes <span class="wj-filter-badge">${all.length}</span></button>
        <button class="wj-filter-tab ${isCommon  ? 'active' : ''}" id="notes-tab-common">🌐 Common Notes <span class="wj-filter-badge">${pub.length}</span></button>
      </div>

      <div class="wj-search-bar">
        <span class="wj-search-icon">${SEARCH_ICON}</span>
        <input class="wj-search-input" id="notes-search" type="search"
          placeholder="${isCommon ? 'Search shared notes…' : 'Search title, sections, tags…'}"
          value="${esc(notesSearch)}" autocomplete="off" />
        ${notesSearch ? `<button class="wj-search-clear" id="notes-search-clear">×</button>` : ''}
      </div>
      ${q ? `<p class="wj-search-count">${filtered.length} result${filtered.length!==1?'s':''} for "<strong>${esc(q)}</strong>"</p>` : ''}

      ${isCommon ? commonBody : myNotesBody}
    </div>
  `;

  document.getElementById('btn-back-landing').addEventListener('click', () => nav.landing());
  document.getElementById('btn-new-note')?.addEventListener('click', () => openModal());
  document.getElementById('btn-add-first-note')?.addEventListener('click', () => openModal());

  // Tab switching
  document.getElementById('notes-tab-mine')?.addEventListener('click', () => {
    notesTab = 'mine'; notesSearch = ''; _renderNotes();
  });
  document.getElementById('notes-tab-common')?.addEventListener('click', async () => {
    notesTab = 'common'; notesSearch = '';
    await loadPublicNotes();
    _renderNotes();
  });

  const searchEl = document.getElementById('notes-search');
  searchEl?.addEventListener('input', () => {
    notesSearch = searchEl.value;
    _renderNotes();
    const el = document.getElementById('notes-search');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  });
  document.getElementById('notes-search-clear')?.addEventListener('click', () => {
    notesSearch = ''; _renderNotes();
    document.getElementById('notes-search')?.focus();
  });

  // Card click → view modal
  document.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.note-card-actions')) return;
      const id   = card.dataset.id;
      const own  = state.myNotes.find(n => n.id === id);
      const pub  = state.publicNotes.find(n => n.id === id);
      const note = own ?? pub;
      if (note) openViewModal(note, !!own);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id   = card.dataset.id;
        const own  = state.myNotes.find(n => n.id === id);
        const pub  = state.publicNotes.find(n => n.id === id);
        const note = own ?? pub;
        if (note) openViewModal(note, !!own);
      }
    });
  });

  document.querySelectorAll('.btn-note-public').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await toggleNotePublic(btn.dataset.id);
      _renderNotes();
    });
  });

  document.querySelectorAll('.btn-pin-note').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await togglePin(btn.dataset.id);
      _renderNotes();
    });
  });
  document.querySelectorAll('.btn-edit-note').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const note = state.myNotes.find(n => n.id === btn.dataset.id);
      if (note) openModal(note);
    });
  });
  document.querySelectorAll('.btn-delete-note').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this note?')) return;
      await deleteNote(btn.dataset.id);
      _renderNotes();
    });
  });

  document.getElementById('notes-modal')?.remove();
  document.getElementById('notes-view-modal')?.remove();
  _buildModal();
  _buildViewModal();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
let _editingId = null;

function _buildModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'admin-modal-backdrop';
  backdrop.id = 'notes-modal';
  backdrop.style.display = 'none';
  backdrop.innerHTML = `
    <div class="admin-modal notes-modal-inner" style="max-width:600px;width:100%;">
      <h3 id="nm-heading">New Note</h3>

      <div class="aw-form-group" style="margin-top:1rem;">
        <label class="aw-label">Title</label>
        <input class="aw-input" id="nm-title" type="text"
          placeholder="e.g. Grammar Rules, Exam Tips…" autocomplete="off" />
      </div>

      <div class="aw-form-group">
        <label class="aw-label">Content</label>
        <div id="nm-sections"></div>
        <button type="button" class="notes-add-section-btn" id="nm-add-section">+ Add Section</button>
      </div>

      <div class="aw-form-group">
        <label class="aw-label">Tags <span class="aw-hint">(comma-separated, optional)</span></label>
        <input class="aw-input" id="nm-tags" type="text" placeholder="e.g. grammar, exam" />
      </div>

      <div class="notes-pin-row">
        <span class="notes-pin-label">📌 Pin this note</span>
        <label class="notes-pin-toggle">
          <input type="checkbox" id="nm-pinned" />
          <span class="notes-pin-slider"></span>
        </label>
      </div>

      <div id="nm-status" style="font-size:0.8rem;margin-top:0.5rem;min-height:1.2em;"></div>
      <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:flex-end;">
        <button class="btn-secondary" id="nm-cancel">Cancel</button>
        <button class="btn-primary"   id="nm-save">Save Note</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.getElementById('nm-cancel').addEventListener('click', closeModal);
  document.getElementById('nm-add-section').addEventListener('click', () => addSectionBlock(null, true));
  document.getElementById('nm-save').addEventListener('click', saveModal);
}

// ── View modal (read-only) ─────────────────────────────────────────────────────
function _buildViewModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'admin-modal-backdrop';
  backdrop.id = 'notes-view-modal';
  backdrop.style.display = 'none';
  backdrop.innerHTML = `
    <div class="admin-modal notes-view-modal-inner" style="max-width:620px;width:100%;position:relative;">
      <button class="notes-view-close" id="nv-close" title="Close">×</button>
      <div id="nv-content"></div>
      <div style="display:flex;gap:0.75rem;margin-top:1.5rem;justify-content:flex-end;">
        <button class="btn-secondary" id="nv-close-btn">Close</button>
        <button class="btn-primary"   id="nv-edit-btn">${EDIT_ICON} Edit</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeViewModal(); });
  document.getElementById('nv-close').addEventListener('click', closeViewModal);
  document.getElementById('nv-close-btn').addEventListener('click', closeViewModal);
  document.getElementById('nv-edit-btn').addEventListener('click', () => {
    const id = backdrop.dataset.noteId;
    const note = state.myNotes.find(n => n.id === id);
    if (note) { closeViewModal(); openModal(note); }
  });
}

function openViewModal(note, isOwn = true) {
  const backdrop = document.getElementById('notes-view-modal');
  backdrop.dataset.noteId = note.id;

  const sectionsHtml = (note.sections ?? []).map(sec => {
    const lines = (sec.lines ?? []).filter(l => l.trim());
    if (!sec.subtitle && !lines.length) return '';
    return `
      ${sec.subtitle ? `<div class="nv-subtitle">${esc(sec.subtitle)}</div>` : ''}
      ${lines.length ? `<ul class="nv-lines">${lines.map(l => `<li class="nv-line">${esc(l)}</li>`).join('')}</ul>` : ''}`;
  }).join('');

  const tagsHtml = (note.tags ?? []).length
    ? `<div class="word-tags" style="margin-top:1rem;">${note.tags.map(t => `<span class="word-tag">${esc(t)}</span>`).join('')}</div>`
    : '';

  document.getElementById('nv-content').innerHTML = `
    <div class="nv-pin-row">
      ${note.pinned ? '<span class="nv-pinned-badge">📌 Pinned</span>' : ''}
      ${note.authorName ? `<span class="nv-pinned-badge" style="color:var(--primary);">by ${esc(note.authorName)}</span>` : ''}
    </div>
    <h2 class="nv-title">${esc(note.title) || '<em style="opacity:.4">Untitled</em>'}</h2>
    ${sectionsHtml ? `<div class="nv-body">${sectionsHtml}</div>` : ''}
    ${tagsHtml}
    <p class="nv-date">Last updated: ${fmtDate(note.updatedAt)}</p>
  `;
  // Show Edit button only if user owns the note
  document.getElementById('nv-edit-btn').style.display = isOwn ? '' : 'none';
  backdrop.style.display = 'flex';
}

function closeViewModal() {
  document.getElementById('notes-view-modal').style.display = 'none';
}

function openModal(note = null) {
  _editingId = note?.id ?? null;
  document.getElementById('nm-heading').textContent = note ? 'Edit Note' : 'New Note';
  document.getElementById('nm-title').value          = note?.title  ?? '';
  document.getElementById('nm-tags').value           = (note?.tags ?? []).join(', ');
  document.getElementById('nm-pinned').checked       = note?.pinned ?? false;
  document.getElementById('nm-status').textContent   = '';

  const container = document.getElementById('nm-sections');
  container.innerHTML = '';

  const sections = note?.sections?.length ? note.sections : [{ subtitle: '', lines: [''] }];
  sections.forEach(s => addSectionBlock(s));

  document.getElementById('notes-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('nm-title').focus(), 50);
}

function closeModal() {
  document.getElementById('notes-modal').style.display = 'none';
  _editingId = null;
}

// ── Section block ─────────────────────────────────────────────────────────────
function addSectionBlock(sec = null, focusSubtitle = false) {
  const container = document.getElementById('nm-sections');
  const block = document.createElement('div');
  block.className = 'nm-section-block';
  block.innerHTML = `
    <div class="nm-section-header">
      <input class="aw-input nm-subtitle-input" type="text"
        placeholder="Subtitle (optional)"
        value="${esc(sec?.subtitle ?? '')}" />
      <button type="button" class="nm-remove-section" title="Remove section">×</button>
    </div>
    <div class="nm-lines-list"></div>
    <button type="button" class="notes-add-point-btn nm-add-line">+ Add Line</button>
  `;
  container.appendChild(block);

  const linesList  = block.querySelector('.nm-lines-list');
  const addLineBtn = block.querySelector('.nm-add-line');
  const removeBtn  = block.querySelector('.nm-remove-section');

  // Remove section (keep at least one)
  removeBtn.addEventListener('click', () => {
    if (container.children.length === 1) {
      block.querySelector('.nm-subtitle-input').value = '';
      linesList.innerHTML = '';
      addLineRow(linesList, '', true);
      return;
    }
    block.remove();
  });

  addLineBtn.addEventListener('click', () => addLineRow(linesList, '', true));

  // Seed lines
  const lines = sec?.lines?.length ? sec.lines : [''];
  lines.forEach(l => addLineRow(linesList, l));

  if (focusSubtitle) block.querySelector('.nm-subtitle-input')?.focus();
  return block;
}

// ── Line row ──────────────────────────────────────────────────────────────────
function addLineRow(linesList, value = '', focusIt = false) {
  const row = document.createElement('div');
  row.className = 'notes-point-row';
  row.innerHTML = `
    <span class="nm-bullet">•</span>
    <input class="notes-point-input aw-input" type="text"
      placeholder="Write a line…" value="${esc(value)}" />
    <button type="button" class="notes-point-delete" title="Remove">×</button>
  `;
  linesList.appendChild(row);

  const input  = row.querySelector('input');
  const delBtn = row.querySelector('.notes-point-delete');

  input.addEventListener('keydown', e => {
    // Enter → new line below
    if (e.key === 'Enter') {
      e.preventDefault();
      addLineRow(linesList, '', true);
    }
    // Backspace on empty → remove line; if last line in section, add new section instead
    if (e.key === 'Backspace' && input.value === '') {
      if (linesList.children.length > 1) {
        e.preventDefault();
        const prev = row.previousElementSibling;
        row.remove();
        prev?.querySelector('input')?.focus();
      }
    }
    // Tab on last line → add new section
    if (e.key === 'Tab' && !e.shiftKey && row === linesList.lastElementChild) {
      const block   = linesList.closest('.nm-section-block');
      const container = document.getElementById('nm-sections');
      if (block === container.lastElementChild) {
        e.preventDefault();
        addSectionBlock(null, true);
      }
    }
  });

  delBtn.addEventListener('click', () => {
    if (linesList.children.length === 1) { input.value = ''; input.focus(); return; }
    const prev = row.previousElementSibling;
    row.remove();
    (prev ?? linesList.lastElementChild)?.querySelector('input')?.focus();
  });

  if (focusIt) setTimeout(() => input.focus(), 0);
  return row;
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveModal() {
  const title   = document.getElementById('nm-title').value.trim();
  const tagsRaw = document.getElementById('nm-tags').value.trim();
  const pinned  = document.getElementById('nm-pinned').checked;
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const status  = document.getElementById('nm-status');

  // Collect sections — only keep non-empty content
  const sections = [...document.querySelectorAll('.nm-section-block')].map(block => ({
    subtitle: block.querySelector('.nm-subtitle-input').value.trim(),
    lines:    [...block.querySelectorAll('.notes-point-input')]
                .map(i => i.value.trim())
                .filter(Boolean),
  })).filter(s => s.subtitle || s.lines.length);

  if (!title && sections.length === 0) {
    status.style.color = 'var(--danger)';
    status.textContent = 'Please add a title or at least one line of content.';
    return;
  }

  const saveBtn = document.getElementById('nm-save');
  saveBtn.disabled = true;
  status.style.color = 'var(--text-muted)';
  status.textContent = 'Saving…';

  const result = _editingId
    ? await updateNote(_editingId, { title, sections, tags, pinned })
    : await addNote({ title, sections, tags, pinned });

  saveBtn.disabled = false;

  if (result?.error) {
    status.style.color = 'var(--danger)';
    status.textContent = result.error;
    return;
  }

  closeModal();
  _renderNotes();
}
