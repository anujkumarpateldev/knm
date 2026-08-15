// src/views/profile.js
import { supabase } from '../supabase.js';
import { state }    from '../state.js';
import { nav }      from '../router.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;

export function renderProfile() {
  if (!state.currentUser) { nav.auth(); return; }

  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  const user        = state.currentUser;
  const email       = user.email ?? '';
  const displayName = user.user_metadata?.display_name ?? email.split('@')[0];
  const joined      = new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="profile-view">
      <div class="static-page" style="max-width:640px;">

        <div class="static-page-header">
          <button class="btn-back" id="btn-profile-back">${BACK_ICON} Back</button>
          <div>
            <h1 class="static-page-title">Account Settings</h1>
            <p class="static-page-meta">Manage your profile and account</p>
          </div>
        </div>

        <!-- Avatar + summary -->
        <div class="profile-summary">
          <div class="profile-avatar">${displayName[0].toUpperCase()}</div>
          <div>
            <div class="profile-name">${esc(displayName)}</div>
            <div class="profile-email">${esc(email)}</div>
            <div class="profile-joined">Member since ${joined}</div>
          </div>
        </div>

        <!-- Display name -->
        <div class="profile-section">
          <h2 class="profile-section-title">Display Name</h2>
          <div class="aw-form-group" style="margin-bottom:0.75rem;">
            <input class="aw-input" id="pf-display-name" type="text" value="${esc(displayName)}"
              placeholder="Your display name" maxlength="40" autocomplete="nickname" />
          </div>
          <div id="pf-name-status" class="profile-status" style="display:none;"></div>
          <button class="btn-primary profile-btn" id="pf-btn-save-name">Save Name</button>
        </div>

        <!-- Change password -->
        <div class="profile-section">
          <h2 class="profile-section-title">Change Password</h2>
          <div class="aw-form-group">
            <label class="aw-label">New password</label>
            <input class="aw-input" id="pf-new-password" type="password" placeholder="At least 8 characters"
              autocomplete="new-password" />
          </div>
          <div class="aw-form-group" style="margin-bottom:0.75rem;">
            <label class="aw-label">Confirm new password</label>
            <input class="aw-input" id="pf-confirm-password" type="password" placeholder="Repeat password"
              autocomplete="new-password" />
          </div>
          <div id="pf-pw-status" class="profile-status" style="display:none;"></div>
          <button class="btn-primary profile-btn" id="pf-btn-save-pw">Update Password</button>
        </div>

        <!-- Danger zone -->
        <div class="profile-section profile-danger-zone">
          <h2 class="profile-section-title profile-danger-title">Danger Zone</h2>
          <p class="profile-danger-desc">
            Deleting your account will permanently remove your progress, word journal, and all personal data.
            This action cannot be undone.
          </p>
          <div id="pf-delete-status" class="profile-status" style="display:none;"></div>
          <button class="btn-danger profile-btn" id="pf-btn-delete">Delete My Account</button>
        </div>

      </div>
    </div>
  `;

  document.getElementById('btn-profile-back').addEventListener('click', () => nav.landing());

  // ── Save display name ───────────────────────────────────────────────────────
  document.getElementById('pf-btn-save-name').addEventListener('click', async () => {
    const name   = document.getElementById('pf-display-name').value.trim();
    const status = document.getElementById('pf-name-status');
    const btn    = document.getElementById('pf-btn-save-name');

    if (!name) { showStatus(status, 'error', 'Name cannot be empty.'); return; }

    btn.disabled = true; btn.textContent = 'Saving…';

    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });

    btn.disabled = false; btn.textContent = 'Save Name';

    if (error) {
      showStatus(status, 'error', error.message);
    } else {
      // Patch local state
      state.currentUser = { ...state.currentUser, user_metadata: { ...state.currentUser.user_metadata, display_name: name } };
      // Update profile page elements
      document.querySelector('.profile-name').textContent = name;
      document.querySelector('.profile-avatar').textContent = name[0].toUpperCase();
      // Update header immediately
      const initial = name[0].toUpperCase();
      const headerUsername = document.querySelector('.header-username');
      const dropdownAvatar = document.querySelector('.dropdown-avatar');
      const dropdownName   = document.querySelector('.dropdown-name');
      if (headerUsername) headerUsername.textContent = name;
      if (dropdownAvatar) dropdownAvatar.textContent = initial;
      if (dropdownName)   dropdownName.textContent   = name;
      showStatus(status, 'success', 'Display name updated.');
    }
  });

  // ── Change password ─────────────────────────────────────────────────────────
  document.getElementById('pf-btn-save-pw').addEventListener('click', async () => {
    const pw1    = document.getElementById('pf-new-password').value;
    const pw2    = document.getElementById('pf-confirm-password').value;
    const status = document.getElementById('pf-pw-status');
    const btn    = document.getElementById('pf-btn-save-pw');

    if (!pw1) { showStatus(status, 'error', 'Please enter a new password.'); return; }
    if (pw1.length < 8) { showStatus(status, 'error', 'Password must be at least 8 characters.'); return; }
    if (pw1 !== pw2)    { showStatus(status, 'error', 'Passwords do not match.'); return; }

    btn.disabled = true; btn.textContent = 'Updating…';

    const { error } = await supabase.auth.updateUser({ password: pw1 });

    btn.disabled = false; btn.textContent = 'Update Password';

    if (error) {
      showStatus(status, 'error', error.message);
    } else {
      document.getElementById('pf-new-password').value     = '';
      document.getElementById('pf-confirm-password').value = '';
      showStatus(status, 'success', 'Password updated successfully.');
    }
  });

  // ── Delete account ──────────────────────────────────────────────────────────
  document.getElementById('pf-btn-delete').addEventListener('click', async () => {
    const status = document.getElementById('pf-delete-status');

    const confirmed = confirm(
      'Are you sure you want to delete your account?\n\n' +
      'This will permanently erase your progress, word journal, and all personal data. ' +
      'This cannot be undone.'
    );
    if (!confirmed) return;

    const btn = document.getElementById('pf-btn-delete');
    btn.disabled = true; btn.textContent = 'Deleting…';

    // Delete user's words
    await supabase.from('user_words').delete().eq('user_id', state.currentUser.id);

    // Deactivate profile (marks account as inactive — deactivated screen shown on next login)
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('user_id', state.currentUser.id);

    if (error) {
      btn.disabled = false; btn.textContent = 'Delete My Account';
      showStatus(status, 'error', 'Could not delete account. Please contact support.');
      return;
    }

    await supabase.auth.signOut();
    state.currentUser  = null;
    state.userProfile  = null;
    state.myWords      = [];
    nav.landing();
  });
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showStatus(el, type, msg) {
  el.style.display = 'block';
  el.className = `profile-status profile-status-${type}`;
  el.textContent = msg;
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 4000);
}
