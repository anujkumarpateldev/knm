// src/views/admin/users.js
import { nav } from '../../router.js';
import { supabase } from '../../supabase.js';
import { state } from '../../state.js';

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const ADMIN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ops`;
const PAGE_SIZES = [10, 25, 50, 100];

let allUsers   = [];
let currentPage = 0;
let pageSize    = 25;

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

async function callAdminOp(action, extra = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(ADMIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok && !res.headers.get('content-type')?.includes('application/json')) {
      return { error: `Edge Function error (${res.status}) — is admin-ops deployed?` };
    }
    return res.json();
  } catch (err) {
    return { error: err.message };
  }
}

export async function renderAdminUsers() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  currentPage = 0;
  pageSize    = 25;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-users-view">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-admin">${BACK} Dashboard</button>
        <div>
          <div class="admin-eyebrow">Admin</div>
          <h1 class="admin-title">Users</h1>
        </div>
        <button class="btn-primary" id="btn-invite-user" style="margin-left:auto;">+ Invite User</button>
      </div>

      <div class="admin-toolbar">
        <span id="users-count" style="color:var(--text-muted);font-size:0.875rem;"></span>
        <div class="admin-per-page">
          <label class="admin-per-page-label">Per page</label>
          <select class="admin-per-page-select" id="users-per-page">
            ${PAGE_SIZES.map(n => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="users-table-wrap" class="admin-table-wrap">
        <div class="admin-loading">Loading users…</div>
      </div>

      <div class="admin-pagination" id="users-pagination" style="display:none;">
        <button class="btn-secondary" id="btn-first-page" title="First">«</button>
        <button class="btn-secondary" id="btn-prev-page">← Prev</button>
        <span id="users-page-info" style="color:var(--text-muted);font-size:0.875rem;"></span>
        <button class="btn-secondary" id="btn-next-page">Next →</button>
        <button class="btn-secondary" id="btn-last-page" title="Last">»</button>
      </div>

      <!-- Invite modal -->
      <div class="admin-modal-backdrop" id="invite-modal" style="display:none;">
        <div class="admin-modal">
          <h3>Invite User</h3>
          <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1rem;">An invitation email will be sent to this address.</p>
          <input class="aw-input" id="invite-email" type="email" placeholder="user@example.com" />
          <div id="invite-status" style="margin-top:0.5rem;font-size:0.8rem;"></div>
          <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:flex-end;">
            <button class="btn-secondary" id="btn-invite-cancel">Cancel</button>
            <button class="btn-primary"   id="btn-invite-send">Send Invite</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-admin').addEventListener('click', () => nav.adminDashboard());

  document.getElementById('users-per-page').addEventListener('change', e => {
    pageSize    = parseInt(e.target.value);
    currentPage = 0;
    renderTable();
  });

  document.getElementById('btn-first-page').addEventListener('click', () => { currentPage = 0; renderTable(); });
  document.getElementById('btn-prev-page').addEventListener('click',  () => { if (currentPage > 0) { currentPage--; renderTable(); } });
  document.getElementById('btn-next-page').addEventListener('click',  () => { currentPage++; renderTable(); });
  document.getElementById('btn-last-page').addEventListener('click',  () => {
    currentPage = Math.max(0, Math.ceil(allUsers.length / pageSize) - 1);
    renderTable();
  });

  // Move modal to body so position:fixed works regardless of parent overflow/transform
  const inviteModalEl = document.getElementById('invite-modal');
  if (inviteModalEl) document.body.appendChild(inviteModalEl);

  setupInviteModal();
  await loadUsers();
}

async function loadUsers() {
  const wrap = document.getElementById('users-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="admin-loading">Loading users…</div>';

  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, role, is_active, last_login_at, created_at, deactivated_at')
    .order('created_at', { ascending: false });

  if (error) { wrap.innerHTML = `<p class="admin-error">${esc(error.message)}</p>`; return; }

  const { data: wordRows } = await supabase.from('user_words').select('user_id');
  const countMap = {};
  (wordRows ?? []).forEach(r => { countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1; });

  allUsers = (profiles ?? []).map(p => ({ ...p, word_count: countMap[p.user_id] ?? 0 }));
  currentPage = 0;
  renderTable();
}

function renderTable() {
  const wrap = document.getElementById('users-table-wrap');
  if (!wrap) return;

  const total      = allUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  currentPage      = Math.min(currentPage, totalPages - 1);
  const start      = currentPage * pageSize;
  const page       = allUsers.slice(start, start + pageSize);

  const countEl = document.getElementById('users-count');
  if (countEl) countEl.textContent = `${total} user${total !== 1 ? 's' : ''}`;

  if (!page.length) {
    wrap.innerHTML = `<p style="color:var(--text-muted);padding:2rem;">No users found.</p>`;
    document.getElementById('users-pagination').style.display = 'none';
    return;
  }

  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Email</th><th>Role</th><th>Status</th>
          <th>Words</th><th>Last Login</th><th>Joined</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${page.map(u => `
          <tr>
            <td class="admin-td-email">${esc(u.email)}</td>
            <td><span class="admin-role-badge admin-role-${esc(u.role)}">${esc(u.role)}</span></td>
            <td><span class="admin-status-badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${u.word_count}</td>
            <td>${fmtDate(u.last_login_at)}</td>
            <td>${fmtDate(u.created_at)}</td>
            <td>
              <button class="admin-action-btn ${u.is_active ? 'btn-deactivate' : 'btn-reactivate'}"
                data-uid="${esc(u.user_id)}" data-active="${u.is_active}">
                ${u.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('.btn-deactivate, .btn-reactivate').forEach(btn => {
    btn.addEventListener('click', () => toggleUser(btn.dataset.uid, btn.dataset.active === 'true'));
  });

  // Pagination controls
  const pagination = document.getElementById('users-pagination');
  if (totalPages > 1) {
    pagination.style.display = 'flex';
    document.getElementById('users-page-info').textContent =
      `Page ${currentPage + 1} of ${totalPages} — showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total}`;
    document.getElementById('btn-first-page').disabled = currentPage === 0;
    document.getElementById('btn-prev-page').disabled  = currentPage === 0;
    document.getElementById('btn-next-page').disabled  = currentPage >= totalPages - 1;
    document.getElementById('btn-last-page').disabled  = currentPage >= totalPages - 1;
  } else {
    pagination.style.display = 'none';
  }
}

async function toggleUser(userId, currentlyActive) {
  if (!confirm(`${currentlyActive ? 'Deactivate' : 'Reactivate'} this user?`)) return;
  const now = new Date().toISOString();
  const updates = currentlyActive
    ? { is_active: false, deactivated_at: now, deactivated_by: state.currentUser.id, reactivated_at: null }
    : { is_active: true,  reactivated_at: now, deactivated_at: null, deactivated_by: null };
  const { error } = await supabase.from('user_profiles').update(updates).eq('user_id', userId);
  if (error) { alert('Error: ' + error.message); return; }
  await loadUsers();
}

function setupInviteModal() {
  const modal   = document.getElementById('invite-modal');
  const openBtn = document.getElementById('btn-invite-user');
  const cancel  = document.getElementById('btn-invite-cancel');
  const send    = document.getElementById('btn-invite-send');

  openBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
  cancel.addEventListener('click',  () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  send.addEventListener('click', async () => {
    const email  = document.getElementById('invite-email').value.trim();
    const status = document.getElementById('invite-status');
    if (!email) return;
    send.disabled = true;
    status.textContent = 'Sending…';
    const result = await callAdminOp('inviteUser', { email });
    send.disabled = false;
    if (result.error) {
      status.style.color = 'var(--danger)';
      status.textContent = result.error;
    } else {
      status.style.color = 'var(--success)';
      status.textContent = `Invite sent to ${email}`;
      setTimeout(() => { modal.style.display = 'none'; loadUsers(); }, 1500);
    }
  });
}
