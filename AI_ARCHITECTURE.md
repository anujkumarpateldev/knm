# DutchExamPro — AI Integration Architecture

> Design document + implementation status
> Original design: 2026-04-12 | Last updated: 2026-08-17

---

## Current Implementation Status

> **Read this first.** The original design below described an "AI Aggregator" middleware layer. **That was never built.** The actual implementation calls DeepSeek and Anthropic directly from the Supabase Edge Function with automatic fallback. The design principles (server-side proxy, streaming, rate limiting) were all followed. Only the aggregator abstraction layer was simplified away.

### What is actually deployed

```
Browser → Supabase Edge Function (ai-chat) → DeepSeek OR Claude (direct)
```

**Models in use:**
- **Primary (speed):** DeepSeek `deepseek-chat` — hints, explain, fill, mnemonic, translate, simplify
- **Primary (quality):** Claude `claude-haiku-4-5-20251001` — grade, evaluate, feedback
- **Fallback:** If primary fails for any reason, automatically tries the other provider

**Rate limiting:** 50 AI calls/day per registered user, enforced server-side in the edge function, logged to `ai_usage` Supabase table.

**Timeout:** 15 seconds per provider request before triggering fallback.

### Phase implementation status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | AI Foundation (Edge Function, client SDK, UI components, `ai_usage` table) | ✅ Done |
| Phase 2 | Quiz AI (Hint + Explain buttons in practice mode) | ✅ Done |
| Phase 3 | Writing Module (task prompts, textarea, AI grade feedback) | ⬜ To Do |
| Phase 4 | Vocab + Reading AI (mnemonic, simplify, reading hint) | ⬜ To Do |
| Phase 5 | Rate limiting + polish (server-side limit done; UI counter not built) | 🔄 Partial |
| Phase 6 | Word Journal AI Fill (`fill` action, correction suggestion, tag autocomplete) | ✅ Done (added scope) |

---

## 1. Market Landscape — How Leading Apps Use AI

### Duolingo (Max tier)
| Feature | How it works |
|---------|-------------|
| "Explain My Answer" | GPT-4 called server-side after each wrong answer. Returns contextual explanation. |
| Roleplay conversations | Streaming GPT-4 chat with a persona (e.g., café owner). Turn-based dialogue. |
| Architecture | All AI calls go through Duolingo's own backend. API key never exposed. Rate limited per subscription tier. |
| UX insight | AI is injected into existing flows (post-answer), not a separate "AI mode". |

### Khan Academy — Khanmigo
| Feature | How it works |
|---------|-------------|
| AI tutor | GPT-4 with Socratic method prompt. Never gives the answer directly — guides with questions. |
| Context-aware | Edge Function receives current lesson, student history, wrong attempts. |
| Essay feedback | Student submits writing → structured rubric evaluation → highlighted inline feedback. |
| UX insight | "Hint" system: 3 levels. Level 1 = vague nudge. Level 2 = bigger hint. Level 3 = full explanation. |

### Key takeaways from market
1. **Server-side proxy is universal** — no app exposes AI API keys to the browser.
2. **Context is everything** — AI is most useful when it knows what the user is doing right now.
3. **Streaming > batch** — typing-effect responses feel faster and more natural.
4. **Progressive hints > full answers** — give users agency over how much help they get.
5. **Inject into existing flows** — don't make "AI" a separate section; put it in the moment of learning.
6. **Cache where possible** — generate AI content once (explanations, model answers), reuse for all users.

---

## 2. Architecture — Actual Implementation

### Design principles (all implemented)
- **One AI client** — single `aiService.js` in the frontend. All modules use the same `askAI()` interface.
- **Supabase Edge Function as proxy** — validates auth, enforces rate limits, builds prompts.
- **Two direct providers** — DeepSeek (speed) and Claude (quality), with automatic fallback between them.
- **Action-level routing** — Edge Function maps `action` → priority → provider selection.
- **Streaming by default** — responses stream character by character via SSE.
- **Rate limiting** — 50 AI calls/day per user tracked in `ai_usage` Supabase table.
- **Graceful degradation** — both providers failing returns a clean error message. App works without AI.

### System diagram (actual)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                              │
│                                                                       │
│  src/ai/                                                              │
│    ├── aiService.js     ← single entry point for all AI calls        │
│    ├── aiPrompts.js     ← context builders per module/action         │
│    └── aiUI.js          ← streaming panel + trigger button           │
│                                                                       │
│  src/utils/                                                           │
│    └── aiFill.js        ← word journal AI fill + tag autocomplete    │
│                                                                       │
│  Modules call AI via:                                                 │
│    askAI({ module, action, context, input, model, onChunk, onDone }) │
│         │                                                             │
│         │  HTTPS POST + Supabase JWT                                 │
│         ▼                                                             │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Supabase Edge Function  /functions/v1/ai-chat           │
│                                                                       │
│  1. Verify JWT → reject unauthenticated requests                     │
│  2. Check rate limit → reject if user exceeded 50/day               │
│  3. Map action → priority ('speed' | 'quality')                      │
│  4. Select system prompt (action-level or module-level)              │
│  5. Build user message from action + context                         │
│  6. Try primary provider (DeepSeek or Claude based on priority)      │
│  7. On failure → try secondary provider (automatic fallback)         │
│  8. Stream SSE response back to browser                              │
│  9. On stream complete → log to ai_usage table                       │
│                                                                       │
│  Secrets: ANTHROPIC_API_KEY, DEEPSEEK_API_KEY                        │
│                                                                       │
└──────────────────┬────────────────────┬────────────────────────────-┘
                   │                    │
                   ▼                    ▼
        ┌──────────────┐      ┌─────────────────┐
        │   DeepSeek   │      │   Anthropic      │
        │ deepseek-chat│      │ claude-haiku-4-5 │
        │ (speed tasks)│      │ (quality tasks)  │
        └──────────────┘      └─────────────────┘
```

---

## 3. Frontend AI Layer — `src/ai/`

### 3.1 `aiService.js` — Central client

```js
// src/ai/aiService.js
import { supabase } from '../supabase.js';

const AI_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export async function askAI({ module, action, context, input = '', model, onChunk, onDone, onError }) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ module, action, context, input, model }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    onError?.(err.error ?? 'AI request failed');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onChunk?.(chunk);
  }

  onDone?.();
}

export function getPreferredModel() {
  return localStorage.getItem('dutchexampro_ai_model') ?? 'deepseek';
}

export function setPreferredModel(model) {
  localStorage.setItem('dutchexampro_ai_model', model);
}
```

### 3.2 `aiPrompts.js` — Context builders per module

Exports one function per use case, each returning `{ module, action, context, input }` ready to pass to `askAI()`:

| Export | Use case |
|--------|----------|
| `quizHintContext(question)` | Hint before answering a quiz question |
| `quizExplainContext(question, userAnswer)` | Explanation after wrong answer |
| `writingGradeContext(task, userText)` | Grade a Dutch writing submission |
| `vocabMnemonicContext(dutchWord, englishWord)` | Create a memorable mnemonic |
| `vocabTranslateContext(word, sentence)` | Explain a word in sentence context |
| `readingSimplifyContext(passage)` | Simplify a Dutch passage to A1 level |
| `readingHintContext(question, passage)` | Hint for a reading comprehension question |
| `speakingEvalContext(question, expectedAnswer, transcript)` | Evaluate a spoken Dutch answer |

### 3.3 `aiUI.js` — Reusable streaming UI

```js
createAIPanel({ containerId, title, append })
// Returns: { stream(chunk), done(), error(msg), setHTML(html), destroy() }

createAIButton({ label, panelId, panelTitle, getAICall, reusable })
// Returns: <button> that manages loading state and creates its own AI panel
```

---

## 4. Supabase Edge Function — `supabase/functions/ai-chat/index.ts`

### Action routing

```typescript
// Actions mapped to priority
const ACTION_PRIORITY: Record<string, 'speed' | 'quality'> = {
  hint:      'speed',
  explain:   'speed',
  translate: 'speed',
  mnemonic:  'speed',
  simplify:  'speed',
  fill:      'speed',
  grade:     'quality',
  evaluate:  'quality',
  feedback:  'quality',
};

// Action-specific prompts override module-level prompts
const ACTION_PROMPTS: Record<string, string> = {
  fill: `You are a Dutch dictionary assistant. Output EXACTLY four labeled lines — nothing else.
Format:
CORRECTION: <corrected Dutch spelling, or "none" if already correct>
ENGLISH: <English translation only>
MEANING: <one English sentence definition>
EXAMPLE: <one natural Dutch example sentence>`,
};

// Module-level system prompts (used when no action-specific prompt)
const SYSTEM_PROMPTS: Record<string, string> = {
  quiz:     `...KNM tutor prompt...`,
  writing:  `...writing coach prompt with SCORE/ERRORS/IMPROVED VERSION/ENCOURAGEMENT format...`,
  vocab:    `...vocabulary tutor prompt...`,
  reading:  `...reading assistant prompt...`,
  speaking: `...speaking exam coach prompt...`,
};

// Selection logic:
const systemPrompt = ACTION_PROMPTS[action] ?? SYSTEM_PROMPTS[mod] ?? SYSTEM_PROMPTS.quiz;
```

### Fallback error handling

```typescript
// Errors are classified for better logging
type ErrorReason = 'auth' | 'rate_limit' | 'network' | 'timeout' | 'server' | 'config';

// Fallback chain:
// 1. Try primary (DeepSeek for speed, Claude for quality)
// 2. On any error → try secondary
// 3. Both failed → return 502 "There is an issue with the AI model"
```

### Provider format differences

The stream builder (`buildStream`) handles both SSE formats transparently:

| Provider | SSE format | Text extraction |
|----------|-----------|-----------------|
| DeepSeek | OpenAI-compatible | `parsed.choices[0].delta.content` |
| Claude | Anthropic | `parsed.delta.text` when `type === 'content_block_delta'` |

---

## 5. AI Use Cases Per Module

### 5.1 Word Journal — AI Fill ✅ Implemented

```
User types Dutch word in Add Word form → clicks "AI Fill"
  → askAI({ module: 'vocab', action: 'fill', context: { dutch_word } })
    → Edge function uses strict system prompt
      → AI returns 4 labeled lines
        → Parser fills English, Meaning, Example fields
          → If CORRECTION differs → shows "Did you mean X?" with Use button
```

**Client-side parser (markdown-tolerant):**
```js
const get = key => {
  const m = fullText.match(new RegExp(`\\*{0,2}${key}\\*{0,2}:?\\*{0,2}\\s*(.+)`, 'i'));
  return m ? m[1].replace(/\*+$/, '').trim() : '';
};
```

### 5.2 Quiz Module — Hint + Explain ✅ Implemented

```
Practice mode only (hidden in exam mode):

"💡 Hint" (before answering):
  → askAI({ module: 'quiz', action: 'hint', context: { question_nl } })
    → 1-2 sentence nudge without revealing the answer

"🔍 Explain in depth" (after wrong answer):
  → askAI({ module: 'quiz', action: 'explain', context: { question_nl, correct_answer, user_answer } })
    → Explains why the correct answer is right and why the user's choice was wrong
```

### 5.3 Writing Module ⬜ Not yet built

```
Planned flow:
Student sees writing task prompt
  → Types Dutch text in textarea
    → Clicks "Get Feedback"
      → askAI({ module: 'writing', action: 'grade', context: { task }, input: userText })
        → AI returns SCORE / ERRORS / IMPROVED VERSION / ENCOURAGEMENT
```

### 5.4 Vocab + Reading AI ⬜ Not yet built

```
Planned additions to existing vocab cards:
  "🧠 Mnemonic" button → askAI({ module: 'vocab', action: 'mnemonic' })

Planned additions to reading passages:
  "Simplify Text" → askAI({ module: 'reading', action: 'simplify' })
  "Hint" → askAI({ module: 'reading', action: 'hint' })
```

### 5.5 Speaking Evaluation 🔄 Partial

The `evaluate` action is implemented in the Edge Function and context builder (`speakingEvalContext`). The Speaking practice view does not yet wire it up. When called, it returns JSON:

```json
{
  "verdict": "good" | "partial" | "retry",
  "score": "X/5",
  "correct": ["..."],
  "missing": ["..."],
  "tip": "...",
  "encouragement": "..."
}
```

---

## 6. Database Schema — `ai_usage`

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

-- Rate limit check (runs per AI request):
-- select count(*) from ai_usage
-- where user_id = $1
-- and created_at > now() - interval '24 hours';
-- Limit: 50

-- Cost monitoring (admin):
-- select date_trunc('day', created_at) as day, provider, model,
--   count(*) as requests
-- from ai_usage
-- group by 1, 2, 3
-- order by 1 desc;
```

---

## 7. Cost Model

| Model | Input cost | Output cost | Use case |
|-------|-----------|-------------|---------|
| deepseek-chat | ~$0.14 / 1M tokens | ~$0.28 / 1M tokens | Speed tasks (hints, fill, explain) |
| claude-haiku-4-5 | $0.25 / 1M tokens | $1.25 / 1M tokens | Quality tasks (grade, evaluate) |

**Estimated cost per user action:**

| Action | Model | Avg tokens | Cost per call |
|--------|-------|-----------|---------------|
| Fill word | DeepSeek | ~100 in, ~60 out | ~$0.00003 |
| Hint | DeepSeek | ~150 in, ~80 out | ~$0.00004 |
| Explain answer | DeepSeek | ~200 in, ~150 out | ~$0.00007 |
| Grade writing | Haiku | ~300 in, ~250 out | ~$0.0004 |

**Rate limiting:** 50 calls/day × registered users. At typical usage, cost is negligible.

---

## 8. Implementation Roadmap

### Phase 1 — Foundation ✅ Done
- [x] Create `supabase/functions/ai-chat/index.ts` Edge Function
- [x] Create `src/ai/aiService.js`, `aiPrompts.js`, `aiUI.js`
- [x] Create `ai_usage` table + RLS in Supabase
- [x] Stream response, rate limit check, JWT validation

### Phase 2 — Quiz AI ✅ Done
- [x] "💡 Hint" button in practice mode quiz (`quiz.render.js`)
- [x] "🔍 Explain in depth" button in wrong-answer panel (`quiz.logic.js`)
- [x] Hidden in exam mode and for guests

### Phase 3 — Writing Module ⬜ Not started
- [ ] `src/views/writing/` — task prompts + textarea UI
- [ ] `src/data/writing.js` — writing task JSON
- [ ] Wire `askAI({ module: 'writing', action: 'grade', input: userText })`
- [ ] Render structured feedback (score, errors, improved version)
- [ ] Add to nav registry + landing page card

### Phase 4 — Vocab + Reading AI ⬜ Not started
- [ ] "🧠 Mnemonic" button on vocab flip-cards
- [ ] "Simplify" + "Hint" buttons on reading passages

### Phase 5 — Rate Limiting + Polish 🔄 Partial
- [x] Enforce 50 calls/day in Edge Function
- [x] Graceful 429 error message
- [ ] AI usage counter shown in UI ("X of 50 credits used today")

### Phase 6 — Word Journal AI Fill ✅ Done (added scope)
- [x] `fill` action in Edge Function with strict 4-line output prompt
- [x] `src/utils/aiFill.js` with markdown-tolerant parser
- [x] Spelling correction suggestion flow
- [x] Tag autocomplete with cached dictionary tags
- [x] Used by both user Add Word page and admin Words panel

---

## 9. Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| AI providers | DeepSeek (speed) + Claude (quality) | DeepSeek is cheaper for fast tasks; Claude is more reliable for structured output |
| Proxy layer | Supabase Edge Function | Already using Supabase, no new infrastructure |
| Streaming | Yes (ReadableStream SSE) | Responses feel instant; better UX than waiting |
| Fallback | Automatic provider fallback | Resilience against API outages |
| Rate limiting | Per user/day in DB | Prevents abuse, controls cost |
| Aggregator | **Not built** | Direct provider calls are simpler and sufficient at current scale |
| Auth requirement | Registered users only | AI is a registration incentive; protects costs |
| Graceful degradation | Yes | If AI is down, existing app works unchanged |
