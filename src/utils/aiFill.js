// src/utils/aiFill.js
// Shared AI fill logic — used by both user addWord and admin wordsAdmin
import { supabase } from '../supabase.js';

let cachedTags  = null;
let cacheAt     = 0;
let inFlight    = null;
const CACHE_MS  = 30_000; // re-fetch after 30 s or after invalidation

async function fetchTags() {
  const now = Date.now();
  // Return cached value if still fresh
  if (cachedTags !== null && now - cacheAt < CACHE_MS) return cachedTags;
  // Deduplicate concurrent in-flight requests
  if (inFlight) return inFlight;
  inFlight = supabase.from('word_dictionary').select('tags').then(({ data }) => {
    const set = new Set();
    (data ?? []).forEach(row => (row.tags ?? []).forEach(t => { if (t) set.add(t); }));
    cachedTags = [...set].sort();
    cacheAt    = Date.now();
    inFlight   = null;
    return cachedTags;
  }).catch(() => { inFlight = null; return cachedTags ?? []; });
  return inFlight;
}

export async function loadAllTags() {
  return fetchTags();
}

// Call after saving a word with new tags so next open fetches fresh
export function invalidateTagsCache() {
  cachedTags = null;
  cacheAt    = 0;
}

// Track dropdowns by inputId for cleanup
const _dropdowns = {};

export function setupTagsAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Remove old dropdown if present
  _dropdowns[inputId]?.remove();

  const dropdown = document.createElement('div');
  dropdown.className = 'tag-dropdown';
  document.body.appendChild(dropdown);
  _dropdowns[inputId] = dropdown;

  function getSelected() {
    return input.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  function getFilter() {
    const parts = input.value.split(',');
    return parts[parts.length - 1].trim().toLowerCase();
  }

  function positionDropdown() {
    const r = input.getBoundingClientRect();
    dropdown.style.top   = (r.bottom + 4) + 'px';
    dropdown.style.left  = r.left + 'px';
    dropdown.style.width = r.width + 'px';
  }

  async function showDropdown() {
    const all      = await fetchTags();
    const filter   = getFilter();
    const selected = getSelected();
    const visible  = all.filter(t =>
      !selected.includes(t.toLowerCase()) &&
      (filter === '' || t.toLowerCase().includes(filter))
    );

    if (!visible.length) { dropdown.style.display = 'none'; return; }

    positionDropdown();
    dropdown.innerHTML = visible.map(t =>
      `<div class="tag-dropdown-item" data-tag="${t}">${t}</div>`
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.tag-dropdown-item').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const parts = input.value.split(',').map(t => t.trim()).filter(Boolean);
        // Replace the partial last segment with the chosen tag
        const last = input.value.split(',');
        last[last.length - 1] = last.length > 1 || input.value.includes(',') ? ' ' + item.dataset.tag : item.dataset.tag;
        input.value = last.join(',').replace(/^,\s*/, '') + ', ';
        input.focus();
        showDropdown();
      });
    });
  }

  input.addEventListener('focus',   () => showDropdown());
  input.addEventListener('click',   () => showDropdown());
  input.addEventListener('input',   () => showDropdown());
  input.addEventListener('blur',    () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
  input.addEventListener('keydown', e => { if (e.key === 'Escape') dropdown.style.display = 'none'; });
}

export async function runAIFill({ dutch, btn, status, fields, dutchInputId, onRetrigger }) {
  btn.disabled = true;
  btn.style.opacity = '0.6';
  status.style.display = 'block';
  status.className = 'aw-ai-status aw-ai-loading';
  status.textContent = 'AI is thinking…';

  const restore = () => { btn.disabled = false; btn.style.opacity = ''; };

  let askAI;
  try {
    ({ askAI } = await import('../ai/aiService.js'));
  } catch (e) {
    restore();
    status.className = 'aw-ai-status aw-ai-error';
    status.textContent = 'Could not load AI service.';
    return;
  }

  let fullText = '';

  try {
  await askAI({
    module: 'vocab',
    action: 'fill',
    context: { dutch_word: dutch },
    input: dutch,
    onChunk: chunk => { fullText += chunk; },
    onDone: () => {
      // Handles plain "KEY: value" and markdown-bold "**KEY:** value" variants
      const get = key => {
        const m = fullText.match(new RegExp(`\\*{0,2}${key}\\*{0,2}:?\\*{0,2}\\s*(.+)`, 'i'));
        return m ? m[1].replace(/\*+$/, '').trim() : '';
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
      restore();
      status.className = 'aw-ai-status aw-ai-error';
      status.textContent = msg;
    },
  });
  } catch (e) {
    restore();
    status.className = 'aw-ai-status aw-ai-error';
    status.textContent = e?.message || 'AI request failed.';
  }
}
