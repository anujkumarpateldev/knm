import { state } from '../state.js';

// ── startExamTimer ───────────────────────────────────────────────────────────
// Starts a countdown timer. Clears any existing timer first.
//
// durationSeconds  — total seconds for the exam
// onTick(seconds)  — called every second with the current remaining seconds
// onExpire()       — called once when the timer reaches 0
export function startExamTimer(durationSeconds, onTick, onExpire) {
  state.examTimeRemaining = durationSeconds;

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.examTimeRemaining = Math.max(0, state.examTimeRemaining - 1);
    onTick(state.examTimeRemaining);
    if (state.examTimeRemaining <= 0) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      onExpire();
    }
  }, 1000);
}

// ── stopExamTimer ────────────────────────────────────────────────────────────
// Clears the running interval. Safe to call even if no timer is active.
export function stopExamTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

// ── formatTime ───────────────────────────────────────────────────────────────
// Formats seconds into MM:SS string.
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
