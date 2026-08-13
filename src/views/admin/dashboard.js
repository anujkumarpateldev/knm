// src/views/admin/dashboard.js
import { nav } from '../../router.js';
import { state } from '../../state.js';

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

export function renderAdminDashboard() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-dashboard">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-home">${BACK} Home</button>
        <div>
          <div class="admin-eyebrow">Admin Panel</div>
          <h1 class="admin-title">Dashboard</h1>
        </div>
      </div>

      <div class="admin-cards-grid">
        <div class="admin-nav-card" id="nav-users">
          <div class="admin-nav-icon" style="background:rgba(59,130,246,0.12);color:#3b82f6;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3>Users</h3>
          <p>View, activate, deactivate and invite users</p>
        </div>

        <div class="admin-nav-card" id="nav-words">
          <div class="admin-nav-icon" style="background:rgba(16,185,129,0.12);color:#10b981;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </div>
          <h3>Word Dictionary</h3>
          <p>Review and edit the shared Dutch vocabulary dictionary</p>
        </div>

        <div class="admin-nav-card" id="nav-tags">
          <div class="admin-nav-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <h3>Tags</h3>
          <p>Manage predefined vocabulary tags shown as suggestions</p>
        </div>

        <div class="admin-nav-card" id="nav-email">
          <div class="admin-nav-icon" style="background:rgba(139,92,246,0.12);color:#8b5cf6;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h3>Email Users</h3>
          <p>Draft and send emails to selected users</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-home').addEventListener('click', () => nav.landing());
  document.getElementById('nav-users').addEventListener('click', () => nav.adminUsers());
  document.getElementById('nav-words').addEventListener('click', () => nav.adminWords());
  document.getElementById('nav-tags').addEventListener('click', () => nav.adminTags());
  document.getElementById('nav-email').addEventListener('click', () => nav.adminEmail());
}
