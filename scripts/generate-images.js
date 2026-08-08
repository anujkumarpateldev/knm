// scripts/generate-images.js
// Generates images for all speaking flashcards via Replicate (FLUX-schnell)
// and uploads them to Cloudflare R2.
//
// Usage:
//   node scripts/generate-images.js                        → all sections
//   node scripts/generate-images.js heden                  → only heden (all categories)
//   node scripts/generate-images.js heden basic_actions    → one category
//   node scripts/generate-images.js verleden               → only verleden
//   node scripts/generate-images.js scenarios              → only leren scenarios
//   node scripts/generate-images.js practice               → oefenen (single/double/triple)
//   node scripts/generate-images.js practice single        → only single questions
//   node scripts/generate-images.js --retry                → retry all previously failed items
//
// Resumable : skips images already in R2
// Failure log: scripts/failed-images.json  (auto-created, auto-cleared on --retry success)
// Requires  : .env.images (see .env.images.example)

import Replicate                                          from 'replicate';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, writeFileSync, existsSync }       from 'fs';
import { join, dirname }                                  from 'path';
import { fileURLToPath }                                  from 'url';
import { config }                                         from 'dotenv';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const FAIL_LOG   = join(__dirname, 'failed-images.json');

config({ path: join(ROOT, '.env.images') });

// ── Config ────────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const R2_ACCOUNT_ID   = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET       = 'knm';
const R2_PUBLIC_URL   = 'https://pub-4d240c1edc9a45279dad4b8804a047e7.r2.dev';
const DELAY_MS        = 1500;
const MAX_RETRIES     = 3;       // attempts per step (generate / upload)
const RETRY_DELAY_MS  = 3000;   // wait between retry attempts

// ── Clients ───────────────────────────────────────────────────────────────────
const replicate = new Replicate({ auth: REPLICATE_TOKEN });

const s3 = new S3Client({
  region:      'auto',
  endpoint:    `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

// ── Failure log ───────────────────────────────────────────────────────────────
// Each entry: { key, prompt, stage: 'generate'|'upload', error, timestamp }
let failLog = [];

function loadFailLog() {
  if (existsSync(FAIL_LOG)) {
    try { failLog = JSON.parse(readFileSync(FAIL_LOG, 'utf-8')); } catch { failLog = []; }
  }
}

function saveFailLog() {
  writeFileSync(FAIL_LOG, JSON.stringify(failLog, null, 2));
}

function recordFailure(key, prompt, stage, error) {
  // Remove any previous failure for this key so we don't duplicate
  failLog = failLog.filter(f => f.key !== key);
  failLog.push({ key, prompt, stage, error: error.message ?? String(error), timestamp: new Date().toISOString() });
  saveFailLog();
}

function clearFailure(key) {
  failLog = failLog.filter(f => f.key !== key);
  saveFailLog();
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(englishText) {
  return `${englishText}, in a bright modern Dutch everyday setting, `
    + `natural daylight, realistic photography style, candid lifestyle photo, `
    + `shallow depth of field, warm neutral tones, `
    + `no text, no watermarks, simple uncluttered background`;
}

// ── Parse double/triple scenario_en into per-image descriptions ───────────────
function parseMultiScenario(scenarioEn) {
  const parts = scenarioEn
    .split(/(?:Photo|Image)\s+\d+\s*:/i)
    .map(s => s.trim().replace(/\.$/, '').trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [scenarioEn];
}

// ── Utilities ─────────────────────────────────────────────────────────────────
const sleep  = (ms) => new Promise(r => setTimeout(r, ms));
const padId  = (id) => String(id).padStart(3, '0');
const padIdx = (i)  => String(i + 1).padStart(3, '0');

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === MAX_RETRIES;
      console.warn(`     ⚠️  ${label} attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (!isLast) {
        console.warn(`     ↩️  retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastErr;
}

// ── Generate image via Replicate ──────────────────────────────────────────────
async function generateImage(prompt) {
  const output = await replicate.run('black-forest-labs/flux-schnell', {
    input: {
      prompt,
      aspect_ratio:        '4:3',
      output_format:       'webp',
      output_quality:      85,
      num_inference_steps: 4,
    },
  });
  return Array.isArray(output) ? output[0] : output;
}

// ── Upload buffer to R2 ───────────────────────────────────────────────────────
async function uploadToR2(buffer, key) {
  await s3.send(new PutObjectCommand({
    Bucket:       R2_BUCKET,
    Key:          key,
    Body:         buffer,
    ContentType:  'image/webp',
    CacheControl: 'public, max-age=31536000',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

// ── Core: generate + upload one image with staged retries ─────────────────────
async function processOne(key, englishText) {
  if (await existsInR2(key)) {
    console.log(`  ✓ skip   ${key}`);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  const prompt = buildPrompt(englishText);
  console.log(`  ⏳ gen    ${key}`);
  console.log(`           "${englishText.slice(0, 80)}"`);

  // Stage 1: Generate image (with retry)
  let imageUrl;
  try {
    imageUrl = await withRetry('generate', () => generateImage(prompt));
  } catch (err) {
    console.error(`  ❌ gen failed after ${MAX_RETRIES} attempts — logged to failed-images.json`);
    recordFailure(key, englishText, 'generate', err);
    return null;
  }

  // Download the image bytes
  let buffer;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(`  ❌ download failed — logged to failed-images.json`);
    recordFailure(key, englishText, 'generate', err);
    return null;
  }

  // Stage 2: Upload to R2 (with retry)
  let pubUrl;
  try {
    pubUrl = await withRetry('upload', () => uploadToR2(buffer, key));
  } catch (err) {
    console.error(`  ❌ upload failed after ${MAX_RETRIES} attempts — logged to failed-images.json`);
    recordFailure(key, englishText, 'upload', err);
    return null;
  }

  clearFailure(key);  // remove from fail log if previously failed
  console.log(`  ✅ done   ${key}`);
  await sleep(DELAY_MS);
  return pubUrl;
}

// ── Section processors ────────────────────────────────────────────────────────
async function processPresent(filterCategory) {
  console.log(`\n📗 HEDEN${filterCategory ? ` › ${filterCategory}` : ''}`);
  const path = join(ROOT, 'public/speaking/learn_present.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const stats = { done: 0, skipped: 0, failed: 0 };

  for (const cat of data.categories) {
    if (filterCategory && cat.id !== filterCategory) continue;
    console.log(`\n  ▸ ${cat.id} (${cat.sentences.length} sentences)`);
    for (let i = 0; i < cat.sentences.length; i++) {
      const s   = cat.sentences[i];
      const key = `speaking/heden/${cat.id}/${padIdx(i)}.webp`;
      const url = await processOne(key, s.english);
      if (url) { s.image = url; url.startsWith(R2_PUBLIC_URL) ? stats.done++ : stats.skipped++; }
      else stats.failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  printStats('learn_present.json', stats);
}

async function processPast(filterCategory) {
  console.log(`\n📘 VERLEDEN${filterCategory ? ` › ${filterCategory}` : ''}`);
  const path = join(ROOT, 'public/speaking/learn_past.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const stats = { done: 0, skipped: 0, failed: 0 };

  for (const cat of data.categories) {
    if (filterCategory && cat.id !== filterCategory) continue;
    console.log(`\n  ▸ ${cat.id} (${cat.sentences.length} sentences)`);
    for (let i = 0; i < cat.sentences.length; i++) {
      const s   = cat.sentences[i];
      const key = `speaking/verleden/${cat.id}/${padIdx(i)}.webp`;
      const url = await processOne(key, s.english);
      if (url) { s.image = url; url.startsWith(R2_PUBLIC_URL) ? stats.done++ : stats.skipped++; }
      else stats.failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  printStats('learn_past.json', stats);
}

async function processScenarios(filterCategory) {
  console.log(`\n📙 SCENARIOS${filterCategory ? ` › ${filterCategory}` : ''}`);
  const path = join(ROOT, 'public/speaking/learn_scenarios.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const stats = { done: 0, skipped: 0, failed: 0 };

  for (const cat of data.categories) {
    if (filterCategory && cat.id !== filterCategory) continue;
    console.log(`\n  ▸ ${cat.id} (${cat.scenarios.length} scenarios)`);
    for (let i = 0; i < cat.scenarios.length; i++) {
      const sc  = cat.scenarios[i];
      const key = `speaking/scenarios/${cat.id}/${padIdx(i)}.webp`;
      const url = await processOne(key, sc.scenario_en || sc.title || '');
      if (url) { sc.image = url; url.startsWith(R2_PUBLIC_URL) ? stats.done++ : stats.skipped++; }
      else stats.failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  printStats('learn_scenarios.json', stats);
}

async function processPractice(filterType) {
  console.log(`\n🎙️  PRACTICE${filterType ? ` › ${filterType}` : ''}`);
  const path = join(ROOT, 'public/speaking/practice.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const stats = { done: 0, skipped: 0, failed: 0 };

  if (!filterType || filterType === 'single') {
    console.log(`\n  ▸ single (${data.single.length} questions)`);
    for (const q of data.single) {
      const key = `speaking/practice/single/${padId(q.id)}.webp`;
      const url = await processOne(key, q.scenario_en);
      if (url) { q.image = url; url.startsWith(R2_PUBLIC_URL) ? stats.done++ : stats.skipped++; }
      else stats.failed++;
    }
  }

  if (!filterType || filterType === 'double') {
    console.log(`\n  ▸ double (${data.double.length} questions → ${data.double.length * 2} images)`);
    for (const q of data.double) {
      const parts = parseMultiScenario(q.scenario_en);
      const urls  = [];
      for (let p = 0; p < parts.length; p++) {
        const key = `speaking/practice/double/${padId(q.id)}_${p + 1}.webp`;
        const url = await processOne(key, parts[p]);
        urls.push(url ?? null);
        if (url) { url.startsWith(R2_PUBLIC_URL) ? stats.done++ : stats.skipped++; }
        else stats.failed++;
      }
      q.images = urls;
    }
  }

  if (!filterType || filterType === 'triple') {
    console.log(`\n  ▸ triple (${data.triple.length} questions → ${data.triple.length * 3} images)`);
    for (const q of data.triple) {
      const parts = parseMultiScenario(q.scenario_en);
      const urls  = [];
      for (let p = 0; p < parts.length; p++) {
        const key = `speaking/practice/triple/${padId(q.id)}_${p + 1}.webp`;
        const url = await processOne(key, parts[p]);
        urls.push(url ?? null);
        if (url) { url.startsWith(R2_PUBLIC_URL) ? stats.done++ : stats.skipped++; }
        else stats.failed++;
      }
      q.images = urls;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  printStats('practice.json', stats);
}

// ── Retry all logged failures ─────────────────────────────────────────────────
async function retryFailed() {
  loadFailLog();
  if (failLog.length === 0) {
    console.log('✅ No failures logged. Nothing to retry.');
    return;
  }

  console.log(`\n🔁 Retrying ${failLog.length} failed image(s)...\n`);
  const toRetry = [...failLog]; // snapshot
  let recovered = 0, stillFailed = 0;

  for (const entry of toRetry) {
    console.log(`  ↩️  ${entry.stage} failed previously: ${entry.key}`);
    const url = await processOne(entry.key, entry.prompt);
    if (url) recovered++;
    else stillFailed++;
  }

  console.log(`\n  Recovered: ${recovered}  Still failing: ${stillFailed}`);
  if (stillFailed > 0) {
    console.log(`  ⚠️  ${stillFailed} items still in failed-images.json — check your API keys / network and retry again.`);
  } else {
    console.log('  🎉 All failures recovered! failed-images.json cleared.');
  }
}

// ── Stats printer ─────────────────────────────────────────────────────────────
function printStats(file, { done, skipped, failed }) {
  console.log(`\n  ✅ ${file} saved`);
  console.log(`     generated: ${done}  skipped: ${skipped}  failed: ${failed}`);
  if (failed > 0) {
    console.log(`     ⚠️  ${failed} failure(s) logged → scripts/failed-images.json`);
    console.log(`     To retry: node scripts/generate-images.js --retry`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!REPLICATE_TOKEN || !R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.error('❌  Missing credentials. Copy .env.images.example → .env.images and fill in values.');
    process.exit(1);
  }

  loadFailLog();

  const arg1 = process.argv[2];
  const arg2 = process.argv[3];

  // Retry mode
  if (arg1 === '--retry') {
    await retryFailed();
    return;
  }

  console.log('🚀 Image generation starting...');
  console.log(`   Section: ${arg1 ?? 'all'}  Filter: ${arg2 ?? 'none'}`);

  if (!arg1 || arg1 === 'heden')     await processPresent(arg2);
  if (!arg1 || arg1 === 'verleden')  await processPast(arg2);
  if (!arg1 || arg1 === 'scenarios') await processScenarios(arg2);
  if (!arg1 || arg1 === 'practice')  await processPractice(arg2);

  // Final failure summary
  if (failLog.length > 0) {
    console.log(`\n⚠️  ${failLog.length} total failure(s) across this run:`);
    failLog.forEach(f => console.log(`   [${f.stage}] ${f.key} — ${f.error}`));
    console.log('\n   Run: node scripts/generate-images.js --retry');
  } else {
    console.log('\n🎉 All done — no failures!');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
