/**
 * GLOBAL DIGITAL LITERACY FRAMEWORK (UNESCO DLGF / DigComp 2.2)
 * We use 'PILLARS' as the variable name to maintain backward compatibility 
 * with your existing components, but it now contains the 7 Global Areas.
 */
export const PILLARS = {
  '0': {
    code: '0',
    label: 'Devices & Software Operations',
    color: '#64748b',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    indicators: [
      { code: '0.1', label: 'Physical Devices & Hardware' },
      { code: '0.2', label: 'Software & Basic Apps' }
    ]
  },
  '1': {
    code: '1',
    label: 'Information & Data Literacy',
    color: '#3b82f6',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    indicators: [
      { code: '1.1', label: 'Browsing, Searching & Filtering' },
      { code: '1.2', label: 'Evaluating Data & Content' },
      { code: '1.3', label: 'Managing Data & Content' }
    ]
  },
  '2': {
    code: '2',
    label: 'Communication & Collaboration',
    color: '#10b981',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    indicators: [
      { code: '2.1', label: 'Interacting via Digital Tech' },
      { code: '2.2', label: 'Sharing information & content' },
      { code: '2.3', label: 'Engaging in Citizenship' },
      { code: '2.4', label: 'Collaborating via Digital Tech' },
      { code: '2.5', label: 'Netiquette' },
      { code: '2.6', label: 'Managing Digital Identity' }
    ]
  },
  '3': {
    code: '3',
    label: 'Digital Content Creation',
    color: '#8b5cf6',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-700',
    indicators: [
      { code: '3.1', label: 'Developing Digital Content' },
      { code: '3.2', label: 'Integrating & Re-elaborating' },
      { code: '3.3', label: 'Copyright & Licenses' },
      { code: '3.4', label: 'Programming' }
    ]
  },
  '4': {
    code: '4',
    label: 'Safety',
    color: '#f59e0b',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    indicators: [
      { code: '4.1', label: 'Protecting Devices' },
      { code: '4.2', label: 'Protecting Personal Data' },
      { code: '4.3', label: 'Protecting Health & Wellbeing' },
      { code: '4.4', label: 'Protecting the Environment' }
    ]
  },
  '5': {
    code: '5',
    label: 'Problem Solving',
    color: '#ef4444',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    indicators: [
      { code: '5.1', label: 'Solving Technical Problems' },
      { code: '5.2', label: 'Identifying Needs & Responses' },
      { code: '5.3', label: 'Creatively using Digital Tech' },
      { code: '5.4', label: 'Identifying Digital Gaps' }
    ]
  },
  '6': {
    code: '6',
    label: 'Career-Related Competences',
    color: '#ec4899',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
    indicators: [
      { code: '6.1', label: 'Operating Tech in Workplace' },
      { code: '6.2', label: 'Career Data Management' },
      { code: '6.3', label: 'Professional Networking' }
    ]
  }
};

export const TOTAL_COMPETENCIES = 26;

export function calculateFrameworkCoverage(questions) {
  if (!questions || questions.length === 0) return 0;
  // Support both old 'pillarCode' and new 'areaCode' for safety
  const coveredCodes = new Set(questions.map(q => q.competencyCode || q.indicatorCode).filter(Boolean));
  return Math.round((coveredCodes.size / TOTAL_COMPETENCIES) * 100);
}

export function calculateScores(answers, maxWeight = 5) {
  const areaData = {};
  answers.forEach(({ areaCode, pillarCode, selectedWeight }) => {
    const code = areaCode || pillarCode; // Handle both schemas
    if (!areaData[code]) areaData[code] = { total: 0, count: 0 };
    areaData[code].total += selectedWeight;
    areaData[code].count += 1;
  });

  const scores = {};
  Object.keys(PILLARS).forEach((code) => {
    if (areaData[code]) {
      const { total, count } = areaData[code];
      scores[code] = Math.round((total / (count * maxWeight)) * 100);
    } else {
      scores[code] = 0;
    }
  });

  const allScores = Object.values(scores);
  // Calculate index based on how many areas actually have questions
  const activeScores = allScores.filter(s => s > 0);
  const overallIndex = activeScores.length
    ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length)
    : 0;

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