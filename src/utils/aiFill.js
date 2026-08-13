// src/utils/aiFill.js
// Shared AI fill logic — used by both user addWord and admin wordsAdmin
import { supabase } from '../supabase.js';

let cachedTags = null;

export async function loadAllTags() {
  const { data } = await supabase.from('word_dictionary').select('tags');
  const set = new Set();
  (data ?? []).forEach(row => (row.tags ?? []).forEach(t => { if (t) set.add(t); }));
  cachedTags = [...set].sort();
  return cachedTags;
}

export function setupTagsAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'tags-dropdown';
  document.body.appendChild(dropdown);

  function position() {
    const r = input.getBoundingClientRect();
    dropdown.style.top   = (r.bottom + window.scrollY + 4) + 'px';
    dropdown.style.left  = (r.left  + window.scrollX) + 'px';
    dropdown.style.width = r.width + 'px';
  }

  function getTyping() {
    const parts = input.value.split(',');
    return parts[parts.length - 1].trim().toLowerCase();
  }

  function getSelected() {
    return input.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  async function showSuggestions() {
    const tags = cachedTags ?? await loadAllTags();
    if (!tags.length) return;
    const filter   = getTyping();
    const selected = getSelected();
    const matches  = tags.filter(t =>
      t.toLowerCase().includes(filter) && !selected.includes(t.toLowerCase())
    );
    if (!matches.length) { dropdown.style.display = 'none'; return; }

    position();
    dropdown.innerHTML = matches.slice(0, 10).map(t =>
      `<div class="tags-dropdown-item" data-tag="${t}">${t}</div>`
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.tags-dropdown-item').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const parts = input.value.split(',');
        parts[parts.length - 1] = ' ' + item.dataset.tag;
        input.value = parts.join(',').replace(/^\s*,\s*/, '') + ', ';
        dropdown.style.display = 'none';
        input.focus();
      });
    });
  }

  input.addEventListener('focus',   () => showSuggestions());
  input.addEventListener('input',   () => showSuggestions());
  input.addEventListener('blur',    () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
  input.addEventListener('keydown', e => { if (e.key === 'Escape') dropdown.style.display = 'none'; });
}

export async function runAIFill({ dutch, btn, status, fields, dutchInputId, onRetrigger }) {
  btn.disabled = true;
  btn.style.opacity = '0.6';
  status.style.display = 'block';
  status.className = 'aw-ai-status aw-ai-loading';
  status.textContent = 'AI is thinking…';

  const { askAI } = await import('../ai/aiService.js');
  let fullText = '';

  await askAI({
    module: 'vocab',
    action: 'fill',
    context: { dutch_word: dutch },
    input: `For the Dutch word or phrase "${dutch}", respond with ONLY this format (no extra text):
CORRECTION: [if the word is misspelled or not a real Dutch word, write the correct Dutch word/phrase; otherwise write "none"]
ENGLISH: [English translation]
MEANING: [one-sentence definition in English]
EXAMPLE: [one natural Dutch example sentence using this word]`,
    onChunk: chunk => { fullText += chunk; },
    onDone: () => {
      const get = key => {
        const m = fullText.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
        return m?.[1]?.trim() ?? '';
      };
      const correction = get('CORRECTION');
      const english    = get('ENGLISH');
      const meaning    = get('MEANING');
      const example    = get('EXAMPLE');

      if (english && !document.getElementById(fields.english).value) document.getElementById(fields.english).value = english;
      if (meaning && !document.getElementById(fields.meaning).value)  document.getElementById(fields.meaning).value  = meaning;
      if (example && !document.getElementById(fields.example).value)  document.getElementById(fields.example).value  = example;

      btn.disabled = false; btn.style.opacity = '';

      // Show correction suggestion if AI detected a typo
      if (correction && correction.toLowerCase() !== 'none' && correction.toLowerCase() !== dutch.toLowerCase()) {
        status.className = 'aw-ai-status aw-ai-warning';
        status.innerHTML = `Did you mean <strong>${correction}</strong>?
          <button type="button" class="aw-correction-btn" id="btn-use-correction">Use "${correction}"</button>`;
        document.getElementById('btn-use-correction').addEventListener('click', () => {
          document.getElementById(dutchInputId).value = correction;
          // Clear fields so AI refills with the correct word
          document.getElementById(fields.english).value = '';
          document.getElementById(fields.meaning).value  = '';
          document.getElementById(fields.example).value  = '';
          onRetrigger();
        });
      } else {
        status.className = 'aw-ai-status aw-ai-success';
        status.textContent = 'Fields filled — review and adjust as needed.';
        setTimeout(() => { status.style.display = 'none'; }, 3500);
      }
    },
    onError: msg => {
      btn.disabled = false; btn.style.opacity = '';
      status.className = 'aw-ai-status aw-ai-error';
      status.textContent = msg;
    },
  });
}
