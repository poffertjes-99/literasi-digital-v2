// =============================================================================
// scoring.js — Dual-Framework Scoring Engine
// Supports both KOMDIGI (National 4-pillar) and UNESCO DigComp (7-area) frames
// =============================================================================

// 🇮🇩 KOMDIGI PILLARS — used for admin analytics & scoring output
export const KOMDIGI_FRAMEWORK = {
  DSK: { label: 'Kecakapan Digital' },
  DET: { label: 'Etika Digital' },
  DSA: { label: 'Keamanan Digital' },
  DCU: { label: 'Budaya Digital' },
};

// 🌍 UNESCO DigComp Areas — used for question mapping & framework coverage
export const PILLARS = {
  '0': {
    code: '0', label: 'Devices & Software Operations', color: '#64748b', bgColor: 'bg-slate-100', textColor: 'text-slate-700',
    indicators: [
      { code: '0.1', label: 'Physical Devices & Hardware' },
      { code: '0.2', label: 'Software & Basic Apps' },
    ],
  },
  '1': {
    code: '1', label: 'Information & Data Literacy', color: '#3b82f6', bgColor: 'bg-blue-100', textColor: 'text-blue-700',
    indicators: [
      { code: '1.1', label: 'Browsing, Searching & Filtering' },
      { code: '1.2', label: 'Evaluating Data & Content' },
      { code: '1.3', label: 'Managing Data & Content' },
    ],
  },
  '2': {
    code: '2', label: 'Communication & Collaboration', color: '#10b981', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700',
    indicators: [
      { code: '2.1', label: 'Interacting via Digital Tech' },
      { code: '2.2', label: 'Sharing information & content' },
      { code: '2.3', label: 'Engaging in Citizenship' },
      { code: '2.4', label: 'Collaborating via Digital Tech' },
      { code: '2.5', label: 'Netiquette' },
      { code: '2.6', label: 'Managing Digital Identity' },
    ],
  },
  '3': {
    code: '3', label: 'Digital Content Creation', color: '#8b5cf6', bgColor: 'bg-violet-100', textColor: 'text-violet-700',
    indicators: [
      { code: '3.1', label: 'Developing Digital Content' },
      { code: '3.2', label: 'Integrating & Re-elaborating' },
      { code: '3.3', label: 'Copyright & Licenses' },
      { code: '3.4', label: 'Programming' },
    ],
  },
  '4': {
    code: '4', label: 'Safety', color: '#f59e0b', bgColor: 'bg-amber-100', textColor: 'text-amber-700',
    indicators: [
      { code: '4.1', label: 'Protecting Devices' },
      { code: '4.2', label: 'Protecting Personal Data' },
      { code: '4.3', label: 'Protecting Health & Wellbeing' },
      { code: '4.4', label: 'Protecting the Environment' },
    ],
  },
  '5': {
    code: '5', label: 'Problem Solving', color: '#ef4444', bgColor: 'bg-red-100', textColor: 'text-red-700',
    indicators: [
      { code: '5.1', label: 'Solving Technical Problems' },
      { code: '5.2', label: 'Identifying Needs & Responses' },
      { code: '5.3', label: 'Creatively using Digital Tech' },
      { code: '5.4', label: 'Identifying Digital Gaps' },
    ],
  },
  '6': {
    code: '6', label: 'Career-Related Competences', color: '#ec4899', bgColor: 'bg-pink-100', textColor: 'text-pink-700',
    indicators: [
      { code: '6.1', label: 'Operating Tech in Workplace' },
      { code: '6.2', label: 'Career Data Management' },
      { code: '6.3', label: 'Professional Networking' },
    ],
  },
};

export const TOTAL_COMPETENCIES = 26;

// ──────────────────────────────────────────────────────────────────────────────
// Framework Coverage (UNESCO) — % of competency codes covered by a question set
// ──────────────────────────────────────────────────────────────────────────────
export function calculateFrameworkCoverage(questions) {
  if (!questions || questions.length === 0) return 0;
  const coveredCodes = new Set(questions.map((q) => q.competencyCode).filter(Boolean));
  return Math.round((coveredCodes.size / TOTAL_COMPETENCIES) * 100);
}

// ──────────────────────────────────────────────────────────────────────────────
// calculateScores — Primary scoring function
//
// Accepts `answers` array (from QuizPage rawAnswers), each item:
//   { pillarCode: 'DSK'|'DET'|'DSA'|'DCU', areaCode: '0'–'6', selectedWeight: 1–5 }
//
// Returns:
//   {
//     komdigiScores : { DSK: 0–100, DET: 0–100, DSA: 0–100, DCU: 0–100 },  ← used by admin analytics
//     areaScores   : { '0': 0–100, …, '6': 0–100 },                         ← used by UNESCO breakdown
//     overallIndex : 0–100,
//   }
//
// maxWeight: the highest weight value in the option scale (default 5).
// ──────────────────────────────────────────────────────────────────────────────
export function calculateScores(answers, maxWeight = 5) {
  if (!answers || answers.length === 0) {
    return {
      komdigiScores: { DSK: 0, DET: 0, DSA: 0, DCU: 0 },
      areaScores: Object.fromEntries(Object.keys(PILLARS).map((c) => [c, 0])),
      overallIndex: 0,
    };
  }

  // --- KOMDIGI (pillarCode) accumulation ---
  const komdigiTotals = { DSK: 0, DET: 0, DSA: 0, DCU: 0 };
  const komdigiCounts = { DSK: 0, DET: 0, DSA: 0, DCU: 0 };

  // --- UNESCO Area (areaCode) accumulation ---
  const areaTotals = Object.fromEntries(Object.keys(PILLARS).map((c) => [c, 0]));
  const areaCounts = Object.fromEntries(Object.keys(PILLARS).map((c) => [c, 0]));

  answers.forEach(({ pillarCode, areaCode, selectedWeight }) => {
    const weight = Number(selectedWeight);

    // Guard: only accumulate if keys are valid and weight is a finite number
    if (!Number.isFinite(weight)) return;

    if (pillarCode && Object.prototype.hasOwnProperty.call(komdigiTotals, pillarCode)) {
      komdigiTotals[pillarCode] += weight;
      komdigiCounts[pillarCode] += 1;
    }

    if (areaCode !== undefined && areaCode !== null && Object.prototype.hasOwnProperty.call(areaTotals, String(areaCode))) {
      const key = String(areaCode);
      areaTotals[key] += weight;
      areaCounts[key] += 1;
    }
  });

  // --- Normalise KOMDIGI scores (0–100) ---
  const komdigiScores = {};
  let komdigiActiveCount = 0;
  let komdigiActiveSum = 0;

  Object.keys(komdigiTotals).forEach((code) => {
    const count = komdigiCounts[code];
    if (count > 0) {
      const score = Math.round((komdigiTotals[code] / (count * maxWeight)) * 100);
      komdigiScores[code] = score;
      komdigiActiveCount += 1;
      komdigiActiveSum += score;
    } else {
      komdigiScores[code] = 0; // pillar present but not tested — scores 0
    }
  });

  // --- Normalise UNESCO Area scores (0–100) ---
  const areaScores = {};
  Object.keys(areaTotals).forEach((code) => {
    const count = areaCounts[code];
    areaScores[code] = count > 0
      ? Math.round((areaTotals[code] / (count * maxWeight)) * 100)
      : 0;
  });

  // --- Overall index: average of ACTIVE KOMDIGI pillars only ---
  // (avoid inflating/deflating by pillars with zero questions in this quiz set)
  const overallIndex = komdigiActiveCount > 0
    ? Math.round(komdigiActiveSum / komdigiActiveCount)
    : 0;

  return { komdigiScores, areaScores, overallIndex };
}

// ──────────────────────────────────────────────────────────────────────────────
// getLiteracyLevel — Maps a 0–100 score to a qualitative label
// ──────────────────────────────────────────────────────────────────────────────
export function getLiteracyLevel(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return { label: 'N/A', color: 'text-slate-400' };
  if (s >= 80) return { label: 'Sangat Baik', color: 'text-emerald-600' };
  if (s >= 65) return { label: 'Baik', color: 'text-blue-600' };
  if (s >= 50) return { label: 'Cukup', color: 'text-amber-600' };
  return { label: 'Perlu Peningkatan', color: 'text-red-600' };
}

// ──────────────────────────────────────────────────────────────────────────────
// generateSessionCode — Produces a 6-char alphanumeric session code
// Excludes visually ambiguous chars (I, O, 0, 1)
// ──────────────────────────────────────────────────────────────────────────────
export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}