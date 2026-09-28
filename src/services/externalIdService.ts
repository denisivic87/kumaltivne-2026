import { supabase } from '../lib/supabase';

export interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  errors: {
    missingNumbers: number[];
    duplicates: number[];
    invalidFormats: Array<{ recordId: string; externalId: string }>;
  };
}

function currentMonthYear(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${mm}/${yyyy}`;
}

export async function restartExternalIds(userId: string): Promise<number> {
  const { data: recordsData, error: fetchError } = await supabase
    .from('records')
    .select('id')
    .eq('user_id', userId)
    .order('sequence_number', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (fetchError) throw fetchError;
  if (!recordsData || recordsData.length === 0) {
    throw new Error('Nema zapisa za obradu');
  }

  const monthYear = currentMonthYear();
  const updates = recordsData.map((record, index) => ({
    id: record.id,
    external_id: `${String(index + 1).padStart(4, '0')}-${monthYear}`,
    updated_at: new Date().toISOString()
  }));

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('records')
      .update({
        external_id: update.external_id,
        updated_at: update.updated_at
      })
      .eq('id', update.id);

    if (updateError) throw updateError;
  }

  return recordsData.length;
}

export async function validateExternalIds(userId: string): Promise<ValidationResult> {
  const { data: recordsData, error: fetchError } = await supabase
    .from('records')
    .select('id, external_id')
    .eq('user_id', userId)
    .order('sequence_number', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (fetchError) throw fetchError;
  if (!recordsData || recordsData.length === 0) {
    return {
      isValid: true,
      totalRecords: 0,
      errors: {
        missingNumbers: [],
        duplicates: [],
        invalidFormats: []
      }
    };
  }

  const totalRecords = recordsData.length;
  const missingNumbers: number[] = [];
  const duplicates: number[] = [];
  const invalidFormats: Array<{ recordId: string; externalId: string }> = [];
  const seenNumbers = new Map<number, number>();

  const monthYear = currentMonthYear();
  const expectedPattern = new RegExp(`^(\\d+)-${monthYear.replace('/', '\\/')}$`);

  recordsData.forEach(record => {
    const externalId = record.external_id;

    if (!externalId || !expectedPattern.test(externalId)) {
      invalidFormats.push({
        recordId: record.id,
        externalId: externalId || 'PRAZNO'
      });
      return;
    }

    const match = externalId.match(expectedPattern);
    if (match) {
      const number = parseInt(match[1], 10);
      const count = seenNumbers.get(number) || 0;
      seenNumbers.set(number, count + 1);
    }
  });

  for (let i = 1; i <= totalRecords; i++) {
    const count = seenNumbers.get(i) || 0;
    if (count === 0) {
      missingNumbers.push(i);
    } else if (count > 1) {
      duplicates.push(i);
    }
  }

  const isValid =
    missingNumbers.length === 0 &&
    duplicates.length === 0 &&
    invalidFormats.length === 0;

  return {
    isValid,
    totalRecords,
    errors: {
      missingNumbers,
      duplicates,
      invalidFormats
    }
  };
}
