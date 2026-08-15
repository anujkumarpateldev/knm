// src/views/help.js
import { nav } from '../router.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;

const FAQ_GROUPS = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is DutchExamPro?',
        a: 'DutchExamPro is a free, independent exam preparation platform designed to help you pass the Dutch A2 Integration Exam (Inburgeringsexamen). It offers 500+ practice questions, full exam simulations, vocabulary flashcards, personal word lists, and AI-powered speaking practice — all in one place.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click the "Register Free" button on the home page, enter your email address, and choose a password. You\'ll be logged in immediately — no email verification is required to start practising. Creating an account lets you save your progress, sync across devices, and access your personal word journal.',
      },
      {
        q: 'Is DutchExamPro free?',
        a: 'Yes. DutchExamPro is completely free to use. All practice questions, exam simulations, vocabulary tools, and the personal word journal (Mijn Woorden) are available at no cost. There is no credit card required and no hidden premium tier.',
      },
    ],
  },
  {
    title: 'Exam Preparation',
    items: [
      {
        q: 'What is the Dutch A2 Integration Exam (Inburgeringsexamen)?',
        a: 'The Inburgeringsexamen is the Dutch civic integration exam that many non-EU immigrants are required to pass to obtain a residence permit or Dutch citizenship. It tests your knowledge of the Dutch language at the A2 level and your knowledge of Dutch society (Kennis van de Nederlandse Maatschappij, or KNM). The exam is administered by the Dutch government through DUO (Dienst Uitvoering Onderwijs).',
      },
      {
        q: 'What sections does the exam have?',
        a: `The integration exam consists of several components:
          <ul style="margin-top:0.5rem">
            <li><strong>KNM (Kennis van de Nederlandse Maatschappij):</strong> Multiple-choice questions about Dutch society, culture, history, and civic life.</li>
            <li><strong>Lezen (Reading):</strong> Reading comprehension at A2 level, including signs, letters, and short texts.</li>
            <li><strong>Luisteren (Listening):</strong> Understanding spoken Dutch in everyday situations.</li>
            <li><strong>Schrijven (Writing):</strong> Short written tasks such as filling in forms or writing a brief message.</li>
            <li><strong>Spreken (Speaking):</strong> Answering questions and having short spoken interactions.</li>
          </ul>
          DutchExamPro covers the KNM and Reading components with full practice modules.`,
      },
      {
        q: 'How long is the exam?',
        a: 'The total exam time varies by component, but candidates typically spend between 3 and 5 hours across all sections on exam day. Each module is timed separately. In DutchExamPro\'s exam simulation mode, the KNM exam runs for 45 minutes, reflecting the official time allocation.',
      },
    ],
  },
  {
    title: 'Features',
    items: [
      {
        q: 'What is Mijn Woorden (My Words)?',
        a: 'Mijn Woorden is your personal vocabulary journal. You can add Dutch words or phrases, write your own definitions and example sentences, and organise them with custom labels or tags. Your word list is saved to your account and syncs across all your devices. You can also practise your saved words using the built-in spaced repetition revision tool.',
      },
      {
        q: 'What is spaced repetition (SRS)?',
        a: 'Spaced repetition is a proven learning technique that shows you study material at increasing intervals based on how well you know it. Words you find difficult are shown more frequently; words you know well appear less often. This approach maximises long-term retention while minimising study time. DutchExamPro uses spaced repetition in the Mijn Woorden revision mode to help you memorise vocabulary efficiently.',
      },
      {
        q: 'How does AI Fill work?',
        a: 'AI Fill is a smart assistant inside Mijn Woorden that helps you add new words quickly. When you type a Dutch word, AI Fill can automatically suggest a definition, a usage example, and appropriate tags. This saves time and helps you create higher-quality vocabulary entries. You can always review and edit the suggestions before saving.',
      },
    ],
  },
  {
    title: 'Account & Data',
    items: [
      {
        q: 'How do I reset my password?',
        a: 'On the sign-in page, click "Forgot password?". Enter the email address associated with your account and we\'ll send you a password reset link. Click the link in the email to set a new password. If you don\'t receive the email within a few minutes, check your spam folder or contact us at <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a>.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Account deletion is not yet available via a self-service option in the app. To request deletion of your account and all associated data, please email us at <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a> with the subject line "Account Deletion Request". We will process your request within 30 days in accordance with our Privacy Policy.',
      },
      {
        q: 'Is my data safe?',
        a: 'Yes. Your data is stored on secure Supabase-managed servers located within the European Union, encrypted in transit (TLS) and at rest (AES-256). We do not use tracking cookies or share your data with advertisers. You have full GDPR rights including the right to access, correct, export, or delete your data at any time. See our <a href="#" class="help-privacy-link">Privacy Policy</a> for full details.',
      },
    ],
  },
];

export function renderHelp() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  const groupsHTML = FAQ_GROUPS.map(group => `
    <p class="faq-group-title">${group.title}</p>
    ${group.items.map((item, i) => {
      const id = `faq-${group.title.replace(/\s+/g, '-').toLowerCase()}-${i}`;
      return `
        <div class="faq-item">
          <button class="faq-question" data-faq="${id}" aria-expanded="false">
            ${item.q}
            <span class="faq-chevron" aria-hidden="true">&#9660;</span>
          </button>
          <div class="faq-answer" id="${id}">
            ${item.a}
          </div>
        </div>
      `;
    }).join('')}
  `).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="help-view">
      <div class="static-page">

        <div class="static-page-header">
          <button class="btn-back" id="btn-help-back">${BACK_ICON} Back</button>
          <div>
            <h1 class="static-page-title">Help &amp; FAQ</h1>
            <p class="static-page-meta">Find answers to the most common questions about DutchExamPro</p>
          </div>
        </div>

        <div class="static-section">
          <p>Can't find what you're looking for? Email us at <a href="mailto:dutchexamprosupport@gmail.com">dutchexamprosupport@gmail.com</a> and we'll get back to you within one business day.</p>
        </div>

        <div id="faq-container">
          ${groupsHTML}
        </div>

      </div>
    </div>
  `;

  document.getElementById('btn-help-back').addEventListener('click', () => nav.landing());

  // FAQ accordion — event delegation on the container
  document.getElementById('faq-container').addEventListener('click', e => {
    const btn = e.target.closest('.faq-question');
    if (!btn) return;

    const answerId = btn.dataset.faq;
    const answerEl = document.getElementById(answerId);
    if (!answerEl) return;

    const isOpen = btn.classList.contains('open');

    // Close all open items first
    document.querySelectorAll('.faq-question.open').forEach(openBtn => {
      openBtn.classList.remove('open');
      openBtn.setAttribute('aria-expanded', 'false');
      const openAnswer = document.getElementById(openBtn.dataset.faq);
      if (openAnswer) openAnswer.classList.remove('open');
    });

    // If it wasn't open before, open it now
    if (!isOpen) {
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      answerEl.classList.add('open');
    }
  });

  // Handle privacy policy links inside FAQ answers
  document.getElementById('faq-container').addEventListener('click', e => {
    const link = e.target.closest('.help-privacy-link');
    if (!link) return;
    e.preventDefault();
    nav.privacy();
  });
}
