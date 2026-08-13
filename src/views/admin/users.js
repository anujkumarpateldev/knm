// src/views/admin/users.js
import { nav } from '../../router.js';
import { supabase } from '../../supabase.js';
import { state } from '../../state.js';

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const ADMIN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ops`;

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

async function callAdminOp(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(ADMIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  });
  return res.json();
}

export async function renderAdminUsers() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

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
      <div id="users-table-wrap" class="admin-table-wrap">
        <div class="admin-loading">Loading users…</div>
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
  setupInviteModal();
  await loadUsers();
}

async function loadUsers() {
  const wrap = document.getElementById('users-table-wrap');
  if (!wrap) return;

  const result = await callAdminOp('listUsers');
  if (result.error) {
    wrap.innerHTML = `<p class="admin-error">${esc(result.error)}</p>`;
    return;
  }

  const users = result.users ?? [];
  if (!users.length) {
    wrap.innerHTML = `<p style="color:var(--text-muted);padding:2rem;">No users found.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Words</th>
          <th>Last Login</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr data-uid="${esc(u.user_id)}">
            <td class="admin-td-email">${esc(u.email)}</td>
            <td><span class="admin-role-badge admin-role-${esc(u.role)}">${esc(u.role)}</span></td>
            <td><span class="admin-status-badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${u.word_count ?? 0}</td>
            <td>${fmtDate(u.last_login_at)}</td>
            <td>${fmtDate(u.created_at)}</td>
            <td>
              <button class="admin-action-btn ${u.is_active ? 'btn-deactivate' : 'btn-reactivate'}"
                data-uid="${esc(u.user_id)}"
                data-active="${u.is_active}">
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
}

async function toggleUser(userId, currentlyActive) {
  const action = currentlyActive ? 'Deactivate' : 'Reactivate';
  if (!confirm(`${action} this user?`)) return;

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
    const email = document.getElementById('invite-email').value.trim();
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
