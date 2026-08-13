// src/views/admin/tagsAdmin.js
import { nav } from '../../router.js';
import { supabase } from '../../supabase.js';

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

let editingId = null;

export async function renderAdminTags() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-tags-view">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-admin">${BACK} Dashboard</button>
        <div>
          <div class="admin-eyebrow">Admin</div>
          <h1 class="admin-title">Tags</h1>
        </div>
      </div>

      <div class="admin-two-col">
        <!-- Tag form -->
        <div class="admin-form-card">
          <h3 id="tag-form-title">Add Tag</h3>
          <div class="aw-form-group" style="margin-top:1rem;">
            <label class="aw-label">Name</label>
            <input class="aw-input" id="tag-name" type="text" placeholder="e.g. transport" />
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Colour</label>
            <div style="display:flex;gap:0.5rem;align-items:center;">
              <input type="color" id="tag-color" value="#6b8c84" style="width:40px;height:36px;border:1px solid var(--border-color);border-radius:0.4rem;cursor:pointer;padding:2px;" />
              <span id="tag-color-val" style="font-size:0.8rem;color:var(--text-muted);">#6b8c84</span>
            </div>
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Sort order</label>
            <input class="aw-input" id="tag-order" type="number" value="0" min="0" />
          </div>
          <div id="tag-form-status" style="font-size:0.8rem;margin-top:0.5rem;"></div>
          <div style="display:flex;gap:0.5rem;margin-top:1rem;">
            <button class="btn-primary" id="btn-save-tag">Save Tag</button>
            <button class="btn-secondary" id="btn-cancel-edit" style="display:none;">Cancel</button>
          </div>
        </div>

        <!-- Tags list -->
        <div id="tags-list-wrap"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-admin').addEventListener('click', () => nav.adminDashboard());
  document.getElementById('tag-color').addEventListener('input', e => {
    document.getElementById('tag-color-val').textContent = e.target.value;
  });
  document.getElementById('btn-save-tag').addEventListener('click', saveTag);
  document.getElementById('btn-cancel-edit').addEventListener('click', cancelEdit);

  await loadTags();
}

async function loadTags() {
  const wrap = document.getElementById('tags-list-wrap');
  if (!wrap) return;
  const { data: tags, error } = await supabase.from('tags').select('*').order('sort_order').order('name');
  if (error) { wrap.innerHTML = `<p class="admin-error">${esc(error.message)}</p>`; return; }

  wrap.innerHTML = `
    <div class="admin-tags-list">
      ${(tags ?? []).map(t => `
        <div class="admin-tag-row">
          <span class="admin-tag-pill" style="background:${esc(t.color)}20;color:${esc(t.color)};border-color:${esc(t.color)}40;">
            ${esc(t.name)}
          </span>
          <span style="font-size:0.8rem;color:var(--text-muted);">order: ${t.sort_order}</span>
          <div style="display:flex;gap:0.4rem;margin-left:auto;">
            <button class="admin-icon-btn btn-edit-tag" data-id="${esc(t.id)}" data-name="${esc(t.name)}" data-color="${esc(t.color)}" data-order="${t.sort_order}">${EDIT}</button>
            <button class="admin-icon-btn btn-delete-tag" data-id="${esc(t.id)}" data-name="${esc(t.name)}">${TRASH}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  wrap.querySelectorAll('.btn-edit-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      editingId = btn.dataset.id;
      document.getElementById('tag-name').value  = btn.dataset.name;
      document.getElementById('tag-color').value  = btn.dataset.color;
      document.getElementById('tag-color-val').textContent = btn.dataset.color;
      document.getElementById('tag-order').value  = btn.dataset.order;
      document.getElementById('tag-form-title').textContent = 'Edit Tag';
      document.getElementById('btn-cancel-edit').style.display = '';
    });
  });

  wrap.querySelectorAll('.btn-delete-tag').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Delete tag "${btn.dataset.name}"?`)) return;
      const { error } = await supabase.from('tags').delete().eq('id', btn.dataset.id);
      if (error) alert(error.message);
      else await loadTags();
    });
  });
}

async function saveTag() {
  const name  = document.getElementById('tag-name').value.trim();
  const color = document.getElementById('tag-color').value;
  const sort_order = parseInt(document.getElementById('tag-order').value) || 0;
  const status = document.getElementById('tag-form-status');

  if (!name) { status.style.color='var(--danger)'; status.textContent='Name is required.'; return; }

  let error;
  if (editingId) {
    ({ error } = await supabase.from('tags').update({ name, color, sort_order }).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('tags').insert({ name, color, sort_order }));
  }

  if (error) { status.style.color='var(--danger)'; status.textContent=error.message; return; }
  status.style.color='var(--success)'; status.textContent='Saved!';
  setTimeout(() => { status.textContent=''; }, 2000);
  cancelEdit();
  await loadTags();
}

function cancelEdit() {
  editingId = null;
  document.getElementById('tag-name').value  = '';
  document.getElementById('tag-color').value  = '#6b8c84';
  document.getElementById('tag-color-val').textContent = '#6b8c84';
  document.getElementById('tag-order').value  = '0';
  document.getElementById('tag-form-title').textContent = 'Add Tag';
  document.getElementById('btn-cancel-edit').style.display = 'none';
}
