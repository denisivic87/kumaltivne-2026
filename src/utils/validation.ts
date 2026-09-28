import { Record, Header, ValidationError } from '../types/records';

export const validateHeader = (header: Header): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!header.cumulative_reason_code.trim()) {
    errors.push({ field: 'cumulative_reason_code', message: 'Cumulative reason code is required' });
  }

  if (!header.budget_year.trim()) {
    errors.push({ field: 'budget_year', message: 'Budget year is required' });
  }

  if (!header.budget_user_id.trim()) {
    errors.push({ field: 'budget_user_id', message: 'Budget user ID is required' });
  }

  if (!header.currency_code.trim()) {
    errors.push({ field: 'currency_code', message: 'Currency code is required' });
  }

  if (!header.treasury.trim()) {
    errors.push({ field: 'treasury', message: 'Treasury is required' });
  }

  return errors;
};

export const validateRecord = (record: Record, index: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  const prefix = `record_${index}`;

  // Record fields
  if (!record.reason_code.trim()) {
    errors.push({ field: `${prefix}_reason_code`, message: `Row ${index + 1}: Reason code is required` });
  }

  if (!record.recipient.trim()) {
    errors.push({ field: `${prefix}_recipient`, message: `Row ${index + 1}: Recipient is required` });
  }

  if (!record.recipient_place.trim()) {
    errors.push({ field: `${prefix}_recipient_place`, message: `Row ${index + 1}: Recipient place is required` });
  }

  if (!record.account_number.trim()) {
    errors.push({ field: `${prefix}_account_number`, message: `Row ${index + 1}: Account number is required` });
  }

  if (!record.invoice_date.trim()) {
    errors.push({ field: `${prefix}_invoice_date`, message: `Row ${index + 1}: Invoice date is required` });
  }

  if (!record.due_date.trim()) {
    errors.push({ field: `${prefix}_due_date`, message: `Row ${index + 1}: Due date is required` });
  }

  // Item fields
  if (!record.item.budget_user_id.trim()) {
    errors.push({ field: `${prefix}_item_budget_user_id`, message: `Row ${index + 1}: Item budget user ID is required` });
  }

  if (!record.item.program_code.trim()) {
    errors.push({ field: `${prefix}_item_program_code`, message: `Row ${index + 1}: Item program code is required` });
  }

  if (!record.item.economic_classification_code.trim()) {
    errors.push({ field: `${prefix}_item_economic_classification_code`, message: `Row ${index + 1}: Item economic classification code is required` });
  }

  if (!record.item.source_of_funding_code.trim()) {
    errors.push({ field: `${prefix}_item_source_of_funding_code`, message: `Row ${index + 1}: Item source of funding code is required` });
  }

  if (!record.item.function_code.trim()) {
    errors.push({ field: `${prefix}_item_function_code`, message: `Row ${index + 1}: Item function code is required` });
  }

  if (record.item.amount <= 0) {
    errors.push({ field: `${prefix}_item_amount`, message: `Row ${index + 1}: Item amount must be greater than 0` });
  }

  if (!record.item.recording_account.trim()) {
    errors.push({ field: `${prefix}_item_recording_account`, message: `Row ${index + 1}: Item recording account is required` });
  }

  if (!record.item.expected_payment_date.trim()) {
    errors.push({ field: `${prefix}_item_expected_payment_date`, message: `Row ${index + 1}: Item expected payment date is required` });
  }

  return errors;
};

export const validateAll = (header: Header, records: Record[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate header
  errors.push(...validateHeader(header));

  // Validate records
  if (records.length === 0) {
    errors.push({ field: 'records', message: 'Potreban je najmanje jedan zapis' });
  } else {
    records.forEach((record, index) => {
      errors.push(...validateRecord(record, index));
    });
  }

  return errors;
};