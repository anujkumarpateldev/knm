# DutchExamPro — Technical Task Backlog

> Last updated: 2026-08-17
> Format: each task has priority, effort estimate, status, and acceptance criteria.

---

## 🔴 Critical

### TASK-001 — Fix exam timer interval memory leak
- **Status:** ✅ Done — all exit paths call `stopExamTimer()` from `src/utils/examTimer.js`. Timer cleared at top of `startExamTimer()` before creating a new interval.
- **Effort:** 30 min
- **Files:** `src/views/knm/exam.js`, `src/views/reading/exam.js`, `src/utils/examTimer.js`
- **Acceptance criteria:**
  - [x] Starting a new exam always clears any existing timer
  - [x] Navigating away mid-exam stops the timer
  - [x] No duplicate countdown ticks observed in console

---

### TASK-002 — Add quiz render guard for missing module
- **Status:** ✅ Done — guard split into two cases in `quiz.render.js`: no module → `nav.landing()`, questions exhausted → `nav.results()`
- **Effort:** 15 min
- **File:** `src/views/quiz/quiz.render.js`
- **Acceptance criteria:**
  - [x] Navigating directly to quiz without a module redirects to landing
  - [x] No uncaught TypeError on missing state

---

## 🟠 High

### TASK-003 — Persist theme preference to localStorage
- **Status:** ✅ Done — saves to `dutchexampro_theme` key on toggle, restores on `setupTheme()` init.
- **Effort:** 15 min
- **File:** `src/theme.js`
- **Acceptance criteria:**
  - [x] Theme persists across page reloads
  - [x] Default is light if no preference saved
  - [x] Toggle still works correctly

---

### TASK-004 — Standardise progress key schema
- **Status:** ✅ Done — unified `domain:moduleId` schema. Helpers in `storage.js`. Auto-migration on `loadFromStorage()`.
- **Effort:** 2 hrs
- **Files:** `src/storage.js`, `src/views/quiz/quiz.logic.js`, `src/views/reading/vocab.js`
- **Key schema:** `knm:M1`, `vocab:daily_routine`, `rq:rq_daily`
- **Acceptance criteria:**
  - [x] All progress reads/writes use helper functions
  - [x] Existing localStorage data migrated automatically

---

### TASK-005 — Split quiz.js into smaller modules
- **Status:** ✅ Done — `quiz.render.js`, `quiz.events.js`, `quiz.logic.js`. Original `quiz.js` kept as a 1-line re-export shim.
- **Effort:** 3 hrs
- **Acceptance criteria:**
  - [x] Each file has a single clear responsibility
  - [x] No circular imports (render → events → logic, one-way)

---

### TASK-006 — Add exam timer warning before time runs out
- **Status:** ✅ Done — amber at ≤5 min, red + pulsing at ≤1 min. Toast pill at exactly 5 min and 1 min.
- **Effort:** 1 hr
- **Files:** `src/views/knm/exam.js`, `src/views/reading/exam.js`, `style.css`
- **Acceptance criteria:**
  - [x] Timer turns amber at < 5 min, red at < 1 min
  - [x] Warning toast shown at 5 min and 1 min
  - [x] Timer stops at 00:00, does not go negative

---

## 🟡 Medium

### TASK-007 — Sync progress to Supabase DB
- **Status:** ✅ Done — `src/sync.js` handles upsert + pull/merge. Sync hook in `storage.js` auto-fires on every `setProgress()` call.
- **Effort:** 1 day
- **Files:** `src/sync.js` (new), `src/storage.js`, `main.js`
- **Merge strategy:** `true` always wins — learned items are never un-marked by remote data.
- **Acceptance criteria:**
  - [x] Progress visible on second device after login
  - [x] Offline fallback works via localStorage

---

### TASK-008 — Add server-side feature gating
- **Status:** ⬜ To Do
- **Effort:** 1 day
- **Problem:** Exam access is only blocked client-side. A user can call `nav.exam()` in the console to bypass.
- **Fix:** Supabase Edge Function or RLS to reject exam data requests without valid auth token.
- **Acceptance criteria:**
  - [ ] Unauthenticated API call to exam endpoint returns 401
  - [ ] No exam data served without valid session

---

### TASK-009 — Fix shuffle algorithm (Fisher-Yates)
- **Status:** ✅ Done — replaced biased `sort(() => 0.5 - Math.random())` with Fisher-Yates in both exam files.
- **Effort:** 15 min
- **Files:** `src/views/knm/exam.js`, `src/views/reading/exam.js`
- **Acceptance criteria:**
  - [x] Fisher-Yates used in both KNM and Reading exam modes

---

### TASK-010 — Add user-friendly error handling
- **Status:** ✅ Done — `src/utils/errors.js` provides `showErrorView()` and `friendlyFetchError()`. Auth errors handled in `auth.js`.
- **Effort:** 2 hrs
- **Acceptance criteria:**
  - [x] Data load failure shows "Try Again" retry button
  - [x] Auth errors shown in plain English

---

### TASK-011 — Extract duplicate timer logic into shared utility
- **Status:** ✅ Done — `src/utils/examTimer.js` exports `startExamTimer()`, `stopExamTimer()`, `formatTime()`.
- **Effort:** 1 hr
- **Acceptance criteria:**
  - [x] Both exam modes use the shared timer
  - [x] Timer cleans up correctly on all exit paths

---

## 🟢 Low

### TASK-012 — Add JSDoc type annotations to state and core modules
- **Status:** ⬜ To Do
- **Effort:** 2 days
- **Files:** `src/state.js`, `src/router.js`, `src/storage.js`, `src/data/*.js`
- **Acceptance criteria:**
  - [ ] `state.js` has full type annotation for each property
  - [ ] All exported functions have `@param` and `@returns` docs

---

### TASK-013 — Add unit tests for quiz business logic
- **Status:** ⬜ To Do
- **Effort:** 3 days
- **Fix:** Add Vitest. Test: `handleAnswer`, progress helpers, `shuffle`, `formatTime`, score calculation.
- **Acceptance criteria:**
  - [ ] `npm test` runs successfully
  - [ ] Core quiz logic has >80% coverage

---

### TASK-014 — Add PWA / offline support
- **Status:** ⬜ To Do
- **Effort:** 2 days
- **Files:** `public/manifest.json`, `public/sw.js`, `index.html`
- **Acceptance criteria:**
  - [ ] App loads offline after first visit
  - [ ] Questions available without network

---

### TASK-015 — Add keyboard navigation for quiz
- **Status:** ⬜ To Do
- **Effort:** 1 hr
- **File:** `src/views/quiz/quiz.events.js`
- **Fix:** A/B/C/D keys select options; Enter advances; Arrow keys navigate options.
- **Acceptance criteria:**
  - [ ] All quiz actions achievable with keyboard only
  - [ ] Works in both practice and exam modes

---

### TASK-016 — Add analytics / question difficulty tracking
- **Status:** ⬜ To Do
- **Effort:** 2 days
- **Fix:** Log answer events to Supabase `analytics` table. Track: `question_id`, `correct`, `domain`, `module_id`, `user_id`.
- **Acceptance criteria:**
  - [ ] Answer events logged for authenticated users
  - [ ] No PII stored in analytics table

---

## 🤖 AI Integration

### AI-001 — Phase 1: AI Foundation
- **Status:** ✅ Done
- **Files created:** `supabase/functions/ai-chat/index.ts`, `src/ai/aiService.js`, `src/ai/aiPrompts.js`, `src/ai/aiUI.js`
- **Acceptance criteria:**
  - [x] Edge Function proxies to AI providers, validates JWT, checks rate limit
  - [x] Frontend `askAI()` streams response with `onChunk` / `onDone` / `onError` callbacks
  - [x] `createAIButton()` and `createAIPanel()` reusable UI components built
  - [x] `ai_usage` table with RLS deployed in Supabase

---

### AI-002 — Phase 2: Quiz AI (Hint + Explain)
- **Status:** ✅ Done
- **Files:** `src/views/quiz/quiz.render.js`, `src/views/quiz/quiz.logic.js`
- **Acceptance criteria:**
  - [x] "💡 Hint" button visible in practice mode for logged-in users
  - [x] "🔍 Explain in depth" button appears after wrong answer in practice mode
  - [x] Both hidden in exam mode and for guests
  - [x] AI responses stream into panel below the question

---

### AI-003 — Phase 3: Writing Module
- **Status:** ⬜ To Do
- **Effort:** 2–3 days
- **Files to create:** `src/views/writing/dashboard.js`, `src/views/writing/editor.js`, `public/writing/tasks.json`
- **Acceptance criteria:**
  - [ ] Writing task dashboard with task categories
  - [ ] Editor view with textarea + "Get Feedback" button
  - [ ] AI grades writing (score, errors, improved version) using quality model
  - [ ] New card on landing page

---

### AI-004 — Phase 4: Vocab + Reading AI
- **Status:** ⬜ To Do
- **Effort:** 1 day
- **Files:** `src/views/reading/vocab.js`, `src/views/quiz/quiz.render.js`
- **Acceptance criteria:**
  - [ ] "🧠 Mnemonic" button on vocab flashcards
  - [ ] "Simplify Text" button on reading passages
  - [ ] "Hint" button on reading comprehension questions

---

### AI-005 — Phase 5: Rate Limiting + Polish
- **Status:** ✅ Done — 50 calls/day enforced in Edge Function. Logged to `ai_usage` table per call. Graceful 429 error returned when exceeded.
- **Effort:** 1 day
- **Note:** AI usage counter visible to user ("X of 50 credits used today") is **not yet implemented** as a UI element — rate limit is enforced server-side only.
- **Acceptance criteria:**
  - [x] Rate limit enforced in Edge Function (50 calls/day)
  - [x] Graceful 429 JSON error returned when limit reached
  - [ ] AI usage counter shown in UI

---

### AI-006 — AI Fill for Word Journal
- **Status:** ✅ Done
- **Files:** `src/utils/aiFill.js`, `src/views/words/addWord.js`, `src/views/admin/wordsAdmin.js`
- **Description:** AI auto-fills English, Meaning, and Example fields when adding a Dutch word. Uses a strict action-specific system prompt (`fill` action) that outputs exactly 4 labeled lines. Handles spelling correction suggestions.
- **Acceptance criteria:**
  - [x] AI fills empty fields from just the Dutch word
  - [x] Spelling correction shown as a "Did you mean X?" prompt with a "Use" button
  - [x] Markdown-tolerant regex handles both `KEY: value` and `**KEY:** value` AI output formats
  - [x] Tag autocomplete with 30-second cached tag list from `word_dictionary`
  - [x] Falls back gracefully if AI is unavailable

---

## 📖 Word Journal

### WORD-001 — Personal Word Journal (Mijn Woorden)
- **Status:** ✅ Done
- **Files:** `src/data/words.js`, `src/views/words/journal.js`, `src/views/words/addWord.js`
- **Description:** Full word management: add, view, edit, delete, speak (TTS). Persisted in `user_words` Supabase table. Paginated journal (20 per page), grouped by date.
- **Acceptance criteria:**
  - [x] Words stored in Supabase for logged-in users
  - [x] Add word form with duplicate/dictionary detection
  - [x] Edit word via inline form in journal
  - [x] Delete word with confirmation
  - [x] Pagination (20 per page)
  - [x] Stats strip: total, added today, due for review

---

### WORD-002 — Shared Word Dictionary
- **Status:** ✅ Done
- **Files:** `src/data/words.js`, `src/views/admin/wordsAdmin.js`, `src/views/admin/tagsAdmin.js`
- **Description:** `word_dictionary` table holds canonical Dutch words with meanings, examples, and tags. When a user adds a word that exists in the dictionary, they get the dictionary entry added to their list instead of a duplicate. Admins manage the dictionary via the admin panel.
- **Acceptance criteria:**
  - [x] `word_dictionary` table deployed with RLS
  - [x] Adding a word checks for dictionary match (case-insensitive)
  - [x] Admin can add/edit/delete shared dictionary words with AI Fill
  - [x] Tags manageable separately via admin tag panel

---

### WORD-003 — Spaced Repetition Revision
- **Status:** ✅ Done
- **Files:** `src/views/words/revision.js`, `src/data/words.js`
- **Description:** SRS flashcard revision with 5 session modes. Rating updates `srs_interval` and `srs_next_review` in `user_words`. Schedule: `[1, 2, 4, 7, 14, 30]` days.
- **Acceptance criteria:**
  - [x] Due Today mode shows only words scheduled for review
  - [x] Random, Last 7 Days, All Words, By Date modes
  - [x] Direction toggle: Dutch→English or English→Dutch
  - [x] Three rating buttons: Forgot / Vague / Knew it
  - [x] SRS state persisted to Supabase after each rating
  - [x] Session summary with % known

---

### WORD-004 — Account Management (Profile)
- **Status:** ✅ Done
- **Files:** `src/views/profile.js`, `main.js`
- **Description:** Profile page lets users update display name, change password, or delete their account. Display name appears in the header in real-time.
- **Acceptance criteria:**
  - [x] Display name editable and reflected in header immediately
  - [x] Password change with 8+ character validation
  - [x] Account deletion with confirmation (cascade-deletes all user data)
  - [x] Deactivated accounts redirected to deactivated screen on login

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Done | Completed and verified |
| 🔄 In Progress | Currently being worked on |
| ⬜ To Do | Not started |
| ⏸ Blocked | Waiting on dependency |
| ❌ Cancelled | Won't fix |

---

## Completion Summary

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| 🔴 Critical | 2 | 2 | 0 |
| 🟠 High | 4 | 4 | 0 |
| 🟡 Medium | 5 | 5 | 0 |
| 🟢 Low | 5 | 0 | 5 |
| 🤖 AI Integration | 6 | 4 | 2 |
| 📖 Word Journal | 4 | 4 | 0 |
| **Total** | **26** | **19** | **7** |
