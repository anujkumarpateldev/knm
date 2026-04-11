import { nav } from '../router.js';

export function showAuthModal() {
  const overlay = document.createElement('div');
  overlay.id = 'auth-gate-overlay';
  overlay.innerHTML = `
    <div class="auth-gate-modal">
      <div class="auth-gate-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <h3 class="auth-gate-title">Members Only</h3>
      <p class="auth-gate-body">Create a free account to access this feature and track your progress.</p>
      <div class="auth-gate-actions">
        <button class="auth-gate-btn-primary" id="auth-gate-register">Register — it's free</button>
        <button class="auth-gate-btn-secondary" id="auth-gate-login">I already have an account</button>
      </div>
      <button class="auth-gate-dismiss" id="auth-gate-close" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.6);
    backdrop-filter:blur(4px); display:flex; align-items:center;
    justify-content:center; z-index:999; padding:1rem;
    animation:fadeIn 0.2s ease;
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('auth-gate-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('auth-gate-register').addEventListener('click', () => {
    close();
    nav.auth();
    setTimeout(() => document.getElementById('tab-register')?.click(), 50);
  });
  document.getElementById('auth-gate-login').addEventListener('click', () => { close(); nav.auth(); });
}
