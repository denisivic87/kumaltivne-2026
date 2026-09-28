import { Header, Record } from '../types/records';

const STORAGE_KEYS = {
  HEADER: 'finance_xml_header',
  RECORDS: 'finance_xml_records',
  PREFILL: 'finance_xml_prefill',
};

export const saveHeader = (header: Header, userId?: string): void => {
  const key = userId ? `${STORAGE_KEYS.HEADER}_${userId}` : STORAGE_KEYS.HEADER;
  try {
    localStorage.setItem(key, JSON.stringify(header));
  } catch (error) {
    console.error('Error saving header to localStorage:', error);
  }
};

export const loadHeader = (userId?: string): Header => {
  const key = userId ? `${STORAGE_KEYS.HEADER}_${userId}` : STORAGE_KEYS.HEADER;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading header from localStorage:', error);
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
  const key = userId ? `${STORAGE_KEYS.RECORDS}_${userId}` : STORAGE_KEYS.RECORDS;
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving records to localStorage:', error);
  }
};

export const loadRecords = (userId?: string): Record[] => {
  const key = userId ? `${STORAGE_KEYS.RECORDS}_${userId}` : STORAGE_KEYS.RECORDS;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading records from localStorage:', error);
  }
  return [];
};

export const loadPrefillEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFILL);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading prefill setting:', error);
  }
  return true;
};

export const savePrefillEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PREFILL, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving prefill setting:', error);
  }
};

export const clearAllData = (userId?: string): void => {
  try {
    if (userId) {
      localStorage.removeItem(`${STORAGE_KEYS.HEADER}_${userId}`);
      localStorage.removeItem(`${STORAGE_KEYS.RECORDS}_${userId}`);
    }
    // General fallback ključevi
    localStorage.removeItem(STORAGE_KEYS.HEADER);
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
  } catch (error) {
    console.error('Error clearing data from localStorage:', error);
  }
};