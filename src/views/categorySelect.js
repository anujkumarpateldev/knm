import { state } from '../state.js';
import { nav } from '../router.js';

// Category registry — add new categories here only
const CATEGORIES = [
  {
    id: 'KNM',
    label: 'KNM',
    subtitle: 'Kennis van de Nederlandse Maatschappij',
    available: true,
    supportsPractice: true,
    supportsExam: true,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  },
  {
    id: 'READING',
    label: 'Reading (Lezen)',
    subtitle: 'Vocabulary & reading comprehension',
    available: true,
    supportsPractice: true,
    supportsExam: true,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  },
  {
    id: 'LISTENING',
    label: 'Listening (Luisteren)',
    subtitle: 'Coming soon',
    available: false,
    supportsPractice: false,
    supportsExam: false,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  },
  {
    id: 'WRITING',
    label: 'Writing (Schrijven)',
    subtitle: 'Coming soon',
    available: false,
    supportsPractice: false,
    supportsExam: false,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
  },
  {
    id: 'SPEAKING',
    label: 'Speaking (Spreken)',
    subtitle: 'Coming soon',
    available: false,
    supportsPractice: false,
    supportsExam: false,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  },
];

export function renderCategorySelect(mode) {
  state.currentMode = mode;

  const cardsHtml = CATEGORIES.map(cat => {
    const availableForMode = mode === 'EXAM' ? cat.supportsExam : cat.supportsPractice;
    const disabled = !cat.available || !availableForMode;
    const subtitle = !cat.available
      ? 'Coming soon'
      : (mode === 'EXAM' && !cat.supportsExam ? 'No exam mode' : cat.subtitle);

    return `
      <div class="landing-card category-card ${disabled ? 'disabled' : ''}" data-cat-id="${cat.id}">
        <div class="landing-card-icon">${cat.icon}</div>
        <h3>${cat.label}</h3>
        <p>${subtitle}</p>
      </div>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="category-select">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>${mode === 'EXAM' ? 'Take Full Exam' : 'Practice by Section'}</h1>
          <p>Select a category to begin.</p>
        </div>
        <button class="btn-secondary" id="btn-back-landing">Back to Home</button>
      </div>
      <div class="modules-grid">${cardsHtml}</div>
    </div>
  `;

  document.getElementById('btn-back-landing').addEventListener('click', () => nav.landing());

  document.querySelectorAll('.category-card:not(.disabled)').forEach(card => {
    card.addEventListener('click', () => {
      const catId = card.getAttribute('data-cat-id');
      state.currentCategory = catId;
      if (catId === 'KNM') {
        mode === 'EXAM' ? nav.exam() : nav.knmDashboard();
      } else if (catId === 'READING') {
        mode === 'EXAM' ? nav.readingExam() : nav.readingDashboard();
      }
    });
  });
}
