// supabase/functions/ai-chat/index.ts
// Multi-model AI proxy with full exception handling and automatic fallback.
//
// Fallback chain:
//   preferred model → other model → "There is an issue with the AI model"
//
// Handles: network errors, expired/invalid API keys, timeouts, rate limits,
//          unreachable URLs, and mid-stream failures.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY
//   DEEPSEEK_API_KEY
import { createClient } from 'npm:@supabase/supabase-js';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const DEEPSEEK_KEY     = Deno.env.get('DEEPSEEK_API_KEY')  ?? '';

const DEEPSEEK_MODEL = 'deepseek-chat';
const CLAUDE_MODEL   = 'claude-haiku-4-5-20251001';

// How long to wait for the API to respond before giving up (ms)
const FETCH_TIMEOUT_MS = 15_000;

const DAILY_LIMIT = 50;

// ── Error classification ──────────────────────────────────────────────────────
class AIProviderError extends Error {
  constructor(
    public provider: string,
    public reason: 'auth' | 'rate_limit' | 'network' | 'timeout' | 'server' | 'config',
    message: string,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

function classifyHttpError(provider: string, status: number, body: string): AIProviderError {
  if (status === 401 || status === 403) {
    return new AIProviderError(provider, 'auth',
      `${provider} API key is invalid or expired (HTTP ${status})`);
  }
  if (status === 429) {
    return new AIProviderError(provider, 'rate_limit',
      `${provider} rate limit reached (HTTP 429)`);
  }
  if (status >= 500) {
    return new AIProviderError(provider, 'server',
      `${provider} server error (HTTP ${status})`);
  }
  return new AIProviderError(provider, 'server',
    `${provider} returned HTTP ${status}: ${body.slice(0, 120)}`);
}

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, opts: RequestInit, provider: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AIProviderError(provider, 'timeout',
        `${provider} did not respond within ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    // Network-level failure: DNS, connection refused, unreachable URL
    throw new AIProviderError(provider, 'network',
      `${provider} is unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Model routing ─────────────────────────────────────────────────────────────
const ACTION_PRIORITY: Record<string, 'speed' | 'quality'> = {
  hint:      'speed',
  explain:   'speed',
  translate: 'speed',
  mnemonic:  'speed',
  simplify:  'speed',
  grade:     'quality',
  evaluate:  'quality',
  feedback:  'quality',
};

// ── System prompts ────────────────────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
  quiz: `You are a helpful Dutch language tutor for the KNM (Kennis van de Nederlandse Maatschappij) integration exam.
Always respond in both Dutch and English. Be concise — max 3 sentences per point.
Never just give the answer outright. Guide the student to understand WHY.`,

  writing: `You are a Dutch language writing coach specialising in A2-level Dutch for the integration exam.
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
Always respond in both Dutch and English.`,

  speaking: `You are a Dutch A2 speaking exam coach. Evaluate spoken Dutch answers for the integration exam.
Be encouraging, specific, and constructive. Focus on key vocabulary, sentence structure, and whether all question parts were answered.
Reply in simple English. Keep feedback concise.`,
};

// ── User message builders ─────────────────────────────────────────────────────
function buildUserMessage(action: string, context: Record<string, unknown>, input: string): string {
  switch (action) {
    case 'hint':
      return `Question: "${context.question_nl}"
Give a subtle 1–2 sentence hint without giving the answer away.`;
    case 'explain':
      return `Question: "${context.question_nl}"
Correct answer: ${context.correct_answer}. Student chose: ${context.user_answer}.
Explain clearly why the correct answer is right and why the student's choice was wrong.`;
    case 'grade':
      return `Writing task: "${context.task}"\nStudent's Dutch writing:\n"""\n${input}\n"""
Grade this writing according to A2 Dutch integration exam standards.`;
    case 'mnemonic':
      return `Dutch word: "${context.dutch_word}" (English: "${context.english_word}")
Create a memorable, vivid mnemonic to help an English speaker remember this Dutch word.`;
    case 'translate':
      return `Explain the Dutch word "${context.word}" in the sentence: "${context.sentence}"
Keep it simple for an A2 learner. Include meaning, a tip, and one more example sentence.`;
    case 'simplify':
      return `Rewrite this Dutch text at A1 level:\n"""\n${context.text}\n"""
Then provide an English summary in 2–3 sentences.`;
    case 'evaluate':
      return `EXAM QUESTION:\n${context.question}\n\nMODEL ANSWER:\n${context.expected_answer}\n\nSTUDENT SAID:\n"${context.transcript}"\n\nEvaluate the student's spoken answer. Reply as valid JSON only:\n{"verdict":"good"|"partial"|"retry","score":"X/5","correct":["..."],"missing":["..."],"tip":"...","encouragement":"..."}`;
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

// ── DeepSeek call (OpenAI-compatible SSE) ─────────────────────────────────────
async function callDeepSeek(system: string, userMsg: string, maxTokens: number) {
  if (!DEEPSEEK_KEY) {
    throw new AIProviderError('deepseek', 'config', 'DEEPSEEK_API_KEY secret is not set');
  }

  const res = await fetchWithTimeout(
    'https://api.deepseek.com/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        max_tokens: maxTokens,
        stream: true,
      }),
    },
    'deepseek',
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw classifyHttpError('deepseek', res.status, body);
  }

  return { response: res, provider: 'deepseek', model: DEEPSEEK_MODEL };
}

// ── Claude call (Anthropic SSE) ───────────────────────────────────────────────
async function callClaude(system: string, userMsg: string, maxTokens: number) {
  if (!ANTHROPIC_KEY) {
    throw new AIProviderError('claude', 'config', 'ANTHROPIC_API_KEY secret is not set');
  }

  const res = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMsg }],
        stream: true,
      }),
    },
    'claude',
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw classifyHttpError('claude', res.status, body);
  }

  return { response: res, provider: 'anthropic', model: CLAUDE_MODEL };
}

// ── Stream builder — wraps raw response into a clean text stream ──────────────
// Handles both DeepSeek (OpenAI SSE) and Claude (Anthropic SSE) formats.
// If the stream itself errors mid-way, enqueues an error marker and closes cleanly.
function buildStream(
  rawResponse: Response,
  provider: string,
  onComplete: () => void,
): ReadableStream<Uint8Array> {
  const encoder  = new TextEncoder();
  const decoder  = new TextDecoder();
  let   buffer   = '';
  let   hasChunk = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = rawResponse.body?.getReader();
      if (!reader) {
        controller.enqueue(encoder.encode('⚠️ There is an issue with the AI model. Please try again.'));
        controller.close();
        onComplete();
        return;
      }

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

              // DeepSeek / OpenAI format
              const openaiText = parsed.choices?.[0]?.delta?.content;
              if (openaiText) {
                controller.enqueue(encoder.encode(openaiText));
                hasChunk = true;
                continue;
              }

              // Anthropic / Claude format
              if (parsed.type === 'content_block_delta') {
                const claudeText = parsed.delta?.text;
                if (claudeText) {
                  controller.enqueue(encoder.encode(claudeText));
                  hasChunk = true;
                }
              }
            } catch { /* malformed SSE line — skip */ }
          }
        }

        // If stream ended but we never got any content, treat as a failure
        if (!hasChunk) {
          controller.enqueue(encoder.encode('⚠️ There is an issue with the AI model. Please try again.'));
        }
      } catch (streamErr) {
        // Mid-stream failure (connection dropped, read error)
        console.error(`[ai-chat] stream error from ${provider}:`, streamErr);
        if (!hasChunk) {
          controller.enqueue(encoder.encode('⚠️ There is an issue with the AI model. Please try again.'));
        }
      } finally {
        controller.close();
        onComplete();
      }
    },
  });
}

// ── Try providers in order, return first success ──────────────────────────────
async function callWithFallback(
  useDeepSeekFirst: boolean,
  system: string,
  userMsg: string,
  maxTokens: number,
): Promise<{ response: Response; provider: string; model: string }> {

  const primary   = useDeepSeekFirst ? callDeepSeek : callClaude;
  const secondary = useDeepSeekFirst ? callClaude   : callDeepSeek;
  const primaryName   = useDeepSeekFirst ? 'deepseek' : 'claude';
  const secondaryName = useDeepSeekFirst ? 'claude'   : 'deepseek';

  // Try primary
  try {
    const result = await primary(system, userMsg, maxTokens);
    console.log(`[ai-chat] using ${result.provider}:${result.model}`);
    return result;
  } catch (primaryErr) {
    const reason = primaryErr instanceof AIProviderError ? primaryErr.reason : 'unknown';
    console.warn(`[ai-chat] ${primaryName} failed (${reason}): ${(primaryErr as Error).message}`);
  }

  // Try secondary
  try {
    const result = await secondary(system, userMsg, maxTokens);
    console.log(`[ai-chat] fell back to ${result.provider}:${result.model}`);
    return result;
  } catch (secondaryErr) {
    const reason = secondaryErr instanceof AIProviderError ? secondaryErr.reason : 'unknown';
    console.error(`[ai-chat] ${secondaryName} also failed (${reason}): ${(secondaryErr as Error).message}`);
    throw new Error('both_failed');
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // 1. Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError('Sign in to use AI features.', 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) {
    return jsonError('Your session has expired. Please sign in again.', 401);
  }

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

  // 4. Decide primary model
  const priority      = ACTION_PRIORITY[action] ?? 'speed';
  const useDeepSeek   = preferredModel === 'deepseek' || (preferredModel !== 'claude' && priority === 'speed');
  const maxTokens     = priority === 'quality' ? 800 : 400;
  const systemPrompt  = SYSTEM_PROMPTS[mod] ?? SYSTEM_PROMPTS.quiz;
  const userMessage   = buildUserMessage(action, context, input);

  // 5. Call with automatic fallback
  let callResult: { response: Response; provider: string; model: string };
  try {
    callResult = await callWithFallback(useDeepSeek, systemPrompt, userMessage, maxTokens);
  } catch {
    // Both providers failed
    return jsonError('There is an issue with the AI model. Please try again later.', 502);
  }

  const { response: rawResponse, provider, model } = callResult;

  // 6. Log usage after stream completes (fire-and-forget)
  function logUsage() {
    supabase.from('ai_usage').insert({
      user_id: user.id, module: mod, action, provider, model,
      input_tokens: 0, output_tokens: 0,
    }).then(({ error: logErr }) => {
      if (logErr) console.error('[ai-chat] usage log failed:', logErr.message);
    });
  }

  // 7. Build the outgoing stream
  const outStream = buildStream(rawResponse, provider, logUsage);

  return new Response(outStream, {
    headers: {
      ...CORS,
      'Content-Type':      'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'X-AI-Provider':     provider,
      'X-AI-Model':        model,
    },
  });
});
