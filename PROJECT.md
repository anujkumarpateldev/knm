# DutchExamPro — Project Documentation

> **Primary audience:** AI agents making changes to this codebase.
> **Last updated:** 2026-08-17
>
> **Note:** `ARCHITECTURE.md` is the authoritative technical reference (DB schema, SQL scripts, module deep-dives). This file provides the quick-start overview, file structure, feature inventory, and extension guides.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Feature Reference](#feature-reference)
5. [How to Run](#how-to-run)
6. [How to Extend (for AI)](#how-to-extend-for-ai)

---

## Project Overview

**DutchExamPro** is a single-page web application for studying the Dutch A2 integration exam (inburgeringsexamen). It has five study modules:

- **KNM** (Kennis van de Nederlandse Maatschappij): 8 topic modules, each with ~80 multiple-choice questions. Practice mode and full timed 40-question exam (45 minutes, pass threshold 65%).
- **Reading (Lezen)**: Vocabulary flip-cards (11 topics, 100 words each) + Reading quiz (9 topic sets of comprehension questions).
- **Speaking (Spreken)**: A2 speaking exam practice. Two modes: Learn (sentence/scenario flashcards) and Practice (photo-based exam simulation with MediaRecorder).
- **Mijn Woorden**: Personal word journal. Users add Dutch words, AI auto-fills fields, and spaced repetition scheduling keeps review on track.
- **Writing**: Planned — not yet built.

**Backend:** Supabase (Auth + PostgreSQL + Edge Functions).
**AI:** Supabase Edge Function proxies to DeepSeek (speed) and Claude (quality) with automatic fallback.
**Email:** EmailJS (browser SDK) for the contact form.
**Hosting:** Netlify static site.

---

## Tech Stack

| Concern | Tool |
|---|---|
| Build | Vite (v8+) |
| Language | Vanilla JavaScript (ES modules, no TypeScript, no framework) |
| UI | Pure DOM manipulation via `innerHTML` |
| Styling | Single `public/style.css` (custom properties, dark/light theme) |
| Fonts | Fraunces + DM Sans (Google Fonts) |
| Auth | Supabase Auth (email/password, JWT) |
| Database | Supabase PostgreSQL |
| AI | Supabase Edge Function → DeepSeek + Anthropic Claude (streaming SSE) |
| Email | EmailJS browser SDK (contact form) |
| Speech | Web Speech API (`nl-NL`), MediaRecorder API (speaking practice) |
| Persistence | localStorage (offline fallback) + Supabase (cross-device sync) |

---

## Project Structure

```
knm/
├── index.html                        # Shell HTML: header, main-content, footer, cookie banner
├── main.js                           # Entry point: nav registry, auth wiring, boot
├── package.json
├── vite.config.js
├── supabase/
│   └── functions/
│       └── ai-chat/
│           └── index.ts              # AI proxy Edge Function (DeepSeek + Claude)
├── public/
│   ├── style.css                     # All CSS (single file)
│   ├── _redirects                    # Netlify SPA redirect rule
│   ├── favicon.png / logo.png
│   ├── questions/                    # KNM JSON (8 modules)
│   ├── reading/
│   │   ├── vocab/                    # Vocabulary JSON (11 topics)
│   │   └── questions/               # Reading quiz JSON (9 topics)
│   └── speaking/                     # Speaking JSON (4 files)
└── src/
    ├── state.js                      # Global state (single mutable object)
    ├── router.js                     # nav{} registry (plain object, no-op defaults)
    ├── storage.js                    # localStorage helpers + progress key schema
    ├── sync.js                       # Supabase progress upsert + pull/merge
    ├── supabase.js                   # Supabase client (createClient)
    ├── speech.js                     # Web Speech API wrapper (speakDutch)
    ├── theme.js                      # Dark/light toggle (persists to localStorage)
    ├── ai/
    │   ├── aiService.js              # askAI() — central streaming AI call
    │   ├── aiPrompts.js              # Context builders per module/action
    │   └── aiUI.js                   # createAIPanel(), createAIButton()
    ├── data/
    │   ├── knm.js                    # Fetches KNM JSON; progress helpers
    │   ├── reading.js                # Fetches vocab + reading quiz JSON
    │   ├── speaking.js               # Fetches speaking JSON
    │   └── words.js                  # Word journal CRUD (user_words + word_dictionary)
    ├── utils/
    │   ├── aiFill.js                 # AI word fill + tag autocomplete (with cache)
    │   ├── authModal.js              # Auth form logic helpers
    │   ├── errors.js                 # showErrorView(), friendlyFetchError()
    │   └── examTimer.js              # startExamTimer(), stopExamTimer(), formatTime()
    └── views/
        ├── auth.js                   # Login / Register / Password Reset
        ├── landing.js                # Home page (module cards, trust strip, marquee)
        ├── categorySelect.js         # Category + mode picker grid
        ├── progress.js               # Activity history list
        ├── results.js                # End-of-quiz results + flashcard trigger
        ├── flashcards.js             # Wrong-answer flip-card review
        ├── contact.js                # EmailJS contact form
        ├── profile.js                # Display name, password, delete account
        ├── help.js                   # FAQ page
        ├── privacy.js                # Privacy Policy
        ├── terms.js                  # Terms of Service
        ├── deactivated.js            # Deactivated account screen
        ├── quiz/
        │   ├── quiz.render.js        # Question HTML builder (renderQuestion export)
        │   ├── quiz.events.js        # Button event wiring
        │   └── quiz.logic.js         # handleAnswer(), progress updates, AI buttons
        ├── quiz.js                   # Re-export shim (backward compat)
        ├── knm/
        │   ├── dashboard.js          # KNM module grid + start practice
        │   └── exam.js               # 40-question timed exam
        ├── reading/
        │   ├── dashboard.js          # Vocab vs Reading Quiz picker
        │   ├── vocab.js              # Vocab topic grid + flip-cards
        │   ├── quizDashboard.js      # Reading quiz topic grid
        │   └── exam.js               # 25-question timed reading exam
        ├── speaking/
        │   ├── dashboard.js          # Speaking mode picker + Answer Formula
        │   ├── learn.js              # Sentence/scenario flashcards (3 tabs)
        │   └── practice.js           # Photo-based exam practice with MediaRecorder
        ├── words/
        │   ├── journal.js            # Paginated word journal (20/page, grouped by date)
        │   ├── addWord.js            # Add word form with AI Fill
        │   └── revision.js           # SRS flashcard revision (5 session modes)
        └── admin/
            ├── dashboard.js          # Admin hub
            ├── users.js              # User management (activate/deactivate)
            ├── wordsAdmin.js         # Shared word_dictionary CRUD + AI Fill
            ├── tagsAdmin.js          # Tag management for word dictionary
            └── emailComposer.js      # Send emails to users via EmailJS
```

---

## Feature Reference

| Feature | Status | Files |
|---|---|---|
| Landing page | ✅ Done | `views/landing.js` |
| Category + mode selection | ✅ Done | `views/categorySelect.js` |
| KNM practice (8 modules, resume support) | ✅ Done | `views/knm/dashboard.js` |
| KNM full exam (40 questions, 45 min) | ✅ Done | `views/knm/exam.js` |
| Reading vocab flip-cards (11 topics, TTS) | ✅ Done | `views/reading/vocab.js` |
| Reading quiz (9 topics, comprehension) | ✅ Done | `views/reading/quizDashboard.js` |
| Reading full exam (25 questions, 65 min) | ✅ Done | `views/reading/exam.js` |
| Speaking Learn (sentence/scenario flashcards) | ✅ Done | `views/speaking/learn.js` |
| Speaking Practice (photo exam, recording) | ✅ Done | `views/speaking/practice.js` |
| Mijn Woorden — word journal | ✅ Done | `views/words/journal.js`, `data/words.js` |
| Add word with AI Fill | ✅ Done | `views/words/addWord.js`, `utils/aiFill.js` |
| Shared word dictionary | ✅ Done | `data/words.js` → `word_dictionary` table |
| Spaced repetition revision (5 modes) | ✅ Done | `views/words/revision.js` |
| Quiz AI: Hint + Explain buttons | ✅ Done | `views/quiz/quiz.logic.js` |
| Writing module + AI grade | ⬜ Planned | — |
| Vocab mnemonic AI | ⬜ Planned | — |
| Reading simplify/hint AI | ⬜ Planned | — |
| Speaking AI evaluation | 🔄 Partial | `ai/aiPrompts.js` (context built, not wired) |
| Quiz engine (shared MCQ/T-F/reading) | ✅ Done | `views/quiz/` (3 files) |
| Exam timer (amber/red warnings, toast) | ✅ Done | `utils/examTimer.js` |
| Flashcard wrong-answer review | ✅ Done | `views/flashcards.js` |
| Progress history | ✅ Done | `views/progress.js` |
| User auth (register, login, session restore) | ✅ Done | `views/auth.js`, `main.js` |
| Profile (display name, password, delete account) | ✅ Done | `views/profile.js` |
| Cross-device progress sync | ✅ Done | `sync.js` → `user_progress` table |
| Dark/light theme (persisted) | ✅ Done | `theme.js` |
| Contact form (EmailJS) | ✅ Done | `views/contact.js` |
| Help / Privacy / Terms pages | ✅ Done | `views/help.js`, `privacy.js`, `terms.js` |
| Cookie consent banner | ✅ Done | `index.html` + `main.js` |
| Admin panel (users, words, tags, email) | ✅ Done | `views/admin/` |
| TTS (Dutch audio on quiz + vocab) | ✅ Done | `speech.js` |
| Fisher-Yates shuffle for exams | ✅ Done | `views/knm/exam.js`, `views/reading/exam.js` |
| Error handling with retry | ✅ Done | `utils/errors.js` |

---

## How to Run

```bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Build for production (outputs to dist/)
npm run build
```

The dev server (Vite) serves `public/` at the root, so `/style.css` resolves to `public/style.css` and question JSON files resolve to `public/questions/...`.

**Environment:** Create `.env` at project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## How to Extend (for AI)

### Key Invariants — Never Break These

1. **Never import a view directly from another view.** Always navigate through `nav`. This prevents circular imports.
2. **Always replace `#main-content` innerHTML completely.** Views do not unmount or patch — they wholesale replace.
3. **Always attach event listeners after setting innerHTML.** Elements must exist in the DOM first.
4. **Set body class on every view render.** Every render function must call `document.body.classList.add('in-dashboard')` + `remove('in-quiz')` (or vice versa). Forgetting causes layout bugs.
5. **Progress keys must be stable.** Changing a `module_id` or vocab `id` will orphan previously-saved progress. Do not rename once shipped.
6. **`state` is mutated directly.** No setter pattern. Just assign: `state.currentModule = mod;`.
7. **`saveToStorage()` must be called** whenever `state.userProgress` or `state.activityHistory` is mutated. Not automatic.

---

### 1. Add a New View/Screen

**Step 1 — Create the view file**
```js
// src/views/myNewView.js
import { state } from '../state.js';
import { nav } from '../router.js';

export function renderMyNewView() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="my-new-view">
      <button id="btn-back">Back</button>
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', () => nav.landing());
}
```

**Step 2 — Add nav key in `src/router.js`**
```js
export const nav = {
  // existing keys...
  myNewView: () => {},
};
```

**Step 3 — Wire in `main.js`**
```js
import { renderMyNewView } from './src/views/myNewView.js';
nav.myNewView = renderMyNewView;
```

**Step 4 — Navigate to it from any view**
```js
import { nav } from '../router.js';
nav.myNewView();
```

---

### 2. Add a New AI Action

**Step 1 — Add to the Edge Function** (`supabase/functions/ai-chat/index.ts`):

```typescript
// In ACTION_PRIORITY:
myAction: 'speed',  // or 'quality'

// In buildUserMessage() switch:
case 'myAction':
  return `Your prompt to the AI using ${context.someField}`;

// Optionally in ACTION_PROMPTS for a strict format:
myAction: `You are a... Output EXACTLY...`,
```

**Step 2 — Add a context builder** (`src/ai/aiPrompts.js`):
```js
export function myActionContext(data) {
  return {
    module: 'vocab',  // or quiz, reading, writing, speaking
    action: 'myAction',
    context: { someField: data.value },
    input: '',
  };
}
```

**Step 3 — Wire it in the view:**
```js
import { createAIButton } from '../../ai/aiUI.js';
import { myActionContext } from '../../ai/aiPrompts.js';

const btn = createAIButton({
  label: '✦ My Action',
  panelId: 'my-panel-container-id',
  panelTitle: 'AI Result',
  getAICall: () => myActionContext(currentData),
  reusable: true,
});
someElement.appendChild(btn);
```

**Step 4 — Deploy the Edge Function:**
```bash
# Via Supabase MCP tool or CLI:
supabase functions deploy ai-chat
```

---

### 3. Add a New KNM Module

**Step 1 — Create the JSON file** at `public/questions/module_9_<slug>.json`. Follow the existing schema (see `ARCHITECTURE.md § 8`). Use `module_id: "M9"`.

**Step 2 — Register in `src/data/knm.js`:**
```js
const FILES = [
  // existing...
  'module_9_<slug>.json',
];
```

The module appears automatically in the KNM Dashboard and exam question pool.

---

### 4. Add a New Vocab Topic

**Step 1 — Create the JSON file** at `public/reading/vocab/<slug>.json`.

**Step 2 — Register in `src/data/reading.js`:**
```js
export const VOCAB_MODULES = [
  // existing...
  { file: '<slug>.json', id: '<unique_id>', title_en: 'My Topic', title_nl: 'Mijn Onderwerp' },
];
```

The `id` becomes the localStorage progress key (`vocab:<id>`). Keep it stable.

---

### 5. Add a New Database Table

**Step 1 — Write the SQL** (RLS is required on every table):
```sql
create table if not exists my_table (...);
alter table my_table enable row level security;
create policy "..." on my_table for all using (auth.uid() = user_id) with check (...);
```

**Step 2 — Run it** in the Supabase SQL editor or via MCP `apply_migration` tool.

**Step 3 — Access it** via the Supabase client in any data file:
```js
import { supabase } from '../supabase.js';
const { data, error } = await supabase.from('my_table').select('*');
```

---

### 6. Body Class Rules

Every render function must set exactly one of these at the top:

| Body class | When to use |
|------------|------------|
| `in-dashboard` | All normal screens (landing, dashboards, journal, profile, etc.) |
| `in-quiz` | Full-screen quiz/flashcard screens (hides header timer outside exams) |

```js
// Dashboard screen:
document.body.classList.add('in-dashboard');
document.body.classList.remove('in-quiz');

// Quiz/card screen:
document.body.classList.add('in-quiz');
document.body.classList.remove('in-dashboard');
```

---

### 7. Navigation Registry — All Current Keys

| Key | Assigned function | File |
|---|---|---|
| `nav.auth` | `renderAuthPage` | `views/auth.js` |
| `nav.deactivated` | `renderDeactivated` | `views/deactivated.js` |
| `nav.landing` | `renderLandingPage` | `views/landing.js` |
| `nav.categorySelect` | `renderCategorySelect` | `views/categorySelect.js` |
| `nav.progress` | `renderProgressDashboard` | `views/progress.js` |
| `nav.quiz` | `renderQuestion` | `views/quiz/quiz.render.js` |
| `nav.results` | `renderResults` | `views/results.js` |
| `nav.flashcards` | `startFlashcards` | `views/flashcards.js` |
| `nav.flashcard` | `renderSingleFlashcard` | `views/flashcards.js` |
| `nav.knmDashboard` | `renderKNMDashboard` | `views/knm/dashboard.js` |
| `nav.exam` | `startExamMode` | `views/knm/exam.js` |
| `nav.readingDashboard` | `renderReadingDashboard` | `views/reading/dashboard.js` |
| `nav.readingExam` | `startReadingExam` | `views/reading/exam.js` |
| `nav.vocabDashboard` | `renderVocabDashboard` | `views/reading/vocab.js` |
| `nav.vocabCards` | `renderVocabCards` | `views/reading/vocab.js` |
| `nav.readingQuizDashboard` | `renderReadingQuizDashboard` | `views/reading/quizDashboard.js` |
| `nav.speakingDashboard` | `renderSpeakingDashboard` | `views/speaking/dashboard.js` |
| `nav.speakingLearn` | `renderSpeakingLearn` | `views/speaking/learn.js` |
| `nav.speakingPractice` | `renderSpeakingPractice` | `views/speaking/practice.js` |
| `nav.wordJournal` | `renderWordJournal` | `views/words/journal.js` |
| `nav.addWord` | `renderAddWord` | `views/words/addWord.js` |
| `nav.wordRevision` | `renderWordRevision` | `views/words/revision.js` |
| `nav.adminDashboard` | `renderAdminDashboard` | `views/admin/dashboard.js` |
| `nav.adminUsers` | `renderAdminUsers` | `views/admin/users.js` |
| `nav.adminWords` | `renderAdminWords` | `views/admin/wordsAdmin.js` |
| `nav.adminTags` | `renderAdminTags` | `views/admin/tagsAdmin.js` |
| `nav.adminEmail` | `renderAdminEmail` | `views/admin/emailComposer.js` |
| `nav.profile` | `renderProfile` | `views/profile.js` |
| `nav.contact` | `renderContact` | `views/contact.js` |
| `nav.help` | `renderHelp` | `views/help.js` |
| `nav.privacy` | `renderPrivacy` | `views/privacy.js` |
| `nav.terms` | `renderTerms` | `views/terms.js` |
