# KNM A2 Practice — Project Documentation

> **Primary audience:** AI agents making changes to this codebase. Every section is written to enable fast, correct edits with minimal exploration.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Data Formats](#data-formats)
6. [App Flow](#app-flow)
7. [Feature Reference](#feature-reference)
8. [How to Run](#how-to-run)
9. [How to Extend (for AI)](#how-to-extend-for-ai)

---

## Project Overview

**KNM A2 Practice** is a single-page web application for studying the Dutch A2 integration exam (inburgeringsexamen). It covers:

- **KNM** (Kennis van de Nederlandse Maatschappij — Knowledge of Dutch Society): 8 topic modules, each with ~80 multiple-choice questions. Supports both module-by-module practice and a full timed 40-question exam simulation (45 minutes, pass threshold 65%).
- **Reading (Lezen)**: Two sub-modes:
  - **Vocabulary** (Woordenschat): 11 topic sets of ~100 Dutch words each, shown as flip-cards with TTS audio.
  - **Reading Quiz** (Leesbegrip): 9 topic sets of comprehension questions based on Dutch passages.
- **Listening, Writing, Speaking**: Registered as placeholder categories (shown as "Coming soon", not yet implemented).

The app is entirely client-side. There is no backend. All data is served as static JSON files. Progress is persisted in `localStorage`.

---

## Tech Stack

| Concern | Tool / Library |
|---|---|
| Build tool & dev server | [Vite](https://vitejs.dev/) v8+ |
| Language | Vanilla JavaScript (ES modules, no TypeScript) |
| UI | Pure DOM manipulation via `innerHTML` — no framework, no virtual DOM |
| Styling | Single `style.css` (linked from `index.html`); dark/light theme via `.dark-theme` body class |
| Fonts | Inter (Google Fonts, loaded in `index.html`) |
| Icons | Inline SVG strings (Lucide-style) embedded directly in view files; `lucide` npm package is listed as a dependency but icons are mostly inlined |
| Text-to-Speech | Web Speech API (`window.speechSynthesis`), Dutch locale `nl-NL` |
| Persistence | `localStorage` only — two keys (see [Data Formats](#data-formats)) |
| Module type | `"type": "module"` in `package.json` — all JS files use ESM `import`/`export` |

**Dependencies (`package.json`):**

```json
{
  "devDependencies": { "vite": "^8.0.3" },
  "dependencies":    { "lucide": "^1.7.0" }
}
```

---

## Project Structure

```
knm/
├── index.html                        # Shell HTML — one <main id="main-content"> mount point
├── main.js                           # Entry point: wires nav registry, boots app
├── package.json
├── public/                           # Served as static files (no bundling)
│   ├── favicon.png
│   ├── style.css                     # All CSS (single file)
│   ├── questions/                    # KNM question JSON files (8 modules)
│   │   ├── module_1_werk_en_inkomen.json
│   │   ├── module_2_omgangsvormen.json
│   │   ├── module_3_wonen (1).json
│   │   ├── module_4_gezondheid.json
│   │   ├── module_5_geschiedenis.json
│   │   ├── module_6_instanties.json
│   │   ├── module_7_staatsinrichting.json
│   │   └── module_8_opvoeding.json
│   └── reading/
│       ├── vocab/                    # Vocabulary JSON files (11 topics, loaded by VOCAB_MODULES)
│       │   ├── dailyroutine.json
│       │   ├── education.json
│       │   ├── food_drink.json
│       │   ├── government_rules.json
│       │   ├── health_body.json
│       │   ├── home.json
│       │   ├── leisure.json
│       │   ├── neighbourhood.json
│       │   ├── shopping_money.json
│       │   ├── travel_transaport.json   # Note: intentional typo in filename
│       │   └── workjob.json
│       └── questions/                # Reading quiz JSON files (9 topics, loaded by QUESTION_MODULES)
│           ├── dailyroutine.json
│           ├── education.json
│           ├── food_drink.json
│           ├── government_rules.json
│           ├── health_body.json
│           ├── home.json
│           ├── leisure.json
│           ├── travel_transaport.json   # Note: intentional typo in filename
│           └── workjob.json
└── src/
    ├── state.js                      # Global state object (single source of truth)
    ├── router.js                     # Navigation registry (nav object)
    ├── storage.js                    # localStorage load/save helpers
    ├── speech.js                     # Web Speech API wrapper (speakDutch)
    ├── theme.js                      # Dark/light theme toggle
    ├── data/
    │   ├── knm.js                    # Fetches KNM JSON files; progress helpers
    │   └── reading.js                # Fetches vocab + reading quiz JSON; progress helpers
    └── views/
        ├── landing.js                # Home screen (3 entry cards)
        ├── categorySelect.js         # Category picker (KNM / Reading / placeholders)
        ├── progress.js               # Activity history list
        ├── quiz.js                   # Shared quiz engine (KNM + reading quiz)
        ├── results.js                # End-of-quiz results screen + flashcard trigger
        ├── flashcards.js             # Wrong-answer flip-card review
        ├── knm/
        │   ├── dashboard.js          # KNM module grid + "start practice" logic
        │   └── exam.js               # Full 40-question timed exam setup
        └── reading/
            ├── dashboard.js          # Reading mode picker (Vocab | Quiz)
            ├── vocab.js              # Vocab topic grid + flip-card viewer + session modal
            └── quizDashboard.js      # Reading quiz topic grid + "start quiz" logic
```

---

## Architecture

### Module System

The app has four layers, each with a single responsibility:

```
index.html          — static shell; never changes at runtime
    ↓
main.js             — imports everything, wires nav registry, calls init()
    ↓
src/state.js        — mutable global object; all runtime data lives here
src/router.js       — nav object; plain object whose values are render functions
    ↓
src/data/*.js       — fetch JSON → populate state; export progress helpers
src/views/**/*.js   — read state, write innerHTML, attach event listeners
```

There is **no framework, no component tree, no reactivity system**. Each view function:
1. Writes a complete HTML string into `document.getElementById('main-content').innerHTML`.
2. Immediately attaches `addEventListener` calls to the freshly-inserted elements.
3. Navigates to the next screen by calling `nav.<routeName>()`.

### The Navigation Registry Pattern

**Why it exists:** View modules need to call each other (e.g. quiz calls results), but importing them directly would create circular dependency chains. Instead, `router.js` exports a plain object `nav` pre-filled with no-op functions:

```js
// src/router.js
export const nav = {
  landing:        () => {},
  categorySelect: () => {},
  quiz:           () => {},
  // ... etc
};
```

`main.js` — which imports every view module — assigns the real render functions after all imports resolve:

```js
// main.js
nav.landing        = renderLandingPage;
nav.quiz           = renderQuestion;
nav.knmDashboard   = renderKNMDashboard;
// ... etc
```

View modules import `nav` from `router.js` and call `nav.quiz()` etc. without knowing which function that resolves to. This breaks all circular imports.

**Rule:** Every navigable screen must have a `nav` key. The key is assigned in `main.js`. The view function lives in a dedicated view file.

### Current Nav Registry (all keys)

| Key | Assigned function | File |
|---|---|---|
| `nav.landing` | `renderLandingPage` | `src/views/landing.js` |
| `nav.categorySelect` | `renderCategorySelect` | `src/views/categorySelect.js` |
| `nav.progress` | `renderProgressDashboard` | `src/views/progress.js` |
| `nav.quiz` | `renderQuestion` | `src/views/quiz.js` |
| `nav.results` | `renderResults` | `src/views/results.js` |
| `nav.flashcards` | `startFlashcards` | `src/views/flashcards.js` |
| `nav.flashcard` | `renderSingleFlashcard` | `src/views/flashcards.js` |
| `nav.knmDashboard` | `renderKNMDashboard` | `src/views/knm/dashboard.js` |
| `nav.exam` | `startExamMode` | `src/views/knm/exam.js` |
| `nav.readingDashboard` | `renderReadingDashboard` | `src/views/reading/dashboard.js` |
| `nav.vocabDashboard` | `renderVocabDashboard` | `src/views/reading/vocab.js` |
| `nav.vocabCards` | `renderVocabCards` | `src/views/reading/vocab.js` |
| `nav.readingQuizDashboard` | `renderReadingQuizDashboard` | `src/views/reading/quizDashboard.js` |

### State Object (`src/state.js`)

The `state` object is the single source of truth for all runtime data. It is mutated directly (no setters, no Proxy). Views read it, modify it, and re-render.

```js
export const state = {
  // Loaded at boot from JSON files
  knmModules:       [],   // Array of KNM module objects
  readingVocab:     [],   // Array of vocab set objects
  readingQuestions: [],   // Array of reading quiz module objects

  // Navigation context
  currentCategory: null,  // 'KNM' | 'READING'
  currentMode:     null,  // 'PRACTICE' | 'EXAM'

  // Shared quiz engine state
  currentModule:         null,  // The active module object (has .questions[])
  currentQuestionIndex:  0,
  isExamMode:            false,
  hasAnsweredCurrent:    false,

  // Vocab-specific state
  currentVocabSet:   null,  // Active vocab module
  currentVocabIndex: 0,

  // Session tracking (reset each quiz/exam)
  sessionStats:         { correct: 0, wrong: 0 },
  sessionWrongQuestions: [],
  flashcardIndex:        0,

  // Persisted (loaded from / saved to localStorage)
  userProgress:    {},  // See Data Formats section
  activityHistory: [],  // See Data Formats section

  // Exam timer
  examTimeRemaining: 45 * 60,  // seconds
  timerInterval:     null,     // setInterval handle
};
```

### How to Add a New Category

A "category" is a top-level study domain (e.g. KNM, Reading, Listening). The category grid is driven by the `CATEGORIES` array in `src/views/categorySelect.js`.

Steps:
1. Add an entry to `CATEGORIES` in `src/views/categorySelect.js`.
2. Set `available: true` and `supportsPractice`/`supportsExam` appropriately.
3. Add a click handler branch for the new `catId` in the `querySelectorAll` listener at the bottom of `renderCategorySelect`.
4. Create dashboard/view files under `src/views/<categoryId>/`.
5. Register new nav keys in `src/router.js` and wire them in `main.js`.

### How to Add a New View/Screen

1. Create `src/views/<name>.js` and export a render function.
2. Add a no-op placeholder key in `src/router.js`.
3. Import the render function in `main.js` and assign it to `nav.<key>`.
4. Call `nav.<key>()` from wherever the navigation should be triggered.

---

## Data Formats

### KNM Question JSON Schema

**File location:** `public/questions/module_N_<slug>.json`
**Fetched by:** `src/data/knm.js` → stored in `state.knmModules[]`

```json
{
  "module_id": "M1",
  "module_title_nl": "Werk en inkomen",
  "module_title_en": "Work and Income",
  "total_questions": 80,
  "questions": [
    {
      "id": "M1_Q001",
      "type": "multiple_choice",
      "difficulty": "A2",
      "topic_nl": "Werk zoeken",
      "topic_en": "Finding work",
      "question_nl": "Je bent werkloos. Waar moet je je als eerste melden?",
      "question_en": "(optional English translation of the question)",
      "options": [
        { "id": "A", "text_nl": "Bij het uitzendbureau" },
        { "id": "B", "text_nl": "Bij het UWV WERKbedrijf" },
        { "id": "C", "text_nl": "Bij de gemeente" },
        { "id": "D", "text_nl": "Bij de Kamer van Koophandel" }
      ],
      "correct_answer": "B",
      "explanation": {
        "nl": "Als je werkloos bent, moet je je altijd eerst melden bij het UWV WERKbedrijf.",
        "en": "When you are unemployed, you must first register at the UWV WERKbedrijf."
      },
      "source_text_nl": "Als je werkloos bent, moet je altijd eerst naar het UWV WERKbedrijf.",
      "tags": ["werk zoeken", "UWV", "werkloosheid"]
    }
  ]
}
```

**Field notes:**
- `module_id`: Short identifier like `"M1"` through `"M8"`. Used as the key in `state.userProgress`.
- `type`: `"multiple_choice"` or `"true_false"`. The quiz engine also handles `"reading_comprehension"` (same as `multiple_choice` but always has `source_text_nl`).
- `correct_answer`: String matching an `option.id` value (`"A"` / `"B"` / `"C"` / `"D"`) or `"true"` / `"false"` for true/false questions.
- `question_en`: Optional. Rendered beneath the Dutch question in muted color.
- `source_text_nl`: Optional for KNM. Shown in the feedback panel after answering.
- `explanation`: Optional but strongly recommended. Both `nl` and `en` fields shown in feedback panel.
- `tags`: Array of strings. Rendered as pill badges on the quiz screen.

### Reading Vocab JSON Schema

**File location:** `public/reading/vocab/<slug>.json`
**Fetched by:** `src/data/reading.js` → stored in `state.readingVocab[]`

```json
{
  "title_reading": "A2 Vocabulary Master",
  "category": "Daily Routine",
  "total_words_target": 100,
  "batch": 1,
  "vocabulary_list": [
    {
      "type": "Profession",
      "dutch_word": "De huishoudster",
      "english_word": "The housekeeper",
      "meaning": "A person employed to manage a household and do domestic chores.",
      "example_sentence": "De huishoudster komt elke dinsdag om het huis schoon te maken."
    },
    {
      "type": "Object",
      "dutch_word": "De wekker",
      "english_word": "The alarm clock",
      "meaning": "A clock that wakes you up at a set time.",
      "example_sentence": "Mijn wekker gaat elke ochtend om half zeven af."
    }
  ]
}
```

**Field notes:**
- Top-level fields (`title_reading`, `category`, `total_words_target`, `batch`) are metadata only — not used by the app. The app only reads `vocabulary_list`.
- `type`: Word category. Controls badge color in the UI. Known values: `"Profession"`, `"Place"`, `"Object"`, `"Verb"`, `"Adjective"`, `"Abstract"`.
- `dutch_word`: Shown on the flashcard front. Also passed to TTS.
- `english_word`: Shown on the flashcard back.
- `meaning`: Optional. Shown on the flashcard back below the English word.
- `example_sentence`: Optional. Shown on both front and back. Also appended to TTS output.

**Progress key pattern:** `READING:vocab:<moduleId>` (e.g. `READING:vocab:daily_routine`)
**Progress value shape:** `{ "w0": true, "w5": true, ... }` — indices of words marked as learned.

### Reading Quiz Question JSON Schema

**File location:** `public/reading/questions/<slug>.json`
**Fetched by:** `src/data/reading.js` → stored in `state.readingQuestions[]`

```json
{
  "module_id": "M8_Reading",
  "module_title_nl": "Dagelijkse routine",
  "module_title_en": "Daily Routine",
  "total_questions": 15,
  "questions": [
    {
      "id": "M8_R001",
      "type": "reading_comprehension",
      "difficulty": "A2",
      "topic_nl": "Ochtendritueel",
      "topic_en": "Morning ritual",
      "source_text_nl": "Mijn dag begint vroeg. De wekker gaat om 06:30 uur. Ik sta direct op en neem een douche.",
      "source_text_en": "My day starts early. The alarm goes off at 06:30 AM. I get up immediately and take a shower.",
      "question_nl": "Wat doet de persoon direct na het opstaan?",
      "options": [
        { "id": "A", "text_nl": "Ontbijt maken" },
        { "id": "B", "text_nl": "De kinderen naar school brengen" },
        { "id": "C", "text_nl": "Een douche nemen" },
        { "id": "D", "text_nl": "De wekker zetten" }
      ],
      "correct_answer": "C",
      "explanation": {
        "nl": "In de tekst staat: 'Ik sta direct op en neem een douche.'",
        "en": "The text states: 'I get up immediately and take a shower.'"
      },
      "tags": ["ochtend", "douchen", "tijd"]
    }
  ]
}
```

**Field notes:**
- `type` must be `"reading_comprehension"`. The quiz engine renders `source_text_nl` in a box above the question (`.source-text-box`).
- `source_text_en`: Optional. Shown beneath the Dutch passage in muted color.
- The `_readingQuiz: true` flag is added automatically by `fetchReadingData()` when loading.
- Progress key: the `module_id` from this file (e.g. `"rq_daily"` as defined in `QUESTION_MODULES` in `src/data/reading.js`) — not the JSON's own `module_id` field.

**Important:** The `module_id` used for progress tracking is the one from `QUESTION_MODULES` in `src/data/reading.js` (e.g. `"rq_daily"`), not the `module_id` field inside the JSON file itself (e.g. `"M8_Reading"`). The JSON loader maps them at fetch time.

### localStorage Keys and Shapes

Only two keys are used. Both are managed exclusively by `src/storage.js`.

**Key: `knm_study_progress`**

```json
{
  "M1": { "M1_Q001": true, "M1_Q005": true },
  "M3": { "M3_Q002": true },
  "READING:vocab:daily_routine": { "w0": true, "w3": true, "w7": true },
  "rq_daily": { "M8_R001": true, "M8_R003": true },
  "EXAM": {}
}
```

- KNM modules: key = `module_id` (e.g. `"M1"`), value = object of `{ questionId: true }`.
- Vocab: key = `"READING:vocab:<moduleId>"`, value = object of `{ "w<index>": true }`.
- Reading quiz: key = `module_id` from `QUESTION_MODULES` (e.g. `"rq_daily"`), value = object of `{ questionId: true }`.
- Exam: key = `"EXAM"`, value = `{}` (always reset on each exam).

**Key: `knm_activity_history`**

```json
[
  {
    "mode": "Practice",
    "title": "Work and Income",
    "score": 87,
    "timestamp": 1712345678901,
    "passed": null
  },
  {
    "mode": "Exam",
    "title": "KNM Full Practice Exam",
    "score": 72,
    "timestamp": 1712345999000,
    "passed": true
  },
  {
    "mode": "Practice",
    "title": "Vocabulary – Daily Routine",
    "score": 45,
    "timestamp": 1712346100000,
    "passed": null
  }
]
```

- `mode`: `"Practice"` or `"Exam"`.
- `title`: Human-readable label.
- `score`: Integer 0–100.
- `timestamp`: `Date.now()` at time of recording.
- `passed`: `true` / `false` for exam mode (65% threshold); `null` for practice.

---

## App Flow

### Full User Journey

```
Boot (init in main.js)
  ├── loadFromStorage()        — restore userProgress + activityHistory
  ├── setupTheme()             — wire theme-toggle button
  ├── logo click → nav.landing
  └── fetch all JSON in parallel
        ├── fetchKNMModules()  → state.knmModules
        └── fetchReadingData() → state.readingVocab + state.readingQuestions
              └── renderLandingPage()

Landing Page
  ├── "Practice by Section" → nav.categorySelect('PRACTICE')
  ├── "Take Full Exam"      → nav.categorySelect('EXAM')
  └── "Your Progress"       → nav.progress()

Category Select (mode = 'PRACTICE' | 'EXAM')
  ├── KNM + PRACTICE  → nav.knmDashboard()
  ├── KNM + EXAM      → nav.exam()
  ├── READING + any   → nav.readingDashboard()
  └── Others          — disabled (shown as "Coming soon")

──── KNM PRACTICE FLOW ────────────────────────────────────────────
KNM Dashboard
  └── Click module card → startKNMQuiz(moduleId)
        ├── sets state.currentModule, state.isExamMode = false
        ├── finds first unanswered question (resume support)
        └── nav.quiz()

Quiz (shared engine — practice mode)
  ├── Displays question with options
  ├── User selects answer → immediate feedback (correct/wrong highlight + panel)
  ├── Progress saved to state.userProgress[moduleId][questionId] = true
  ├── "Next" → state.currentQuestionIndex++ → renderQuestion()
  ├── "Previous" → state.currentQuestionIndex-- → renderQuestion()
  ├── "Finish Early" → nav.results()
  └── Last question "Finish Section" → nav.results()

Results
  ├── Shows score%, correct/wrong counts
  ├── If wrong answers exist → "Review Wrong Answers" → nav.flashcards()
  ├── "Retry Module" → reset index → nav.quiz()
  └── "Return to Home" → nav.landing()

Flashcards (wrong-answer review)
  ├── Flip-card for each wrong question
  ├── Front: Dutch question + "Your Answer" (exam mode only)
  ├── Back: correct answer + explanation
  ├── TTS available on front and back
  └── "Finish Review" → nav.results()

──── KNM EXAM FLOW ─────────────────────────────────────────────────
Exam (startExamMode)
  ├── 5 random questions × 8 modules = 40 questions (shuffled)
  ├── Countdown timer starts (45:00)
  ├── state.isExamMode = true
  └── nav.quiz()

Quiz (exam mode)
  ├── No immediate feedback — user just selects an answer
  ├── "Next" appears after any selection
  └── Timer reaches 0 → nav.results() automatically

Results (exam mode)
  ├── Tallies all answers now (deferred from quiz)
  ├── Shows PASSED (≥65%) or FAILED
  ├── Records to activityHistory with passed: true/false
  └── "Take Another Exam" → nav.exam()

──── READING FLOW ──────────────────────────────────────────────────
Reading Dashboard
  ├── "Vocabulary" → nav.vocabDashboard()
  └── "Reading Quiz" → nav.readingQuizDashboard()

Vocab Dashboard (topic grid)
  └── Click topic → set state.currentVocabSet → nav.vocabCards()

Vocab Cards (flip-card viewer)
  ├── Front: Dutch word + example sentence + TTS button
  ├── Back: English word + meaning + example
  ├── "Mark as Learned" → saves w<index> to userProgress
  ├── "Previous" / "Next" → state.currentVocabIndex ± 1
  ├── "End Session" → showSessionSummary() modal
  └── Last card "Finish" → showSessionSummary() modal

Session Summary Modal
  ├── Shows words learned this session
  ├── "Back to Topics" → nav.vocabDashboard()
  └── "Continue Studying" → restart from index 0

Reading Quiz Dashboard (topic grid)
  └── Click topic → startReadingQuiz(moduleId)
        ├── sets state.currentModule, state.isExamMode = false
        ├── finds first unanswered question
        └── nav.quiz()

Quiz (shared engine — reading_comprehension mode)
  ├── Passage shown in .source-text-box above question
  ├── Same feedback/progress flow as KNM practice
  └── → nav.results() on completion

──── PROGRESS HISTORY ──────────────────────────────────────────────
Progress Dashboard
  ├── Lists state.activityHistory sorted by timestamp desc
  ├── Score shown green or red (red = Exam + passed === false)
  └── "Back to Home" → nav.landing()
```

---

## Feature Reference

| Feature | Description | Primary File(s) |
|---|---|---|
| Landing page | Entry screen with 3 mode cards | `src/views/landing.js` |
| Category selection | Grid of study categories; filters by mode | `src/views/categorySelect.js` |
| KNM practice | Module grid with progress bars; resumes from first unanswered | `src/views/knm/dashboard.js` |
| KNM exam | 40 random questions, 45-min countdown, 65% pass threshold | `src/views/knm/exam.js` |
| Exam timer | Countdown in header; auto-submits on 0; hidden outside exam | `src/views/knm/exam.js`, `index.html` |
| Quiz engine | Shared question renderer for all MCQ/T-F/reading questions | `src/views/quiz.js` |
| Practice feedback | Immediate correct/wrong highlight + explanation panel | `src/views/quiz.js` → `handleAnswer()` |
| Exam feedback | Deferred — no feedback during quiz; tallied at results | `src/views/quiz.js`, `src/views/results.js` |
| TTS (Dutch audio) | Speaks question + options in Dutch; toggle pause/resume | `src/speech.js` |
| Results screen | Score%, pass/fail banner, retry, flashcard trigger | `src/views/results.js` |
| Flashcard review | Flip-cards for wrong answers; TTS on front and back | `src/views/flashcards.js` |
| Reading dashboard | Mode picker for Vocab vs Reading Quiz | `src/views/reading/dashboard.js` |
| Vocab topic grid | 11 topics with learned/total progress bars | `src/views/reading/vocab.js` → `renderVocabDashboard` |
| Vocab flip-cards | Dutch word front, English+meaning back; Mark as Learned | `src/views/reading/vocab.js` → `renderVocabCards` |
| Vocab TTS | Speaks Dutch word + example sentence | `src/views/reading/vocab.js`, `src/speech.js` |
| Session summary modal | End-of-vocab-session modal; lists words learned | `src/views/reading/vocab.js` → `showSessionSummary` |
| Reading quiz dashboard | 9 topics with completed/total progress bars | `src/views/reading/quizDashboard.js` |
| Reading quiz | Comprehension questions with passage shown above | `src/views/quiz.js` (type: reading_comprehension) |
| Progress history | Chronological activity log with mode + score | `src/views/progress.js` |
| Dark/light theme | Toggles `.dark-theme` on `<body>`; icon swaps | `src/theme.js` |
| State management | Single mutable global object | `src/state.js` |
| Navigation registry | Decoupled routing via plain object | `src/router.js`, `main.js` |
| Data loading | Parallel JSON fetches at boot; error shown on failure | `src/data/knm.js`, `src/data/reading.js`, `main.js` |
| Progress persistence | `localStorage` load on boot, save on every answer/mark | `src/storage.js` |
| Category placeholder | Listening/Writing/Speaking shown disabled in UI | `src/views/categorySelect.js` |

---

## How to Run

```bash
# Install dependencies
npm install

# Start development server (hot reload, serves public/ as static root)
npm run dev

# Build for production (outputs to dist/)
npm run build
```

The dev server (Vite) serves `public/` at the root, so `/questions/module_1_werk_en_inkomen.json` resolves to `public/questions/module_1_werk_en_inkomen.json`, and `/style.css` resolves to `public/style.css`.

---

## How to Extend (for AI)

This section gives exact, step-by-step instructions for the most common extension tasks. Follow the patterns precisely — the codebase is consistent and deviating from these patterns will break things.

---

### 1. Add a New Category (e.g. Listening)

A category is a top-level domain visible on the Category Select screen.

**Step 1 — Register the category in the CATEGORIES array**

File: `B:\workspace\claude\knm\src\views\categorySelect.js`

Add to the `CATEGORIES` array (the order determines display order):

```js
{
  id: 'LISTENING',
  label: 'Listening (Luisteren)',
  subtitle: 'Audio comprehension practice',
  available: true,              // set false for "Coming soon"
  supportsPractice: true,
  supportsExam: false,
  icon: `<svg .../>`,           // inline SVG, same size as others (32x32)
},
```

**Step 2 — Add a click handler branch**

In the same file, inside the `querySelectorAll('.category-card:not(.disabled)')` listener:

```js
} else if (catId === 'LISTENING') {
  nav.listeningDashboard();
}
```

**Step 3 — Add a nav key placeholder**

File: `B:\workspace\claude\knm\src\router.js`

```js
export const nav = {
  // ... existing keys ...
  listeningDashboard: () => {},
};
```

**Step 4 — Create the dashboard view**

Create file: `B:\workspace\claude\knm\src\views\listening\dashboard.js`

```js
import { state } from '../../state.js';
import { nav } from '../../router.js';

export function renderListeningDashboard() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="listening-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Listening Practice</h1>
          <p>...</p>
        </div>
        <button class="btn-secondary" id="btn-back-categories">Change Category</button>
      </div>
      <!-- content -->
    </div>
  `;

  document.getElementById('btn-back-categories').addEventListener('click', () => nav.categorySelect('PRACTICE'));
}
```

**Step 5 — Wire it in main.js**

File: `B:\workspace\claude\knm\main.js`

```js
import { renderListeningDashboard } from './src/views/listening/dashboard.js';
// ... after existing imports ...
nav.listeningDashboard = renderListeningDashboard;
```

**Step 6 — Add data loading if needed**

Create `B:\workspace\claude\knm\src\data\listening.js` following the pattern of `src/data/knm.js`. Then add the fetch call to the `Promise.all` in `main.js`'s `init()` function.

---

### 2. Add a New View/Screen

A view is any screen that occupies `#main-content`.

**Step 1 — Create the view file**

```js
// src/views/myNewView.js
import { state } from '../state.js';
import { nav } from '../router.js';

export function renderMyNewView(optionalArg) {
  document.body.classList.add('in-dashboard');   // or 'in-quiz'
  document.body.classList.remove('in-quiz');     // always set both

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="my-new-view">
      <!-- HTML -->
      <button id="btn-back">Back</button>
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', () => nav.landing());
}
```

**Step 2 — Add nav key in router.js**

```js
// src/router.js
export const nav = {
  // existing keys...
  myNewView: () => {},
};
```

**Step 3 — Wire in main.js**

```js
import { renderMyNewView } from './src/views/myNewView.js';
nav.myNewView = renderMyNewView;
```

**Step 4 — Navigate to it from another view**

In the calling view file: `nav.myNewView()` or `nav.myNewView(someArg)`.

**Body class rules:**
- Use `document.body.classList.add('in-dashboard'); document.body.classList.remove('in-quiz')` for dashboard-style screens (header always visible, normal layout).
- Use `document.body.classList.add('in-quiz'); document.body.classList.remove('in-dashboard')` for full-screen quiz/card screens.

---

### 3. Add a New Data Module/Topic

#### New KNM module (e.g. Module 9)

**Step 1 — Create the JSON file**

File: `B:\workspace\claude\knm\public\questions\module_9_<slug>.json`

Follow the KNM JSON schema exactly. Use `module_id: "M9"`.

**Step 2 — Register it in the loader**

File: `B:\workspace\claude\knm\src\data\knm.js`

Add to the `FILES` array:

```js
const FILES = [
  // existing entries...
  'module_9_<slug>.json',
];
```

That's it — the module will appear automatically in the KNM Dashboard and be included in exam questions.

#### New vocab topic

**Step 1 — Create the JSON file**

File: `B:\workspace\claude\knm\public\reading\vocab\<slug>.json`

Follow the vocab JSON schema. The `vocabulary_list` array is what the app reads.

**Step 2 — Register it in VOCAB_MODULES**

File: `B:\workspace\claude\knm\src\data\reading.js`

```js
export const VOCAB_MODULES = [
  // existing entries...
  { file: '<slug>.json', id: '<unique_id>', title_en: 'My Topic', title_nl: 'Mijn Onderwerp' },
];
```

The `id` must be unique — it becomes part of the localStorage progress key (`READING:vocab:<id>`).

#### New reading quiz topic

**Step 1 — Create the JSON file**

File: `B:\workspace\claude\knm\public\reading\questions\<slug>.json`

Follow the reading quiz JSON schema. All questions must have `"type": "reading_comprehension"`.

**Step 2 — Register it in QUESTION_MODULES**

File: `B:\workspace\claude\knm\src\data\reading.js`

```js
export const QUESTION_MODULES = [
  // existing entries...
  { file: '<slug>.json', id: 'rq_<unique>', title_en: 'My Topic', title_nl: 'Mijn Onderwerp' },
];
```

The `id` here (e.g. `"rq_mything"`) is the progress key stored in localStorage — keep it short and stable.

---

### 4. Modify the Quiz Engine

The quiz engine is entirely in `B:\workspace\claude\knm\src\views\quiz.js`. It contains two exported functions and one private function:

- `renderQuestion()` — renders the current question from `state.currentModule.questions[state.currentQuestionIndex]`.
- `handleAnswer(selectedBtn, correctAnswer, questionData)` — private. Called on option click. Branches on `state.isExamMode`.

**To add a new question type:**

1. Add an `else if (q.type === 'my_type')` block in `renderQuestion()` where `optionsHtml` is built.
2. Handle TTS text for the new type in the `btn-speak` click handler.
3. Handle answer comparison in `handleAnswer()` if the `correct_answer` format differs.

**To change pass threshold:**

File: `B:\workspace\claude\knm\src\views\results.js`, line:

```js
const passed = state.isExamMode ? pc >= 65 : null;
```

Change `65` to the desired percentage.

**To change exam question count or distribution:**

File: `B:\workspace\claude\knm\src\views\knm\exam.js`

```js
// Currently: 5 questions per module × 8 modules = 40 total
const shuffled = [...mod.questions].sort(() => 0.5 - Math.random());
examQuestions.push(...shuffled.slice(0, 5));  // change 5 here
```

**To change exam duration:**

File: `B:\workspace\claude\knm\src\views\knm\exam.js`, line 6:

```js
state.examTimeRemaining = 45 * 60;  // 45 minutes in seconds
```

Also update the display default in `index.html`:

```html
<div id="exam-timer" ...>45:00</div>
```

---

### 5. Add a New Nav Route

This is the minimum change needed to register a new route that can be called anywhere.

**Step 1 — Add placeholder in router.js**

File: `B:\workspace\claude\knm\src\router.js`

```js
export const nav = {
  // existing keys...
  myRoute: () => {},   // <-- add here
};
```

**Step 2 — Create and export the render function**

```js
// src/views/myRoute.js
export function renderMyRoute() { ... }
```

**Step 3 — Wire in main.js**

```js
import { renderMyRoute } from './src/views/myRoute.js';
nav.myRoute = renderMyRoute;
```

**Step 4 — Call it from any view**

```js
import { nav } from '../router.js';
nav.myRoute();
// or with args:
nav.myRoute(someData);
```

Note: the `nav` object values are plain function references. The function signature is whatever the render function accepts — there is no argument validation.

---

### Key Invariants to Never Break

1. **Never import a view directly from another view.** Always go through `nav`. This prevents circular imports.
2. **Always replace `#main-content` innerHTML completely.** Views do not unmount or patch — they wholesale replace.
3. **Always attach event listeners after setting innerHTML.** The elements must exist in the DOM first.
4. **Progress keys must be stable.** Changing a `module_id` or vocab `id` will orphan previously-saved progress. Do not rename them once data has been shipped.
5. **`state` is mutated directly.** There is no setter pattern. Just assign: `state.currentModule = mod;`.
6. **`saveToStorage()` must be called** whenever `state.userProgress` or `state.activityHistory` is mutated. It is not automatic.
7. **Body class must be set on every view render.** Every render function must set `in-dashboard` or `in-quiz` and remove the other. Forgetting causes layout bugs.
