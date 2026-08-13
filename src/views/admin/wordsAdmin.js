// src/views/admin/wordsAdmin.js
import { nav } from '../../router.js';
import { supabase } from '../../supabase.js';
import { runAIFill, loadAllTags, setupTagsAutocomplete } from '../../utils/aiFill.js';

const BACK    = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const SPARKLE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10 L13.5 11 L12 18 L10.5 11 L4 10 L10.5 9 Z"/></svg>`;
const PAGE_SIZES = [10, 25, 50, 100];

let currentPage  = 0;
let pageSize     = 25;
let searchQuery  = '';
let totalCount   = 0;
let editingWord  = null;

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export async function renderAdminWords() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  currentPage = 0; pageSize = 25; searchQuery = ''; editingWord = null;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-words-view">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-admin">${BACK} Dashboard</button>
        <div>
          <div class="admin-eyebrow">Admin</div>
          <h1 class="admin-title">Word Dictionary</h1>
        </div>
        <button class="btn-primary" id="btn-add-word" style="margin-left:auto;">+ Add Word</button>
      </div>

      <div class="admin-toolbar">
        <input class="aw-input" id="dict-search" type="text"
          placeholder="Search Dutch or English…" style="max-width:300px;" />
        <span id="dict-count" style="color:var(--text-muted);font-size:0.875rem;"></span>
        <div class="admin-per-page" style="margin-left:auto;">
          <label class="admin-per-page-label">Per page</label>
          <select class="admin-per-page-select" id="dict-per-page">
            ${PAGE_SIZES.map(n => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="dict-table-wrap" class="admin-table-wrap">
        <div class="admin-loading">Loading…</div>
      </div>

      <div class="admin-pagination" id="dict-pagination" style="display:none;">
        <button class="btn-secondary" id="btn-first-page" title="First">«</button>
        <button class="btn-secondary" id="btn-prev-page">← Prev</button>
        <span id="dict-page-info" style="color:var(--text-muted);font-size:0.875rem;"></span>
        <button class="btn-secondary" id="btn-next-page">Next →</button>
        <button class="btn-secondary" id="btn-last-page" title="Last">»</button>
      </div>

      <!-- Add Word modal -->
      <div class="admin-modal-backdrop" id="word-add-modal" style="display:none;">
        <div class="admin-modal" style="max-width:500px;">
          <h3>Add Word</h3>
          <div class="aw-form-group" style="margin-top:1rem;">
            <label class="aw-label">Dutch <span class="aw-required">*</span></label>
            <div class="aw-dutch-row">
              <input class="aw-input" id="add-dutch" type="text" placeholder="e.g. de fiets" autocomplete="off" />
              <button type="button" class="btn-ai-fill" id="btn-ai-fill-admin" title="Auto-fill with AI">
                ${SPARKLE} AI Fill
              </button>
            </div>
            <div class="aw-ai-status" id="add-ai-status" style="display:none;"></div>
          </div>
          <div class="aw-form-group">
            <label class="aw-label">English <span class="aw-required">*</span></label>
            <input class="aw-input" id="add-english" type="text" placeholder="e.g. the bicycle" />
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Meaning</label>
            <input class="aw-input" id="add-meaning" type="text" placeholder="e.g. A two-wheeled vehicle…" />
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Example sentence</label>
            <textarea class="aw-input aw-textarea" id="add-example" rows="2"
              placeholder="e.g. Ik ga op de fiets naar het werk."></textarea>
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Labels <span class="aw-hint">(comma-separated, optional)</span></label>
            <input class="aw-input" id="add-tags" type="text" placeholder="e.g. transport, work, daily life" />
          </div>
          <div id="add-word-status" style="font-size:0.8rem;margin-top:0.5rem;"></div>
          <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:flex-end;">
            <button class="btn-secondary" id="btn-add-cancel">Cancel</button>
            <button class="btn-primary"   id="btn-add-save">Add Word</button>
          </div>
        </div>
      </div>

      <!-- Edit modal -->
      <div class="admin-modal-backdrop" id="word-edit-modal" style="display:none;">
        <div class="admin-modal" style="max-width:500px;">
          <h3>Edit Word</h3>
          <div class="aw-form-group" style="margin-top:1rem;">
            <label class="aw-label">Dutch</label>
            <input class="aw-input" id="edit-dutch" type="text" />
          </div>
          <div class="aw-form-group">
            <label class="aw-label">English</label>
            <input class="aw-input" id="edit-english" type="text" />
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Meaning</label>
            <input class="aw-input" id="edit-meaning" type="text" />
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Example sentence</label>
            <textarea class="aw-input aw-textarea" id="edit-example" rows="2"></textarea>
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Labels <span class="aw-hint">(comma-separated, optional)</span></label>
            <input class="aw-input" id="edit-tags" type="text" placeholder="e.g. transport, work, daily life" />
          </div>
          <div id="edit-word-status" style="font-size:0.8rem;margin-top:0.5rem;"></div>
          <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:flex-end;">
            <button class="btn-secondary" id="btn-edit-cancel">Cancel</button>
            <button class="btn-primary"   id="btn-edit-save">Save</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-admin').addEventListener('click', () => nav.adminDashboard());

  let searchTimer;
  document.getElementById('dict-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { searchQuery = e.target.value.trim(); currentPage = 0; loadWords(); }, 300);
  });

  document.getElementById('dict-per-page').addEventListener('change', e => {
    pageSize    = parseInt(e.target.value);
    currentPage = 0;
    loadWords();
  });

  document.getElementById('btn-first-page').addEventListener('click', () => { currentPage = 0; loadWords(); });
  document.getElementById('btn-prev-page').addEventListener('click',  () => { if (currentPage > 0) { currentPage--; loadWords(); } });
  document.getElementById('btn-next-page').addEventListener('click',  () => { currentPage++; loadWords(); });
  document.getElementById('btn-last-page').addEventListener('click',  () => {
    currentPage = Math.max(0, Math.ceil(totalCount / pageSize) - 1);
    loadWords();
  });

  // Add Word modal
  const addModal = document.getElementById('word-add-modal');
  document.getElementById('btn-add-word').addEventListener('click', () => {
    document.getElementById('add-dutch').value   = '';
    document.getElementById('add-english').value = '';
    document.getElementById('add-meaning').value = '';
    document.getElementById('add-example').value = '';
    document.getElementById('add-tags').value    = '';
    document.getElementById('add-word-status').textContent = '';
    document.getElementById('add-ai-status').style.display = 'none';
    addModal.style.display = 'flex';
    setTimeout(() => document.getElementById('add-dutch').focus(), 50);
  });
  document.getElementById('btn-ai-fill-admin').addEventListener('click', handleAIFill);
  document.getElementById('btn-add-cancel').addEventListener('click', () => { addModal.style.display = 'none'; });
  addModal.addEventListener('click', e => { if (e.target === addModal) addModal.style.display = 'none'; });
  document.getElementById('btn-add-save').addEventListener('click', addWord);

  // Edit modal
  // Move modals to body so position:fixed works regardless of parent overflow/transform
  ['word-add-modal', 'word-edit-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) document.body.appendChild(el);
  });

  // Edit modal
  const modal = document.getElementById('word-edit-modal');
  document.getElementById('btn-edit-cancel').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('btn-edit-save').addEventListener('click', saveWord);

  await Promise.all([loadWords(), loadAllTags()]);
  setupTagsAutocomplete('add-tags');
  setupTagsAutocomplete('edit-tags');
}

async function loadWords() {
  const wrap = document.getElementById('dict-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="admin-loading">Loading…</div>';

  let query = supabase.from('word_dictionary').select('*', { count: 'exact' });
  if (searchQuery) {
    query = query.or(`dutch_lower.ilike.%${searchQuery.toLowerCase()}%,english.ilike.%${searchQuery}%`);
  }
  const from = currentPage * pageSize;
  const to   = from + pageSize - 1;
  query = query.order('usage_count', { ascending: false }).order('dutch_lower').range(from, to);

  const { data: words, count, error } = await query;
  if (error) { wrap.innerHTML = `<p class="admin-error">${esc(error.message)}</p>`; return; }

  totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // Clamp page in case pageSize changed
  if (currentPage >= totalPages) { currentPage = totalPages - 1; }

  const countEl = document.getElementById('dict-count');
  if (countEl) countEl.textContent = `${totalCount} word${totalCount !== 1 ? 's' : ''}`;

  // Pagination
  const pagination = document.getElementById('dict-pagination');
  if (totalPages > 1) {
    pagination.style.display = 'flex';
    document.getElementById('dict-page-info').textContent =
      `Page ${currentPage + 1} of ${totalPages} — showing ${from + 1}–${Math.min(from + pageSize, totalCount)} of ${totalCount}`;
    document.getElementById('btn-first-page').disabled = currentPage === 0;
    document.getElementById('btn-prev-page').disabled  = currentPage === 0;
    document.getElementById('btn-next-page').disabled  = currentPage >= totalPages - 1;
    document.getElementById('btn-last-page').disabled  = currentPage >= totalPages - 1;
  } else {
    pagination.style.display = 'none';
  }

  if (!words?.length) {
    wrap.innerHTML = `<p style="color:var(--text-muted);padding:2rem;">No words found.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Dutch</th><th>English</th><th>Meaning</th><th>Example</th><th>Uses</th><th></th>
      </tr></thead>
      <tbody>
        ${words.map(w => `
          <tr>
            <td><strong>${esc(w.dutch)}</strong></td>
            <td>${esc(w.english)}</td>
            <td class="admin-td-muted">${esc(w.meaning || '—')}</td>
            <td class="admin-td-muted admin-td-example">${esc(w.example || '—')}</td>
            <td>${w.usage_count}</td>
            <td>
              <button class="admin-action-btn btn-edit-word"
                data-id="${esc(w.id)}" data-dutch="${esc(w.dutch)}" data-english="${esc(w.english)}"
                data-meaning="${esc(w.meaning || '')}" data-example="${esc(w.example || '')}"
                data-tags="${esc((w.tags || []).join(', '))}">
                Edit
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('.btn-edit-word').forEach(btn => {
    btn.addEventListener('click', () => {
      editingWord = btn.dataset.id;
      document.getElementById('edit-dutch').value   = btn.dataset.dutch;
      document.getElementById('edit-english').value = btn.dataset.english;
      document.getElementById('edit-meaning').value = btn.dataset.meaning;
      document.getElementById('edit-example').value = btn.dataset.example;
      document.getElementById('edit-tags').value    = btn.dataset.tags;
      document.getElementById('edit-word-status').textContent = '';
      document.getElementById('word-edit-modal').style.display = 'flex';
    });
  });
}

async function handleAIFill() {
  const dutch  = document.getElementById('add-dutch').value.trim();
  const btn    = document.getElementById('btn-ai-fill-admin');
  const status = document.getElementById('add-ai-status');

  if (!dutch) { document.getElementById('add-dutch').focus(); return; }

  await runAIFill({
    dutch,
    btn,
    status,
    fields: {
      english: 'add-english',
      meaning: 'add-meaning',
      example: 'add-example',
    },
    dutchInputId: 'add-dutch',
    onRetrigger: () => handleAIFill(),
  });
}

async function addWord() {
  const dutch   = document.getElementById('add-dutch').value.trim();
  const english = document.getElementById('add-english').value.trim();
  const meaning = document.getElementById('add-meaning').value.trim();
  const example = document.getElementById('add-example').value.trim();
  const tagsRaw = document.getElementById('add-tags').value.trim();
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const status  = document.getElementById('add-word-status');

  if (!dutch || !english) {
    status.style.color = 'var(--danger)';
    status.textContent = 'Dutch and English are required.';
    return;
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('word_dictionary')
    .select('id, dutch')
    .eq('dutch_lower', dutch.toLowerCase())
    .maybeSingle();

  if (existing) {
    status.style.color = 'var(--danger)';
    status.textContent = `"${existing.dutch}" already exists in the dictionary.`;
    return;
  }

  const btn = document.getElementById('btn-add-save');
  btn.disabled = true;
  status.style.color = 'var(--text-muted)';
  status.textContent = 'Saving…';

  const { error } = await supabase
    .from('word_dictionary')
    .insert({ dutch, english, meaning: meaning || '', example: example || '', tags });

  btn.disabled = false;

  if (error) {
    status.style.color = 'var(--danger)';
    status.textContent = error.message;
    return;
  }

  document.getElementById('word-add-modal').style.display = 'none';
  currentPage = 0;
  await loadWords();
}

async function saveWord() {
  if (!editingWord) return;
  const status = document.getElementById('edit-word-status');
  const editTagsRaw = document.getElementById('edit-tags').value.trim();
  const editTags    = editTagsRaw ? editTagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const { error } = await supabase.from('word_dictionary').update({
    dutch:   document.getElementById('edit-dutch').value.trim(),
    english: document.getElementById('edit-english').value.trim(),
    meaning: document.getElementById('edit-meaning').value.trim(),
    example: document.getElementById('edit-example').value.trim(),
    tags:    editTags,
  }).eq('id', editingWord);

  if (error) { status.style.color = 'var(--danger)'; status.textContent = error.message; return; }
  document.getElementById('word-edit-modal').style.display = 'none';
  await loadWords();
}
