// src/views/notes/journal.js
// My Notes — list with pin, search, create/edit modal with numbered points.
import { state }       from '../../state.js';
import { nav }         from '../../router.js';
import { loadNotes, addNote, updateNote, deleteNote, togglePin } from '../../data/notes.js';
import { trackEnter }  from '../../utils/tracker.js';

const BACK_ICON   = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const PIN_ICON    = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`;
const EDIT_ICON   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

let notesSearch = '';

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function noteCardHTML(note) {
  const pointsHtml = note.points.filter(p => p.trim()).map((p, i) =>
    `<li class="note-card-point"><span class="note-point-num">${i + 1}.</span> ${esc(p)}</li>`
  ).join('');
  const tagsHtml = note.tags.length
    ? note.tags.map(t => `<span class="word-tag">${esc(t)}</span>`).join('')
    : '';
  return `
    <div class="note-card ${note.pinned ? 'note-card-pinned' : ''}" data-id="${esc(note.id)}">
      <div class="note-card-header">
        <h3 class="note-card-title">${esc(note.title) || '<em style="opacity:.5">Untitled</em>'}</h3>
        <div class="note-card-actions">
          <button class="btn-icon btn-pin-note ${note.pinned ? 'is-pinned' : ''}" data-id="${esc(note.id)}" title="${note.pinned ? 'Unpin' : 'Pin'}">${PIN_ICON}</button>
          <button class="btn-icon btn-edit-note" data-id="${esc(note.id)}" title="Edit">${EDIT_ICON}</button>
          <button class="btn-icon btn-delete-note" data-id="${esc(note.id)}" title="Delete">${DELETE_ICON}</button>
        </div>
      </div>
      ${pointsHtml ? `<ol class="note-card-points">${pointsHtml}</ol>` : ''}
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

  await loadNotes();
  notesSearch = '';
  _renderNotes();
}

function _renderNotes() {
  const all = state.myNotes ?? [];
  const q   = notesSearch.trim().toLowerCase();
  const filtered = q
    ? all.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.points.some(p => p.toLowerCase().includes(q)) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    : all;

  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  const pinnedSection = pinned.length ? `
    <div class="notes-group">
      <div class="notes-group-label">📌 Pinned</div>
      <div class="notes-grid">${pinned.map(noteCardHTML).join('')}</div>
    </div>` : '';

  const allSection = unpinned.length ? `
    <div class="notes-group">
      ${pinned.length ? `<div class="notes-group-label">Notes</div>` : ''}
      <div class="notes-grid">${unpinned.map(noteCardHTML).join('')}</div>
    </div>` : '';

  const emptyHtml = filtered.length === 0 ? `
    <div class="wj-empty">
      <div class="wj-empty-icon">${q ? '🔍' : '📝'}</div>
      <h3>${q ? 'No results found' : 'No notes yet'}</h3>
      <p>${q ? `Nothing matches "<strong>${esc(q)}</strong>". Try a different search.` : 'Create your first note to keep track of important points.'}</p>
      ${!q ? `<button class="btn-primary" id="btn-add-first-note">+ New Note</button>` : ''}
    </div>` : '';

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="notes-journal-view">
      <div class="wj-page-header">
        <button class="btn-back" id="btn-back-landing">${BACK_ICON} Home</button>
        <div>
          <h1 class="wj-title">My Notes</h1>
          <p class="wj-subtitle">${all.length} note${all.length !== 1 ? 's' : ''}${pinned.length ? ` · ${pinned.length} pinned` : ''}</p>
        </div>
      </div>

      <div class="wj-search-bar">
        <span class="wj-search-icon">${SEARCH_ICON}</span>
        <input class="wj-search-input" id="notes-search" type="search"
          placeholder="Search title, points, tags…"
          value="${esc(notesSearch)}" autocomplete="off" />
        ${notesSearch ? `<button class="wj-search-clear" id="notes-search-clear">×</button>` : ''}
      </div>
      ${q ? `<p class="wj-search-count">${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "<strong>${esc(q)}</strong>"</p>` : ''}

      <div class="notes-top-actions">
        <button class="btn-primary" id="btn-new-note">+ New Note</button>
      </div>

      ${emptyHtml}
      ${pinnedSection}
      ${allSection}
    </div>
  `;

  // ── Nav ─────────────────────────────────────────────────────────────────────
  document.getElementById('btn-back-landing').addEventListener('click', () => nav.landing());
  document.getElementById('btn-new-note').addEventListener('click', () => openModal());
  document.getElementById('btn-add-first-note')?.addEventListener('click', () => openModal());

  // ── Search ──────────────────────────────────────────────────────────────────
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

  // ── Pin ─────────────────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-pin-note').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await togglePin(btn.dataset.id);
      _renderNotes();
    });
  });

  // ── Edit ────────────────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-edit-note').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const note = state.myNotes.find(n => n.id === btn.dataset.id);
      if (note) openModal(note);
    });
  });

  // ── Delete ───────────────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-delete-note').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this note?')) return;
      await deleteNote(btn.dataset.id);
      _renderNotes();
    });
  });

  // Remove any stale modal
  document.getElementById('notes-modal')?.remove();
  _buildModal();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
let _editingId = null;

function _buildModal() {
  const el = document.createElement('div');
  el.className = 'admin-modal-backdrop';
  el.id = 'notes-modal';
  el.style.display = 'none';
  el.innerHTML = `
    <div class="admin-modal notes-modal-inner" style="max-width:560px;width:100%;">
      <h3 id="notes-modal-title">New Note</h3>

      <div class="aw-form-group" style="margin-top:1rem;">
        <label class="aw-label">Title</label>
        <input class="aw-input" id="nm-title" type="text" placeholder="e.g. Grammar tips, Exam notes…" autocomplete="off" />
      </div>

      <div class="aw-form-group">
        <label class="aw-label">Points</label>
        <div id="nm-points-list" class="notes-points-editor"></div>
        <button type="button" class="notes-add-point-btn" id="nm-add-point">+ Add Point</button>
      </div>

      <div class="aw-form-group">
        <label class="aw-label">Tags <span class="aw-hint">(comma-separated, optional)</span></label>
        <input class="aw-input" id="nm-tags" type="text" placeholder="e.g. grammar, exam, speaking" />
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
        <button class="btn-primary" id="nm-save">Save Note</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
  document.getElementById('nm-cancel').addEventListener('click', closeModal);
  document.getElementById('nm-add-point').addEventListener('click', () => addPointRow(''));
  document.getElementById('nm-save').addEventListener('click', saveModal);
}

function openModal(note = null) {
  _editingId = note?.id ?? null;
  document.getElementById('notes-modal-title').textContent = note ? 'Edit Note' : 'New Note';
  document.getElementById('nm-title').value  = note?.title  ?? '';
  document.getElementById('nm-tags').value   = (note?.tags  ?? []).join(', ');
  document.getElementById('nm-pinned').checked = note?.pinned ?? false;
  document.getElementById('nm-status').textContent = '';

  // Clear + fill points
  const list = document.getElementById('nm-points-list');
  list.innerHTML = '';
  const pts = note?.points?.length ? note.points : [''];
  pts.forEach(p => addPointRow(p));

  document.getElementById('notes-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('nm-title').focus(), 50);
}

function closeModal() {
  document.getElementById('notes-modal').style.display = 'none';
  _editingId = null;
}

function addPointRow(value = '', focusIt = false) {
  const list  = document.getElementById('nm-points-list');
  const index = list.children.length + 1;

  const row = document.createElement('div');
  row.className = 'notes-point-row';
  row.innerHTML = `
    <span class="notes-point-num">${index}.</span>
    <input class="notes-point-input aw-input" type="text"
      placeholder="Write your point here…"
      value="${esc(value)}" />
    <button type="button" class="notes-point-delete" title="Remove">×</button>
  `;
  list.appendChild(row);

  const input  = row.querySelector('input');
  const delBtn = row.querySelector('.notes-point-delete');

  // Renumber all rows
  function renumber() {
    [...list.children].forEach((r, i) => {
      r.querySelector('.notes-point-num').textContent = `${i + 1}.`;
    });
  }

  // Enter → new row below
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPointRow('', true);
    }
    // Backspace on empty → remove row, focus previous
    if (e.key === 'Backspace' && input.value === '' && list.children.length > 1) {
      e.preventDefault();
      const prev = row.previousElementSibling;
      row.remove();
      renumber();
      prev?.querySelector('input')?.focus();
    }
  });

  // Tab on last row → add new row
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey && row === list.lastElementChild) {
      e.preventDefault();
      addPointRow('', true);
    }
  });

  delBtn.addEventListener('click', () => {
    if (list.children.length === 1) { input.value = ''; input.focus(); return; }
    const prev = row.previousElementSibling;
    row.remove();
    renumber();
    (prev ?? list.lastElementChild)?.querySelector('input')?.focus();
  });

  if (focusIt) input.focus();
  return row;
}

async function saveModal() {
  const title  = document.getElementById('nm-title').value.trim();
  const tagsRaw= document.getElementById('nm-tags').value.trim();
  const pinned = document.getElementById('nm-pinned').checked;
  const tags   = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const points = [...document.getElementById('nm-points-list').querySelectorAll('.notes-point-input')]
    .map(i => i.value.trim())
    .filter(Boolean);

  const status = document.getElementById('nm-status');

  if (!title && points.length === 0) {
    status.style.color = 'var(--danger)';
    status.textContent = 'Please add a title or at least one point.';
    return;
  }

  const saveBtn = document.getElementById('nm-save');
  saveBtn.disabled = true;
  status.style.color = 'var(--text-muted)';
  status.textContent = 'Saving…';

  const result = _editingId
    ? await updateNote(_editingId, { title, points, tags, pinned })
    : await addNote({ title, points, tags, pinned });

  saveBtn.disabled = false;

  if (result?.error) {
    status.style.color = 'var(--danger)';
    status.textContent = result.error;
    return;
  }

  closeModal();
  _renderNotes();
}
