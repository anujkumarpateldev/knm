# DutchExamPro — Architecture Documentation

> Last updated: 2026-08-17

---

## 1. Overview

DutchExamPro is a **vanilla JavaScript single-page application (SPA)** for Dutch A2 integration exam preparation. It covers the KNM (Kennis van de Nederlandse Maatschappij) civics exam, Reading comprehension, Speaking (Spreken) practice, and a personal word journal (Mijn Woorden) with AI-powered fill and spaced repetition.

**Live URL:** https://dutchexampro.netlify.app
**Hosting:** Netlify (static site)
**Backend:** Supabase (Auth + PostgreSQL + Edge Functions)
**Build tool:** Vite

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JavaScript (ES Modules) | UI, routing, state |
| Build | Vite | Bundling, dev server, env vars |
| Styling | CSS (custom properties) | Theming, layout, animations |
| Fonts | Fraunces + DM Sans (Google Fonts) | Typography |
| Auth | Supabase Auth (email/password) | User registration & login |
| Database | Supabase PostgreSQL | User progress, words, profiles |
| AI Proxy | Supabase Edge Function (`ai-chat`) | JWT validation, rate limiting, prompt building |
| AI Providers | DeepSeek (`deepseek-chat`) + Anthropic Claude (`claude-haiku-4-5-20251001`) | LLM responses with automatic fallback |
| Email | EmailJS (browser SDK) | Contact form submissions |
| Persistence (offline) | localStorage | Progress, theme, activity history, cookie consent |
| Speech | Web Speech API | Dutch pronunciation (nl-NL) |
| Recording | MediaRecorder API | Speaking practice voice recording |
| Deployment | Netlify | Static hosting + SPA redirect rules |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
│                                                                   │
│  index.html  (shell: header, main-content, footer, cookie banner)│
│     └── main.js  (bootstrap, nav registry, auth wiring)          │
│           │                                                       │
│           ├── src/state.js       (global state object)           │
│           ├── src/router.js      (navigation registry)           │
│           ├── src/storage.js     (localStorage + sync hook)      │
│           ├── src/sync.js        (Supabase progress read/write)  │
│           ├── src/theme.js       (dark/light toggle)             │
│           ├── src/speech.js      (Web Speech API)                │
│           ├── src/supabase.js    (Supabase client)               │
│           │                                                       │
│           ├── src/ai/            (AI client layer)               │
│           │     ├── aiService.js                                  │
│           │     ├── aiPrompts.js                                  │
│           │     └── aiUI.js                                       │
│           │                                                       │
│           ├── src/utils/         (shared utilities)              │
│           │     ├── aiFill.js    (AI word fill + tag autocomplete)│
│           │     ├── authModal.js (auth form logic)               │
│           │     ├── errors.js    (error rendering)               │
│           │     └── examTimer.js (countdown timer)               │
│           │                                                       │
│           ├── src/data/          (JSON fetchers + word CRUD)     │
│           │     ├── knm.js                                        │
│           │     ├── reading.js                                    │
│           │     ├── speaking.js                                   │
│           │     └── words.js     (word journal + SRS)            │
│           │                                                       │
│           └── src/views/         (page renderers)                │
│                 ├── auth.js, landing.js, progress.js             │
│                 ├── results.js, flashcards.js, categorySelect.js │
│                 ├── contact.js, profile.js, deactivated.js       │
│                 ├── help.js, privacy.js, terms.js                 │
│                 ├── quiz/         (quiz.render/events/logic)     │
│                 ├── knm/          (dashboard, exam)              │
│                 ├── reading/      (dashboard, vocab, quiz, exam) │
│                 ├── speaking/     (dashboard, learn, practice)   │
│                 ├── words/        (journal, addWord, revision)   │
│                 └── admin/        (dashboard, users, words, tags,│
│                                    emailComposer)                │
│                                                                   │
│  public/                                                          │
│     ├── questions/    (8 KNM JSON files)                         │
│     ├── reading/vocab/   (11 vocab JSON files)                   │
│     ├── reading/questions/  (9 reading quiz JSON files)          │
│     └── speaking/     (4 speaking JSON files)                    │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│   Supabase      │          │   Netlify CDN         │
│   ─────────     │          │   ───────────         │
│   Auth service  │          │   Static assets       │
│   PostgreSQL DB │          │   _redirects → SPA    │
│   Edge Functions│          └──────────────────────┘
└─────────────────┘
```

---

## 4. Core Modules

### 4.1 Entry Point — `main.js`

**Responsibilities:**
- Registers all navigation targets onto the `nav` object (see §4.3)
- Checks existing session on boot via `supabase.auth.getSession()`
- Loads user profile from `user_profiles` table and checks `is_active`; deactivated accounts are routed to `nav.deactivated()`
- Updates `last_login_at` in `user_profiles` on login
- Builds the header (avatar, display name, hamburger dropdown, theme toggle)
- Wires the Supabase progress sync hook once on startup
- Pulls remote progress from Supabase for logged-in users via `pullAndMergeProgress()`
- Listens for auth state changes (`onAuthStateChange`) to handle SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY events
- Fetches all JSON data in parallel (`fetchKNMModules`, `fetchReadingData`) before rendering
- Initialises EmailJS with public key from CDN-loaded SDK
- Shows cookie consent banner on first visit (checks `knm_cookie_consent` key in localStorage)

**Nav registry wiring (all 28 routes):**
```
nav.auth                = renderAuthPage
nav.deactivated         = renderDeactivated
nav.landing             = renderLandingPage
nav.categorySelect      = renderCategorySelect
nav.progress            = renderProgressDashboard
nav.quiz                = renderQuestion          (src/views/quiz/quiz.render.js)
nav.results             = renderResults
nav.flashcards          = startFlashcards
nav.flashcard           = renderSingleFlashcard
nav.knmDashboard        = renderKNMDashboard
nav.exam                = startExamMode           (src/views/knm/exam.js)
nav.readingDashboard    = renderReadingDashboard
nav.readingExam         = startReadingExam        (src/views/reading/exam.js)
nav.vocabDashboard      = renderVocabDashboard
nav.vocabCards          = renderVocabCards
nav.readingQuizDashboard= renderReadingQuizDashboard
nav.speakingDashboard   = renderSpeakingDashboard
nav.speakingLearn       = renderSpeakingLearn
nav.speakingPractice    = renderSpeakingPractice
nav.wordJournal         = renderWordJournal
nav.addWord             = renderAddWord
nav.wordRevision        = renderWordRevision
nav.adminDashboard      = renderAdminDashboard
nav.adminUsers          = renderAdminUsers
nav.adminWords          = renderAdminWords
nav.adminTags           = renderAdminTags
nav.adminEmail          = renderAdminEmail
nav.profile             = renderProfile
nav.contact             = renderContact
nav.help                = renderHelp
nav.privacy             = renderPrivacy
nav.terms               = renderTerms
```

---

### 4.2 State — `src/state.js`

Single shared object. No framework — all views read and write `state` directly.

| Property | Type | Description |
|----------|------|-------------|
| `knmModules` | Array | Loaded KNM module objects (8 modules) |
| `readingVocab` | Array | Loaded vocab topics (11 topics) |
| `readingQuestions` | Array | Loaded reading quiz modules (9 topics) |
| `currentCategory` | string | `'KNM'` or `'READING'` |
| `currentMode` | string | `'PRACTICE'` or `'EXAM'` |
| `currentModule` | Object | Active module being studied |
| `currentQuestionIndex` | number | Current question position |
| `isExamMode` | boolean | True during timed exam |
| `hasAnsweredCurrent` | boolean | Prevents double-answering |
| `currentVocabSet` | Object | Active vocabulary topic |
| `currentVocabIndex` | number | Current flashcard position |
| `sessionStats` | Object | `{ correct, wrong }` for current session |
| `sessionWrongQuestions` | Array | Questions answered incorrectly this session |
| `userProgress` | Object | Nested progress map (see §6.2) |
| `activityHistory` | Array | Session log entries |
| `examTimeRemaining` | number | Seconds left on exam timer |
| `timerInterval` | number | `setInterval` handle (cleared on exit) |
| `currentUser` | Object | Supabase auth user object or `null` |
| `userProfile` | Object | Row from `user_profiles` table or `null` — includes `role`, `is_active`, `display_name` |
| `myWords` | Array | Loaded personal vocabulary journal entries (see §4.8) |

---

### 4.3 Router — `src/router.js`

```js
export const nav = {};
```

A plain object populated in `main.js`. Views call `nav.landing()`, `nav.quiz()` etc. instead of importing each other directly. This prevents circular imports across the view layer.

**Rule:** Every navigable screen must have a `nav` key. The key is assigned in `main.js`. Calling `nav.myRoute()` before `main.js` assigns the function is safe — the no-op placeholder in `router.js` prevents crashes.

---

### 4.4 Storage — `src/storage.js`

Manages localStorage and exposes the progress helper API.

**Progress key schema:** `"domain:moduleId"` → `{ itemId: boolean }`

| Domain | Key example | Used for |
|--------|------------|---------|
| `knm` | `knm:M1` | KNM practice questions |
| `vocab` | `vocab:daily_routine` | Vocabulary learned words |
| `rq` | `rq:rq_daily` | Reading quiz questions |

**Exported functions:**

| Function | Description |
|----------|-------------|
| `setProgress(domain, moduleId, itemId, value)` | Write a progress item + fire sync hook |
| `getProgress(domain, moduleId, itemId)` | Read a single progress item |
| `getModuleProgressMap(domain, moduleId)` | Get all items for a module |
| `setProgressSyncHook(fn)` | Register a callback fired on every `setProgress` call |
| `loadFromStorage()` | Load progress + history from localStorage, run key migration |
| `saveToStorage()` | Persist current state to localStorage |

**Key migration** (runs once on `loadFromStorage`): automatically converts old key formats:

| Old key | New key |
|---------|---------|
| `M1`, `M2`… | `knm:M1`, `knm:M2`… |
| `READING:vocab:daily_routine` | `vocab:daily_routine` |
| `rq_daily` | `rq:rq_daily` |

**localStorage keys:**

| Key | Content |
|-----|---------|
| `knm_study_progress` | Serialised `state.userProgress` object |
| `knm_activity_history` | Serialised `state.activityHistory` array |
| `dutchexampro_theme` | `'dark'` or `'light'` |
| `knm_cookie_consent` | `'accepted'` or `'declined'` |
| `dutchexampro_ai_model` | `'deepseek'` or `'claude'` (user AI preference) |

---

### 4.5 Sync — `src/sync.js`

Connects the progress layer to Supabase. Completely isolated from `storage.js`.

| Function | Description |
|----------|-------------|
| `syncProgressItem(domain, moduleId, itemId, value)` | Fire-and-forget upsert of a single item to `user_progress` table |
| `pullAndMergeProgress(userId)` | Fetch all rows for the user, merge into `state.userProgress`, persist |

**Merge strategy:** `true` always wins. Items marked as learned/correct locally are never un-marked by remote data.

**Sync flow:**
```
User answers question correctly
  → quiz.logic.js calls setProgress('knm', 'M1', 'Q001', true)
    → storage.js writes to state.userProgress
    → storage.js fires _syncHook(domain, moduleId, itemId, value)
      → main.js hook calls syncProgressItem()  [fire-and-forget]
        → Supabase upserts row in user_progress table
```

---

### 4.6 Quiz Module — `src/views/quiz/`

Split into three files with a one-way dependency chain:

```
quiz.render.js  →  quiz.events.js  →  quiz.logic.js
```

| File | Responsibility |
|------|---------------|
| `quiz.render.js` | Builds the full question HTML, inserts into DOM, calls `bindQuizEvents` |
| `quiz.events.js` | Wires all button listeners (Quit, Prev, Next, Finish, Speak, option buttons) |
| `quiz.logic.js` | `handleAnswer()` — validates selection, highlights, shows feedback, updates `sessionStats`, calls `setProgress` |

`src/views/quiz.js` is a 1-line re-export shim kept for backward compatibility.

---

### 4.7 Exam Timer — `src/utils/examTimer.js`

Shared timer utility used by both KNM and Reading exam modes.

**API:**
```js
startExamTimer(durationSeconds, onTick, onExpire)
stopExamTimer()
formatTime(seconds) // → "MM:SS"
```

| Threshold | Timer appearance | User notification |
|-----------|-----------------|-------------------|
| > 5 min | Neutral | — |
| ≤ 5 min, > 1 min | Amber colour | Toast: "⏱ 5 minutes remaining!" |
| ≤ 1 min | Red + pulsing | Toast: "⏱ 1 minute remaining!" |
| 0 | Stops at 00:00 | Navigates to results |

| Exam | Duration | Question pool |
|------|----------|--------------|
| KNM Full Exam | 45 min | 40 questions (5 random per module × 8 modules) |
| Reading Full Exam | 65 min | 25 random questions from all reading quiz modules |

---

### 4.8 Word Journal Module — `src/views/words/` + `src/data/words.js`

The personal vocabulary journal lets logged-in users build their own Dutch word list with spaced repetition review.

#### Data layer: `src/data/words.js`

Words are stored in Supabase (`user_words` + `word_dictionary`) for logged-in users, with a localStorage fallback for offline use.

| Function | Description |
|----------|-------------|
| `loadWords()` | Load user's words; LEFT JOIN with `word_dictionary` for defaults |
| `addWord({ dutch, english, meaning, example, tags })` | Add new word. Checks `word_dictionary` for existing entry first. Returns `{ duplicate, dictExists, dictWord, error }` |
| `confirmAddFromDict(dictId)` | Add a shared dictionary word to the user's list without re-inserting |
| `updateWord(id, fields)` | Update custom fields on a user's word |
| `deleteWord(id)` | Remove a word from the user's list |
| `reviewWord(id, result)` | Record SRS result ('knew', 'vague', 'forgot') — updates `srs_interval`, `srs_repetitions`, `srs_next_review` |
| `getDueWords()` | Return words from `state.myWords` where `srs_next_review <= today` |
| `getWordsByDate(dateStr)` | Filter words added on a specific date |
| `getUniqueDates()` | Return sorted list of all dates with word counts |

**SRS schedule:** `[1, 2, 4, 7, 14, 30]` days. On "knew it": advance interval; on "vague": stay; on "forgot": reset to day 1.

**Schema note:** Each `user_words` row has `custom_dutch`, `custom_english`, `custom_meaning`, `custom_example` that override the shared `word_dictionary` defaults. The data layer resolves these into flat `dutch`, `english`, `meaning`, `example` fields before storing in `state.myWords`.

#### Views

**`journal.js`** — Main word journal page:
- Lists all words paginated (20 per page), grouped by date added
- Stats strip: total words, added today, due for review count
- Per-word: mastery dots (0–5), tags chips, example/meaning preview
- Actions: Add Word, Start Revision, Edit (opens inline edit form), Delete, Speak (TTS)
- Duplicate detection notice when a word already exists in the dictionary

**`addWord.js`** — Standalone add word form:
- Dutch word + English (required), Meaning, Example, Tags fields
- AI Fill button: auto-fills English, Meaning, Example via `runAIFill()`
- Handles `dictExists` response: calls `confirmAddFromDict()` directly
- Handles `duplicate` response: shows "already in your list" error

**`revision.js`** — Spaced repetition revision mode:
- Mode selector (5 modes): Due Today, Random, Last 7 Days, All Words, By Date
- Direction toggle: Dutch → English or English → Dutch
- Flashcard flip with "Show answer" button
- Rating buttons after flip: ✗ Forgot, ~ Vague, ✓ Knew it (updates SRS via `reviewWord()`)
- Progress bar + session counter
- End-of-session summary: stats + % known + option to revise again

#### AI Fill for words — `src/utils/aiFill.js`

`runAIFill({ dutch, btn, status, fields, dutchInputId, onRetrigger })`:
1. Calls `askAI` with `module: 'vocab'`, `action: 'fill'`, `context: { dutch_word }`
2. Edge function uses a strict system prompt returning exactly 4 labeled lines: `CORRECTION:`, `ENGLISH:`, `MEANING:`, `EXAMPLE:`
3. Parses response with a markdown-tolerant regex: `\*{0,2}KEY\*{0,2}:?\*{0,2}\s*(.+)`
4. Fills only empty fields (never overwrites user's existing input)
5. If `CORRECTION` differs from input, shows a "Did you mean X?" suggestion with a "Use" button that clears fields and re-triggers AI fill with the corrected word

**Tag autocomplete** (also in `aiFill.js`):
- `setupTagsAutocomplete(inputId)`: attaches a positioned floating dropdown to a tags input
- Tags are fetched from `word_dictionary.tags` column, cached 30 seconds, deduplicated
- Exported: `loadAllTags()`, `invalidateTagsCache()`

---

### 4.9 Admin Module — `src/views/admin/`

Admin panel accessible only to users with `role = 'admin'` in `user_profiles`. The role check is client-side; Supabase RLS policies enforce server-side access control.

| View | File | Description |
|------|------|-------------|
| Admin Dashboard | `dashboard.js` | Links to all admin sub-sections |
| Users | `users.js` | List registered users, view profiles, activate/deactivate accounts |
| Words | `wordsAdmin.js` | Manage `word_dictionary` — add, edit, delete shared words; uses AI Fill |
| Tags | `tagsAdmin.js` | Manage tags on the shared word dictionary |
| Email Composer | `emailComposer.js` | Send transactional emails to users via EmailJS |

---

### 4.10 Profile — `src/views/profile.js`

Account management page for logged-in users.

- **Display name**: Read/update via `user_profiles.display_name`; updates header in real-time
- **Email**: Shown read-only (email changes require Supabase Auth flow)
- **Join date**: From `user_profiles.created_at`
- **Change password**: `supabase.auth.updateUser({ password })` — minimum 8 characters
- **Delete account**: Calls `supabase.rpc('delete_user')` — cascades to all user data (words, progress, profile)

---

### 4.11 Contact — `src/views/contact.js`

Contact form using EmailJS (no server needed).

- **Fields**: Name, Email, Subject (dropdown), Message
- **Subject options**: General feedback, Bug report, Account issue, Content question, Privacy/GDPR, Other
- **Sends via**: EmailJS template to `dutchexamprosupport@gmail.com`
- **EmailJS init**: In `index.html` via CDN: `emailjs.init({ publicKey: '7TRTQdCZRdCUFAx4M' })`
- **Fallback**: Direct email link shown if JS fails

---

### 4.12 Cookie Consent Banner

Shown once on first visit, stored in `localStorage` key `knm_cookie_consent`.

- **Accept**: Sets key to `'accepted'`, dismisses banner
- **Decline**: Sets key to `'declined'`, dismisses banner
- **Privacy Policy link**: Opens privacy page
- Essential cookies only (session + theme + progress). No tracking or advertising cookies.

---

### 4.13 AI Integration — `src/ai/` + `supabase/functions/ai-chat/`

#### Client — `src/ai/aiService.js`

```js
askAI({ module, action, context, input, model, onChunk, onDone, onError })
getPreferredModel()   // 'deepseek' | 'claude' from localStorage
setPreferredModel(m)  // persist preference
```

Streams the edge function response character by character via `ReadableStream`.

#### Edge Function — `supabase/functions/ai-chat/index.ts`

**Primary model:** DeepSeek `deepseek-chat` (speed tasks) or Claude `claude-haiku-4-5-20251001` (quality tasks)
**Fallback:** Automatically tries the other provider if the primary fails (network, timeout, auth, rate limit, server error)
**Timeout:** 15 seconds per provider attempt
**Rate limit:** 50 AI calls per user per 24 hours (tracked in `ai_usage` table)

**Action routing:**

| Action | Priority | Max tokens | System prompt |
|--------|----------|-----------|---------------|
| `hint` | speed | 400 | quiz module prompt |
| `explain` | speed | 400 | quiz module prompt |
| `translate` | speed | 400 | vocab module prompt |
| `mnemonic` | speed | 400 | vocab module prompt |
| `simplify` | speed | 400 | reading module prompt |
| `fill` | speed | 400 | **action-specific** strict 4-line format |
| `grade` | quality | 800 | writing module prompt |
| `evaluate` | quality | 800 | speaking module prompt |
| `feedback` | quality | 800 | speaking module prompt |

**Action-specific system prompt for `fill`:**
```
You are a Dutch dictionary assistant. Output EXACTLY four labeled lines — nothing else.
CORRECTION: <corrected Dutch spelling, or "none" if already correct>
ENGLISH: <English translation only>
MEANING: <one English sentence definition>
EXAMPLE: <one natural Dutch example sentence>
```

#### UI — `src/ai/aiUI.js`

```js
createAIPanel({ containerId, title, append })
// Returns: { stream(chunk), done(), error(msg), setHTML(html), destroy() }

createAIButton({ label, panelId, panelTitle, getAICall, reusable })
// Returns: <button> that manages its own loading state and AI panel
```

#### Context builders — `src/ai/aiPrompts.js`

Exports one builder per action: `quizHintContext`, `quizExplainContext`, `writingGradeContext`, `vocabMnemonicContext`, `vocabTranslateContext`, `readingSimplifyContext`, `readingHintContext`, `speakingEvalContext`.

---

### 4.14 Speaking Module — `src/views/speaking/`

The Speaking module prepares users for the A2 Dutch speaking exam.

**Dashboard** (`dashboard.js`): Two mode cards (Leren / Oefenen) + sticky Answer Formula box showing the 5-step exam structure (Wie → Waar → Wat → Waarom → Jij).

**Learn** (`learn.js`): Three tabs (Heden/Verleden/Scenario's). Within each tab a category grid; clicking a category enters flip-card mode.

| Tab | Source file | Items |
|-----|------------|-------|
| Heden (Present) | `learn_present.json` | 200 sentences |
| Verleden (Past) | `learn_past.json` | 130 sentences |
| Scenario's | `learn_scenarios.json` | 200 scenarios |

**Practice** (`practice.js`): Three question types (single / double / triple image), 20 questions each. Flow: scenario context → exam question → Record Answer (MediaRecorder) → Listen playback → Show Sample Answer toggle.

---

## 5. Authentication & Registration

### 5.1 Provider

**Supabase Auth** — email/password with email confirmation.

### 5.2 Registration Flow

```
User fills Register form (email*, password*)
  → supabase.auth.signUp({ email, password })
    → Supabase sends confirmation email
      → User clicks email link
        → Account confirmed
          → onAuthStateChange fires SIGNED_IN
            → state.currentUser set
            → user_profiles row created (database trigger)
            → header updated with display name
            → pullAndMergeProgress() called
            → nav.landing() called
```

### 5.3 Session Management

| Mechanism | Detail |
|-----------|--------|
| Access token | JWT, 1 hour expiry |
| Refresh token | 7-day rolling window |
| Storage | Supabase SDK manages in localStorage |
| Restore | `supabase.auth.getSession()` called on every app load |
| Logout | `supabase.auth.signOut()` — clears session, resets header |
| Deactivated accounts | Checked on session restore via `user_profiles.is_active` |

### 5.4 Error Messages

Raw Supabase errors mapped in `auth.js`:

| Supabase error | User-facing message |
|---------------|---------------------|
| `Invalid login credentials` | Incorrect email or password. |
| `Email not confirmed` | Please confirm your email before signing in. |
| `User already registered` | An account with this email already exists. |
| `Password…` | Password must be at least 6 characters. |
| `Rate limit` | Too many attempts. Please wait a moment and try again. |

---

## 6. Database

### 6.1 Supabase Project

- **Project URL:** stored in `.env` as `VITE_SUPABASE_URL`
- **Anon key:** stored in `.env` as `VITE_SUPABASE_ANON_KEY` (public — protected by RLS)
- **Service role key:** stored in Supabase Edge Function secrets as `SUPABASE_SERVICE_ROLE_KEY`

### 6.2 Tables

#### `auth.users` (managed by Supabase)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `email` | text | User's email address |
| `created_at` | timestamptz | Registration timestamp |
| `confirmed_at` | timestamptz | Email confirmation timestamp |

#### `user_profiles` (custom)

Extended user data. Auto-created on registration via database trigger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | References `auth.users(id)` |
| `email` | text | Copied from auth record |
| `display_name` | text | Shown in header (optional) |
| `role` | text | `'user'` or `'admin'` |
| `is_active` | boolean | `false` = account deactivated |
| `deactivated_at` | timestamptz | When account was deactivated |
| `last_login_at` | timestamptz | Updated on each login |
| `created_at` | timestamptz | Profile creation timestamp |

#### `user_progress` (custom)

Granular learning progress for cross-device sync.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `auth.users(id)` |
| `domain` | text | `'knm'`, `'vocab'`, or `'rq'` |
| `module_id` | text | e.g. `'M1'`, `'daily_routine'` |
| `item_id` | text | e.g. `'Q001'`, `'w0'` |
| `value` | boolean | `true` = answered correctly |
| `updated_at` | timestamptz | Last sync timestamp |

**Unique constraint:** `(user_id, domain, module_id, item_id)`

#### `word_dictionary` (custom)

Shared dictionary of Dutch words. Populated by admins. Users can add from this dictionary to their personal list.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `dutch` | text | Dutch word or phrase |
| `english` | text | English translation |
| `meaning` | text | Definition in English |
| `example` | text | Example sentence in Dutch |
| `tags` | text[] | Array of topic tags |
| `created_at` | timestamptz | When added |

#### `user_words` (custom)

Personal vocabulary journal. One row per word per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `auth.users(id)` |
| `dict_id` | uuid | References `word_dictionary(id)` (nullable) |
| `custom_dutch` | text | User override for Dutch word |
| `custom_english` | text | User override for English |
| `custom_meaning` | text | User override for meaning |
| `custom_example` | text | User override for example |
| `tags` | text[] | User's tags for this word |
| `srs_interval` | int | Days until next review (SRS) |
| `srs_repetitions` | int | Number of successful reviews |
| `srs_next_review` | date | Next scheduled review date |
| `created_at` | timestamptz | When added to journal |

**SRS schedule:** `[1, 2, 4, 7, 14, 30]` days

#### `ai_usage` (custom)

Tracks AI calls for rate limiting and cost monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `auth.users(id)` |
| `module` | text | `'quiz'`, `'vocab'`, `'writing'`, `'reading'`, `'speaking'` |
| `action` | text | `'hint'`, `'explain'`, `'fill'`, `'grade'`, `'evaluate'`… |
| `provider` | text | `'anthropic'` or `'deepseek'` |
| `model` | text | Exact model ID used |
| `input_tokens` | int | (Logged as 0 — token counting not yet implemented) |
| `output_tokens` | int | (Logged as 0) |
| `created_at` | timestamptz | When the call was made |

**Rate limit query (runs per request):**
```sql
SELECT count(*) FROM ai_usage
WHERE user_id = $1
AND created_at > now() - interval '24 hours';
```
Limit: **50 calls/day** per registered user.

---

## 7. Database SQL Scripts

### Script 1 — User Profiles Table

```sql
create table if not exists user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  role            text default 'user',
  is_active       boolean default true,
  deactivated_at  timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "Users can view own profile" on user_profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);
```

### Script 2 — Auto-create Profile on Registration (Trigger)

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Script 3 — User Progress Table

```sql
create table if not exists user_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain      text not null,
  module_id   text not null,
  item_id     text not null,
  value       boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (user_id, domain, module_id, item_id)
);

alter table user_progress enable row level security;

create policy "Users manage own progress" on user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Script 4 — Word Dictionary Table

```sql
create table if not exists word_dictionary (
  id         uuid primary key default gen_random_uuid(),
  dutch      text not null,
  english    text,
  meaning    text,
  example    text,
  tags       text[] default '{}',
  created_at timestamptz default now()
);

alter table word_dictionary enable row level security;

-- All authenticated users can read the dictionary
create policy "Authenticated users can read dictionary" on word_dictionary
  for select using (auth.role() = 'authenticated');

-- Only admins can write (enforce via Edge Function or service role)
```

### Script 5 — User Words Table

```sql
create table if not exists user_words (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  dict_id          uuid references word_dictionary(id) on delete set null,
  custom_dutch     text,
  custom_english   text,
  custom_meaning   text,
  custom_example   text,
  tags             text[] default '{}',
  srs_interval     int default 1,
  srs_repetitions  int default 0,
  srs_next_review  date default current_date + 1,
  created_at       timestamptz default now()
);

alter table user_words enable row level security;

create policy "Users manage own words" on user_words
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Script 6 — AI Usage Table

```sql
create table if not exists ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  module        text not null,
  action        text not null,
  provider      text not null,
  model         text not null,
  input_tokens  int default 0,
  output_tokens int default 0,
  created_at    timestamptz default now()
);

alter table ai_usage enable row level security;

create policy "Users view own AI usage" on ai_usage
  for select using (auth.uid() = user_id);
```

### Script 7 — Delete User RPC (for profile delete account)

```sql
create or replace function delete_user()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
```

### Script 8 — Useful Admin Queries

```sql
-- Count registered users
select count(*) from auth.users;

-- Active users with display names
select id, email, display_name, role, last_login_at
from user_profiles
where is_active = true
order by last_login_at desc;

-- AI usage last 7 days by provider
select
  date_trunc('day', created_at) as day,
  provider, model,
  count(*) as requests
from ai_usage
where created_at > now() - interval '7 days'
group by 1, 2, 3
order by 1 desc;

-- Words per user
select user_id, count(*) as word_count
from user_words
group by user_id
order by word_count desc;

-- Words due for review today (across all users)
select u.email, count(*) as due_count
from user_words w
join user_profiles u on u.id = w.user_id
where w.srs_next_review <= current_date
group by u.email;
```

---

## 8. Data Files

### KNM Questions — `public/questions/`

8 JSON files, one per module. File naming: `module_{N}_{topic}.json`

**Question schema:**
```json
{
  "module_id": "M1",
  "module_title_en": "Work & Income",
  "module_title_nl": "Werk en Inkomen",
  "questions": [
    {
      "id": "Q001",
      "type": "multiple_choice",
      "difficulty": "A2",
      "tags": ["work", "income"],
      "question_nl": "...",
      "question_en": "...",
      "options": [
        { "id": "A", "text_nl": "...", "text_en": "..." }
      ],
      "correct_answer": "A",
      "explanation": { "nl": "...", "en": "..." }
    }
  ]
}
```

**Question types:** `multiple_choice`, `true_false`, `reading_comprehension`

### Vocabulary — `public/reading/vocab/`

11 JSON files, one per topic.

```json
{ "vocabulary_list": [
    {
      "dutch_word": "werken",
      "english_word": "to work",
      "type": "Verb",
      "example_sentence": "Ik werk elke dag.",
      "meaning": "to be employed / to function"
    }
] }
```

### Reading Quiz Questions — `public/reading/questions/`

9 JSON files. All questions have `"type": "reading_comprehension"` with a `source_text_nl` passage.

### Speaking Data — `public/speaking/`

| File | Content | Count |
|------|---------|-------|
| `practice.json` | Exam-style photo questions with sample answers | 60 (20 single / 20 double / 20 triple image) |
| `learn_scenarios.json` | Full scenarios, 5-part answer structure | 200 scenarios, 9 categories |
| `learn_present.json` | Present-tense sentences | 200 sentences, 13 categories |
| `learn_past.json` | Past-tense sentences | 130 sentences, 12 categories |

---

## 9. Deployment

### Netlify Configuration

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 18+ |
| SPA redirect | `public/_redirects` → `/* /index.html 200` |

### Environment Variables

| Variable | Where set | Description |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | Netlify dashboard | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Netlify dashboard | Supabase anon key (RLS protected) |
| `ANTHROPIC_API_KEY` | Supabase Edge Function secrets | Claude API key |
| `DEEPSEEK_API_KEY` | Supabase Edge Function secrets | DeepSeek API key |

---

## 10. Outstanding Tasks

See `TASKS.md` for full details.

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| 🔴 Critical | 2 | 2 | 0 |
| 🟠 High | 4 | 4 | 0 |
| 🟡 Medium | 5 | 5 | 0 |
| 🟢 Low | 5 | 0 | 5 |
| 🤖 AI Integration | 5 | 5 | 0 |
| 📖 Word Journal | 4 | 4 | 0 |
| **Total** | **25** | **20** | **5** |
