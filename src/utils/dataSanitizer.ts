/**
 * Data Sanitization Module
 *
 * CRITICAL: This module ensures data integrity before XML generation.
 * All input fields MUST be sanitized to prevent state leaks and invalid XML.
 */

/**
 * Sanitizes invoice number by removing year suffixes and slashes
 *
 * Examples:
 *   "110/2026" -> "110-26"
 *   "110/26" -> "110-26"
 *   "110" -> "110"
 *   "343-110-26" -> "343-110-26" (already clean)
 *
 * @param invoiceNumber - Raw invoice number from user input
 * @returns Sanitized invoice number
 */
export const sanitizeInvoiceNumber = (invoiceNumber: string): string => {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') {
    return '';
  }

  const trimmed = invoiceNumber.trim();

  if (!trimmed) {
    return '';
  }

  // Replace forward slashes with hyphens
  let sanitized = trimmed.replace(/\//g, '-');

  // If year format like "110-2026", convert to "110-26"
  sanitized = sanitized.replace(/(\d+)-(\d{4})$/, (match, num, year) => {
    const shortYear = year.slice(-2);
    return `${num}-${shortYear}`;
  });

  return sanitized;
};

/**
 * Generates a unique external_id based on sequence number
 *
 * CRITICAL: This function is PURE and IMMUTABLE
 * - No side effects
 * - Same input = Same output
 * - No global state dependencies
 *
 * Format: "{sequence_number}"
 *
 * @param sequenceNumber - The sequence number from database
 * @param fallbackIndex - Fallback index if sequence_number is missing
 * @returns Clean external_id
 */
export const generateExternalId = (
  sequenceNumber: number | undefined | null,
  fallbackIndex: number
): string => {
  // Priority 1: Use sequence_number if valid
  if (sequenceNumber !== undefined && sequenceNumber !== null && !isNaN(Number(sequenceNumber))) {
    return String(sequenceNumber);
  }

  // Priority 2: Use fallback index (1-based)
  return String(fallbackIndex + 1);
};

/**
 * Validates and sanitizes external_id from user input
 *
 * Rules:
 * - If user provided external_id, use it AS-IS (respect user input)
 * - If empty, generate from sequence_number
 * - NEVER mix invoice_number into external_id (this was the bug!)
 *
 * @param userExternalId - User-provided external_id (may be empty)
 * @param sequenceNumber - Database sequence_number
 * @param fallbackIndex - Array index for fallback
 * @returns Final external_id
 */
export const sanitizeExternalId = (
  userExternalId: string,
  sequenceNumber: number | undefined | null,
  fallbackIndex: number
): string => {
  const trimmedId = userExternalId?.trim() || '';

  // If user provided an ID, respect it
  if (trimmedId) {
    return trimmedId;
  }

  // Otherwise, generate from sequence_number
  return generateExternalId(sequenceNumber, fallbackIndex);
};

/**
 * Sanitizes a string field by trimming and normalizing
 *
 * @param value - Raw string value
 * @param defaultValue - Default if empty (default: '')
 * @returns Sanitized string
 */
export const sanitizeString = (value: string | undefined | null, defaultValue: string = ''): string => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const trimmed = String(value).trim();
  return trimmed || defaultValue;
};

/**
 * Sanitizes a numeric field
 *
 * @param value - Raw numeric value
 * @param defaultValue - Default if invalid (default: 0)
 * @returns Valid number
 */
export const sanitizeNumber = (value: number | undefined | null, defaultValue: number = 0): number => {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return defaultValue;
  }

  return Number(value);
};

/**
 * Validates that external_id values are unique across all records
 *
 * @param externalIds - Array of external_id values
 * @returns Object with isValid flag and duplicate IDs
 */
export const validateUniqueExternalIds = (externalIds: string[]): {
  isValid: boolean;
  duplicates: string[];
} => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  externalIds.forEach(id => {
    if (seen.has(id)) {
      duplicates.add(id);
    } else {
      seen.add(id);
    }
  });

  return {
    isValid: duplicates.size === 0,
    duplicates: Array.from(duplicates)
  };
};
