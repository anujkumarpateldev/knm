// src/views/words/journal.js
// Main "Mijn Woorden" journal — word list grouped by date + stats.
import { state } from '../../state.js';
import { nav } from '../../router.js';
import { loadWords, deleteWord, getDueWords } from '../../data/words.js';
import { speakDutch } from '../../speech.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const SPEAK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.round((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function masteryDots(reps) {
  const max = 5;
  return `<div class="mastery-dots" title="${Math.min(reps, max)}/${max} successful reviews">` +
    Array.from({ length: max }, (_, i) =>
      `<span class="mastery-dot${i < reps ? ' filled' : ''}"></span>`
    ).join('') +
  `</div>`;
}

function wordCardHTML(w) {
  return `
    <div class="word-card">
      <div class="word-card-header">
        <div class="word-card-dutch">
          <span class="word-dutch-text">${esc(w.dutch)}</span>
          <button class="btn-icon btn-speak-word" data-word="${esc(w.dutch)}" title="Listen">${SPEAK_ICON}</button>
        </div>
        <button class="btn-icon btn-delete-word" data-id="${esc(w.id)}" title="Delete">${DELETE_ICON}</button>
      </div>
      <div class="word-card-english">${esc(w.english)}</div>
      ${w.meaning ? `<div class="word-card-meaning">${esc(w.meaning)}</div>` : ''}
      ${w.example ? `<div class="word-card-example">"${esc(w.example)}"</div>` : ''}
      <div class="word-card-footer">
        ${masteryDots(w.srsRepetitions)}
        ${w.tags.length ? `<div class="word-tags">${w.tags.map(t => `<span class="word-tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>`;
}

export async function renderWordJournal() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML =
    `<div class="view active" style="display:flex;align-items:center;justify-content:center;min-height:40vh;">
      <p style="color:var(--text-muted);">Loading words…</p>
    </div>`;

  await loadWords();

  const words = state.myWords;
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCount = getDueWords().length;
  const todayCount = words.filter(w => w.dateAdded === todayStr).length;

  const byDate = {};
  words.forEach(w => { (byDate[w.dateAdded] ??= []).push(w); });
  const dateEntries = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="word-journal-view">
      <div class="wj-page-header">
        <button class="btn-back" id="btn-back-landing">${BACK_ICON} Home</button>
        <div>
          <h1 class="wj-title">Mijn Woorden</h1>
          <p class="wj-subtitle">Your personal Dutch vocabulary journal</p>
        </div>
      </div>

      <div class="wj-stats-strip">
        <div class="wj-stat">
          <span class="wj-stat-num">${words.length}</span>
          <span class="wj-stat-label">Total words</span>
        </div>
        <div class="wj-stat">
          <span class="wj-stat-num wj-stat-primary">${todayCount}</span>
          <span class="wj-stat-label">Added today</span>
        </div>
        <div class="wj-stat">
          <span class="wj-stat-num ${dueCount > 0 ? 'wj-stat-warning' : ''}">${dueCount}</span>
          <span class="wj-stat-label">Due for review</span>
        </div>
      </div>

      <div class="wj-top-actions">
        <button class="btn-primary" id="btn-add-word">+ Add Word</button>
        <button class="btn-secondary" id="btn-start-revision" ${words.length === 0 ? 'disabled' : ''}>
          Revise Words
        </button>
      </div>

      ${words.length === 0 ? `
        <div class="wj-empty">
          <div class="wj-empty-icon">📖</div>
          <h3>No words yet</h3>
          <p>Add Dutch words you encounter each day.<br>Build your personal vocabulary journal!</p>
          <button class="btn-primary" id="btn-add-first">+ Add Your First Word</button>
        </div>
      ` : `
        <div class="wj-journal">
          ${dateEntries.map(([date, dateWords]) => `
            <div class="wj-date-group">
              <div class="wj-date-header">
                <span class="wj-date-label">${formatDate(date)}</span>
                <span class="wj-date-badge">${dateWords.length} word${dateWords.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="word-cards-grid">
                ${dateWords.map(wordCardHTML).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  document.getElementById('btn-back-landing').addEventListener('click', () => nav.landing());
  document.getElementById('btn-add-word').addEventListener('click', () => nav.addWord());
  document.getElementById('btn-add-first')?.addEventListener('click', () => nav.addWord());
  document.getElementById('btn-start-revision')?.addEventListener('click', () => nav.wordRevision());

  document.querySelectorAll('.btn-speak-word').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); speakDutch(btn.dataset.word); });
  });

  document.querySelectorAll('.btn-delete-word').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this word?')) return;
      await deleteWord(btn.dataset.id);
      renderWordJournal();
    });
  });
}
