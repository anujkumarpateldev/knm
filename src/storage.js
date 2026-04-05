import { state } from './state.js';

const PROGRESS_KEY = 'knm_study_progress';
const HISTORY_KEY  = 'knm_activity_history';

export function loadFromStorage() {
  try {
    const p = localStorage.getItem(PROGRESS_KEY);
    if (p) state.userProgress = JSON.parse(p);
  } catch { state.userProgress = {}; }

  try {
    const h = localStorage.getItem(HISTORY_KEY);
    if (h) state.activityHistory = JSON.parse(h);
  } catch { state.activityHistory = []; }
}

export function saveToStorage() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.userProgress));
  localStorage.setItem(HISTORY_KEY,  JSON.stringify(state.activityHistory));
}
