import { state } from './state.js';

const PROGRESS_KEY = 'knm_study_progress';
const HISTORY_KEY  = 'knm_activity_history';

// ── Progress helpers ─────────────────────────────────────────────────────────
// Unified key schema: top-level = "domain:moduleId", nested = itemId
// Domains: "knm" | "vocab" | "rq"

// Optional hook called after every setProgress — wired to Supabase sync in main.js.
// Kept here as a null slot so storage.js has zero dependency on Supabase.
let _syncHook = null;
export function setProgressSyncHook(fn) { _syncHook = fn; }

export function setProgress(domain, moduleId, itemId, value) {
  const key = `${domain}:${moduleId}`;
  if (!state.userProgress[key]) state.userProgress[key] = {};
  state.userProgress[key][itemId] = value;
  if (_syncHook) _syncHook(domain, moduleId, itemId, value);
}

export function getProgress(domain, moduleId, itemId) {
  return state.userProgress[`${domain}:${moduleId}`]?.[itemId] ?? null;
}

export function getModuleProgressMap(domain, moduleId) {
  return state.userProgress[`${domain}:${moduleId}`] || {};
}

// ── Migration ────────────────────────────────────────────────────────────────
// Converts old key formats to the new "domain:moduleId" schema.
// Runs once on load — safe to call on already-migrated data.
function migrateProgressKeys() {
  const old = state.userProgress;
  const migrated = {};
  let changed = false;

  for (const [key, val] of Object.entries(old)) {
    if (key.startsWith('knm:') || key.startsWith('vocab:') || key.startsWith('rq:')) {
      migrated[key] = val; // already in new format
    } else if (/^M\d+$/.test(key)) {
      migrated[`knm:${key}`] = val; // M1 → knm:M1
      changed = true;
    } else if (key.startsWith('READING:vocab:')) {
      migrated[`vocab:${key.replace('READING:vocab:', '')}`] = val; // READING:vocab:daily_routine → vocab:daily_routine
      changed = true;
    } else if (key.startsWith('rq_')) {
      migrated[`rq:${key}`] = val; // rq_daily → rq:rq_daily
      changed = true;
    } else {
      migrated[key] = val; // unknown — preserve as-is
    }
  }

  if (changed) {
    state.userProgress = migrated;
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────

export function loadFromStorage() {
  try {
    const p = localStorage.getItem(PROGRESS_KEY);
    if (p) state.userProgress = JSON.parse(p);
  } catch { state.userProgress = {}; }

  migrateProgressKeys();

  try {
    const h = localStorage.getItem(HISTORY_KEY);
    if (h) state.activityHistory = JSON.parse(h);
  } catch { state.activityHistory = []; }
}

export function saveToStorage() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.userProgress));
  localStorage.setItem(HISTORY_KEY,  JSON.stringify(state.activityHistory));
}
