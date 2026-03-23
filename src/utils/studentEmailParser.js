/**
 * Student Email Parser for Kampus XYZ Literasi Digital System
 *
 * Expected format: NIM_Jurusan_Angkatan@domain.com
 * Example:         20230001_IF_2023@kampusxyz.ac.id
 *
 * Rules:
 *  - NIM    : one or more digits
 *  - Jurusan: one or more letters (case-insensitive)
 *  - Angkatan: exactly 4 digits
 *  - Domain : standard email domain (contains at least one dot)
 */

const EMAIL_REGEX = /^(\d+)_([A-Za-z]+)_(\d{4})@.+\..+$/;

/**
 * Validates and parses a kampus student email address.
 *
 * @param {string} email - Raw email string from the input field.
 * @returns {{ valid: true, studentId: string, jurusan: string, angkatan: string }
 *          | { valid: false, message: string }}
 */
export function parseStudentEmail(email) {
  const trimmed = (email || '').trim();

  if (!trimmed) {
    return { valid: false, message: 'Email tidak boleh kosong.' };
  }

  const match = trimmed.match(EMAIL_REGEX);

  if (!match) {
    return {
      valid: false,
      message:
        'Format email salah. Gunakan format: NIM_Jurusan_Angkatan@domain.com (contoh: 20230001_IF_2023@kampusxyz.ac.id)',
    };
  }

  const [, studentId, jurusan, angkatan] = match;

  return {
    valid: true,
    studentId,
    jurusan: jurusan.toUpperCase(),
    angkatan,
  };
}
