import { supabase } from './supabase';
import { Header, Record } from '../types/records';

export interface DatabaseRecord {
  id: string;
  user_id: string;
  header_id: string | null;
  sequence_number?: number;
  version: number;
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
  created_at: string;
  updated_at: string;
  record_items?: DatabaseRecordItem[];
}

export interface DatabaseRecordItem {
  id: string;
  record_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface DatabaseHeader {
  id: string;
  user_id: string;
  cumulative_reason_code: string;
  budget_year: string;
  budget_user_id: string;
  currency_code: string;
  treasury: string;
  created_at: string;
  updated_at: string;
}

function mapDbRecordToRecord(dbRecord: DatabaseRecord): Record {
  return {
    id: dbRecord.id,
    sequence_number: dbRecord.sequence_number,
    reason_code: dbRecord.reason_code,
    external_id: dbRecord.external_id,
    recipient: dbRecord.recipient,
    recipient_place: dbRecord.recipient_place,
    account_number: dbRecord.account_number,
    invoice_number: dbRecord.invoice_number,
    invoice_type: dbRecord.invoice_type,
    invoice_date: dbRecord.invoice_date,
    due_date: dbRecord.due_date,
    contract_number: dbRecord.contract_number,
    payment_code: dbRecord.payment_code,
    credit_model: dbRecord.credit_model,
    credit_reference_number: dbRecord.credit_reference_number,
    payment_basis: dbRecord.payment_basis,
    notes: dbRecord.notes || '',
    class_group: dbRecord.class_group || '',
    item: dbRecord.record_items?.[0] ? {
      budget_user_id: dbRecord.record_items[0].budget_user_id,
      program_code: dbRecord.record_items[0].program_code,
      project_code: dbRecord.record_items[0].project_code,
      economic_classification_code: dbRecord.record_items[0].economic_classification_code,
      source_of_funding_code: dbRecord.record_items[0].source_of_funding_code,
      function_code: dbRecord.record_items[0].function_code,
      amount: parseFloat(String(dbRecord.record_items[0].amount)) || 0,
      recording_account: dbRecord.record_items[0].recording_account,
      expected_payment_date: dbRecord.record_items[0].expected_payment_date,
      urgent_payment: dbRecord.record_items[0].urgent_payment,
      posting_account: dbRecord.record_items[0].posting_account
    } : {
      budget_user_id: '',
      program_code: '',
      project_code: '',
      economic_classification_code: '',
      source_of_funding_code: '',
      function_code: '',
      amount: 0,
      recording_account: '',
      expected_payment_date: '',
      urgent_payment: false,
      posting_account: ''
    }
  };
}

export async function saveHeaderToDatabase(userId: string, header: Header): Promise<string> {
  const { data, error } = await supabase
    .from('headers')
    .upsert({
      user_id: userId,
      cumulative_reason_code: header.cumulative_reason_code,
      budget_year: header.budget_year,
      budget_user_id: header.budget_user_id,
      currency_code: header.currency_code,
      treasury: header.treasury,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function getHeaderFromDatabase(userId: string): Promise<Header | null> {
  const { data, error } = await supabase
    .from('headers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    cumulative_reason_code: data.cumulative_reason_code,
    budget_year: data.budget_year,
    budget_user_id: data.budget_user_id,
    currency_code: data.currency_code,
    treasury: data.treasury
  };
}

export async function saveRecordToDatabase(
  userId: string,
  record: Record,
  headerId: string | null
): Promise<string> {
  const { data: recordData, error: recordError } = await supabase
    .from('records')
    .insert({
      id: record.id,
      user_id: userId,
      header_id: headerId,
      sequence_number: record.sequence_number,
      reason_code: record.reason_code,
      external_id: record.external_id,
      recipient: record.recipient,
      recipient_place: record.recipient_place,
      account_number: record.account_number,
      invoice_number: record.invoice_number,
      invoice_type: record.invoice_type,
      invoice_date: record.invoice_date,
      due_date: record.due_date,
      contract_number: record.contract_number,
      payment_code: record.payment_code,
      credit_model: record.credit_model,
      credit_reference_number: record.credit_reference_number,
      payment_basis: record.payment_basis,
      notes: record.notes,
      class_group: record.class_group
    })
    .select()
    .single();

  if (recordError) throw recordError;

  const { error: itemError } = await supabase
    .from('record_items')
    .insert({
      record_id: recordData.id,
      budget_user_id: record.item.budget_user_id,
      program_code: record.item.program_code,
      project_code: record.item.project_code,
      economic_classification_code: record.item.economic_classification_code,
      source_of_funding_code: record.item.source_of_funding_code,
      function_code: record.item.function_code,
      amount: record.item.amount,
      recording_account: record.item.recording_account,
      expected_payment_date: record.item.expected_payment_date,
      urgent_payment: record.item.urgent_payment,
      posting_account: record.item.posting_account
    });

  if (itemError) throw itemError;
  return recordData.id;
}

export async function getRecordsFromDatabase(userId: string): Promise<Record[]> {
  const { data: recordsData, error: recordsError } = await supabase
    .from('records')
    .select(`*, record_items (*)`)
    .eq('user_id', userId)
    .order('sequence_number', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (recordsError) throw recordsError;
  if (!recordsData || recordsData.length === 0) return [];

  const hasAnyItems = recordsData.some(
    (r: any) => r.record_items && r.record_items.length > 0
  );

  if (hasAnyItems) {
    return recordsData.map(mapDbRecordToRecord);
  }

  const recordIds = recordsData.map((r: any) => r.id);
  const { data: itemsData, error: itemsError } = await supabase
    .from('record_items')
    .select('*')
    .in('record_id', recordIds);

  if (itemsError) throw itemsError;

  const itemsByRecordId = new Map<string, any>();
  if (itemsData) {
    for (const item of itemsData) {
      itemsByRecordId.set(item.record_id, item);
    }
  }

  const combined = recordsData.map((r: any) => ({
    ...r,
    record_items: itemsByRecordId.has(r.id) ? [itemsByRecordId.get(r.id)] : []
  }));

  return combined.map(mapDbRecordToRecord);
}

export async function updateRecordInDatabase(recordId: string, record: Record): Promise<void> {
  const { error: recordError } = await supabase
    .from('records')
    .update({
      sequence_number: record.sequence_number,
      reason_code: record.reason_code,
      external_id: record.external_id,
      recipient: record.recipient,
      recipient_place: record.recipient_place,
      account_number: record.account_number,
      invoice_number: record.invoice_number,
      invoice_type: record.invoice_type,
      invoice_date: record.invoice_date,
      due_date: record.due_date,
      contract_number: record.contract_number,
      payment_code: record.payment_code,
      credit_model: record.credit_model,
      credit_reference_number: record.credit_reference_number,
      payment_basis: record.payment_basis,
      notes: record.notes,
      class_group: record.class_group,
      updated_at: new Date().toISOString()
    })
    .eq('id', recordId);

  if (recordError) throw recordError;

  // Uklonjen restriktivni if uslov — sada se item uvijek ažurira ispravno, uključujući i nulte iznose
  const { error: itemError } = await supabase
    .from('record_items')
    .update({
      budget_user_id: record.item.budget_user_id,
      program_code: record.item.program_code,
      project_code: record.item.project_code,
      economic_classification_code: record.item.economic_classification_code,
      source_of_funding_code: record.item.source_of_funding_code,
      function_code: record.item.function_code,
      amount: record.item.amount,
      recording_account: record.item.recording_account,
      expected_payment_date: record.item.expected_payment_date,
      urgent_payment: record.item.urgent_payment,
      posting_account: record.item.posting_account,
      updated_at: new Date().toISOString()
    })
    .eq('record_id', recordId);

  if (itemError) throw itemError;
}

export async function upsertRecordsBatch(
  userId: string,
  headerId: string | null,
  records: Record[]
): Promise<void> {
  if (records.length === 0) return;

  const now = new Date().toISOString();

  const recordRows = records.map(r => ({
    id: r.id,
    user_id: userId,
    header_id: headerId,
    sequence_number: r.sequence_number ?? null,
    reason_code: r.reason_code,
    external_id: r.external_id,
    recipient: r.recipient,
    recipient_place: r.recipient_place,
    account_number: r.account_number,
    invoice_number: r.invoice_number,
    invoice_type: r.invoice_type,
    invoice_date: r.invoice_date,
    due_date: r.due_date,
    contract_number: r.contract_number,
    payment_code: r.payment_code,
    credit_model: r.credit_model,
    credit_reference_number: r.credit_reference_number,
    payment_basis: r.payment_basis,
    notes: r.notes,
    class_group: r.class_group,
    updated_at: now,
  }));

  const { error: recErr } = await supabase
    .from('records')
    .upsert(recordRows, { onConflict: 'id', ignoreDuplicates: false });

  if (recErr) throw recErr;

  // Uklonjen restriktivni filter — svi validni itemi se sinhronizuju bez preskakanja
  const itemRows = records.map(r => ({
    record_id: r.id,
    budget_user_id: r.item.budget_user_id,
    program_code: r.item.program_code,
    project_code: r.item.project_code,
    economic_classification_code: r.item.economic_classification_code,
    source_of_funding_code: r.item.source_of_funding_code,
    function_code: r.item.function_code,
    amount: r.item.amount,
    recording_account: r.item.recording_account,
    expected_payment_date: r.item.expected_payment_date,
    urgent_payment: r.item.urgent_payment,
    posting_account: r.item.posting_account,
    updated_at: now,
  }));

  if (itemRows.length > 0) {
    const { error: itemErr } = await supabase
      .from('record_items')
      .upsert(itemRows, { onConflict: 'record_id', ignoreDuplicates: false });

    if (itemErr) throw itemErr;
  }
}

export interface Snapshot {
  id: string;
  label: string;
  trigger: string;
  record_count: number;
  created_at: string;
}

export interface SnapshotFull extends Snapshot {
  records_json: Record[];
  header_json: Header;
}

export async function saveSnapshot(
  userId: string,
  label: string,
  trigger: 'import' | 'manual' | 'auto',
  records: Record[],
  header: Header
): Promise<void> {
  const { error } = await supabase.from('record_snapshots').insert({
    user_id: userId,
    label,
    trigger,
    records_json: records,
    header_json: header,
    record_count: records.length,
  });
  if (error) throw error;
}

export async function getSnapshots(userId: string): Promise<Snapshot[]> {
  const { data, error } = await supabase
    .from('record_snapshots')
    .select('id, label, trigger, record_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSnapshotById(id: string): Promise<SnapshotFull | null> {
  const { data, error } = await supabase
    .from('record_snapshots')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    label: data.label,
    trigger: data.trigger,
    record_count: data.record_count,
    created_at: data.created_at,
    records_json: data.records_json,
    header_json: data.header_json,
  };
}

export async function deleteSnapshot(id: string): Promise<void> {
  const { error } = await supabase.from('record_snapshots').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteRecordFromDatabase(recordId: string): Promise<void> {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId);

  if (error) throw error;
}

export async function deleteAllUserRecords(userId: string): Promise<void> {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export async function clearAllUserData(userId: string): Promise<void> {
  await deleteAllUserRecords(userId);

  const { error: headersError } = await supabase
    .from('headers')
    .delete()
    .eq('user_id', userId);

  if (headersError) throw headersError;
}

export type RealtimeCallback = (records: Record[]) => void;

export function subscribeToUserRecords(
  userId: string,
  onChange: RealtimeCallback
) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const handleChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const updated = await getRecordsFromDatabase(userId);
      onChange(updated);
    }, 1500);
  };

  const channel = supabase
    .channel(`records:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${userId}` },
      handleChange
    )
    .subscribe();

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    supabase.removeChannel(channel);
  };
}

export function subscribeToUserHeader(
  userId: string,
  onChange: (header: Header | null) => void
) {
  const channel = supabase
    .channel(`headers:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'headers',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        const updated = await getHeaderFromDatabase(userId);
        onChange(updated);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}