/**
 * Scoring utility for the Digital Literacy Measurement System
 * Based on the Kominfo/Siberkreasi 4-pillar framework.
 */

export const PILLARS = {
  DSK: {
    code: 'DSK',
    label: 'Kecakapan Digital',
    indicators: [
      { code: 'DSK1', label: 'Perangkat Keras & Lunak' },
      { code: 'DSK2', label: 'Mesin Pencari Informasi' },
      { code: 'DSK3', label: 'Aplikasi Percakapan & Medsos' },
      { code: 'DSK4', label: 'Dompet Digital & E-Commerce' }
    ],
    bgColor: 'bg-blue-100', textColor: 'text-blue-700'
  },
  DET: {
    code: 'DET',
    label: 'Etika Digital',
    indicators: [
      { code: 'DET1', label: 'Etika Berinternet (Netiquette)' },
      { code: 'DET2', label: 'Konten Negatif (Hoax, dll)' },
      { code: 'DET3', label: 'Interaksi Sahabat Digital' },
      { code: 'DET4', label: 'Bertransaksi Secara Etis' }
    ],
    bgColor: 'bg-emerald-100', textColor: 'text-emerald-700'
  },
  DSA: {
    code: 'DSA',
    label: 'Keamanan Digital',
    indicators: [
      { code: 'DSA1', label: 'Proteksi Perangkat Keras' },
      { code: 'DSA2', label: 'Proteksi Identitas Digital' },
      { code: 'DSA3', label: 'Penipuan Digital' },
      { code: 'DSA4', label: 'Rekam Jejak Digital' }
    ],
    bgColor: 'bg-amber-100', textColor: 'text-amber-700'
  },
  DCU: {
    code: 'DCU',
    label: 'Budaya Digital',
    indicators: [
      { code: 'DCU1', label: 'Hak Digital' },
      { code: 'DCU2', label: 'Nilai Pancasila & Bhinneka' },
      { code: 'DCU3', label: 'Cinta Produk Dalam Negeri' },
      { code: 'DCU4', label: 'Digitalisasi Budaya' }
    ],
    bgColor: 'bg-violet-100', textColor: 'text-violet-700'
  },
};

export function calculateScores(answers, maxWeight = 5) {
  const pillarData = {};
  answers.forEach(({ pillarCode, selectedWeight }) => {
    if (!pillarData[pillarCode]) pillarData[pillarCode] = { total: 0, count: 0 };
    pillarData[pillarCode].total += selectedWeight;
    pillarData[pillarCode].count += 1;
  });

  const scores = {};
  Object.keys(PILLARS).forEach((code) => {
    if (pillarData[code]) {
      const { total, count } = pillarData[code];
      scores[code] = Math.round((total / (count * maxWeight)) * 100);
    } else {
      scores[code] = 0;
    }
  });

  const allScores = Object.values(scores);
  const overallIndex = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  return { scores, overallIndex };
}

export function getLiteracyLevel(score) {
  if (score >= 80) return { label: 'Sangat Baik', color: 'text-emerald-600' };
  if (score >= 65) return { label: 'Baik', color: 'text-blue-600' };
  if (score >= 50) return { label: 'Cukup', color: 'text-amber-600' };
  return { label: 'Perlu Peningkatan', color: 'text-red-600' };
}

export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}