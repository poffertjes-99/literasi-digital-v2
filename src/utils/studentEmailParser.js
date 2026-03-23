/**
 * Universal Student Email Parser
 * Supported format: jurusan-nim@students.ithb.ac.id (e.g., si-19031@students.ithb.ac.id)
 * Fallback: Any valid email is accepted.
 */

// Matches: si-19031@students.ithb.ac.id
const ITHB_REGEX = /^([a-zA-Z]+)-(\d{2})(\d+)@students\.ithb\.ac\.id$/;
// Generic email check
const GENERIC_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseStudentEmail(email) {
  const trimmed = (email || '').trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, message: 'Email tidak boleh kosong.' };
  }

  // Check if it's a valid email structure first
  if (!GENERIC_REGEX.test(trimmed)) {
    return { valid: false, message: 'Format email tidak valid.' };
  }

  const ithbMatch = trimmed.match(ITHB_REGEX);

  if (ithbMatch) {
    const [, jurusan, yearShort, serial] = ithbMatch;
    return {
      valid: true,
      studentId: `${yearShort}${serial}`, // Uses numeric part as ID
      jurusan: jurusan.toUpperCase(),
      angkatan: `20${yearShort}`, // e.g., 19 -> 2019
      isInstitutional: true
    };
  }

  // FALLBACK: Allow any other email (Gmail, Outlook, etc.)
  return {
    valid: true,
    studentId: trimmed.split('@')[0], // Use part before @ as ID
    jurusan: 'GUEST',
    angkatan: 'OTHER',
    isInstitutional: false
  };
}