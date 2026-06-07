/**
 * importSubmissions.mjs
 *
 * Standalone Node.js script (ES Module) that reads a local CSV file and
 * performs a batch write to Google Cloud Firestore using the firebase-admin SDK.
 *
 * Target Collection : sessions/457QHZ/submissions/{safeId}
 * Parent Update     : sessions/457QHZ  →  submissionCount += <validRowCount>
 *
 * Usage:
 *   node scripts/importSubmissions.mjs
 *
 * Prerequisites (run from project root):
 *   npm install firebase-admin csv-parser
 */

import admin from 'firebase-admin';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// ---------------------------------------------------------------------------
// 1. Resolve paths
// ---------------------------------------------------------------------------

// __dirname equivalent for ES Modules
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Service account key — NEVER commit this file (it's already in .gitignore)
const SERVICE_ACCOUNT_PATH = path.resolve(PROJECT_ROOT, 'serviceAccountKey.json');

// CSV file path (relative to project root)
const CSV_FILE_PATH = path.resolve(PROJECT_ROOT, 'bank soal', 'dummy_457QHZ_data.csv');

// ---------------------------------------------------------------------------
// 2. Firestore configuration
// ---------------------------------------------------------------------------

const SESSION_DOC_ID = 'XRQKpCagLkGa1jrTe2jB'; // Firestore-generated document ID
const SESSION_DOC_PATH = `sessions/${SESSION_DOC_ID}`;
const SUBMISSIONS_COLLECTION = `${SESSION_DOC_PATH}/submissions`;

// ---------------------------------------------------------------------------
// 3. Initialize Firebase Admin SDK
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ---------------------------------------------------------------------------
// 4. Helper: sanitise studentId → safeId
//    Replaces any character that is NOT a letter, digit, underscore, or hyphen
//    with an underscore.
// ---------------------------------------------------------------------------
function toSafeId(studentId) {
  return String(studentId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ---------------------------------------------------------------------------
// 5. Helper: parse a score field as Float (1–5 scale), defaulting to 0 on bad input
// ---------------------------------------------------------------------------
function parseScore(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

// ---------------------------------------------------------------------------
// 6. Main import function
// ---------------------------------------------------------------------------
async function importSubmissions() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Firestore Batch Import — Doc ID:', SESSION_DOC_ID);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📂 CSV Path  :', CSV_FILE_PATH);
  console.log('🔑 Key Path  :', SERVICE_ACCOUNT_PATH);
  console.log('');

  // Validate that the CSV file exists before proceeding
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error('❌ ERROR: CSV file not found at:', CSV_FILE_PATH);
    process.exit(1);
  }

  // Collect all valid rows first so we know the exact count before committing
  const rows = [];
  const skipped = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(
        csv({
          // Trim whitespace from header names and values
          mapHeaders: ({ header }) => header.trim(),
          mapValues: ({ value }) => value.trim(),
        })
      )
      .on('data', (row) => {
        const { studentId, jurusan, angkatan, DSK, DET, DSA, DCU } = row;

        // Skip rows with a missing or empty studentId
        if (!studentId) {
          console.warn('⚠️  Skipping row — missing studentId:', JSON.stringify(row));
          skipped.push(row);
          return;
        }

        const safeId = toSafeId(studentId);

        // Parse numeric scores (default to 0 on missing / invalid)
        const scoreDSK = parseScore(DSK);
        const scoreDET = parseScore(DET);
        const scoreDSA = parseScore(DSA);
        const scoreDCU = parseScore(DCU);

        // Overall index = mathematical average of the 4 scores, rounded to 2dp
        const overallIndex =
          Math.round(((scoreDSK + scoreDET + scoreDSA + scoreDCU) / 4) * 100) / 100;

        rows.push({
          safeId,
          data: {
            studentId: String(studentId),
            jurusan: String(jurusan ?? ''),
            angkatan: String(angkatan ?? ''),
            scores: {
              DSK: scoreDSK,
              DET: scoreDET,
              DSA: scoreDSA,
              DCU: scoreDCU,
            },
            overallIndex,
            submittedAt: FieldValue.serverTimestamp(),
          },
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  const validCount = rows.length;
  console.log(`📊 Rows parsed  : ${validCount + skipped.length} total`);
  console.log(`✅ Valid rows   : ${validCount}`);
  console.log(`⚠️  Skipped rows : ${skipped.length}`);
  console.log('');

  if (validCount === 0) {
    console.warn('⚠️  No valid rows to write. Aborting.');
    process.exit(0);
  }

  // ---------------------------------------------------------------------------
  // 7. Build and commit the Firestore batch
  // ---------------------------------------------------------------------------
  console.log('🔄 Building Firestore batch...');
  const batch = db.batch();

  for (const { safeId, data } of rows) {
    const docRef = db.collection(SUBMISSIONS_COLLECTION).doc(safeId);
    batch.set(docRef, data); // set() overwrites; use merge: true to merge
  }

  // CRITICAL: Also update the parent session document
  //   → increment submissionCount by the exact number of valid rows
  const sessionRef = db.doc(SESSION_DOC_PATH);
  // Use set() with merge:true so the session document is created if it doesn't
  // exist yet, while still atomically incrementing submissionCount if it does.
  batch.set(sessionRef, {
    submissionCount: FieldValue.increment(validCount),
  }, { merge: true });

  console.log(`📝 Batch prepared:`);
  console.log(`   • ${validCount} submission document(s) → ${SUBMISSIONS_COLLECTION}/{safeId}`);
  console.log(`   • 1 parent update → ${SESSION_DOC_PATH}  (submissionCount += ${validCount})`);
  console.log('');
  console.log('🚀 Committing batch to Firestore...');

  try {
    await batch.commit();
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS — Batch committed!');
    console.log(`   ${validCount} submission(s) written to Firestore.`);
    console.log(`   sessions/${SESSION_DOC_ID}.submissionCount incremented by ${validCount}.`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ FIRESTORE ERROR — Batch commit failed:');
    console.error('   Code   :', error.code ?? 'N/A');
    console.error('   Message:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 8. Entry point
// ---------------------------------------------------------------------------
importSubmissions().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
