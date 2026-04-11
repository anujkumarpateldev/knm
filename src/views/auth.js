import { supabase } from '../supabase.js';
import { nav } from '../router.js';

export function renderAuthPage() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="auth-page">
      <div class="auth-scene">

        <div class="auth-card">
          <!-- Decorative top accent -->
          <div class="auth-card-accent">
            <span class="auth-accent-nl">NL</span>
            <div class="auth-accent-flag">
              <div class="flag-red"></div>
              <div class="flag-white"></div>
              <div class="flag-blue"></div>
            </div>
          </div>

          <!-- Brand -->
          <div class="auth-brand">
            <img src="/logo.png" alt="DutchExamPro" style="width:48px;height:48px;object-fit:contain;flex-shrink:0;" />
            <div>
              <h1 class="auth-brand-name"><span style="color:var(--primary)">Dutch</span><span style="color:var(--brand-blue)">e</span><span style="color:var(--primary)">✕</span><span style="color:var(--brand-blue)">ampro</span></h1>
              <p class="auth-brand-tagline">Master Your Dutch Exam</p>
            </div>
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
                <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" transform="scale(0.67)"/><polyline points="22,6 12,13 2,6" transform="scale(0.67)"/></svg>
                <input type="email" id="login-email" placeholder="you@example.com" required autocomplete="email" />
              </div>
            </div>
            <div class="auth-field">
              <label class="auth-label" for="login-password">Password</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" transform="scale(0.67)"/><path d="M7 11V7a5 5 0 0 1 10 0v4" transform="scale(0.67)"/></svg>
                <input type="password" id="login-password" placeholder="Enter your password" required autocomplete="current-password" />
                <button type="button" class="auth-pw-toggle" data-target="login-password" tabindex="-1">
                  <svg class="eye-show" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" transform="scale(0.625)"/><circle cx="12" cy="12" r="3" transform="scale(0.625)"/></svg>
                  <svg class="eye-hide" style="display:none" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" transform="scale(0.625)"/><line x1="1" y1="1" x2="23" y2="23" transform="scale(0.625)"/></svg>
                </button>
              </div>
            </div>
            <p class="auth-error" id="login-error"></p>
            <button type="submit" class="auth-submit-btn" id="login-btn">
              <span class="auth-btn-text">Sign In</span>
              <span class="auth-btn-spinner" style="display:none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
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
                <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" transform="scale(0.67)"/><polyline points="22,6 12,13 2,6" transform="scale(0.67)"/></svg>
                <input type="email" id="reg-email" placeholder="you@example.com" required autocomplete="email" />
              </div>
            </div>
            <div class="auth-field">
              <label class="auth-label" for="reg-password">Password <span class="auth-required">*</span></label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" transform="scale(0.67)"/><path d="M7 11V7a5 5 0 0 1 10 0v4" transform="scale(0.67)"/></svg>
                <input type="password" id="reg-password" placeholder="Min. 6 characters" required minlength="6" autocomplete="new-password" />
                <button type="button" class="auth-pw-toggle" data-target="reg-password" tabindex="-1">
                  <svg class="eye-show" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" transform="scale(0.625)"/><circle cx="12" cy="12" r="3" transform="scale(0.625)"/></svg>
                  <svg class="eye-hide" style="display:none" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" transform="scale(0.625)"/><line x1="1" y1="1" x2="23" y2="23" transform="scale(0.625)"/></svg>
                </button>
              </div>
            </div>
            <div class="auth-field">
              <label class="auth-label" for="reg-mobile">Mobile <span class="auth-optional">optional</span></label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" transform="scale(0.67)"/><line x1="12" y1="18" x2="12.01" y2="18" transform="scale(0.67)"/></svg>
                <input type="tel" id="reg-mobile" placeholder="+31 6 12345678" autocomplete="tel" />
              </div>
            </div>
            <p class="auth-error" id="reg-error"></p>
            <button type="submit" class="auth-submit-btn" id="reg-btn">
              <span class="auth-btn-text">Create Account</span>
              <span class="auth-btn-spinner" style="display:none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                Creating account…
              </span>
            </button>
            <p class="auth-switch-hint">Already have an account? <button type="button" class="auth-switch-link" id="switch-to-login">Sign in →</button></p>
          </form>
        </div>

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
      errEl.textContent = error.message;
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
      errEl.textContent = error.message;
      setLoading(btn, false);
      return;
    }

    // Show confirmation message
    document.getElementById('auth-page').querySelector('.auth-card').innerHTML = `
      <div class="auth-success">
        <div class="auth-success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2 class="auth-success-title">Check your inbox</h2>
        <p class="auth-success-body">We sent a confirmation link to<br><strong>${email}</strong></p>
        <p class="auth-success-sub">Click the link to activate your account, then sign in.</p>
        <button class="auth-submit-btn" style="margin-top:1.5rem;" id="back-to-login">Back to Sign In</button>
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
  // Slide the indicator
  const indicator = document.getElementById('tab-indicator');
  if (indicator) indicator.style.transform = tab === 'login' ? 'translateX(0)' : 'translateX(100%)';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector('.auth-btn-text').style.display = loading ? 'none' : '';
  btn.querySelector('.auth-btn-spinner').style.display = loading ? 'flex' : 'none';
}
