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
//
// Resumable: skips images already in R2
// Requires:  .env.images (see .env.images.example)

import Replicate                                          from 'replicate';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, writeFileSync }                   from 'fs';
import { join, dirname }                                  from 'path';
import { fileURLToPath }                                  from 'url';
import { config }                                         from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

config({ path: join(ROOT, '.env.images') });

// ── Config ────────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const R2_ACCOUNT_ID   = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET       = 'knm';
const R2_PUBLIC_URL   = 'https://pub-4d240c1edc9a45279dad4b8804a047e7.r2.dev';
const DELAY_MS        = 1500;

// ── Clients ───────────────────────────────────────────────────────────────────
const replicate = new Replicate({ auth: REPLICATE_TOKEN });

const s3 = new S3Client({
  region:      'auto',
  endpoint:    `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(englishText) {
  return `${englishText}, in a bright modern Dutch everyday setting, `
    + `natural daylight, realistic photography style, candid lifestyle photo, `
    + `shallow depth of field, warm neutral tones, `
    + `no text, no watermarks, simple uncluttered background`;
}

// ── Parse double/triple scenario_en into individual image descriptions ────────
// "Photo 1: a supermarket. Photo 2: a restaurant." → ['a supermarket', 'a restaurant']
// "Image 1: A woman buys vegetables. Image 2: She cuts them. Image 3: Family eats." → [...]
function parseMultiScenario(scenarioEn) {
  const parts = scenarioEn
    .split(/(?:Photo|Image)\s+\d+\s*:/i)
    .map(s => s.trim().replace(/\.$/, '').trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [scenarioEn];
}

// ── Utilities ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function padId(id)    { return String(id).padStart(3, '0'); }
function padIndex(i)  { return String(i + 1).padStart(3, '0'); }

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

async function generateImage(prompt) {
  const output = await replicate.run('black-forest-labs/flux-schnell', {
    input: {
      prompt,
      aspect_ratio:         '4:3',
      output_format:        'webp',
      output_quality:       85,
      num_inference_steps:  4,
    },
  });
  return Array.isArray(output) ? output[0] : output;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

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

// ── Core: generate + upload one image ─────────────────────────────────────────
async function processOne(key, englishText) {
  if (await existsInR2(key)) {
    console.log(`  ✓ skip   ${key}`);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  console.log(`  ⏳ gen    ${key}`);
  console.log(`           "${englishText.slice(0, 80)}"`);

  try {
    const imgUrl = await generateImage(buildPrompt(englishText));
    const buffer = await downloadImage(imgUrl);
    const pubUrl = await uploadToR2(buffer, key);
    console.log(`  ✅ done   ${key}`);
    await sleep(DELAY_MS);
    return pubUrl;
  } catch (err) {
    console.error(`  ❌ fail   ${key} — ${err.message}`);
    return null;
  }
}

// ── Leren: Heden ──────────────────────────────────────────────────────────────
async function processPresent(filterCategory) {
  console.log(`\n📗 HEDEN${filterCategory ? ` › ${filterCategory}` : ''}`);
  const path = join(ROOT, 'public/speaking/learn_present.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let done = 0, skipped = 0, failed = 0;

  for (const cat of data.categories) {
    if (filterCategory && cat.id !== filterCategory) continue;
    console.log(`\n  ▸ ${cat.id} (${cat.sentences.length} sentences)`);
    for (let i = 0; i < cat.sentences.length; i++) {
      const s   = cat.sentences[i];
      const key = `speaking/heden/${cat.id}/${padIndex(i)}.webp`;
      const url = await processOne(key, s.english);
      if (url) { s.image = url; url.includes(R2_PUBLIC_URL) ? done++ : skipped++; }
      else failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n  ✅ learn_present.json saved  (done:${done} skipped:${skipped} failed:${failed})`);
}

// ── Leren: Verleden ───────────────────────────────────────────────────────────
async function processPast(filterCategory) {
  console.log(`\n📘 VERLEDEN${filterCategory ? ` › ${filterCategory}` : ''}`);
  const path = join(ROOT, 'public/speaking/learn_past.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let done = 0, skipped = 0, failed = 0;

  for (const cat of data.categories) {
    if (filterCategory && cat.id !== filterCategory) continue;
    console.log(`\n  ▸ ${cat.id} (${cat.sentences.length} sentences)`);
    for (let i = 0; i < cat.sentences.length; i++) {
      const s   = cat.sentences[i];
      const key = `speaking/verleden/${cat.id}/${padIndex(i)}.webp`;
      const url = await processOne(key, s.english);
      if (url) { s.image = url; url.includes(R2_PUBLIC_URL) ? done++ : skipped++; }
      else failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n  ✅ learn_past.json saved  (done:${done} skipped:${skipped} failed:${failed})`);
}

// ── Leren: Scenarios ──────────────────────────────────────────────────────────
async function processScenarios(filterCategory) {
  console.log(`\n📙 SCENARIOS${filterCategory ? ` › ${filterCategory}` : ''}`);
  const path = join(ROOT, 'public/speaking/learn_scenarios.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let done = 0, skipped = 0, failed = 0;

  for (const cat of data.categories) {
    if (filterCategory && cat.id !== filterCategory) continue;
    console.log(`\n  ▸ ${cat.id} (${cat.scenarios.length} scenarios)`);
    for (let i = 0; i < cat.scenarios.length; i++) {
      const sc  = cat.scenarios[i];
      const txt = sc.scenario_en || sc.title || '';
      const key = `speaking/scenarios/${cat.id}/${padIndex(i)}.webp`;
      const url = await processOne(key, txt);
      if (url) { sc.image = url; url.includes(R2_PUBLIC_URL) ? done++ : skipped++; }
      else failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n  ✅ learn_scenarios.json saved  (done:${done} skipped:${skipped} failed:${failed})`);
}

// ── Oefenen: Practice (single / double / triple) ──────────────────────────────
async function processPractice(filterType) {
  console.log(`\n🎙️  PRACTICE (Oefenen)${filterType ? ` › ${filterType}` : ''}`);
  const path = join(ROOT, 'public/speaking/practice.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let done = 0, skipped = 0, failed = 0;

  // ── Single: one image per question ──────────────────────────────────────────
  if (!filterType || filterType === 'single') {
    console.log(`\n  ▸ single (${data.single.length} questions)`);
    for (const q of data.single) {
      const key = `speaking/practice/single/${padId(q.id)}.webp`;
      const url = await processOne(key, q.scenario_en);
      if (url) { q.image = url; url.includes(R2_PUBLIC_URL) ? done++ : skipped++; }
      else failed++;
    }
  }

  // ── Double: two images per question ─────────────────────────────────────────
  if (!filterType || filterType === 'double') {
    console.log(`\n  ▸ double (${data.double.length} questions → ${data.double.length * 2} images)`);
    for (const q of data.double) {
      const parts = parseMultiScenario(q.scenario_en);
      const urls  = [];
      for (let p = 0; p < parts.length; p++) {
        const key = `speaking/practice/double/${padId(q.id)}_${p + 1}.webp`;
        const url = await processOne(key, parts[p]);
        urls.push(url ?? null);
        if (url) { url.includes(R2_PUBLIC_URL) ? done++ : skipped++; }
        else failed++;
      }
      q.images = urls;
    }
  }

  // ── Triple: three images per question ────────────────────────────────────────
  if (!filterType || filterType === 'triple') {
    console.log(`\n  ▸ triple (${data.triple.length} questions → ${data.triple.length * 3} images)`);
    for (const q of data.triple) {
      const parts = parseMultiScenario(q.scenario_en);
      const urls  = [];
      for (let p = 0; p < parts.length; p++) {
        const key = `speaking/practice/triple/${padId(q.id)}_${p + 1}.webp`;
        const url = await processOne(key, parts[p]);
        urls.push(url ?? null);
        if (url) { url.includes(R2_PUBLIC_URL) ? done++ : skipped++; }
        else failed++;
      }
      q.images = urls;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n  ✅ practice.json saved  (done:${done} skipped:${skipped} failed:${failed})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!REPLICATE_TOKEN || !R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.error('❌  Missing credentials. Copy .env.images.example → .env.images and fill in values.');
    process.exit(1);
  }

  const section  = process.argv[2];
  const filter   = process.argv[3];

  console.log('🚀 Image generation starting...');
  console.log(`   Section: ${section ?? 'all'}  Filter: ${filter ?? 'none'}`);

  if (!section || section === 'heden')     await processPresent(filter);
  if (!section || section === 'verleden')  await processPast(filter);
  if (!section || section === 'scenarios') await processScenarios(filter);
  if (!section || section === 'practice')  await processPractice(filter);

  console.log('\n🎉 Finished!');
}

main().catch(err => { console.error(err); process.exit(1); });
