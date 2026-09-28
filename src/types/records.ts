export interface RecordItem {
  budget_user_id: string;
  program_code: string;
  project_code: string;
  economic_classification_code: string;
  source_of_funding_code: string;
  function_code: string;
  amount: number;
  recording_account: string;
  expected_payment_date: string;
  urgent_payment: boolean;
  posting_account: string;
}

export interface Record {
  id: string;
  sequence_number?: number;
  reason_code: string;
  external_id: string;
  recipient: string;
  recipient_place: string;
  account_number: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  contract_number: string;
  payment_code: string;
  credit_model: string;
  credit_reference_number: string;
  payment_basis: string;
  notes: string;
  class_group: string;
  item: RecordItem;
}

export interface Header {
  cumulative_reason_code: string;
  budget_year: string;
  budget_user_id: string;
  currency_code: string;
  treasury: string;
}

export interface ValidationError {
  field: string;
  message: string;
}