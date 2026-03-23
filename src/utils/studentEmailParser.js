/**
 * Universal Student Email Parser
 * Supports: si-19031@students.ithb.ac.id
 * Fallback: Any valid email
 */

// Matches: si-19031@students.ithb.ac.id
const ITHB_REGEX = /^([a-zA-Z]+)-(\d+)@students\.ithb\.ac\.id$/;
// Generic email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseStudentEmail(email) {
  const trimmed = (email || '').trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, message: 'Email tidak boleh kosong.' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: 'Format email tidak valid. Contoh: si-19031@students.ithb.ac.id'
    };
  }

  const ithbMatch = trimmed.match(ITHB_REGEX);

  if (ithbMatch) {
    const [, jurusan, nim] = ithbMatch;
    // Extract year from NIM (e.g., 19031 -> 2019)
    const yearShort = nim.substring(0, 2);
    return {
      valid: true,
      studentId: nim,
      jurusan: jurusan.toUpperCase(),
      angkatan: `20${yearShort}`,
      isInstitutional: true
    };
  }

  // FALLBACK: Allow any valid email (Gmail, etc.)
  return {
    valid: true,
    studentId: trimmed.replace(/[@.]/g, '_'), // Create a valid Firestore ID from email
    jurusan: 'GUEST',
    angkatan: 'OTHER',
    isInstitutional: false
  };
}