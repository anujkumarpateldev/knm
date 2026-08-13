// src/views/admin/emailComposer.js
import { nav } from '../../router.js';
import { supabase } from '../../supabase.js';
import { state } from '../../state.js';

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const ADMIN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ops`;

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

let allUsers = [];
let selectedIds = new Set();

async function callAdminOp(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(ADMIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  });
  return res.json();
}

export async function renderEmailComposer() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  selectedIds = new Set();

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-email-view">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-admin">${BACK} Dashboard</button>
        <div>
          <div class="admin-eyebrow">Admin</div>
          <h1 class="admin-title">Email Users</h1>
        </div>
      </div>

      <div class="admin-email-layout">
        <!-- Recipient selector -->
        <div class="admin-form-card admin-recipients-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.875rem;">
            <h3>Recipients</h3>
            <div style="display:flex;gap:0.5rem;">
              <button class="admin-action-btn" id="btn-select-all">All</button>
              <button class="admin-action-btn" id="btn-select-active">Active only</button>
              <button class="admin-action-btn" id="btn-deselect-all">Clear</button>
            </div>
          </div>
          <div id="recipient-count" style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem;">Loading users…</div>
          <div id="recipients-list" class="admin-recipients-list"></div>
        </div>

        <!-- Composer -->
        <div class="admin-form-card admin-composer-card">
          <h3 style="margin-bottom:1rem;">Compose Email</h3>
          <div class="aw-form-group">
            <label class="aw-label">Subject <span class="aw-required">*</span></label>
            <input class="aw-input" id="email-subject" type="text" placeholder="e.g. New features in DutchExamPro" />
          </div>
          <div class="aw-form-group">
            <label class="aw-label">Message <span class="aw-required">*</span></label>
            <textarea class="aw-input aw-textarea" id="email-body" rows="10"
              placeholder="Write your message here. Plain text — line breaks are preserved."></textarea>
          </div>
          <div id="email-status" style="font-size:0.875rem;margin-top:0.5rem;"></div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem;align-items:center;">
            <span id="send-to-label" style="font-size:0.85rem;color:var(--text-muted);">0 recipients selected</span>
            <button class="btn-primary" id="btn-send-email" style="margin-left:auto;" disabled>Send Email</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-admin').addEventListener('click', () => nav.adminDashboard());
  document.getElementById('btn-select-all').addEventListener('click',    () => selectGroup('all'));
  document.getElementById('btn-select-active').addEventListener('click', () => selectGroup('active'));
  document.getElementById('btn-deselect-all').addEventListener('click',  () => selectGroup('none'));
  document.getElementById('btn-send-email').addEventListener('click', sendEmail);

  await loadRecipients();
}

async function loadRecipients() {
  const result = await callAdminOp('listUsers');
  allUsers = result.users ?? [];

  renderRecipientList();
  document.getElementById('recipient-count').textContent =
    `${allUsers.length} user${allUsers.length !== 1 ? 's' : ''} total`;
}

function renderRecipientList() {
  const list = document.getElementById('recipients-list');
  list.innerHTML = allUsers.map(u => `
    <label class="admin-recipient-row ${!u.is_active ? 'recipient-inactive' : ''}">
      <input type="checkbox" class="recipient-check" value="${esc(u.user_id)}"
        ${selectedIds.has(u.user_id) ? 'checked' : ''} />
      <span class="recipient-email">${esc(u.email)}</span>
      ${!u.is_active ? '<span class="admin-status-badge badge-inactive" style="font-size:0.65rem;">inactive</span>' : ''}
    </label>
  `).join('');

  list.querySelectorAll('.recipient-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.value);
      else selectedIds.delete(cb.value);
      updateSendButton();
    });
  });

  updateSendButton();
}

function selectGroup(group) {
  if (group === 'all')    allUsers.forEach(u => selectedIds.add(u.user_id));
  if (group === 'active') allUsers.forEach(u => { if (u.is_active) selectedIds.add(u.user_id); else selectedIds.delete(u.user_id); });
  if (group === 'none')   selectedIds.clear();
  renderRecipientList();
}

function updateSendButton() {
  const n = selectedIds.size;
  document.getElementById('send-to-label').textContent = `${n} recipient${n !== 1 ? 's' : ''} selected`;
  document.getElementById('btn-send-email').disabled = n === 0;
}

async function sendEmail() {
  const subject = document.getElementById('email-subject').value.trim();
  const body    = document.getElementById('email-body').value.trim();
  const status  = document.getElementById('email-status');

  if (!subject || !body) { status.style.color='var(--danger)'; status.textContent='Subject and message are required.'; return; }
  if (!selectedIds.size)  { status.style.color='var(--danger)'; status.textContent='Select at least one recipient.'; return; }
  if (!confirm(`Send to ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''}?`)) return;

  const btn = document.getElementById('btn-send-email');
  btn.disabled = true;
  status.style.color = 'var(--text-muted)';
  status.textContent = 'Saving campaign…';

  // Save campaign record first
  const { data: campaign, error: campErr } = await supabase.from('email_campaigns').insert({
    sent_by:       state.currentUser.id,
    subject,
    body,
    recipient_ids: [...selectedIds],
    status:        'draft',
  }).select().single();

  if (campErr) { status.style.color='var(--danger)'; status.textContent=campErr.message; btn.disabled=false; return; }

  status.textContent = `Sending to ${selectedIds.size} users…`;

  const result = await callAdminOp('sendEmail', {
    campaignId:   campaign.id,
    subject,
    body,
    recipientIds: [...selectedIds],
  });

  btn.disabled = false;
  if (result.error) {
    status.style.color = 'var(--danger)';
    status.textContent = `Error: ${result.error}`;
  } else {
    status.style.color = 'var(--success)';
    status.textContent = `Sent to ${result.sent} user${result.sent !== 1 ? 's' : ''} successfully.`;
    document.getElementById('email-subject').value = '';
    document.getElementById('email-body').value = '';
    selectedIds.clear();
    renderRecipientList();
  }
}
