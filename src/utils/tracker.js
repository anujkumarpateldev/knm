// src/utils/tracker.js
// Fire-and-forget analytics event tracker.
// All exports silently no-op when the user is not logged in.

import { supabase } from '../supabase.js';
import { state } from '../state.js';

let _section   = null;   // name of the section the user is currently in
let _enteredAt = null;   // Date.now() when they entered it

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call at the top of every page render function.
 * Automatically records section_exit (with time_spent) for the previous section,
 * then records section_enter for the new one.
 *
 * @param {string} section  short slug, e.g. 'knm', 'words', 'speaking_learn'
 */
export function trackEnter(section) {
  _flushExit(section);
  _section   = section;
  _enteredAt = Date.now();
  _send('section_enter', section, {});
}

/**
 * Fire a named event with optional properties.
 *
 * @param {string} event   e.g. 'quiz_complete', 'word_added', 'revision_done'
 * @param {object} props   arbitrary key/value pairs stored in the jsonb column
 */
export function track(event, props = {}) {
  _send(event, _section, props);
}

// ── Internal ─────────────────────────────────────────────────────────────────

function _flushExit(nextSection) {
  if (!_section || !_enteredAt) return;
  const seconds = Math.round((Date.now() - _enteredAt) / 1000);
  if (seconds >= 3) {
    _send('section_exit', _section, {
      time_spent: seconds,
      next: nextSection ?? null,
    });
  }
  _section   = null;
  _enteredAt = null;
}

function _send(event, section, props) {
  if (!state.currentUser) return;
  supabase.from('user_events').insert({
    user_id:    state.currentUser.id,
    event,
    section:    section ?? null,
    properties: props,
  }).then(() => {}).catch(() => {});
}

// Flush time-on-section when the user switches tabs or closes the page
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') _flushExit(null);
});
