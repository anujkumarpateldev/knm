// src/views/deactivated.js
// Shown when a user's account has been deactivated by an admin.
import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { nav } from '../router.js';

export function renderDeactivated() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="deactivated-view">
      <div class="deactivated-container">
        <div class="deactivated-icon">🔒</div>
        <h1 class="deactivated-title">Account Suspended</h1>
        <p class="deactivated-msg">
          Your account has been temporarily deactivated.<br>
          Please contact the administrator if you believe this is a mistake.
        </p>
        <button class="btn-secondary" id="btn-deactivated-logout">Sign Out</button>
      </div>
    </div>
  `;

  document.getElementById('btn-deactivated-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    state.currentUser = null;
    state.userProfile = null;
    nav.landing();
  });
}
