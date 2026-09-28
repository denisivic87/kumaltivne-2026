import { Record, Header } from '../types/records';
import {
  sanitizeExternalId,
  sanitizeInvoiceNumber,
  sanitizeString,
  validateUniqueExternalIds
} from './dataSanitizer';

// Converts DD.MM.YYYY or DD.MM.YYYY. to YYYY-MM-DD. Passes through YYYY-MM-DD unchanged.
export const formatDateForXML = (value: string): string => {
  if (!value) return '';
  const stripped = value.trim().replace(/\.$/, '');
  const parts = stripped.split('.');
  if (parts.length === 3 && parts[2].length === 4) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return stripped;
};

export const generateXML = (header: Header, records: Record[]): string => {
  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const processedRecords = records.map((record, index) => {
    const cleanExternalId = sanitizeExternalId(
      record.external_id,
      record.sequence_number,
      index
    );

    const cleanInvoiceNumber = sanitizeInvoiceNumber(record.invoice_number);

    const expectedPaymentDate = formatDateForXML(sanitizeString(record.item.expected_payment_date));
    const dueDate = formatDateForXML(sanitizeString(record.due_date));

    return {
      ...record,
      external_id: cleanExternalId,
      invoice_number: cleanInvoiceNumber,
      reason_code: sanitizeString(record.reason_code),
      recipient: sanitizeString(record.recipient),
      recipient_place: sanitizeString(record.recipient_place),
      account_number: sanitizeString(record.account_number),
      invoice_type: sanitizeString(record.invoice_type),
      invoice_date: formatDateForXML(sanitizeString(record.invoice_date)),
      due_date: dueDate, // Zadržava se originalni datum dospeća koji je unio korisnik
      contract_number: sanitizeString(record.contract_number),
      payment_code: sanitizeString(record.payment_code),
      credit_model: sanitizeString(record.credit_model),
      credit_reference_number: sanitizeString(record.credit_reference_number),
      payment_basis: sanitizeString(record.payment_basis),
      item: {
        ...record.item,
        expected_payment_date: expectedPaymentDate,
      },
    };
  });

  const externalIds = processedRecords.map(r => r.external_id);
  const uniqueCheck = validateUniqueExternalIds(externalIds);

  if (!uniqueCheck.isValid) {
    const duplicateList = uniqueCheck.duplicates.join(', ');
    throw new Error(
      `КРИТИЧНА ГРЕШКА: Eksterni identifikatori moraju biti jedinstveni!\n` +
      `Duplirani ID-evi: ${duplicateList}\n\n` +
      `Ovo je obično uzrokovano sa:\n` +
      `1. Istim sequence_number vrednostima\n` +
      `2. Prazan external_id i nedostajući sequence_number\n\n` +
      `Molimo proverite podatke pre eksporta.`
    );
  }

  const buildCommitmentXML = (rec: Record): string => {
    const seqAttr = (rec.sequence_number !== undefined && rec.sequence_number !== null)
      ? ` sequence_number="${rec.sequence_number}"`
      : '';

    return [
      `  <commitment${seqAttr}`,
      ` reason_code="${escapeXML(rec.reason_code)}"`,
      ` external_id="${escapeXML(rec.external_id)}"`,
      ` recipient="${escapeXML(rec.recipient)}"`,
      ` recipient_place="${escapeXML(rec.recipient_place)}"`,
      ` account_number="${escapeXML(rec.account_number)}"`,
      ` invoice_number="${escapeXML(rec.invoice_number)}"`,
      ` invoice_type="${escapeXML(rec.invoice_type)}"`,
      ` invoice_date="${escapeXML(rec.invoice_date)}"`,
      ` due_date="${escapeXML(rec.due_date)}"`,
      ` contract_number="${escapeXML(rec.contract_number)}"`,
      ` payment_code="${escapeXML(rec.payment_code)}"`,
      ` credit_model="${escapeXML(rec.credit_model)}"`,
      ` credit_reference_number="${escapeXML(rec.credit_reference_number)}"`,
      ` payment_basis="${escapeXML(rec.payment_basis)}">`,
      '    <item>',
      `      <budget_user_id>${escapeXML(rec.item.budget_user_id)}</budget_user_id>`,
      `      <program_code>${escapeXML(rec.item.program_code)}</program_code>`,
      `      <project_code>${escapeXML(rec.item.project_code)}</project_code>`,
      `      <economic_classification_code>${escapeXML(rec.item.economic_classification_code)}</economic_classification_code>`,
      `      <source_of_funding_code>${escapeXML(rec.item.source_of_funding_code)}</source_of_funding_code>`,
      `      <function_code>${escapeXML(rec.item.function_code)}</function_code>`,
      `      <amount>${rec.item.amount}</amount>`,
      `      <recording_account>${escapeXML(rec.item.recording_account)}</recording_account>`,
      `      <expected_payment_date>${escapeXML(rec.item.expected_payment_date)}</expected_payment_date>`,
      `      <urgent_payment>${rec.item.urgent_payment ? 'true' : 'false'}</urgent_payment>`,
      `      <posting_account>${escapeXML(rec.item.posting_account)}</posting_account>`,
      '    </item>',
      '  </commitment>'
    ].join('\n');
  };

  const headerXML = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<commitments cumulative_reason_code="${escapeXML(header.cumulative_reason_code)}"`,
    ` budget_year="${escapeXML(header.budget_year)}"`,
    ` budget_user_id="${escapeXML(header.budget_user_id)}"`,
    ` currency_code="${escapeXML(header.currency_code)}"`,
    ` treasury="${escapeXML(header.treasury)}">`
  ].join('\n');

  const commitmentsXML = processedRecords.map(buildCommitmentXML).join('\n');

  return [headerXML, commitmentsXML, '</commitments>'].join('\n');
};

export const downloadXML = (xml: string, filename: string = 'commitments.xml') => {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};