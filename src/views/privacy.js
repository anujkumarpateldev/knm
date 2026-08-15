// src/views/privacy.js
import { nav } from '../router.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;

export function renderPrivacy() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="privacy-view">
      <div class="static-page">

        <div class="static-page-header">
          <button class="btn-back" id="btn-privacy-back">${BACK_ICON} Back</button>
          <div>
            <h1 class="static-page-title">Privacy Policy</h1>
            <p class="static-page-meta">Last updated: January 2025 &nbsp;·&nbsp; Governing law: Netherlands / GDPR</p>
          </div>
        </div>

        <div class="static-section">
          <h2>1. Introduction</h2>
          <p>DutchExamPro ("we", "us", or "our") is committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR) and Dutch data protection law. This Privacy Policy explains what data we collect, how we use it, and your rights as a data subject.</p>
          <p>By using DutchExamPro you agree to the collection and use of information described in this policy. If you do not agree, please do not use the service.</p>
        </div>

        <div class="static-section">
          <h2>2. Data We Collect</h2>
          <p>We collect only the data necessary to provide and improve our service:</p>
          <ul>
            <li><strong>Account data:</strong> Your email address, collected when you register or sign in.</li>
            <li><strong>Usage and progress data:</strong> Quiz scores, completed modules, practice session history, and study streaks — used to personalise your learning experience and track exam readiness.</li>
            <li><strong>Personal word lists (Mijn Woorden):</strong> Words, definitions, example sentences, and labels you add to your personal vocabulary journal.</li>
            <li><strong>Device and session data:</strong> Browser type, approximate time zone, and session identifiers — used for security and to maintain your login session. We do not collect IP addresses beyond what Supabase logs for security purposes.</li>
          </ul>
          <p>We do <strong>not</strong> collect payment information, phone numbers, or government identification numbers.</p>
        </div>

        <div class="static-section">
          <h2>3. How We Store Your Data</h2>
          <p>Your data is stored using two mechanisms:</p>
          <ul>
            <li><strong>Supabase (PostgreSQL, EU servers):</strong> Account credentials, progress records, and personal word lists are stored in a Supabase-managed PostgreSQL database hosted on infrastructure located within the European Union. Supabase is a data processor acting on our behalf and is bound by a Data Processing Agreement consistent with GDPR requirements.</li>
            <li><strong>localStorage (your browser):</strong> A local copy of your progress data may be cached in your browser's localStorage to allow offline access and reduce load times. This data remains on your device and is not transmitted to third parties.</li>
          </ul>
          <p>All data in transit is encrypted using TLS. Data at rest in Supabase is encrypted using AES-256.</p>
        </div>

        <div class="static-section">
          <h2>4. How We Use Your Data</h2>
          <ul>
            <li>To create and maintain your account.</li>
            <li>To display your learning progress and personalise content.</li>
            <li>To store and synchronise your personal word lists across devices.</li>
            <li>To send transactional emails (e.g. password reset). We do not send marketing emails unless you explicitly opt in.</li>
            <li>To detect and prevent fraudulent or abusive use of the service.</li>
            <li>To improve the platform through aggregated, anonymised analytics.</li>
          </ul>
        </div>

        <div class="static-section">
          <h2>5. Cookies and Local Storage</h2>
          <p>DutchExamPro uses the following storage mechanisms:</p>
          <ul>
            <li><strong>Session cookies:</strong> Set by Supabase to maintain your authenticated session. These are strictly necessary and expire when you sign out or close your browser.</li>
            <li><strong>localStorage:</strong> Used to cache progress data locally and to store your preferred theme (light/dark mode). No personally identifiable information beyond your user ID is stored here.</li>
          </ul>
          <p>We do <strong>not</strong> use tracking cookies, advertising cookies, or third-party analytics cookies (such as Google Analytics). No data is shared with advertising networks.</p>
        </div>

        <div class="static-section">
          <h2>6. Data Sharing and Third Parties</h2>
          <p>We do not sell, rent, or trade your personal data. We share data only with:</p>
          <ul>
            <li><strong>Supabase Inc.:</strong> Our database and authentication provider, acting as a data processor under a GDPR-compliant Data Processing Agreement.</li>
            <li><strong>Hosting infrastructure:</strong> Our application is served via a cloud hosting provider. Traffic and server-level logs may be retained for up to 30 days for security purposes.</li>
          </ul>
          <p>We may disclose data if required by applicable law, court order, or governmental authority.</p>
        </div>

        <div class="static-section">
          <h2>7. Your GDPR Rights</h2>
          <p>As a data subject under the GDPR, you have the following rights:</p>
          <ul>
            <li><strong>Right of access:</strong> You may request a copy of all personal data we hold about you.</li>
            <li><strong>Right to rectification:</strong> You may request correction of inaccurate or incomplete data.</li>
            <li><strong>Right to erasure ("right to be forgotten"):</strong> You may request deletion of your account and all associated personal data. We will process erasure requests within 30 days.</li>
            <li><strong>Right to data portability:</strong> You may request your data in a structured, machine-readable format (JSON/CSV).</li>
            <li><strong>Right to restrict processing:</strong> You may request that we limit how we use your data while a dispute is being resolved.</li>
            <li><strong>Right to object:</strong> You may object to processing based on legitimate interests.</li>
            <li><strong>Right to lodge a complaint:</strong> You have the right to lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) at <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener">autoriteitpersoonsgegevens.nl</a>.</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a>. We will respond within 30 days.</p>
        </div>

        <div class="static-section">
          <h2>8. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active or as needed to provide the service. If you request deletion of your account, all personally identifiable data will be permanently deleted within 30 days, except where retention is required by law.</p>
        </div>

        <div class="static-section">
          <h2>9. Children's Privacy</h2>
          <p>DutchExamPro is not directed at children under 16 years of age. We do not knowingly collect personal data from anyone under 16. If you believe we have inadvertently collected such data, please contact us immediately.</p>
        </div>

        <div class="static-section">
          <h2>10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date at the top of this page. Continued use of DutchExamPro after changes are posted constitutes acceptance of the updated policy.</p>
        </div>

        <div class="static-section">
          <h2>11. Contact</h2>
          <p>For privacy-related questions or data requests, please contact:</p>
          <ul>
            <li>Email: <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a></li>
            <li>Subject line: "Privacy / GDPR Request"</li>
          </ul>
          <p>We aim to respond to all requests within 5 business days.</p>
        </div>

      </div>
    </div>
  `;

  document.getElementById('btn-privacy-back').addEventListener('click', () => nav.landing());
}
