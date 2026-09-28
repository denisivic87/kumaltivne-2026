import { Header, Record } from '../types/records';

const PREFILL_KEY = 'xml_records_prefill_enabled';

function headerKey(userId: string) {
  return `xml_records_header_${userId}`;
}

function recordsKey(userId: string) {
  return `xml_records_records_${userId}`;
}

export const saveHeader = (header: Header, userId?: string): void => {
  const key = userId ? headerKey(userId) : 'xml_records_header';
  localStorage.setItem(key, JSON.stringify(header));
};

export const loadHeader = (userId?: string): Header => {
  const key = userId ? headerKey(userId) : 'xml_records_header';
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return {
    cumulative_reason_code: 'PO07',
    budget_year: new Date().getFullYear().toString(),
    budget_user_id: '',
    currency_code: 'RSD',
    treasury: ''
  };
};

export const saveRecords = (records: Record[], userId?: string): void => {
  const key = userId ? recordsKey(userId) : 'xml_records_records';
  localStorage.setItem(key, JSON.stringify(records));
};

export const loadRecords = (userId?: string): Record[] => {
  const key = userId ? recordsKey(userId) : 'xml_records_records';
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [];
};

export const savePrefillEnabled = (enabled: boolean): void => {
  localStorage.setItem(PREFILL_KEY, JSON.stringify(enabled));
};

export const loadPrefillEnabled = (): boolean => {
  const saved = localStorage.getItem(PREFILL_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return true;
};

export const clearAllData = (userId?: string): void => {
  if (userId) {
    localStorage.removeItem(headerKey(userId));
    localStorage.removeItem(recordsKey(userId));
  } else {
    localStorage.removeItem('xml_records_header');
    localStorage.removeItem('xml_records_records');
  }
};
