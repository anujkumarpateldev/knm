// scripts/generate-images.js
// Generates images for all speaking flashcards via Replicate (FLUX-schnell)
// and uploads them to Cloudflare R2.
//
// Usage:
//   node scripts/generate-images.js           → all sections
//   node scripts/generate-images.js heden     → only heden
//   node scripts/generate-images.js verleden  → only verleden
//   node scripts/generate-images.js scenarios → only scenarios
//
// Requires: .env.images file with credentials (see .env.images.example)
// Resumable: skips images that already exist in R2

import Replicate                                          from 'replicate';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, writeFileSync, existsSync }       from 'fs';
import { join, dirname }                                  from 'path';
import { fileURLToPath }                                  from 'url';
import { config }                                         from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// Load credentials from .env.images (never committed)
config({ path: join(ROOT, '.env.images') });

// ── Config ────────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const R2_ACCOUNT_ID   = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET       = 'knm';
const R2_PUBLIC_URL   = 'https://pub-4d240c1edc9a45279dad4b8804a047e7.r2.dev';
const DELAY_MS        = 1500; // ms between API calls to avoid rate limits

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

// ── Utilities ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function pad(n) { return String(n + 1).padStart(3, '0'); }

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

// ── Core: process one entry ───────────────────────────────────────────────────
async function processEntry(section, categoryId, index, englishText) {
  const key = `speaking/${section}/${categoryId}/${pad(index)}.webp`;

  if (await existsInR2(key)) {
    console.log(`  ✓ skip   ${key}`);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  const prompt = buildPrompt(englishText);
  console.log(`  ⏳ gen    ${key}`);
  console.log(`           "${englishText.slice(0, 80)}"`);

  try {
    const imgUrl  = await generateImage(prompt);
    const buffer  = await downloadImage(imgUrl);
    const pubUrl  = await uploadToR2(buffer, key);
    console.log(`  ✅ done   ${key}`);
    await sleep(DELAY_MS);
    return pubUrl;
  } catch (err) {
    console.error(`  ❌ fail   ${key} — ${err.message}`);
    return null;
  }
}

// ── Section processors ────────────────────────────────────────────────────────
async function processPresent() {
  console.log('\n📗 HEDEN (present tense)');
  const path = join(ROOT, 'public/speaking/learn_present.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let done = 0, skipped = 0, failed = 0;

  for (const cat of data.categories) {
    console.log(`\n  ▸ ${cat.id} (${cat.sentences.length} sentences)`);
    for (let i = 0; i < cat.sentences.length; i++) {
      const s   = cat.sentences[i];
      const url = await processEntry('heden', cat.id, i, s.english);
      if (url) { s.image = url; url.includes('skip') ? skipped++ : done++; }
      else failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n  ✅ learn_present.json updated  (done:${done} skipped:${skipped} failed:${failed})`);
}

async function processPast() {
  console.log('\n📘 VERLEDEN (past tense)');
  const path = join(ROOT, 'public/speaking/learn_past.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let done = 0, skipped = 0, failed = 0;

  for (const cat of data.categories) {
    console.log(`\n  ▸ ${cat.id} (${cat.sentences.length} sentences)`);
    for (let i = 0; i < cat.sentences.length; i++) {
      const s   = cat.sentences[i];
      const url = await processEntry('verleden', cat.id, i, s.english);
      if (url) { s.image = url; url.includes('skip') ? skipped++ : done++; }
      else failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n  ✅ learn_past.json updated  (done:${done} skipped:${skipped} failed:${failed})`);
}

async function processScenarios() {
  console.log('\n📙 SCENARIOS');
  const path = join(ROOT, 'public/speaking/learn_scenarios.json');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let done = 0, skipped = 0, failed = 0;

  for (const cat of data.categories) {
    console.log(`\n  ▸ ${cat.id} (${cat.scenarios.length} scenarios)`);
    for (let i = 0; i < cat.scenarios.length; i++) {
      const sc  = cat.scenarios[i];
      const txt = sc.scenario_en || sc.title || '';
      const url = await processEntry('scenarios', cat.id, i, txt);
      if (url) { sc.image = url; url.includes('skip') ? skipped++ : done++; }
      else failed++;
    }
  }

  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n  ✅ learn_scenarios.json updated  (done:${done} skipped:${skipped} failed:${failed})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!REPLICATE_TOKEN || !R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.error('❌  Missing credentials. Copy .env.images.example → .env.images and fill in values.');
    process.exit(1);
  }

  const section = process.argv[2];
  console.log('🚀 Image generation starting...');
  console.log(`   Bucket:     ${R2_BUCKET}`);
  console.log(`   Public URL: ${R2_PUBLIC_URL}`);
  console.log(`   Section:    ${section ?? 'all'}`);

  if (!section || section === 'heden')     await processPresent();
  if (!section || section === 'verleden')  await processPast();
  if (!section || section === 'scenarios') await processScenarios();

  console.log('\n🎉 Finished!');
}

main().catch(err => { console.error(err); process.exit(1); });
