import { describe, it, expect } from 'vitest';
import {
  sanitizeInvoiceNumber,
  sanitizeExternalId,
  generateExternalId,
  sanitizeString,
  sanitizeNumber,
  validateUniqueExternalIds,
} from './dataSanitizer';

describe('sanitizeInvoiceNumber', () => {
  it('converts slash to hyphen', () => {
    expect(sanitizeInvoiceNumber('110/2026')).toBe('110-26');
  });

  it('converts short year format', () => {
    expect(sanitizeInvoiceNumber('110/26')).toBe('110-26');
  });

  it('passes through already clean number', () => {
    expect(sanitizeInvoiceNumber('110')).toBe('110');
  });

  it('passes through already sanitized format', () => {
    expect(sanitizeInvoiceNumber('343-110-26')).toBe('343-110-26');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeInvoiceNumber(null as unknown as string)).toBe('');
    expect(sanitizeInvoiceNumber(undefined as unknown as string)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeInvoiceNumber('')).toBe('');
    expect(sanitizeInvoiceNumber('   ')).toBe('');
  });

  it('converts 4-digit year to 2-digit', () => {
    expect(sanitizeInvoiceNumber('5/2025')).toBe('5-25');
  });

  it('handles multiple slashes', () => {
    expect(sanitizeInvoiceNumber('110/2026/A')).toBe('110-2026-A');
  });
});

describe('sanitizeExternalId', () => {
  it('respects user-provided external_id', () => {
    expect(sanitizeExternalId('CUSTOM-001', 1, 0)).toBe('CUSTOM-001');
  });

  it('generates from sequence_number when user id is empty', () => {
    expect(sanitizeExternalId('', 5, 0)).toBe('5');
  });

  it('generates from fallback index when both are missing', () => {
    expect(sanitizeExternalId('', undefined, 2)).toBe('3');
  });

  it('handles null sequence_number', () => {
    expect(sanitizeExternalId('', null, 0)).toBe('1');
  });

  it('trims whitespace from user input', () => {
    expect(sanitizeExternalId('  TRIMMED  ', 1, 0)).toBe('TRIMMED');
  });
});

describe('generateExternalId', () => {
  it('uses sequence_number when valid', () => {
    expect(generateExternalId(42, 0)).toBe('42');
  });

  it('falls back to index+1 when sequence is undefined', () => {
    expect(generateExternalId(undefined, 4)).toBe('5');
  });

  it('falls back to index+1 when sequence is null', () => {
    expect(generateExternalId(null, 4)).toBe('5');
  });

  it('falls back to index+1 when sequence is NaN', () => {
    expect(generateExternalId(NaN, 4)).toBe('5');
  });
});

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('returns default for null/undefined', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  it('returns custom default when empty', () => {
    expect(sanitizeString('', 'fallback')).toBe('fallback');
  });

  it('converts non-string to string', () => {
    expect(sanitizeString(123 as unknown as string)).toBe('123');
  });
});

describe('sanitizeNumber', () => {
  it('returns number as-is', () => {
    expect(sanitizeNumber(42)).toBe(42);
  });

  it('returns default for null/undefined', () => {
    expect(sanitizeNumber(null)).toBe(0);
    expect(sanitizeNumber(undefined)).toBe(0);
  });

  it('returns default for NaN', () => {
    expect(sanitizeNumber(NaN)).toBe(0);
  });

  it('uses custom default', () => {
    expect(sanitizeNumber(null, 99)).toBe(99);
  });
});

describe('validateUniqueExternalIds', () => {
  it('returns valid for unique ids', () => {
    const result = validateUniqueExternalIds(['1', '2', '3']);
    expect(result.isValid).toBe(true);
    expect(result.duplicates).toEqual([]);
  });

  it('detects duplicates', () => {
    const result = validateUniqueExternalIds(['1', '2', '1', '3', '2']);
    expect(result.isValid).toBe(false);
    expect(result.duplicates).toContain('1');
    expect(result.duplicates).toContain('2');
  });

  it('passes for empty array', () => {
    const result = validateUniqueExternalIds([]);
    expect(result.isValid).toBe(true);
  });

  it('passes for single element', () => {
    const result = validateUniqueExternalIds(['1']);
    expect(result.isValid).toBe(true);
  });
});
