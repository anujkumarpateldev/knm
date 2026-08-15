// src/views/words/addWord.js
// Add a new word to the personal journal with optional AI auto-fill.
import { nav } from '../../router.js';
import { addWord } from '../../data/words.js';
import { state } from '../../state.js';
import { runAIFill } from '../../utils/aiFill.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const SPARKLE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10 L13.5 11 L12 18 L10.5 11 L4 10 L10.5 9 Z"/></svg>`;

export function renderAddWord() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  const isLoggedIn = !!state.currentUser;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="add-word-view">
      <div class="aw-container">
        <div class="wj-page-header" style="margin-bottom:1.5rem;">
          <button class="btn-back" id="btn-back-journal">${BACK_ICON} My Words</button>
          <div>
            <h1 class="wj-title">Add a Word</h1>
            <p class="wj-subtitle">Add a Dutch word you want to remember</p>
          </div>
        </div>

        <form class="aw-form" id="aw-form" novalidate>
          <div class="aw-form-group">
            <label class="aw-label" for="aw-dutch">
              Dutch word / phrase <span class="aw-required">*</span>
            </label>
            <div class="aw-dutch-row">
              <input class="aw-input" id="aw-dutch" type="text"
                placeholder="e.g. de fiets, werkloos zijn…" autocomplete="off" autofocus />
              <button type="button" class="btn-ai-fill" id="btn-ai-fill"
                title="${isLoggedIn ? 'Auto-fill with AI' : 'Sign in to use AI fill'}">
                ${SPARKLE} ${isLoggedIn ? 'AI Fill' : 'Sign in for AI'}
              </button>
            </div>
            <div class="aw-ai-status" id="aw-ai-status" style="display:none;"></div>
          </div>

          <div class="aw-form-group">
            <label class="aw-label" for="aw-english">
              English translation <span class="aw-required">*</span>
            </label>
            <input class="aw-input" id="aw-english" type="text" placeholder="e.g. the bicycle" />
          </div>

          <div class="aw-form-group">
            <label class="aw-label" for="aw-meaning">Meaning / definition</label>
            <input class="aw-input" id="aw-meaning" type="text"
              placeholder="e.g. A two-wheeled vehicle for cycling" />
          </div>

          <div class="aw-form-group">
            <label class="aw-label" for="aw-example">Example sentence <span class="aw-hint">(Dutch)</span></label>
            <textarea class="aw-input aw-textarea" id="aw-example" rows="2"
              placeholder="e.g. Ik ga elke dag op de fiets naar mijn werk."></textarea>
          </div>

          <div class="aw-form-group">
            <label class="aw-label" for="aw-tags">
              Tags <span class="aw-hint">(comma-separated, optional)</span>
            </label>
            <input class="aw-input" id="aw-tags" type="text"
              placeholder="e.g. transport, work, daily life" />
          </div>

          <p class="aw-form-status" id="aw-form-status" style="display:none;"></p>
          <div class="aw-form-actions">
            <button type="button" class="btn-secondary" id="btn-cancel">Cancel</button>
            <button type="submit" class="btn-primary">Save Word</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-back-journal').addEventListener('click', () => nav.wordJournal());
  document.getElementById('btn-cancel').addEventListener('click', () => nav.wordJournal());
  document.getElementById('btn-ai-fill').addEventListener('click', handleAIFill);

  document.getElementById('aw-form').addEventListener('submit', async e => {
    e.preventDefault();
    const dutch   = document.getElementById('aw-dutch').value.trim();
    const english = document.getElementById('aw-english').value.trim();
    if (!dutch || !english) {
      showFormStatus('Dutch word and English translation are required.', 'error');
      return;
    }
    const meaning = document.getElementById('aw-meaning').value.trim();
    const example = document.getElementById('aw-example').value.trim();
    const tagsRaw = document.getElementById('aw-tags').value.trim();
    const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const submitBtn = document.querySelector('#aw-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const result = await addWord({ dutch, english, meaning, example, tags });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Word';

    if (result.duplicate) {
      showFormStatus(`"${dutch}" is already in your word list.`, 'error');
      return;
    }
    if (result.dictExists) {
      // Word is in the shared dictionary but not yet in user's list — add it directly
      const { confirmAddFromDict } = await import('../../data/words.js');
      const r = await confirmAddFromDict(result.dictWord.id);
      if (r.error) { showFormStatus(r.error, 'error'); return; }
      nav.wordJournal();
      return;
    }
    if (result.error) {
      showFormStatus(result.error, 'error');
      return;
    }

    nav.wordJournal();
  });
}

function showFormStatus(msg, type) {
  const el = document.getElementById('aw-form-status');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color = type === 'error' ? 'var(--danger)' : 'var(--success)';
}

async function handleAIFill() {
  if (!state.currentUser) { nav.auth(); return; }

  const dutch  = document.getElementById('aw-dutch').value.trim();
  const btn    = document.getElementById('btn-ai-fill');
  const status = document.getElementById('aw-ai-status');

  if (!dutch) { document.getElementById('aw-dutch').focus(); return; }

  await runAIFill({
    dutch,
    btn,
    status,
    fields: {
      english: 'aw-english',
      meaning: 'aw-meaning',
      example: 'aw-example',
    },
    dutchInputId: 'aw-dutch',
    onRetrigger: () => handleAIFill(),
  });
}

// Re-export so any existing import of runAIFill from this file still works
export { runAIFill };
