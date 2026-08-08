// supabase/functions/ai-chat/index.ts
// Multi-model AI proxy — routes to DeepSeek (speed) or Claude (quality)
// based on action type, or explicit caller preference.
//
// Required env vars (set in Supabase → Settings → Edge Functions → Secrets):
//   SUPABASE_URL              (auto-set)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set)
//   ANTHROPIC_API_KEY         your Anthropic key
//   DEEPSEEK_API_KEY          your DeepSeek key
import { createClient } from 'npm:@supabase/supabase-js';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!;
const DEEPSEEK_KEY     = Deno.env.get('DEEPSEEK_API_KEY')!;

// ── Model routing ─────────────────────────────────────────────────────────────
// 'speed'   → DeepSeek chat (cheap, fast, great for simple tasks)
// 'quality' → Claude (better reasoning, ideal for grading & evaluation)
const ACTION_PRIORITY: Record<string, 'speed' | 'quality'> = {
  hint:      'speed',
  explain:   'speed',
  translate: 'speed',
  mnemonic:  'speed',
  simplify:  'speed',
  grade:     'quality',
  evaluate:  'quality',   // speaking evaluation
  feedback:  'quality',
};

const DEEPSEEK_MODEL  = 'deepseek-chat';
const CLAUDE_MODEL    = 'claude-haiku-4-5-20251001';  // fast Claude for quality tasks

const DAILY_LIMIT = 50;

// ── System prompts ────────────────────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
  quiz: `You are a helpful Dutch language tutor for the KNM (Kennis van de Nederlandse Maatschappij) integration exam. You help students understand Dutch civic knowledge and society.
Always respond in both Dutch and English. Be concise — max 3 sentences per point.
Never just give the answer outright. Guide the student to understand WHY.`,

  writing: `You are a Dutch language writing coach specialising in A2-level Dutch for the integration exam.
Evaluate the student's Dutch writing for grammar, vocabulary, and sentence structure.
Return your response in this exact format:
SCORE: [1-10]/10
ERRORS:
• [error description] → [correction]
IMPROVED VERSION:
[rewritten text]
ENCOURAGEMENT:
[one motivating sentence]
Use simple English for all explanations.`,

  vocab: `You are a Dutch vocabulary tutor. Help students learn Dutch words through mnemonics, example sentences, and real-life context.
Keep responses short and memorable. Always include both Dutch and English.`,

  reading: `You are a Dutch reading comprehension assistant. Help students understand Dutch texts at A2 level.
Explain difficult words in context and guide students through comprehension questions without giving direct answers.
Always respond in both Dutch and English.`,

  speaking: `You are a Dutch A2 speaking exam coach. You evaluate spoken Dutch answers for the integration exam.
Be encouraging, specific, and constructive. Focus on:
- Key vocabulary used correctly
- Sentence structure (Wie → Waar → Wat → Waarom → Persoonlijk)
- Whether all parts of the question were answered
Reply in simple English. Keep feedback concise and actionable.`,
};

// ── User message builders ─────────────────────────────────────────────────────
function buildUserMessage(action: string, context: Record<string, unknown>, input: string): string {
  switch (action) {
    case 'hint':
      return `Question: "${context.question_nl}"
The student is struggling. Give a subtle 1–2 sentence hint without giving the answer away.`;

    case 'explain':
      return `Question: "${context.question_nl}"
Correct answer: ${context.correct_answer}
Student chose: ${context.user_answer}
Explain clearly why the correct answer is right and why the student's choice was wrong.`;

    case 'grade':
      return `Writing task: "${context.task}"
Student's Dutch writing:\n"""\n${input}\n"""
Grade this writing according to A2 Dutch integration exam standards.`;

    case 'mnemonic':
      return `Dutch word: "${context.dutch_word}" (English: "${context.english_word}")
Create a memorable, vivid mnemonic to help an English speaker remember this Dutch word.`;

    case 'translate':
      return `Explain the Dutch word "${context.word}" in the sentence: "${context.sentence}"
Keep it simple for an A2 learner. Include meaning, a tip, and one more example sentence.`;

    case 'simplify':
      return `Rewrite this Dutch text at A1 level (simple vocabulary, short sentences):\n"""\n${context.text}\n"""
Then provide an English summary in 2–3 sentences.`;

    case 'evaluate':
      return `EXAM QUESTION:
${context.question}

MODEL ANSWER:
${context.expected_answer}

STUDENT SAID (transcribed from recording):
"${context.transcript}"

Evaluate the student's spoken answer. Reply as valid JSON only, no extra text:
{
  "verdict": "good" | "partial" | "retry",
  "score": "X/5",
  "correct": ["thing they got right", "..."],
  "missing": ["thing missing or wrong", "..."],
  "tip": "one specific improvement suggestion",
  "encouragement": "short motivating sentence in Dutch"
}`;

    default:
      return input || String(context.question_nl ?? '');
  }
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── DeepSeek streaming (OpenAI-compatible SSE) ────────────────────────────────
async function callDeepSeek(
  system: string,
  userMsg: string,
  maxTokens: number,
): Promise<{ stream: ReadableStream<Uint8Array>; provider: string; model: string }> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system',    content: system },
        { role: 'user',      content: userMsg },
      ],
      max_tokens: maxTokens,
      stream:     true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`DeepSeek error ${res.status}: ${err}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let   buffer  = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (raw === '[DONE]') break;
            try {
              const parsed = JSON.parse(raw);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch { /* skip malformed */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return { stream, provider: 'deepseek', model: DEEPSEEK_MODEL };
}

// ── Claude streaming (Anthropic SSE) ─────────────────────────────────────────
async function callClaude(
  system: string,
  userMsg: string,
  maxTokens: number,
): Promise<{ stream: ReadableStream<Uint8Array>; provider: string; model: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Claude error ${res.status}: ${err}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let   buffer  = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            try {
              const parsed = JSON.parse(line.slice(5).trim());
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text;
                if (text) controller.enqueue(encoder.encode(text));
              }
            } catch { /* skip */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return { stream, provider: 'anthropic', model: CLAUDE_MODEL };
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // 1. Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return jsonError('Sign in to use AI features.', 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) return jsonError('Invalid session. Please sign in again.', 401);

  // 2. Parse body
  let body: { module: string; action: string; context: Record<string, unknown>; input: string; model?: string };
  try { body = await req.json(); }
  catch { return jsonError('Invalid request body.', 400); }

  const { module: mod, action, context = {}, input = '', model: preferredModel } = body;
  if (!mod || !action) return jsonError('Missing module or action.', 400);

  // 3. Rate limit
  const { count, error: rateError } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString());

  if (!rateError && (count ?? 0) >= DAILY_LIMIT) {
    return jsonError(`Daily AI limit reached (${DAILY_LIMIT} calls/day). Try again tomorrow.`, 429);
  }

  // 4. Decide which model to use
  // Caller can pass model: 'deepseek' | 'claude' | 'auto'
  // 'auto' (default) uses the action priority mapping
  const priority      = ACTION_PRIORITY[action] ?? 'speed';
  const useDeepSeek   = preferredModel === 'deepseek' || (preferredModel !== 'claude' && priority === 'speed');
  const maxTokens     = priority === 'quality' ? 800 : 400;
  const systemPrompt  = SYSTEM_PROMPTS[mod] ?? SYSTEM_PROMPTS.quiz;
  const userMessage   = buildUserMessage(action, context, input);

  // 5. Call the selected provider
  let result: { stream: ReadableStream<Uint8Array>; provider: string; model: string };
  try {
    result = useDeepSeek
      ? await callDeepSeek(systemPrompt, userMessage, maxTokens)
      : await callClaude(systemPrompt, userMessage, maxTokens);
  } catch (err) {
    // Fallback: if preferred model fails, try the other one
    console.error(`[ai-chat] primary provider failed:`, err);
    try {
      result = useDeepSeek
        ? await callClaude(systemPrompt, userMessage, maxTokens)
        : await callDeepSeek(systemPrompt, userMessage, maxTokens);
      console.log(`[ai-chat] fell back to ${result.provider}`);
    } catch (fallbackErr) {
      console.error(`[ai-chat] fallback also failed:`, fallbackErr);
      return jsonError('AI service unavailable. Please try again.', 502);
    }
  }

  // 6. Stream response to client + log usage (fire-and-forget)
  const { stream, provider, model } = result;

  // Log after stream closes
  stream.pipeTo(new WritableStream()).catch(() => {}).finally(() => {
    supabase.from('ai_usage').insert({
      user_id: user.id, module: mod, action,
      provider, model, input_tokens: 0, output_tokens: 0,
    }).then(({ error: logErr }) => {
      if (logErr) console.error('[ai-chat] usage log failed:', logErr.message);
    });
  });

  // Re-create stream since pipeTo consumed it — we need a tee
  // Actually, let's re-call and use a proper tee approach
  // Simpler: just stream directly and log separately
  let logProvider = provider;
  let logModel    = model;

  const encoder = new TextEncoder();
  const [streamA, streamB] = (result.stream as any).tee?.() ?? [result.stream, null];

  // Log from streamB if tee is supported, else skip detailed logging
  if (streamB) {
    (async () => {
      const reader = streamB.getReader();
      try { while (!(await reader.read()).done) {} } catch {}
      supabase.from('ai_usage').insert({
        user_id: user.id, module: mod, action,
        provider: logProvider, model: logModel, input_tokens: 0, output_tokens: 0,
      }).catch(() => {});
    })();
  }

  return new Response(streamA ?? result.stream, {
    headers: {
      ...CORS,
      'Content-Type':      'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'X-AI-Provider':     provider,
      'X-AI-Model':        model,
    },
  });
});
