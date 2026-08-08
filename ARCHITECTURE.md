# DutchExamPro — Architecture Documentation

> Last updated: 2026-08-08

---

## 1. Overview

DutchExamPro is a **vanilla JavaScript single-page application (SPA)** for Dutch A2 integration exam preparation. It covers the KNM (Kennis van de Nederlandse Maatschappij) civics exam, Reading comprehension practice, and Speaking (Spreken) exam preparation.

**Live URL:** https://dutchexampro.netlify.app
**Hosting:** Netlify (static site)
**Backend:** Supabase (Auth + PostgreSQL)
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
| Database | Supabase PostgreSQL | User progress sync |
| Persistence (offline) | localStorage | Progress, theme, activity history |
| Speech | Web Speech API | Dutch pronunciation (nl-NL) |
| Recording | MediaRecorder API | Speaking practice voice recording |
| Deployment | Netlify | Static hosting + SPA redirect rules |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
│                                                                   │
│  index.html                                                       │
│     └── main.js  (bootstrap, nav registry, auth wiring)          │
│           │                                                       │
│           ├── src/state.js       (global state object)           │
│           ├── src/router.js      (navigation registry)           │
│           ├── src/storage.js     (localStorage + sync hook)      │
│           ├── src/sync.js        (Supabase read/write)           │
│           ├── src/theme.js       (dark/light toggle)             │
│           ├── src/speech.js      (Web Speech API)                │
│           ├── src/supabase.js    (Supabase client)               │
│           │                                                       │
│           ├── src/data/          (JSON fetchers)                 │
│           │     ├── knm.js                                        │
│           │     ├── reading.js                                    │
│           │     └── speaking.js                                   │
│           │                                                       │
│           └── src/views/         (page renderers)                │
│                 ├── auth.js                                        │
│                 ├── landing.js                                     │
│                 ├── progress.js                                    │
│                 ├── results.js                                     │
│                 ├── flashcards.js                                  │
│                 ├── quiz/                                          │
│                 │     ├── quiz.render.js                          │
│                 │     ├── quiz.events.js                          │
│                 │     └── quiz.logic.js                           │
│                 ├── knm/                                           │
│                 │     ├── dashboard.js                            │
│                 │     └── exam.js                                 │
│                 ├── reading/                                       │
│                 │     ├── dashboard.js                            │
│                 │     ├── vocab.js                                │
│                 │     ├── quizDashboard.js                        │
│                 │     └── exam.js                                 │
│                 └── speaking/                                      │
│                       ├── dashboard.js                            │
│                       ├── learn.js                                │
│                       └── practice.js                             │
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
└─────────────────┘          └──────────────────────┘
```

---

## 4. Core Modules

### 4.1 Entry Point — `main.js`

**Responsibilities:**
- Registers all navigation targets onto the `nav` object (router registry pattern)
- Wires the Supabase progress sync hook once on startup
- Builds the header (username display, hamburger dropdown, theme toggle)
- Restores session on load via `supabase.auth.getSession()`
- Pulls remote progress from Supabase for logged-in users
- Listens for auth state changes (`onAuthStateChange`) to update header and merge remote progress on sign-in
- Fetches all question data in parallel (`fetchKNMModules`, `fetchReadingData`) before rendering

**Key wiring:**
```
nav.quiz                = renderQuestion           (src/views/quiz/quiz.render.js)
nav.exam                = startExamMode            (src/views/knm/exam.js)
nav.auth                = renderAuthPage           (src/views/auth.js)
nav.landing             = renderLandingPage        (src/views/landing.js)
nav.speakingDashboard   = renderSpeakingDashboard  (src/views/speaking/dashboard.js)
nav.speakingLearn       = renderSpeakingLearn      (src/views/speaking/learn.js)
nav.speakingPractice    = renderSpeakingPractice   (src/views/speaking/practice.js)
... (17 total routes)
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
| `currentUser` | Object | Supabase user object or `null` |

---

### 4.3 Router — `src/router.js`

```js
export const nav = {};
```

A plain object populated in `main.js`. Views call `nav.landing()`, `nav.quiz()` etc. instead of importing each other directly. This prevents circular imports across the view layer.

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

**Key migration** (runs once on `loadFromStorage`): automatically converts old key formats from previous versions:

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

---

### 4.5 Sync — `src/sync.js`

Connects the progress layer to Supabase. Completely isolated from `storage.js` (no circular dependency).

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
| `quiz.render.js` | Builds the full question HTML (`buildQuizHTML`, `buildOptionsHtml`, `buildSourceHtml`), inserts it into the DOM, calls `bindQuizEvents` |
| `quiz.events.js` | Wires all button event listeners (Quit, Previous, Next, Finish Early, Speak, Toggle EN, option buttons). Receives `renderQuestion` as parameter to avoid circular import |
| `quiz.logic.js` | `handleAnswer()` — validates selection, highlights correct/wrong options, shows feedback panel, updates `sessionStats`, calls `setProgress` |

`src/views/quiz.js` is a 1-line re-export shim kept for backward compatibility with `main.js`.

---

### 4.7 Exam Timer — `src/views/knm/exam.js` & `src/views/reading/exam.js`

Both files follow the same pattern:

| Threshold | Timer appearance | User notification |
|-----------|-----------------|-------------------|
| > 5 min | Neutral (muted border) | — |
| ≤ 5 min, > 1 min | Amber colour + amber border | Toast: "⏱ 5 minutes remaining!" |
| ≤ 1 min | Red + pulsing animation | Toast: "⏱ 1 minute remaining!" |
| 0 | Stops at 00:00 | Navigates to results |

Timer is clamped with `Math.max(0, state.examTimeRemaining - 1)` — never goes negative.

| Exam | Duration | Question pool |
|------|----------|--------------|
| KNM Full Exam | 45 min | 40 questions (5 random per module × 8 modules) |
| Reading Full Exam | 65 min | 25 random questions from all reading quiz modules |

---

## 5. Authentication & Registration Service

### 5.1 Provider

**Supabase Auth** — email/password authentication with email confirmation flow.

### 5.2 Registration Flow

```
User fills Register form (email*, password*, mobile optional)
  → supabase.auth.signUp({ email, password, options: { data: { mobile } } })
    → Supabase sends confirmation email
      → User clicks email link
        → Account confirmed
          → onAuthStateChange fires SIGNED_IN
            → state.currentUser set
            → header updated with username
            → pullAndMergeProgress() called
            → nav.landing() called
```

Mobile number is stored in `auth.users.raw_user_meta_data` — no separate table needed.

### 5.3 Login Flow

```
User fills Login form (email, password)
  → supabase.auth.signInWithPassword({ email, password })
    → On success: nav.landing()
    → On error: friendly error message displayed
       (raw Supabase errors mapped to plain English in friendlyError())
```

### 5.4 Session Management

| Mechanism | Detail |
|-----------|--------|
| Access token | JWT, 1 hour expiry |
| Refresh token | 7-day rolling window |
| Storage | Supabase SDK manages in localStorage |
| Restore | `supabase.auth.getSession()` called on every app load |
| Logout | `supabase.auth.signOut()` — clears session, resets header |

### 5.5 Auth Gate (client-side)

All features are freely accessible without login. Users may optionally sign in to enable cross-device progress sync via Supabase.

### 5.6 Error Messages

Raw Supabase error strings are mapped to plain English in `auth.js`:

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
- **Anon key:** stored in `.env` as `VITE_SUPABASE_ANON_KEY` (safe to expose — protected by RLS)

### 6.2 Tables

#### `auth.users` (managed by Supabase)

Built-in authentication table. Extended via `raw_user_meta_data` column.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `email` | text | User's email address |
| `raw_user_meta_data` | jsonb | `{ mobile: "+31612345678" }` (optional) |
| `created_at` | timestamptz | Registration timestamp |
| `confirmed_at` | timestamptz | Email confirmation timestamp |

#### `profiles` (custom)

Auto-created on registration via database trigger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | References `auth.users(id)` |
| `email` | text | Copied from auth record |
| `mobile` | text | Optional phone number |
| `created_at` | timestamptz | Profile creation timestamp |

#### `user_progress` (custom)

Stores granular learning progress for cross-device sync.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `auth.users(id)` |
| `domain` | text | `'knm'`, `'vocab'`, or `'rq'` |
| `module_id` | text | e.g. `'M1'`, `'daily_routine'`, `'rq_daily'` |
| `item_id` | text | e.g. `'Q001'`, `'w0'`, `'R001'` |
| `value` | boolean | `true` = answered correctly / marked learned |
| `updated_at` | timestamptz | Last sync timestamp |

**Unique constraint:** `(user_id, domain, module_id, item_id)` — ensures upsert works correctly.

---

## 7. All Database SQL Scripts

### Script 1 — Profiles Table

Run once during initial Supabase setup.

```sql
-- Create profiles table for extended user data
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  mobile     text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
```

### Script 2 — Auto-create Profile on Registration (Trigger)

Run once. Creates a `profiles` row automatically when a new user registers — runs server-side so it works even before email confirmation.

```sql
-- Function to copy new user into profiles table
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, mobile)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'mobile'
  );
  return new;
end;
$$;

-- Trigger fires after every new auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Script 3 — User Progress Table

Run once when deploying TASK-007 (Supabase progress sync).

```sql
-- Progress sync table for cross-device learning persistence
create table if not exists user_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain      text not null,        -- 'knm' | 'vocab' | 'rq'
  module_id   text not null,        -- e.g. 'M1', 'daily_routine', 'rq_daily'
  item_id     text not null,        -- e.g. 'Q001', 'w0', 'R001'
  value       boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (user_id, domain, module_id, item_id)
);

-- Enable Row Level Security
alter table user_progress enable row level security;

-- Users can only access their own progress rows
create policy "Users manage own progress" on user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Script 4 — Useful Admin Queries

```sql
-- Count registered users
select count(*) from auth.users;

-- View all profiles
select id, email, mobile, created_at from profiles order by created_at desc;

-- View progress for a specific user
select domain, module_id, item_id, value, updated_at
from user_progress
where user_id = '<user-uuid>'
order by domain, module_id, updated_at desc;

-- Count synced progress items per user
select user_id, count(*) as items_synced
from user_progress
group by user_id
order by items_synced desc;

-- Check which modules a user has progress in
select domain, module_id, count(*) as answered
from user_progress
where user_id = '<user-uuid>'
group by domain, module_id
order by domain, module_id;
```

---

## 8. Data Files

### KNM Questions — `public/questions/`

8 JSON files, one per module.

**File naming:** `module_{N}_{topic}.json`

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
        { "id": "A", "text_nl": "...", "text_en": "..." },
        { "id": "B", "text_nl": "...", "text_en": "..." },
        { "id": "C", "text_nl": "...", "text_en": "..." },
        { "id": "D", "text_nl": "...", "text_en": "..." }
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

**Vocabulary item schema:**
```json
{
  "vocabulary_list": [
    {
      "dutch_word": "werken",
      "english_word": "to work",
      "type": "Verb",
      "example_sentence": "Ik werk elke dag.",
      "meaning": "to be employed / to function"
    }
  ]
}
```

**Word types:** `Verb`, `Noun`, `Adjective`, `Profession`, `Place`, `Object`, `Abstract`

### Reading Quiz Questions — `public/reading/questions/`

9 JSON files (subset of vocab topics — no Shopping, Neighbourhood).

**Reading question schema:**
```json
{
  "questions": [
    {
      "id": "R001",
      "type": "reading_comprehension",
      "source_text_nl": "...",
      "source_text_en": "...",
      "question_nl": "...",
      "question_en": "...",
      "options": [ ... ],
      "correct_answer": "B",
      "explanation": { "nl": "...", "en": "..." }
    }
  ]
}
```

### Speaking Data — `public/speaking/`

4 JSON files generated from A2 exam practice material.

| File | Content | Count |
|------|---------|-------|
| `practice.json` | Exam-style questions with scenario + sample answer | 60 questions (20 single / 20 double / 20 triple image) |
| `learn_scenarios.json` | Full scenarios with questions and 5-part answer structure | 200 scenarios, 9 categories |
| `learn_present.json` | Present-tense sentences (aan het + verb constructions) | 200 sentences, 13 categories |
| `learn_past.json` | Past-tense sentences (perfect tense) | 130 sentences, 12 categories |

**Practice question schema:**
```json
{
  "single": [
    {
      "id": 1,
      "category": "Apotheek",
      "scenario_en": "A man is standing at the pharmacy counter...",
      "question": "Kijk naar de foto.\nWaar is de man?\nWat doet hij?",
      "answer": [
        "Op de foto zie ik een man.",
        "Hij is bij de apotheek.",
        "Hij haalt medicijnen op."
      ]
    }
  ],
  "double": [ ... ],
  "triple": [ ... ]
}
```

**Learn scenario schema:**
```json
{
  "categories": [
    {
      "id": "apotheek",
      "name": "Apotheek / Dokter",
      "scenarios": [
        {
          "id": 1,
          "title": "At the pharmacy — picking up medicine",
          "scenario_en": "A man is at the pharmacy.",
          "questions": ["Waar is hij?", "Wat doet hij?"],
          "answer": ["Hij is bij de apotheek.", "Hij haalt medicijnen op."]
        }
      ]
    }
  ]
}
```

---

## 9. Deployment

### Netlify Configuration

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 18+ |
| SPA redirect | `public/_redirects` → `/* /index.html 200` |

### Environment Variables (set in Netlify dashboard)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (public, protected by RLS) |

### Supabase Auth Configuration

Allowed redirect URLs (set in Supabase → Auth → URL Configuration):
- `https://dutchexampro.netlify.app`
- `http://localhost:5173` (local dev)

---

## 10. Speaking Module — `src/views/speaking/`

### Overview

The Speaking module prepares users for the A2 Dutch speaking exam. It has two sub-modes accessible from the Speaking dashboard.

### 10.1 Dashboard — `dashboard.js`

Renders two mode cards (Leren / Oefenen) and a sticky **Answer Formula** box showing the 5-step exam structure:

```
1. Wie    → Op de foto zie ik een man/vrouw.
2. Waar   → Hij/Zij is bij / in / op …
3. Wat    → Hij/Zij is aan het … / doet …
4. Waarom → Hij/Zij doet dat omdat …
5. Jij    → Ik doe dit ook als / wanneer …
```

### 10.2 Learn — `learn.js`

Three tabs switch between content types. Within each tab, a category grid is shown; clicking a category enters flip-card mode.

| Tab | Source file | Items |
|-----|------------|-------|
| Heden (Present) | `learn_present.json` | 200 sentences |
| Verleden (Past) | `learn_past.json` | 130 sentences |
| Scenario's | `learn_scenarios.json` | 200 scenarios |

**Flashcard behaviour:**
- Front: Dutch sentence / scenario questions
- Back: English translation / full 5-part answer
- Click card to flip (CSS 3D rotateY transform)
- Prev / Next navigation with progress dots

State is held in module-level variables (`activeTab`, `activeCategoryId`, `cardIndex`, `flipped`) — no framework needed.

### 10.3 Practice — `practice.js`

Three question types (single / double / triple image), 20 questions each.

**Flow per question:**
1. Scenario description (English) is shown as context for the missing image
2. Dutch exam question is displayed
3. User clicks **Record Answer** → `MediaRecorder` captures microphone audio
4. After stopping, **Listen** button appears → plays back the `Blob` URL
5. **Re-record** clears the recording and resets
6. **Show Sample Answer** toggles the model answer panel

**Recording state:** stored in a `recordings` object keyed by `"${type}-${index}"` (e.g. `"single-3"`). Recordings persist for the lifetime of the page session (cleared on navigation away).

**MediaRecorder lifecycle:**
```
getUserMedia({ audio: true })
  → new MediaRecorder(stream)
    → mediaRecorder.start()
      → ondataavailable: push chunks
    → mediaRecorder.stop()
      → onstop: new Blob(chunks) → createObjectURL → store in recordings{}
```

---

## 11. Outstanding Tasks

See `TASKS.md` for full details. Summary of remaining work:

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 008 | Server-side feature gating (RLS / Edge Function) | 🟡 Medium | 1 day |
| 009 | Fix shuffle algorithm (Fisher-Yates) | 🟡 Medium | 15 min |
| 010 | User-friendly error handling | 🟡 Medium | 2 hrs |
| 011 | Extract duplicate timer logic into shared utility | 🟡 Medium | 1 hr |
| 012 | JSDoc type annotations | 🟢 Low | 2 days |
| 013 | Unit tests for quiz business logic | 🟢 Low | 3 days |
| 014 | PWA / offline support | 🟢 Low | 2 days |
| 015 | Keyboard navigation for quiz | 🟢 Low | 1 hr |
| 016 | Analytics / question difficulty tracking | 🟢 Low | 2 days |
