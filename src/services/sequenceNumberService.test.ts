import { describe, it, expect } from 'vitest';
import { SequenceNumberService } from './sequenceNumberService';

describe('SequenceNumberService.validateSequenceOrder', () => {
  it('returns valid for empty records', async () => {
    const result = await SequenceNumberService.validateSequenceOrder([]);
    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('returns invalid when no sequence numbers exist', async () => {
    const records = [
      { id: 'a', sequence_number: undefined, created_at: '2026-01-01' },
      { id: 'b', sequence_number: undefined, created_at: '2026-01-02' },
    ];
    const result = await SequenceNumberService.validateSequenceOrder(records);
    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toContain('No sequence numbers');
  });

  it('detects duplicate sequence numbers', async () => {
    const records = [
      { id: 'a', sequence_number: 1, created_at: '2026-01-01' },
      { id: 'b', sequence_number: 1, created_at: '2026-01-02' },
    ];
    const result = await SequenceNumberService.validateSequenceOrder(records);
    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toContain('Duplicate');
  });

  it('detects gaps in sequence', async () => {
    const records = [
      { id: 'a', sequence_number: 1, created_at: '2026-01-01' },
      { id: 'b', sequence_number: 3, created_at: '2026-01-02' },
    ];
    const result = await SequenceNumberService.validateSequenceOrder(records);
    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toContain('Gap');
  });

  it('passes for correct sequential order', async () => {
    const records = [
      { id: 'a', sequence_number: 1, created_at: '2026-01-01' },
      { id: 'b', sequence_number: 2, created_at: '2026-01-02' },
      { id: 'c', sequence_number: 3, created_at: '2026-01-03' },
    ];
    const result = await SequenceNumberService.validateSequenceOrder(records);
    expect(result.isValid).toBe(true);
  });

  it('detects sequence order mismatch with created_at', async () => {
    const records = [
      { id: 'a', sequence_number: 2, created_at: '2026-01-01' },
      { id: 'b', sequence_number: 1, created_at: '2026-01-02' },
    ];
    const result = await SequenceNumberService.validateSequenceOrder(records);
    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toContain('mismatch');
  });
});

describe('SequenceNumberService.getDisplayNumber', () => {
  it('returns sequence_number as string when present', () => {
    expect(SequenceNumberService.getDisplayNumber({ sequence_number: 5 })).toBe('5');
  });

  it('returns fallback with asterisk when sequence_number is missing', () => {
    expect(SequenceNumberService.getDisplayNumber({}, 3)).toBe('4*');
  });

  it('returns ? when no sequence_number and no fallback', () => {
    expect(SequenceNumberService.getDisplayNumber({})).toBe('?');
  });

  it('handles null sequence_number', () => {
    expect(SequenceNumberService.getDisplayNumber({ sequence_number: null as unknown as undefined }, 0)).toBe('1*');
  });
});
