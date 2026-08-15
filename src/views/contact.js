// src/views/contact.js
import { nav } from '../router.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;

export function renderContact() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="contact-view">
      <div class="static-page">

        <div class="static-page-header">
          <button class="btn-back" id="btn-contact-back">${BACK_ICON} Back</button>
          <div>
            <h1 class="static-page-title">Contact Us</h1>
            <p class="static-page-meta">We typically respond within 1–2 business days</p>
          </div>
        </div>

        <div class="contact-grid">
          <div class="contact-info-col">
            <div class="contact-info-card">
              <div class="contact-info-icon">✉️</div>
              <h3>Email</h3>
              <p>For general questions, feedback, or bug reports:</p>
              <a class="contact-email-link" href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a>
            </div>
            <div class="contact-info-card">
              <div class="contact-info-icon">📖</div>
              <h3>Help &amp; FAQ</h3>
              <p>Many common questions are answered in our Help centre.</p>
              <button class="btn-secondary contact-help-btn" id="contact-link-help">Open Help &amp; FAQ</button>
            </div>
            <div class="contact-info-card">
              <div class="contact-info-icon">🔒</div>
              <h3>Privacy</h3>
              <p>Questions about your data or GDPR rights?</p>
              <button class="btn-secondary contact-help-btn" id="contact-link-privacy">Read Privacy Policy</button>
            </div>
          </div>

          <div class="contact-form-col">
            <h2 class="contact-form-title">Send us a message</h2>
            <div id="contact-form-success" style="display:none;" class="contact-success-msg">
              ✅ Message sent — thank you! We'll be in touch soon.
            </div>
            <form id="contact-form" novalidate>
              <div class="aw-form-group">
                <label class="aw-label">Your name <span class="aw-required">*</span></label>
                <input class="aw-input" id="cf-name" type="text" placeholder="e.g. Maria de Vries" autocomplete="name" />
              </div>
              <div class="aw-form-group">
                <label class="aw-label">Email address <span class="aw-required">*</span></label>
                <input class="aw-input" id="cf-email" type="email" placeholder="you@example.com" autocomplete="email" />
              </div>
              <div class="aw-form-group">
                <label class="aw-label">Subject</label>
                <select class="aw-input" id="cf-subject">
                  <option value="">Select a topic…</option>
                  <option value="bug">Bug report</option>
                  <option value="feedback">Feedback / suggestion</option>
                  <option value="account">Account issue</option>
                  <option value="content">Content question</option>
                  <option value="privacy">Privacy / GDPR request</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="aw-form-group">
                <label class="aw-label">Message <span class="aw-required">*</span></label>
                <textarea class="aw-input aw-textarea" id="cf-message" rows="5"
                  placeholder="Describe your question or issue in as much detail as you like…"></textarea>
              </div>
              <div id="cf-status" style="font-size:0.82rem;color:var(--danger);margin-bottom:0.5rem;"></div>
              <button class="btn-primary" type="submit" id="cf-submit" style="width:100%;">Send Message</button>
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.75rem;text-align:center;">
                Or email us directly at
                <a href="mailto:dutchexamprosupport@gmail.com" style="color:var(--primary);">dutchexamprosupport@gmail.com</a>
              </p>
            </form>
          </div>
        </div>

      </div>
    </div>
  `;

  document.getElementById('btn-contact-back').addEventListener('click', () => history.back ? history.go(-1) : nav.landing());
  document.getElementById('contact-link-help').addEventListener('click', () => nav.help());
  document.getElementById('contact-link-privacy').addEventListener('click', () => nav.privacy());

  document.getElementById('contact-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name    = document.getElementById('cf-name').value.trim();
    const email   = document.getElementById('cf-email').value.trim();
    const message = document.getElementById('cf-message').value.trim();
    const subject = document.getElementById('cf-subject').value || 'General';
    const status  = document.getElementById('cf-status');
    const submit  = document.getElementById('cf-submit');

    if (!name || !email || !message) {
      status.textContent = 'Please fill in all required fields.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Please enter a valid email address.';
      return;
    }

    status.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Sending…';

    try {
      await emailjs.send('service_71de9t4', 'template_c2ti5ce', {
        name,
        email,
        subject,
        message,
        time: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
      });
      document.getElementById('contact-form-success').style.display = 'block';
      document.getElementById('contact-form').style.display = 'none';
    } catch (err) {
      status.textContent = 'Failed to send — please email us directly at dutchexamprosupport@gmail.com';
      submit.disabled = false;
      submit.textContent = 'Send Message';
    }
  });
}
