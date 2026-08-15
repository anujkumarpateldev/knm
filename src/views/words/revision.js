// src/views/words/revision.js
// Vocabulary revision session — mode picker + flashcard loop with SRS rating.
import { state } from '../../state.js';
import { nav } from '../../router.js';
import { loadWords, reviewWord, getDueWords, getWordsByDate, getUniqueDates } from '../../data/words.js';
import { speakDutch } from '../../speech.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const SPEAK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

let revQueue     = [];
let revIndex     = 0;
let revResults   = { knew: 0, vague: 0, forgot: 0 };
let cardFlipped  = false;
let revDirection = localStorage.getItem('knm_rev_direction') || 'nl-en'; // 'nl-en' | 'en-nl'

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.round((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function recentCount(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return state.myWords.filter(w => w.dateAdded >= cutoffStr).length;
}

// ── Mode picker ───────────────────────────────────────────────────────────────
export async function renderWordRevision() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML =
    `<div class="view active" style="display:flex;align-items:center;justify-content:center;min-height:40vh;">
      <p style="color:var(--text-muted);">Loading words…</p>
    </div>`;

  await loadWords();

  const words = state.myWords;
  const dueWords = getDueWords();
  const dates = getUniqueDates();
  const recCount = recentCount(7);

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="word-revision-view">
      <div class="wj-page-header" style="margin-bottom:1.5rem;">
        <button class="btn-back" id="btn-back-journal">${BACK_ICON} My Words</button>
        <div>
          <h1 class="wj-title">Revise Words</h1>
          <p class="wj-subtitle">Choose how you want to revise</p>
        </div>
      </div>

      <div class="rev-direction-bar">
        <span class="rev-direction-label">Card direction</span>
        <div class="rev-direction-toggle">
          <button class="rev-dir-btn ${revDirection === 'nl-en' ? 'active' : ''}" id="dir-nl-en">
            🇳🇱 Dutch <span class="rev-dir-arrow">→</span> English 🇬🇧
          </button>
          <button class="rev-dir-btn ${revDirection === 'en-nl' ? 'active' : ''}" id="dir-en-nl">
            🇬🇧 English <span class="rev-dir-arrow">→</span> Dutch 🇳🇱
          </button>
        </div>
      </div>

      <div class="rev-modes-grid">

        <div class="rev-mode-card ${dueWords.length === 0 ? 'rev-mode-disabled' : ''}" id="mode-due">
          <div class="rev-mode-icon">🔔</div>
          <h3>Due Today</h3>
          <p>SRS-scheduled words ready for review</p>
          <span class="rev-badge ${dueWords.length > 0 ? 'rev-badge-warning' : 'rev-badge-muted'}">${dueWords.length} word${dueWords.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="rev-mode-card ${words.length === 0 ? 'rev-mode-disabled' : ''}" id="mode-random">
          <div class="rev-mode-icon">🎲</div>
          <h3>Random</h3>
          <p>Shuffle all your words for a surprise quiz</p>
          <span class="rev-badge rev-badge-primary">${words.length} word${words.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="rev-mode-card ${recCount === 0 ? 'rev-mode-disabled' : ''}" id="mode-recent">
          <div class="rev-mode-icon">📅</div>
          <h3>Last 7 Days</h3>
          <p>Words you added this week</p>
          <span class="rev-badge rev-badge-primary">${recCount} word${recCount !== 1 ? 's' : ''}</span>
        </div>

        <div class="rev-mode-card ${words.length === 0 ? 'rev-mode-disabled' : ''}" id="mode-all">
          <div class="rev-mode-icon">📚</div>
          <h3>All Words</h3>
          <p>Go through your entire vocabulary journal</p>
          <span class="rev-badge rev-badge-muted">${words.length} word${words.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="rev-mode-card rev-mode-bydate ${words.length === 0 ? 'rev-mode-disabled' : ''}" id="mode-bydate">
          <div class="rev-mode-icon">🗓️</div>
          <h3>By Date</h3>
          <p>Pick a day from your history</p>
          <select class="rev-date-select" id="rev-date-select" ${words.length === 0 ? 'disabled' : ''}>
            <option value="">Select a day…</option>
            ${dates.map(({ date, count }) =>
              `<option value="${date}">${formatDate(date)} — ${count} word${count !== 1 ? 's' : ''}</option>`
            ).join('')}
          </select>
          <button class="btn-primary rev-date-btn" id="btn-start-bydate" ${words.length === 0 ? 'disabled' : ''}>
            Start →
          </button>
        </div>

      </div>
    </div>
  `;

  document.getElementById('btn-back-journal').addEventListener('click', () => nav.wordJournal());

  document.getElementById('dir-nl-en').addEventListener('click', () => {
    revDirection = 'nl-en';
    localStorage.setItem('knm_rev_direction', revDirection);
    document.getElementById('dir-nl-en').classList.add('active');
    document.getElementById('dir-en-nl').classList.remove('active');
  });
  document.getElementById('dir-en-nl').addEventListener('click', () => {
    revDirection = 'en-nl';
    localStorage.setItem('knm_rev_direction', revDirection);
    document.getElementById('dir-en-nl').classList.add('active');
    document.getElementById('dir-nl-en').classList.remove('active');
  });

  const clickable = (id, mode) => {
    const card = document.getElementById(id);
    if (!card.classList.contains('rev-mode-disabled')) {
      card.addEventListener('click', () => startRevision(mode));
    }
  };
  clickable('mode-due',    'due');
  clickable('mode-random', 'random');
  clickable('mode-recent', 'recent');
  clickable('mode-all',    'all');

  document.getElementById('btn-start-bydate')?.addEventListener('click', () => {
    const date = document.getElementById('rev-date-select').value;
    if (date) startRevision('bydate', date);
  });
  // Prevent card click from firing when interacting with the select
  document.getElementById('rev-date-select')?.addEventListener('click', e => e.stopPropagation());
}

// ── Session start ─────────────────────────────────────────────────────────────
function startRevision(mode, dateParam = null) {
  let words = [];
  switch (mode) {
    case 'due':    words = shuffle(getDueWords()); break;
    case 'random': words = shuffle([...state.myWords]); break;
    case 'recent': {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      words = shuffle(state.myWords.filter(w => w.dateAdded >= cutoffStr));
      break;
    }
    case 'all':    words = shuffle([...state.myWords]); break;
    case 'bydate': words = getWordsByDate(dateParam); break;
  }
  if (!words.length) { alert('No words in this selection.'); return; }

  revQueue   = words;
  revIndex   = 0;
  revResults = { knew: 0, vague: 0, forgot: 0 };
  renderRevCard();
}

// ── Flashcard ─────────────────────────────────────────────────────────────────
function renderRevCard() {
  cardFlipped = false;
  const word = revQueue[revIndex];
  const idx  = revIndex;
  const total = revQueue.length;
  const pct = Math.round((idx / total) * 100);

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="rev-card-view">
      <div class="rev-session-header">
        <button class="btn-back" id="btn-quit">${BACK_ICON} Quit</button>
        <span class="rev-progress-text">${idx + 1} / ${total}</span>
      </div>

      <div class="rev-progress-bar">
        <div class="rev-progress-fill" style="width:${pct}%"></div>
      </div>

      <div class="rev-flashcard" id="rev-flashcard">
        <div class="rev-card-inner" id="rev-card-inner">

          ${revDirection === 'nl-en' ? `
          <div class="rev-card-face rev-card-front">
            <span class="rev-card-label">Dutch</span>
            <h2 class="rev-card-word">${esc(word.dutch)}</h2>
            <button class="rev-speak-btn" id="btn-speak">${SPEAK_ICON}</button>
            <p class="rev-flip-hint">Tap to reveal English</p>
          </div>
          <div class="rev-card-face rev-card-back">
            <span class="rev-card-label">English</span>
            <p class="rev-back-english">${esc(word.english)}</p>
            ${word.meaning ? `<p class="rev-back-meaning">${esc(word.meaning)}</p>` : ''}
            ${word.example ? `<p class="rev-back-example">"${esc(word.example)}"</p>` : ''}
          </div>
          ` : `
          <div class="rev-card-face rev-card-front">
            <span class="rev-card-label">English</span>
            <h2 class="rev-card-word rev-card-word-en">${esc(word.english)}</h2>
            <p class="rev-flip-hint">Tap to reveal Dutch</p>
          </div>
          <div class="rev-card-face rev-card-back">
            <span class="rev-card-label">Dutch</span>
            <h2 class="rev-card-word">${esc(word.dutch)}</h2>
            <button class="rev-speak-btn" id="btn-speak">${SPEAK_ICON}</button>
            ${word.meaning ? `<p class="rev-back-meaning">${esc(word.meaning)}</p>` : ''}
            ${word.example ? `<p class="rev-back-example">"${esc(word.example)}"</p>` : ''}
          </div>
          `}

        </div>
      </div>

      <div class="rev-actions">
        <p class="rev-tap-hint" id="rev-tap-hint">Tap the card to flip it</p>
        <div class="rev-rating-row" id="rev-rating-row" style="display:none;">
          <button class="btn-rating btn-rating-forgot" id="btn-forgot">✗ Forgot</button>
          <button class="btn-rating btn-rating-vague"  id="btn-vague">~ Vague</button>
          <button class="btn-rating btn-rating-knew"   id="btn-knew">✓ Knew it</button>
        </div>
        <div class="rev-nav-row">
          <button class="btn-rev-nav" id="btn-prev" ${idx === 0 ? 'disabled' : ''}>← Prev</button>
          <button class="btn-rev-nav" id="btn-skip" ${idx === total - 1 ? 'disabled' : ''}>Skip →</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-quit').addEventListener('click', () => nav.wordJournal());
  document.getElementById('btn-speak').addEventListener('click', e => { e.stopPropagation(); speakDutch(word.dutch); });

  document.getElementById('rev-flashcard').addEventListener('click', () => {
    if (cardFlipped) return;
    cardFlipped = true;
    document.getElementById('rev-card-inner').classList.add('flipped');
    document.getElementById('rev-tap-hint').style.display = 'none';
    document.getElementById('rev-rating-row').style.display = 'flex';
  });

  document.getElementById('btn-forgot').addEventListener('click', () => rate('forgot'));
  document.getElementById('btn-vague').addEventListener('click',  () => rate('vague'));
  document.getElementById('btn-knew').addEventListener('click',   () => rate('knew'));

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (revIndex > 0) { revIndex--; renderRevCard(); }
  });
  document.getElementById('btn-skip').addEventListener('click', () => {
    if (revIndex < revQueue.length - 1) { revIndex++; renderRevCard(); }
    else renderRevSummary();
  });
}

function rate(result) {
  reviewWord(revQueue[revIndex].id, result);
  revResults[result]++;
  revIndex++;
  if (revIndex >= revQueue.length) renderRevSummary();
  else renderRevCard();
}

// ── Summary ───────────────────────────────────────────────────────────────────
function renderRevSummary() {
  const total = revQueue.length;
  const { knew, vague, forgot } = revResults;
  const pct = Math.round((knew / total) * 100);
  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="rev-summary-view">
      <div class="rev-summary">
        <div class="rev-summary-emoji">${emoji}</div>
        <h1 class="rev-summary-title">Session Complete!</h1>
        <p class="rev-summary-sub">You reviewed ${total} word${total !== 1 ? 's' : ''}</p>

        <div class="rev-summary-stats">
          <div class="rev-summary-stat rev-stat-knew">
            <span class="rev-summary-num">${knew}</span>
            <span class="rev-summary-label">Knew it</span>
          </div>
          <div class="rev-summary-stat rev-stat-vague">
            <span class="rev-summary-num">${vague}</span>
            <span class="rev-summary-label">Vague</span>
          </div>
          <div class="rev-summary-stat rev-stat-forgot">
            <span class="rev-summary-num">${forgot}</span>
            <span class="rev-summary-label">Forgot</span>
          </div>
        </div>

        <div class="rev-summary-bar-outer">
          <div class="rev-summary-bar-fill" style="width:${pct}%"></div>
        </div>
        <p class="rev-summary-pct">${pct}% known</p>

        <div class="rev-summary-actions">
          <button class="btn-secondary" id="btn-back-journal">Back to Journal</button>
          <button class="btn-primary"   id="btn-revise-again">Revise Again</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-journal').addEventListener('click', () => nav.wordJournal());
  document.getElementById('btn-revise-again').addEventListener('click', () => nav.wordRevision());
}
