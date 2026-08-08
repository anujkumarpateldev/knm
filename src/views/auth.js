import { supabase } from '../supabase.js';
import { nav } from '../router.js';

export function renderAuthPage() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="auth-page">
      <div class="auth-scene">
        <div class="auth-card">

          <!-- Left branding panel -->
          <div class="auth-panel-left">
            <div class="auth-flag-stripe">
              <div></div><div></div><div></div>
            </div>
            <div class="auth-panel-inner">
              <div class="auth-panel-logo">
                <img src="/logo.png" alt="DutchExamPro" />
              </div>
              <h2 class="auth-panel-heading">Master your Dutch exam with confidence</h2>
              <ul class="auth-panel-perks">
                <li><span class="perk-check">✓</span> Free to get started</li>
                <li><span class="perk-check">✓</span> 500+ official-style questions</li>
                <li><span class="perk-check">✓</span> Full KNM &amp; Reading practice</li>
                <li><span class="perk-check">✓</span> Track your progress</li>
              </ul>
            </div>
            <div class="auth-panel-deco" aria-hidden="true">
              <svg viewBox="0 0 180 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Tower -->
                <path d="M82 240 L98 240 L93 105 L87 105 Z" fill="white" opacity="0.18"/>
                <!-- Door -->
                <rect x="87" y="218" width="6" height="10" rx="3" fill="white" opacity="0.25"/>
                <!-- Hub -->
                <circle cx="90" cy="102" r="9" fill="white" opacity="0.35"/>
                <circle cx="90" cy="102" r="4" fill="white" opacity="0.5"/>
                <!-- Blade NW -->
                <path d="M90 102 L56 34 L74 28 Z" fill="white" opacity="0.2"/>
                <!-- Blade NE -->
                <path d="M90 102 L158 68 L154 86 Z" fill="white" opacity="0.2"/>
                <!-- Blade SE -->
                <path d="M90 102 L124 170 L106 176 Z" fill="white" opacity="0.2"/>
                <!-- Blade SW -->
                <path d="M90 102 L22 136 L26 118 Z" fill="white" opacity="0.2"/>
                <!-- Ground/base hint -->
                <line x1="60" y1="240" x2="120" y2="240" stroke="white" stroke-width="2" opacity="0.15"/>
              </svg>
            </div>
          </div>

          <!-- Right form panel -->
          <div class="auth-panel-right">
            <div class="auth-form-header" id="auth-form-header">
              <h1 class="auth-form-title">Welcome back</h1>
              <p class="auth-form-sub">Sign in to continue your journey</p>
            </div>

            <!-- Tab switcher -->
            <div class="auth-tabs" id="auth-tabs">
              <div class="auth-tabs-track">
                <div class="auth-tab-indicator" id="tab-indicator"></div>
                <button class="auth-tab active" id="tab-login" data-tab="login">Sign In</button>
                <button class="auth-tab" id="tab-register" data-tab="register">Create Account</button>
              </div>
            </div>

            <!-- Login Form -->
            <form class="auth-form" id="form-login">
              <div class="auth-field">
                <label class="auth-label" for="login-email">Email address</label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input type="email" id="login-email" placeholder="you@example.com" required autocomplete="email" />
                </div>
              </div>
              <div class="auth-field">
                <label class="auth-label" for="login-password">Password</label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type="password" id="login-password" placeholder="Enter your password" required autocomplete="current-password" />
                  <button type="button" class="auth-pw-toggle" data-target="login-password" tabindex="-1">
                    <svg class="eye-show" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg class="eye-hide" style="display:none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
              </div>
              <p class="auth-error" id="login-error"></p>
              <button type="submit" class="auth-submit-btn" id="login-btn">
                <span class="auth-btn-text">Sign In</span>
                <span class="auth-btn-spinner" style="display:none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                  Signing in…
                </span>
              </button>
              <p class="auth-switch-hint">No account? <button type="button" class="auth-switch-link" id="switch-to-register">Create one free →</button></p>
            </form>

            <!-- Register Form -->
            <form class="auth-form" id="form-register" style="display:none;">
              <div class="auth-field">
                <label class="auth-label" for="reg-email">Email address <span class="auth-required">*</span></label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input type="email" id="reg-email" placeholder="you@example.com" required autocomplete="email" />
                </div>
              </div>
              <div class="auth-field">
                <label class="auth-label" for="reg-password">Password <span class="auth-required">*</span></label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type="password" id="reg-password" placeholder="Min. 6 characters" required minlength="6" autocomplete="new-password" />
                  <button type="button" class="auth-pw-toggle" data-target="reg-password" tabindex="-1">
                    <svg class="eye-show" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg class="eye-hide" style="display:none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
              </div>
              <div class="auth-field">
                <label class="auth-label" for="reg-mobile">Mobile <span class="auth-optional">optional</span></label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  <input type="tel" id="reg-mobile" placeholder="+31 6 12345678" autocomplete="tel" />
                </div>
              </div>
              <p class="auth-error" id="reg-error"></p>
              <button type="submit" class="auth-submit-btn" id="reg-btn">
                <span class="auth-btn-text">Create Account</span>
                <span class="auth-btn-spinner" style="display:none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                  Creating account…
                </span>
              </button>
              <p class="auth-switch-hint">Already have an account? <button type="button" class="auth-switch-link" id="switch-to-login">Sign in →</button></p>
            </form>

          </div><!-- /auth-panel-right -->
        </div><!-- /auth-card -->
      </div>
    </div>
  `;

  // Tab switching
  document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));
  document.getElementById('switch-to-register').addEventListener('click', () => switchTab('register'));
  document.getElementById('switch-to-login').addEventListener('click', () => switchTab('login'));

  // Password visibility toggles
  document.querySelectorAll('.auth-pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.querySelector('.eye-show').style.display = isText ? '' : 'none';
      btn.querySelector('.eye-hide').style.display = isText ? 'none' : '';
    });
  });

  // Login
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    setLoading(btn, true);
    errEl.textContent = '';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errEl.textContent = friendlyError(error.message);
      setLoading(btn, false);
    } else {
      nav.landing();
    }
  });

  // Register
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-btn');
    const errEl = document.getElementById('reg-error');
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const mobile = document.getElementById('reg-mobile').value.trim();

    setLoading(btn, true);
    errEl.textContent = '';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { mobile: mobile || null } },
    });

    if (error) {
      errEl.textContent = friendlyError(error.message);
      setLoading(btn, false);
      return;
    }

    // Show confirmation message
    document.getElementById('auth-page').querySelector('.auth-panel-right').innerHTML = `
      <div class="auth-success">
        <div class="auth-success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2 class="auth-success-title">Check your inbox</h2>
        <p class="auth-success-body">We sent a confirmation link to<br><strong>${email}</strong></p>
        <p class="auth-success-sub">Click the link to activate your account, then sign in.</p>
        <button class="auth-submit-btn" style="margin-top:1.75rem;" id="back-to-login">Back to Sign In</button>
      </div>
    `;
    document.getElementById('back-to-login').addEventListener('click', () => renderAuthPage());
  });
}

function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
  const indicator = document.getElementById('tab-indicator');
  if (indicator) indicator.style.transform = tab === 'login' ? 'translateX(0)' : 'translateX(100%)';
  const header = document.getElementById('auth-form-header');
  if (header) {
    header.querySelector('.auth-form-title').textContent = tab === 'login' ? 'Welcome back' : 'Join for free';
    header.querySelector('.auth-form-sub').textContent = tab === 'login'
      ? 'Sign in to continue your journey'
      : 'Create your account in seconds';
  }
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector('.auth-btn-text').style.display = loading ? 'none' : '';
  btn.querySelector('.auth-btn-spinner').style.display = loading ? 'flex' : 'none';
}

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (m.includes('user already registered')) return 'An account with this email already exists.';
  if (m.includes('password')) return 'Password must be at least 6 characters.';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  return msg;
}
