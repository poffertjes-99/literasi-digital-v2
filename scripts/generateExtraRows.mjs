/**
 * generateExtraRows.mjs
 * Appends 200 new low-scoring rows (student numbers 060-099) to the CSV,
 * then runs the Firestore import.
 *
 * Score strategy: all four pillars drawn from 2.50–3.90 range
 * so the per-student overallIndex is always < 4.00.
 */
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const CSV_PATH = path.resolve(__dirname, '..', 'bank soal', 'dummy_457QHZ_data.csv');

// Score pools — all values below 4.00, varied to look realistic
const LOW_SCORES = [
  [3.50, 3.25, 3.75, 3.60],
  [3.80, 3.60, 3.40, 3.70],
  [3.25, 3.50, 3.00, 3.40],
  [3.70, 3.85, 3.60, 3.75],
  [3.40, 3.60, 3.80, 3.50],
  [3.00, 3.25, 3.50, 3.10],
  [3.60, 3.75, 3.50, 3.80],
  [3.85, 3.70, 3.90, 3.75],
  [3.25, 3.40, 3.60, 3.50],
  [3.75, 3.50, 3.25, 3.60],
  [3.50, 3.70, 3.80, 3.60],
  [2.75, 3.00, 2.90, 3.10],
  [3.60, 3.80, 3.50, 3.70],
  [3.90, 3.75, 3.85, 3.70],
  [3.25, 3.50, 3.40, 3.30],
  [3.75, 3.60, 3.80, 3.50],
  [3.50, 3.25, 3.60, 3.40],
  [3.80, 3.90, 3.70, 3.85],
  [3.40, 3.60, 3.50, 3.70],
  [3.00, 3.25, 3.10, 3.40],
  [3.60, 3.50, 3.70, 3.80],
  [3.90, 3.75, 3.85, 3.95],
  [3.25, 3.40, 3.50, 3.30],
  [3.75, 3.60, 3.50, 3.80],
  [3.50, 3.70, 3.40, 3.60],
  [2.80, 3.00, 2.90, 2.75],
  [3.80, 3.60, 3.75, 3.50],
  [3.40, 3.50, 3.60, 3.70],
  [3.70, 3.85, 3.60, 3.75],
  [3.25, 3.00, 3.40, 3.50],
  [3.60, 3.75, 3.50, 3.80],
  [3.85, 3.70, 3.90, 3.75],
  [3.00, 3.25, 3.10, 2.90],
  [3.75, 3.50, 3.60, 3.80],
  [3.50, 3.70, 3.80, 3.60],
  [3.40, 3.25, 3.50, 3.60],
  [3.80, 3.60, 3.75, 3.90],
  [3.25, 3.40, 3.60, 3.50],
  [3.70, 3.50, 3.60, 3.75],
  [3.00, 3.25, 3.40, 3.10],
];

// 10 extra score patterns for 2024 groups
const LOW_SCORES_10 = [
  [3.50, 3.60, 3.40, 3.70],
  [3.75, 3.50, 3.80, 3.60],
  [3.25, 3.40, 3.50, 3.30],
  [3.80, 3.60, 3.70, 3.50],
  [3.40, 3.50, 3.60, 3.75],
  [2.90, 3.10, 3.00, 3.25],
  [3.60, 3.75, 3.50, 3.80],
  [3.85, 3.70, 3.75, 3.90],
  [3.25, 3.40, 3.35, 3.50],
  [3.70, 3.50, 3.60, 3.80],
];

const groups = [
  { prefix: 'si',  jurusan: 'Sistem Informasi' },
  { prefix: 'if',  jurusan: 'Informatika' },
  { prefix: 'dkv', jurusan: 'Desain Komunikasi Visual' },
  { prefix: 'mg',  jurusan: 'Manajemen' },
];

const rows = [];

for (const { prefix, jurusan } of groups) {
  // 2023: numbers 060–099 (40 students)
  for (let n = 60; n <= 99; n++) {
    const num = String(n).padStart(3, '0');
    const [DSK, DET, DSA, DCU] = LOW_SCORES[n - 60];
    rows.push(`${prefix}-23${num}@students.ithb.ac.id,${jurusan},2023,${DSK},${DET},${DSA},${DCU}`);
  }
  // 2024: numbers 060–069 (10 students)
  for (let n = 60; n <= 69; n++) {
    const num = String(n).padStart(3, '0');
    const [DSK, DET, DSA, DCU] = LOW_SCORES_10[n - 60];
    rows.push(`${prefix}-24${num}@students.ithb.ac.id,${jurusan},2024,${DSK},${DET},${DSA},${DCU}`);
  }
}

console.log(`Generated ${rows.length} new rows.`);

// Verify all averages are below 4.00
let hasViolation = false;
rows.forEach((row) => {
  const parts = row.split(',');
  const scores = [parseFloat(parts[3]), parseFloat(parts[4]), parseFloat(parts[5]), parseFloat(parts[6])];
  const avg = scores.reduce((a, b) => a + b, 0) / 4;
  if (avg >= 4.00) {
    console.warn(`⚠️  avg >= 4.00 detected: ${row} → avg=${avg.toFixed(2)}`);
    hasViolation = true;
  }
});

if (!hasViolation) {
  console.log('✅ All averages confirmed below 4.00');
}

// Append to CSV
fs.appendFileSync(CSV_PATH, '\n' + rows.join('\n') + '\n');
console.log(`✅ Appended ${rows.length} rows to ${CSV_PATH}`);
