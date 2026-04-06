import { state } from '../../state.js';
import { nav } from '../../router.js';
import { saveToStorage } from '../../storage.js';
import { speakDutch } from '../../speech.js';
import { getVocabLearnedCount } from '../../data/reading.js';

const TYPE_COLORS = {
  'Profession': '#6366f1',
  'Place':      '#10b981',
  'Object':     '#f59e0b',
  'Verb':       '#8b5cf6',
  'Adjective':  '#06b6d4',
  'Abstract':   '#f43f5e',
};

function progressKey(moduleId) {
  return `READING:vocab:${moduleId}`;
}

// Words marked as learned during the current session: Set of word indices
let sessionLearnedIndices = new Set();

// ─── Vocab Dashboard (topic grid) ──────────────────────────────────────────

export function renderVocabDashboard() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  sessionLearnedIndices = new Set(); // reset on returning to dashboard

  const cardsHtml = state.readingVocab.map(mod => {
    const total   = mod.vocabulary_list?.length ?? 0;
    const learned = getVocabLearnedCount(mod.id);
    const pct     = total > 0 ? Math.round((learned / total) * 100) : 0;
    return `
      <div class="module-card" data-vocab-id="${mod.id}" style="cursor:pointer;">
        <h3>${mod.title_en}</h3>
        <p>${mod.title_nl}</p>
        <div class="module-progress-bar" style="margin-top: 1rem;">
          <div class="module-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="module-stats">
          <span>${learned} / ${total} learned</span>
          <span>${pct}%</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="vocab-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Vocabulary Topics</h1>
          <p>Select a topic to start learning Dutch words.</p>
        </div>
        <button class="btn-secondary" id="btn-back-reading">Back to Reading</button>
      </div>
      <div class="modules-grid">${cardsHtml}</div>
    </div>
  `;

  document.getElementById('btn-back-reading').addEventListener('click', () => nav.readingDashboard());
  document.querySelectorAll('[data-vocab-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-vocab-id');
      state.currentVocabSet   = state.readingVocab.find(m => m.id === id);
      state.currentVocabIndex = 0;
      sessionLearnedIndices   = new Set(); // fresh session
      nav.vocabCards();
    });
  });
}

// ─── Session Summary Modal ──────────────────────────────────────────────────

function showSessionSummary() {
  const words = state.currentVocabSet.vocabulary_list;
  const pKey  = progressKey(state.currentVocabSet.id);

  // Log to activity tracker
  const learnedCount = sessionLearnedIndices.size;
  const total        = words.length;
  const score        = total > 0 ? Math.round((getVocabLearnedCount(state.currentVocabSet.id) / total) * 100) : 0;
  state.activityHistory.push({
    mode:      'Practice',
    title:     `Vocabulary – ${state.currentVocabSet.title_en}`,
    score,
    timestamp: Date.now(),
    passed:    null,
  });
  saveToStorage();

  // Collect all words marked as learned in this session
  const learnedWords = [...sessionLearnedIndices]
    .sort((a, b) => a - b)
    .map(i => words[i]);

  const wordsHtml = learnedWords.length === 0
    ? `<p style="color:var(--text-muted); text-align:center; padding: 1.5rem 0;">No words marked as learned this session.</p>`
    : learnedWords.map(w => {
        const color = TYPE_COLORS[w.type] || 'var(--text-muted)';
        return `
          <div class="session-word-row">
            <span class="vocab-type-badge" style="background:${color}22; color:${color}; border:1px solid ${color}44; flex-shrink:0;">
              ${w.type || 'Word'}
            </span>
            <span class="session-word-nl">${w.dutch_word}</span>
            <span class="session-word-en">${w.english_word}</span>
          </div>`;
      }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'session-modal-overlay';
  overlay.innerHTML = `
    <div class="session-modal">
      <div class="session-modal-header">
        <div>
          <h2>Session Complete</h2>
          <p style="color:var(--text-muted); margin-top:0.25rem;">${state.currentVocabSet.title_en}</p>
        </div>
        <div class="session-modal-badge">
          <span style="font-size:2rem; font-weight:800; color:var(--success);">${learnedWords.length}</span>
          <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-top:-4px;">learned</span>
        </div>
      </div>

      ${learnedWords.length > 0 ? `
        <p style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin-bottom:0.75rem;">
          Words learned this session
        </p>
        <div class="session-word-list">${wordsHtml}</div>
      ` : wordsHtml}

      <div style="display:flex; gap:1rem; margin-top:1.5rem; justify-content:center; flex-wrap:wrap;">
        <button class="btn-secondary" id="modal-btn-back">Back to Topics</button>
        <button class="btn-primary"   id="modal-btn-continue">Continue Studying</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('modal-btn-back').addEventListener('click', () => {
    overlay.remove();
    nav.vocabDashboard();
  });

  document.getElementById('modal-btn-continue').addEventListener('click', () => {
    overlay.remove();
    // restart from beginning
    state.currentVocabIndex = 0;
    sessionLearnedIndices   = new Set();
    renderVocabCards();
  });
}

// ─── Vocab Card Viewer ──────────────────────────────────────────────────────

export function renderVocabCards() {
  if (!state.currentVocabSet?.vocabulary_list?.length) {
    nav.vocabDashboard();
    return;
  }

  document.body.classList.remove('in-dashboard');
  document.body.classList.add('in-quiz');

  const words     = state.currentVocabSet.vocabulary_list;
  const idx       = state.currentVocabIndex;
  const word      = words[idx];
  const total     = words.length;
  const pKey      = progressKey(state.currentVocabSet.id);
  const isLearned = !!(state.userProgress[pKey]?.[`w${idx}`]);
  const learned   = getVocabLearnedCount(state.currentVocabSet.id);
  const typeColor = TYPE_COLORS[word.type] || 'var(--text-muted)';
  const progress  = Math.round((idx / total) * 100);

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="vocab-cards">
      <div class="quiz-header">
        <button class="btn-back" id="btn-back-vocab">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          ${state.currentVocabSet.title_en}
        </button>
        <div style="text-align:right;">
          <div class="quiz-progress-text">Word ${idx + 1} of ${total}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${learned} learned</div>
        </div>
      </div>

      <div style="max-width: 600px; margin: 0 auto; padding: 0 1rem 2rem;">

        <div class="module-progress-bar" style="margin-bottom: 1.5rem; height: 4px; border-radius: 2px;">
          <div class="module-progress-fill" style="width: ${progress}%; transition: width 0.3s ease;"></div>
        </div>

        <div class="flashcard-container vocab-flashcard" id="vocab-card"
             onclick="this.classList.toggle('flipped')">
          <div class="flashcard-inner">

            <div class="flashcard-front vocab-face">
              <span class="vocab-type-badge" style="background:${typeColor}22; color:${typeColor}; border:1px solid ${typeColor}44;">
                ${word.type || 'Word'}
              </span>
              <div class="vocab-dutch-word">${word.dutch_word}</div>
              ${word.example_sentence ? `<div class="vocab-example">"${word.example_sentence}"</div>` : ''}
              <button class="vocab-speak-btn" id="btn-speak-word" title="Listen">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              </button>
              <p class="vocab-flip-hint">Tap card to reveal meaning</p>
            </div>

            <div class="flashcard-back vocab-face">
              <span class="vocab-type-badge" style="background:${typeColor}22; color:${typeColor}; border:1px solid ${typeColor}44;">
                ${word.type || 'Word'}
              </span>
              <div class="vocab-english-word">${word.english_word}</div>
              ${word.meaning ? `<div class="vocab-meaning">${word.meaning}</div>` : ''}
              ${word.example_sentence ? `<div class="vocab-example" style="margin-top:1rem;">"${word.example_sentence}"</div>` : ''}
            </div>

          </div>
        </div>

        <div style="display:flex; justify-content:center; margin-top: 1.25rem;">
          <button id="btn-mark" class="${isLearned ? 'btn-secondary' : 'btn-primary'}"
            style="${isLearned ? '' : 'background:var(--success);'}">
            ${isLearned
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Learned`
              : 'Mark as Learned'}
          </button>
        </div>

        <div class="quiz-footer" style="margin-top: 1.5rem;">
          <button class="btn-secondary" id="btn-vocab-prev" ${idx === 0 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Previous
          </button>
          <button class="btn-secondary" id="btn-end-session" style="margin: 0 auto;">End Session</button>
          <button class="btn-primary" id="btn-vocab-next">
            ${idx === total - 1 ? 'Finish' : 'Next'}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

      </div>
    </div>
  `;

  document.getElementById('btn-end-session').addEventListener('click', () => showSessionSummary());

  document.getElementById('btn-speak-word').addEventListener('click', e => {
    e.stopPropagation();
    speakDutch(word.example_sentence ? `${word.dutch_word}. ${word.example_sentence}` : word.dutch_word);
  });

  document.getElementById('btn-mark').addEventListener('click', e => {
    e.stopPropagation();
    if (!state.userProgress[pKey]) state.userProgress[pKey] = {};
    const nowLearned = !isLearned;
    state.userProgress[pKey][`w${idx}`] = nowLearned;
    if (nowLearned) {
      sessionLearnedIndices.add(idx);
    } else {
      sessionLearnedIndices.delete(idx);
    }
    saveToStorage();
    renderVocabCards();
  });

  document.getElementById('btn-vocab-prev').addEventListener('click', () => {
    state.currentVocabIndex--;
    renderVocabCards();
  });

  document.getElementById('btn-vocab-next').addEventListener('click', () => {
    if (idx >= total - 1) {
      showSessionSummary();
    } else {
      state.currentVocabIndex++;
      renderVocabCards();
    }
  });

  // Keyboard arrow keys: left = previous, right = next
  const handleKeyDown = e => {
    if (e.key === 'ArrowRight') {
      if (idx >= total - 1) { showSessionSummary(); } else { state.currentVocabIndex++; renderVocabCards(); }
    } else if (e.key === 'ArrowLeft') {
      if (idx > 0) { state.currentVocabIndex--; renderVocabCards(); }
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  // Clean up listener when navigating away
  document.getElementById('btn-back-vocab').addEventListener('click', () => {
    document.removeEventListener('keydown', handleKeyDown);
    nav.vocabDashboard();
  }, { once: true });

  // Swipe gestures: left = next, right = previous
  const card = document.getElementById('vocab-card');
  let touchStartX = null;
  card.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  card.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) < 50) return; // too small — treat as tap (flip)
    if (delta < 0) {
      // swipe left → next
      if (idx >= total - 1) { showSessionSummary(); } else { state.currentVocabIndex++; renderVocabCards(); }
    } else {
      // swipe right → previous
      if (idx > 0) { state.currentVocabIndex--; renderVocabCards(); }
    }
  }, { passive: true });
}
