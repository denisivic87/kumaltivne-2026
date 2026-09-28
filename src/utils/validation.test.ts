import { describe, it, expect } from 'vitest';
import { validateHeader, validateRecord, validateAll } from './validation';
import { Record, Header, ValidationError } from '../types/records';

const validHeader: Header = {
  cumulative_reason_code: 'PO07',
  budget_year: '2026',
  budget_user_id: '02126',
  currency_code: 'RSD',
  treasury: 'Treasury1',
};

const validRecord: Record = {
  id: 'test-id',
  reason_code: 'PO07',
  external_id: '1',
  recipient: 'Test Recipient',
  recipient_place: 'Test Place',
  account_number: '1234567890',
  invoice_number: '110-26',
  invoice_type: '1',
  invoice_date: '2026-01-01',
  due_date: '2026-01-15',
  contract_number: 'C001',
  payment_code: 'P001',
  credit_model: 'M1',
  credit_reference_number: 'CR001',
  payment_basis: 'Basis1',
  notes: '',
  item: {
    budget_user_id: '02126',
    program_code: 'P001',
    project_code: 'PR001',
    economic_classification_code: 'E001',
    source_of_funding_code: 'S001',
    function_code: 'F001',
    amount: 1000.00,
    recording_account: 'RA001',
    expected_payment_date: '2026-01-15',
    urgent_payment: false,
    posting_account: 'PA001',
  },
};

describe('validateHeader', () => {
  it('passes for valid header', () => {
    const errors = validateHeader(validHeader);
    expect(errors).toHaveLength(0);
  });

  it('fails when cumulative_reason_code is empty', () => {
    const errors = validateHeader({ ...validHeader, cumulative_reason_code: '' });
    expect(errors.some((e: ValidationError) => e.field === 'cumulative_reason_code')).toBe(true);
  });

  it('fails when budget_year is empty', () => {
    const errors = validateHeader({ ...validHeader, budget_year: '' });
    expect(errors.some((e: ValidationError) => e.field === 'budget_year')).toBe(true);
  });

  it('fails when budget_user_id is empty', () => {
    const errors = validateHeader({ ...validHeader, budget_user_id: '' });
    expect(errors.some((e: ValidationError) => e.field === 'budget_user_id')).toBe(true);
  });

  it('fails when currency_code is empty', () => {
    const errors = validateHeader({ ...validHeader, currency_code: '' });
    expect(errors.some((e: ValidationError) => e.field === 'currency_code')).toBe(true);
  });

  it('fails when treasury is empty', () => {
    const errors = validateHeader({ ...validHeader, treasury: '' });
    expect(errors.some((e: ValidationError) => e.field === 'treasury')).toBe(true);
  });

  it('returns all errors for completely empty header', () => {
    const emptyHeader: Header = {
      cumulative_reason_code: '',
      budget_year: '',
      budget_user_id: '',
      currency_code: '',
      treasury: '',
    };
    const errors = validateHeader(emptyHeader);
    expect(errors).toHaveLength(5);
  });
});

describe('validateRecord', () => {
  it('passes for valid record', () => {
    const errors = validateRecord(validRecord, 0);
    expect(errors).toHaveLength(0);
  });

  it('fails when reason_code is empty', () => {
    const errors = validateRecord({ ...validRecord, reason_code: '' }, 0);
    expect(errors.some((e: ValidationError) => e.message.includes('Reason code'))).toBe(true);
  });

  it('fails when recipient is empty', () => {
    const errors = validateRecord({ ...validRecord, recipient: '' }, 0);
    expect(errors.some((e: ValidationError) => e.message.includes('Recipient'))).toBe(true);
  });

  it('fails when amount is zero', () => {
    const errors = validateRecord({
      ...validRecord,
      item: { ...validRecord.item, amount: 0 },
    }, 0);
    expect(errors.some((e: ValidationError) => e.message.includes('amount'))).toBe(true);
  });

  it('fails when amount is negative', () => {
    const errors = validateRecord({
      ...validRecord,
      item: { ...validRecord.item, amount: -100 },
    }, 0);
    expect(errors.some((e: ValidationError) => e.message.includes('amount'))).toBe(true);
  });

  it('includes row number in error messages', () => {
    const errors = validateRecord({ ...validRecord, reason_code: '' }, 4);
    expect(errors[0].message).toContain('Row 5');
  });

  it('fails when expected_payment_date is empty', () => {
    const errors = validateRecord({
      ...validRecord,
      item: { ...validRecord.item, expected_payment_date: '' },
    }, 0);
    expect(errors.some((e: ValidationError) => e.message.includes('expected payment date'))).toBe(true);
  });
});

describe('validateAll', () => {
  it('passes for valid header and records', () => {
    const errors = validateAll(validHeader, [validRecord]);
    expect(errors).toHaveLength(0);
  });

  it('fails when records array is empty', () => {
    const errors = validateAll(validHeader, []);
    expect(errors.some((e: ValidationError) => e.field === 'records')).toBe(true);
  });

  it('accumulates header and record errors', () => {
    const errors = validateAll(
      { ...validHeader, treasury: '' },
      [{ ...validRecord, recipient: '' }],
    );
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
