// scripts/test-image.js
// Quick test: generates ONE image and uploads to R2
// Run: node scripts/test-image.js

import Replicate                                          from 'replicate';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { config }                                         from 'dotenv';
import { join, dirname }                                  from 'path';
import { fileURLToPath }                                  from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.images') });

const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET      = 'knm';
const R2_PUBLIC_URL  = 'https://pub-4d240c1edc9a45279dad4b8804a047e7.r2.dev';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const s3 = new S3Client({
  region:      'auto',
  endpoint:    `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

async function main() {
  console.log('🧪 Test: generating one image...\n');

  // 1. Generate
  console.log('1️⃣  Calling Replicate (FLUX-schnell)...');
  const output = await replicate.run('black-forest-labs/flux-schnell', {
    input: {
      prompt:               'A woman mopping a wooden floor in a bright Dutch home kitchen, natural daylight, realistic photography style, no text, no watermarks',
      aspect_ratio:         '4:3',
      output_format:        'webp',
      output_quality:       85,
      num_inference_steps:  4,
    },
  });
  const imgUrl = Array.isArray(output) ? output[0] : output;
  console.log('   ✅ Image generated:', imgUrl);

  // 2. Download
  console.log('\n2️⃣  Downloading image...');
  const res    = await fetch(imgUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`   ✅ Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);

  // 3. Upload to R2
  console.log('\n3️⃣  Uploading to R2...');
  const key = 'speaking/test/test_001.webp';
  await s3.send(new PutObjectCommand({
    Bucket:       R2_BUCKET,
    Key:          key,
    Body:         buffer,
    ContentType:  'image/webp',
    CacheControl: 'public, max-age=31536000',
  }));
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;
  console.log('   ✅ Uploaded to R2');
  console.log('\n🎉 All good! View your image at:');
  console.log('  ', publicUrl);
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
