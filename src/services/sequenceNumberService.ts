import { supabase } from '../lib/supabase';

export interface SequenceIntegrity {
  user_id: string;
  username: string;
  total_records: number;
  min_sequence: number;
  max_sequence: number;
  expected_count: number;
  unique_sequences: number;
  status: 'HEALTHY' | 'CORRUPTED';
}

export interface SequenceCorruption {
  user_id: string;
  username: string;
  issue_type: 'Missing Sequence' | 'Duplicate Sequence';
  details: string;
  affected_count: number;
}

export interface RenumberResult {
  user_id: string;
  total_records: number;
  renumbered_count: number;
}

export class SequenceNumberService {
  static async getNextSequenceNumber(userId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('get_next_sequence_number', {
        p_user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting next sequence number:', error);
      return null;
    }
  }

  static async detectCorruption(): Promise<SequenceCorruption[]> {
    try {
      const { data, error } = await supabase.rpc('detect_sequence_corruption');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error detecting sequence corruption:', error);
      return [];
    }
  }

  static async detectUserCorruption(userId: string): Promise<SequenceCorruption[]> {
    const allCorruptions = await this.detectCorruption();
    return allCorruptions.filter(c => c.user_id === userId);
  }

  static async renumberRecords(userId?: string): Promise<RenumberResult[]> {
    try {
      const { data, error } = await supabase.rpc('renumber_all_records', {
        p_user_id: userId || null
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error renumbering records:', error);
      return [];
    }
  }

  static async checkIntegrity(): Promise<SequenceIntegrity[]> {
    try {
      const { data, error } = await supabase
        .from('v_sequence_integrity')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error checking sequence integrity:', error);
      return [];
    }
  }

  static async checkUserIntegrity(userId: string): Promise<SequenceIntegrity | null> {
    try {
      const { data, error } = await supabase
        .from('v_sequence_integrity')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking user sequence integrity:', error);
      return null;
    }
  }

  static async autoRepairIfCorrupted(userId: string): Promise<boolean> {
    const corruptions = await this.detectUserCorruption(userId);

    if (corruptions.length > 0) {
      console.warn('Sequence corruption detected, attempting auto-repair...', corruptions);
      const results = await this.renumberRecords(userId);

      if (results.length > 0) {
        console.log('Auto-repair completed:', results[0]);
        return true;
      }
    }

    return false;
  }

  static async validateSequenceOrder(
    records: Array<{ id: string; sequence_number?: number; created_at: string }>
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (records.length === 0) {
      return { isValid: true, issues: [] };
    }

    const sequenceNumbers = records
      .map(r => r.sequence_number)
      .filter((n): n is number => n !== undefined && n !== null);

    if (sequenceNumbers.length === 0) {
      issues.push('No sequence numbers found in records');
      return { isValid: false, issues };
    }

    const uniqueSequences = new Set(sequenceNumbers);
    if (uniqueSequences.size !== sequenceNumbers.length) {
      issues.push(`Duplicate sequence numbers detected (${sequenceNumbers.length} total, ${uniqueSequences.size} unique)`);
    }

    const sortedSequences = [...sequenceNumbers].sort((a, b) => a - b);
    for (let i = 0; i < sortedSequences.length - 1; i++) {
      if (sortedSequences[i + 1] - sortedSequences[i] > 1) {
        issues.push(`Gap detected between sequence ${sortedSequences[i]} and ${sortedSequences[i + 1]}`);
      }
    }

    for (let i = 0; i < records.length - 1; i++) {
      const current = records[i];
      const next = records[i + 1];

      if (
        current.sequence_number &&
        next.sequence_number &&
        current.sequence_number >= next.sequence_number
      ) {
        const currentDate = new Date(current.created_at).getTime();
        const nextDate = new Date(next.created_at).getTime();

        if (currentDate < nextDate) {
          issues.push(
            `Sequence order mismatch: Record #${current.sequence_number} is newer than #${next.sequence_number}`
          );
        }
      }
    }

    return { isValid: issues.length === 0, issues };
  }

  static getDisplayNumber(
    record: { sequence_number?: number },
    fallbackIndex?: number
  ): string {
    if (record.sequence_number !== undefined && record.sequence_number !== null) {
      return record.sequence_number.toString();
    }

    if (fallbackIndex !== undefined) {
      return `${fallbackIndex + 1}*`;
    }

    return '?';
  }
}
