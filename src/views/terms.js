// src/views/terms.js
import { nav } from '../router.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;

export function renderTerms() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="terms-view">
      <div class="static-page">

        <div class="static-page-header">
          <button class="btn-back" id="btn-terms-back">${BACK_ICON} Back</button>
          <div>
            <h1 class="static-page-title">Terms of Service</h1>
            <p class="static-page-meta">Last updated: January 2025 &nbsp;·&nbsp; Governing law: Netherlands</p>
          </div>
        </div>

        <div class="static-section">
          <h2>1. About DutchExamPro</h2>
          <p>DutchExamPro is an independent, privately operated exam preparation platform designed to help candidates study for the Dutch A2 Integration Exam (Inburgeringsexamen). DutchExamPro is <strong>not</strong> an official government resource and is not affiliated with the Dutch government, the Dienst Uitvoering Onderwijs (DUO), or any other governmental body.</p>
          <p>Content on DutchExamPro — including practice questions, flashcards, and study materials — is created for educational purposes and is based on the publicly documented format of the integration exam. We cannot guarantee that specific questions will appear on the official exam.</p>
        </div>

        <div class="static-section">
          <h2>2. Acceptance of Terms</h2>
          <p>By accessing or using DutchExamPro ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.</p>
          <p>We reserve the right to update these Terms at any time. Continued use of the Service after changes are published constitutes your acceptance of the revised Terms.</p>
        </div>

        <div class="static-section">
          <h2>3. Account Creation and Responsibilities</h2>
          <p>To access certain features of DutchExamPro, you must create an account. When creating an account, you agree to:</p>
          <ul>
            <li>Provide accurate, current, and complete information.</li>
            <li>Maintain the security of your password and account credentials.</li>
            <li>Notify us immediately of any unauthorised use of your account at <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a>.</li>
            <li>Accept responsibility for all activity that occurs under your account.</li>
          </ul>
          <p>You must be at least 16 years old to create an account. Accounts are personal and may not be shared or transferred to another person.</p>
        </div>

        <div class="static-section">
          <h2>4. Acceptable Use Policy</h2>
          <p>You agree to use DutchExamPro only for lawful purposes and in a manner consistent with these Terms. You must not:</p>
          <ul>
            <li>Use the Service to distribute spam, malware, or harmful content.</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its underlying infrastructure.</li>
            <li>Scrape, crawl, or systematically extract content from the Service without our express written permission.</li>
            <li>Reproduce, distribute, or sell any content from the Service for commercial purposes without authorisation.</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation with a person or entity.</li>
            <li>Use the Service in any way that could disable, overburden, or impair its functionality.</li>
            <li>Circumvent any access controls or security measures implemented by DutchExamPro.</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate this policy without prior notice.</p>
        </div>

        <div class="static-section">
          <h2>5. Intellectual Property</h2>
          <p>All content on DutchExamPro — including but not limited to practice questions, written explanations, interface design, graphics, and software code — is the intellectual property of DutchExamPro or its licensors, and is protected by applicable copyright and intellectual property laws.</p>
          <p>Practice questions are created by DutchExamPro based on the publicly documented format and subject matter of the Dutch A2 Integration Exam. They are not copied from official government materials.</p>
          <p>You are granted a limited, non-exclusive, non-transferable licence to access and use the Service for your personal, non-commercial study purposes. You may not copy, reproduce, modify, distribute, or create derivative works from any content without our express written permission.</p>
          <p>Content you create within the Service — such as entries in your personal word journal (Mijn Woorden) — remains your own. By storing such content on our platform, you grant us a limited licence to store and display it solely for the purpose of providing the Service to you.</p>
        </div>

        <div class="static-section">
          <h2>6. No Guarantee of Exam Success</h2>
          <p>DutchExamPro provides study materials and practice tools to assist your preparation. However, we make <strong>no guarantee</strong> that use of our Service will result in passing the Dutch Integration Exam or any other examination.</p>
          <p>Exam success depends on many factors beyond our control, including your individual level of preparation, exam conditions, and changes to the official exam format by the relevant authorities. We encourage you to consult official government resources and, where appropriate, a qualified language instructor.</p>
        </div>

        <div class="static-section">
          <h2>7. Disclaimer of Warranties</h2>
          <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. To the fullest extent permitted by applicable law, DutchExamPro disclaims all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
          <p>We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. We may modify, suspend, or discontinue any aspect of the Service at any time without notice.</p>
        </div>

        <div class="static-section">
          <h2>8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by Dutch law, DutchExamPro and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, even if we have been advised of the possibility of such damages.</p>
          <p>Our total liability to you for any claim arising from the use of the Service shall not exceed the amount you paid (if any) for the Service in the twelve months preceding the claim.</p>
        </div>

        <div class="static-section">
          <h2>9. Termination of Accounts</h2>
          <p>You may delete your account at any time by contacting us at <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a>. Upon account deletion, your personal data will be removed in accordance with our <a href="#" id="terms-privacy-link">Privacy Policy</a>.</p>
          <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine, in our sole discretion, violates these Terms or is otherwise harmful to other users, third parties, or the Service. In cases of serious violations, we may take legal action.</p>
        </div>

        <div class="static-section">
          <h2>10. Governing Law and Disputes</h2>
          <p>These Terms are governed by and construed in accordance with the laws of the Netherlands. Any dispute arising out of or in connection with these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the competent courts in the Netherlands.</p>
          <p>If you are a consumer residing in another EU member state, you may also have the right to rely on mandatory provisions of the law of your country of residence.</p>
        </div>

        <div class="static-section">
          <h2>11. Contact</h2>
          <p>If you have questions about these Terms or wish to report a violation, please contact us:</p>
          <ul>
            <li>Email: <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a></li>
          </ul>
        </div>

      </div>
    </div>
  `;

  document.getElementById('btn-terms-back').addEventListener('click', () => nav.landing());
  document.getElementById('terms-privacy-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    nav.privacy();
  });
}
