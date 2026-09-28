import { describe, it, expect } from 'vitest';
import { generateXML, formatDateForXML } from './xmlGenerator';
import { parseXML } from './xmlParser';
import { Record, Header } from '../types/records';

const testHeader: Header = {
  cumulative_reason_code: 'PO07',
  budget_year: '2026',
  budget_user_id: '02126',
  currency_code: 'RSD',
  treasury: 'Treasury1',
};

const testRecord: Record = {
  id: 'test-id-1',
  sequence_number: 1,
  reason_code: 'PO07',
  external_id: '1',
  recipient: 'Test Recipient & Co',
  recipient_place: 'Test Place',
  account_number: '1234567890',
  invoice_number: '110-26',
  invoice_type: '1',
  invoice_date: '01.01.2026',
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
    amount: 1000.50,
    recording_account: 'RA001',
    expected_payment_date: '15.01.2026',
    urgent_payment: false,
    posting_account: 'PA001',
  },
};

describe('formatDateForXML', () => {
  it('converts DD.MM.YYYY to YYYY-MM-DD', () => {
    expect(formatDateForXML('01.01.2026')).toBe('2026-01-01');
  });

  it('converts DD.MM.YYYY. (with trailing dot) to YYYY-MM-DD', () => {
    expect(formatDateForXML('15.03.2026.')).toBe('2026-03-15');
  });

  it('passes through YYYY-MM-DD unchanged', () => {
    expect(formatDateForXML('2026-01-01')).toBe('2026-01-01');
  });

  it('returns empty string for empty input', () => {
    expect(formatDateForXML('')).toBe('');
  });

  it('pads single-digit day and month', () => {
    expect(formatDateForXML('5.3.2026')).toBe('2026-03-05');
  });
});

describe('generateXML', () => {
  it('generates valid XML structure', () => {
    const xml = generateXML(testHeader, [testRecord]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<commitments');
    expect(xml).toContain('</commitments>');
    expect(xml).toContain('<commitment');
    expect(xml).toContain('</commitment>');
    expect(xml).toContain('<item>');
    expect(xml).toContain('</item>');
  });

  it('includes header attributes', () => {
    const xml = generateXML(testHeader, [testRecord]);
    expect(xml).toContain('cumulative_reason_code="PO07"');
    expect(xml).toContain('budget_year="2026"');
    expect(xml).toContain('budget_user_id="02126"');
    expect(xml).toContain('currency_code="RSD"');
    expect(xml).toContain('treasury="Treasury1"');
  });

  it('includes record attributes', () => {
    const xml = generateXML(testHeader, [testRecord]);
    expect(xml).toContain('reason_code="PO07"');
    expect(xml).toContain('recipient="Test Recipient &amp; Co"');
    expect(xml).toContain('invoice_number="110-26"');
  });

  it('includes sequence_number attribute', () => {
    const xml = generateXML(testHeader, [testRecord]);
    expect(xml).toContain('sequence_number="1"');
  });

  it('includes item child elements', () => {
    const xml = generateXML(testHeader, [testRecord]);
    expect(xml).toContain('<budget_user_id>02126</budget_user_id>');
    expect(xml).toContain('<program_code>P001</program_code>');
    expect(xml).toContain('<amount>1000.5</amount>');
    expect(xml).toContain('<urgent_payment>false</urgent_payment>');
  });

  it('escapes XML special characters', () => {
    const record: Record = {
      ...testRecord,
      recipient: 'A & B < C > D "quoted"',
    };
    const xml = generateXML(testHeader, [record]);
    expect(xml).toContain('A &amp; B &lt; C &gt; D &quot;quoted&quot;');
    expect(xml).not.toContain('A & B < C');
  });

  it('converts dates in generated XML', () => {
    const xml = generateXML(testHeader, [testRecord]);
    expect(xml).toContain('invoice_date="2026-01-01"');
    expect(xml).toContain('expected_payment_date>2026-01-15');
  });

  it('throws on duplicate external_ids', () => {
    const records: Record[] = [
      { ...testRecord, external_id: '1', sequence_number: 1 },
      { ...testRecord, external_id: '1', sequence_number: 1 },
    ];
    expect(() => generateXML(testHeader, records)).toThrow();
  });

  it('generates multiple commitment elements for multiple records', () => {
    const records: Record[] = [
      { ...testRecord, external_id: '1', sequence_number: 1 },
      { ...testRecord, id: 'test-id-2', external_id: '2', sequence_number: 2 },
    ];
    const xml = generateXML(testHeader, records);
    const commitmentCount = (xml.match(/<commitment /g) || []).length;
    expect(commitmentCount).toBe(2);
  });
});

describe('XML round-trip (generate -> parse)', () => {
  it('round-trips a single record preserving all fields', () => {
    const records: Record[] = [{ ...testRecord }];
    const xml = generateXML(testHeader, records);
    const parsed = parseXML(xml);

    expect(parsed.header).toEqual(testHeader);
    expect(parsed.records).toHaveLength(1);

    const r = parsed.records[0];
    expect(r.reason_code).toBe(testRecord.reason_code);
    expect(r.external_id).toBe(testRecord.external_id);
    expect(r.recipient).toBe(testRecord.recipient);
    expect(r.recipient_place).toBe(testRecord.recipient_place);
    expect(r.account_number).toBe(testRecord.account_number);
    expect(r.invoice_number).toBe(testRecord.invoice_number);
    expect(r.invoice_type).toBe(testRecord.invoice_type);
    expect(r.invoice_date).toBe('2026-01-01');
    expect(r.due_date).toBe('2026-01-15');
    expect(r.contract_number).toBe(testRecord.contract_number);
    expect(r.payment_code).toBe(testRecord.payment_code);
    expect(r.credit_model).toBe(testRecord.credit_model);
    expect(r.credit_reference_number).toBe(testRecord.credit_reference_number);
    expect(r.payment_basis).toBe(testRecord.payment_basis);
    expect(r.sequence_number).toBe(1);

    expect(r.item.budget_user_id).toBe(testRecord.item.budget_user_id);
    expect(r.item.program_code).toBe(testRecord.item.program_code);
    expect(r.item.project_code).toBe(testRecord.item.project_code);
    expect(r.item.economic_classification_code).toBe(testRecord.item.economic_classification_code);
    expect(r.item.source_of_funding_code).toBe(testRecord.item.source_of_funding_code);
    expect(r.item.function_code).toBe(testRecord.item.function_code);
    expect(r.item.amount).toBe(testRecord.item.amount);
    expect(r.item.recording_account).toBe(testRecord.item.recording_account);
    expect(r.item.expected_payment_date).toBe('2026-01-15');
    expect(r.item.urgent_payment).toBe(testRecord.item.urgent_payment);
    expect(r.item.posting_account).toBe(testRecord.item.posting_account);
  });

  it('round-trips multiple records', () => {
    const records: Record[] = [
      { ...testRecord, external_id: '1', sequence_number: 1 },
      {
        ...testRecord,
        id: 'test-id-2',
        external_id: '2',
        sequence_number: 2,
        recipient: 'Second Recipient',
        item: { ...testRecord.item, amount: 2000.00 },
      },
    ];
    const xml = generateXML(testHeader, records);
    const parsed = parseXML(xml);

    expect(parsed.records).toHaveLength(2);
    expect(parsed.records[0].recipient).toBe('Test Recipient & Co');
    expect(parsed.records[1].recipient).toBe('Second Recipient');
    expect(parsed.records[1].item.amount).toBe(2000.00);
  });

  it('round-trips XML special characters correctly', () => {
    const record: Record = {
      ...testRecord,
      recipient: 'Tom & Jerry <LLC>',
      payment_basis: 'Quote "test" & more',
    };
    const xml = generateXML(testHeader, [record]);
    const parsed = parseXML(xml);

    expect(parsed.records[0].recipient).toBe('Tom & Jerry <LLC>');
    expect(parsed.records[0].payment_basis).toBe('Quote "test" & more');
  });

  it('round-trips urgent_payment flag', () => {
    const record: Record = {
      ...testRecord,
      item: { ...testRecord.item, urgent_payment: true },
    };
    const xml = generateXML(testHeader, [record]);
    const parsed = parseXML(xml);
    expect(parsed.records[0].item.urgent_payment).toBe(true);
  });
});

describe('parseXML', () => {
  it('throws on invalid XML', () => {
    expect(() => parseXML('not valid xml')).toThrow();
  });

  it('throws on missing commitments element', () => {
    expect(() => parseXML('<?xml version="1.0"?><root></root>')).toThrow('commitments');
  });

  it('throws on missing commitment elements', () => {
    expect(() => parseXML('<?xml version="1.0"?><commitments></commitments>')).toThrow('commitment');
  });
});
