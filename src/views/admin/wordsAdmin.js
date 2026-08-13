// src/views/admin/wordsAdmin.js
import { nav } from '../../router.js';
import { supabase } from '../../supabase.js';

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const PAGE_SIZE = 30;
let currentPage = 0;
let searchQuery = '';
let editingWord = null;

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export async function renderAdminWords() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  currentPage = 0; searchQuery = ''; editingWord = null;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-words-view">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-admin">${BACK} Dashboard</button>
        <div>
          <div class="admin-eyebrow">Admin</div>
          <h1 class="admin-title">Word Dictionary</h1>
        </div>
      </div>

      <div class="admin-search-bar">
        <input class="aw-input" id="dict-search" type="text" placeholder="Search Dutch or English…" style="max-width:320px;" />
        <span id="dict-count" style="color:var(--text-muted);font-size:0.875rem;"></span>
      </div>

      <div id="dict-table-wrap" class="admin-table-wrap"></div>
      <div class="admin-pagination" id="dict-pagination" style="display:none;">
        <button class="btn-secondary btn-sm" id="btn-prev-page">← Prev</button>
        <span id="page-label" style="color:var(--text-muted);font-size:0.875rem;"></span>
        <button class="btn-secondary btn-sm" id="btn-next-page">Next →</button>
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

  document.getElementById('btn-prev-page').addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadWords(); } });
  document.getElementById('btn-next-page').addEventListener('click', () => { currentPage++; loadWords(); });

  const modal = document.getElementById('word-edit-modal');
  document.getElementById('btn-edit-cancel').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('btn-edit-save').addEventListener('click', saveWord);

  await loadWords();
}

async function loadWords() {
  const wrap = document.getElementById('dict-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="admin-loading">Loading…</div>';

  let query = supabase.from('word_dictionary').select('*', { count: 'exact' });
  if (searchQuery) {
    query = query.or(`dutch_lower.ilike.%${searchQuery.toLowerCase()}%,english.ilike.%${searchQuery}%`);
  }
  query = query.order('usage_count', { ascending: false }).order('dutch_lower').range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

  const { data: words, count, error } = await query;
  if (error) { wrap.innerHTML = `<p class="admin-error">${esc(error.message)}</p>`; return; }

  const total = count ?? 0;
  document.getElementById('dict-count').textContent = `${total} word${total !== 1 ? 's' : ''}`;

  const pagination = document.getElementById('dict-pagination');
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages > 1) {
    pagination.style.display = 'flex';
    document.getElementById('page-label').textContent = `Page ${currentPage + 1} of ${totalPages}`;
    document.getElementById('btn-prev-page').disabled = currentPage === 0;
    document.getElementById('btn-next-page').disabled = currentPage >= totalPages - 1;
  } else {
    pagination.style.display = 'none';
  }

  if (!words?.length) { wrap.innerHTML = `<p style="color:var(--text-muted);padding:2rem;">No words found.</p>`; return; }

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
                data-meaning="${esc(w.meaning)}" data-example="${esc(w.example)}">
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
      document.getElementById('edit-word-status').textContent = '';
      document.getElementById('word-edit-modal').style.display = 'flex';
    });
  });
}

async function saveWord() {
  if (!editingWord) return;
  const status = document.getElementById('edit-word-status');
  const { error } = await supabase.from('word_dictionary').update({
    dutch:   document.getElementById('edit-dutch').value.trim(),
    english: document.getElementById('edit-english').value.trim(),
    meaning: document.getElementById('edit-meaning').value.trim(),
    example: document.getElementById('edit-example').value.trim(),
  }).eq('id', editingWord);

  if (error) { status.style.color='var(--danger)'; status.textContent=error.message; return; }
  document.getElementById('word-edit-modal').style.display = 'none';
  await loadWords();
}
