/**
 * Scoring utility for the Digital Literacy Measurement System
 * Based on the Kominfo/Siberkreasi 4-pillar framework:
 *   DSK - Digital Skills (Kecakapan Digital)
 *   DET - Digital Ethics (Etika Digital)
 *   DSA - Digital Safety (Keamanan Digital)
 *   DCU - Digital Culture (Budaya Digital)
 */

export const PILLARS = {
  DSK: { code: 'DSK', label: 'Kecakapan Digital', color: '#3b82f6', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  DET: { code: 'DET', label: 'Etika Digital',     color: '#10b981', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
  DSA: { code: 'DSA', label: 'Keamanan Digital',  color: '#f59e0b', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  DCU: { code: 'DCU', label: 'Budaya Digital',    color: '#8b5cf6', bgColor: 'bg-violet-100', textColor: 'text-violet-700', borderColor: 'border-violet-200' },
};

/**
 * Calculate per-pillar scores and overall literacy index.
 * @param {Array} answers - [{ questionId, pillarCode, selectedWeight }]
 * @param {number} maxWeight - Maximum weight per question (default 5)
 * @returns {{ scores: Object, overallIndex: number }}
 */
export function calculateScores(answers, maxWeight = 5) {
  const pillarData = {};

  // Group answers by pillar
  answers.forEach(({ pillarCode, selectedWeight }) => {
    if (!pillarData[pillarCode]) {
      pillarData[pillarCode] = { total: 0, count: 0 };
    }
    pillarData[pillarCode].total += selectedWeight;
    pillarData[pillarCode].count += 1;
  });

  // Calculate percentage score per pillar
  const scores = {};
  Object.keys(PILLARS).forEach((code) => {
    if (pillarData[code]) {
      const { total, count } = pillarData[code];
      scores[code] = Math.round((total / (count * maxWeight)) * 100);
    } else {
      scores[code] = 0;
    }
  });

  // Overall index = average of all 4 pillar scores
  const allScores = Object.values(scores);
  const overallIndex = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  return { scores, overallIndex };
}

/**
 * Get a literacy level label based on an index score (0–100).
 */
export function getLiteracyLevel(score) {
  if (score >= 80) return { label: 'Sangat Baik', color: 'text-emerald-600' };
  if (score >= 65) return { label: 'Baik',        color: 'text-blue-600' };
  if (score >= 50) return { label: 'Cukup',       color: 'text-amber-600' };
  return                  { label: 'Perlu Peningkatan', color: 'text-red-600' };
}

/**
 * Generate a random 6-character alphanumeric session code.
 */
export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
