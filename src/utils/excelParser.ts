import { Record, Header } from '../types/records';
import * as XLSX from 'xlsx';

export interface ParsedExcelData {
  header: Header;
  records: Record[];
}

const parseDate = (d: string): string => {
  if (!d) return '';
  const trimmed = d.trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD.MM.YYYY or DD.MM.YYYY.
  const stripped = trimmed.replace(/\.$/, '');
  const parts = stripped.split('.');
  if (parts.length === 3 && parts[2].length === 4) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed;
};

const toText = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

// Column order must match the export layout in App.tsx handleExportExcel
const DATA_COLUMNS = [
  '#', 'Kod razloga', 'Spoljašnji ID', 'Primalac', 'Mesto primaoca',
  'Broj računa', 'Broj fakture', 'Tip fakture', 'Datum fakture', 'Datum dospeća',
  'Broj ugovora', 'Kod plaćanja', 'Model kredita', 'Ref. broj kredita', 'Osnov plaćanja',
  'ID kor. budžeta', 'Kod programa', 'Kod projekta', 'Ekon. klas.', 'Izvor finans.',
  'Kod funkcije', 'Iznos', 'Račun evidentiranja', 'Oček. datum plać.', 'Hitno', 'Račun knjiženja', 'Razred',
];

const HEADER_LABELS: { [key: string]: keyof Header } = {
  'Kumulativni kod razloga': 'cumulative_reason_code',
  'Budžetska godina': 'budget_year',
  'ID korisnika budžeta': 'budget_user_id',
  'ID kor. budžeta': 'budget_user_id',
  'Kod valute': 'currency_code',
  'Trezor': 'treasury',
};

const parseFromWorkbook = (wb: XLSX.WorkBook): ParsedExcelData => {
  const header: Header = {
    cumulative_reason_code: '',
    budget_year: '',
    budget_user_id: '',
    currency_code: '',
    treasury: '',
  };

  // Try to find header sheet
  const headerSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'zaglavlje');
  if (headerSheetName) {
    const ws = wb.Sheets[headerSheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
    for (const row of rows) {
      const label = toText((row as unknown[])[0]);
      const value = toText((row as unknown[])[1]);
      const key = HEADER_LABELS[label];
      if (key) header[key] = value;
    }
  }

  // Find data sheet
  const dataSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'zapisi') || wb.SheetNames[0];
  if (!dataSheetName) {
    throw new Error('Excel fajl nema list "Zapisi" — provjerite da li je fajl izvezen iz ove aplikacije');
  }

  const dataWs = wb.Sheets[dataSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(dataWs, { header: 1, raw: true, defval: '' });
  if (rows.length < 2) {
    throw new Error('Excel fajl ne sadrži ni jedan zapis');
  }

  // First row is header — use it to map columns by name, falling back to position
  const headerRow = rows[0] as unknown[];
  const colMap: { [col: number]: number } = {};
  for (let c = 0; c < headerRow.length; c++) {
    const h = toText(headerRow[c]).toLowerCase();
    const matchIdx = DATA_COLUMNS.findIndex(dc => dc.toLowerCase() === h);
    if (matchIdx !== -1) {
      colMap[matchIdx] = c;
    } else {
      colMap[c] = c;
    }
  }

  const getCell = (row: unknown[], idx: number): string => {
    const pos = colMap[idx];
    if (pos === undefined) return '';
    return toText(row[pos]);
  };

  const records: Record[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.every(c => toText(c) === '')) continue;

    const seqStr = getCell(row, 0);
    const seqNum = seqStr ? parseInt(seqStr, 10) : undefined;

    const record: Record = {
      id: crypto.randomUUID(),
      sequence_number: isNaN(seqNum as number) ? undefined : seqNum,
      reason_code: getCell(row, 1),
      external_id: getCell(row, 2),
      recipient: getCell(row, 3),
      recipient_place: getCell(row, 4),
      account_number: getCell(row, 5),
      invoice_number: getCell(row, 6),
      invoice_type: getCell(row, 7),
      invoice_date: parseDate(getCell(row, 8)),
      due_date: parseDate(getCell(row, 9)),
      contract_number: getCell(row, 10),
      payment_code: getCell(row, 11),
      credit_model: getCell(row, 12),
      credit_reference_number: getCell(row, 13),
      payment_basis: getCell(row, 14),
      notes: '',
      class_group: getCell(row, 26),
      item: {
        budget_user_id: getCell(row, 15),
        program_code: getCell(row, 16),
        project_code: getCell(row, 17),
        economic_classification_code: getCell(row, 18),
        source_of_funding_code: getCell(row, 19),
        function_code: getCell(row, 20),
        amount: parseFloat(getCell(row, 21)) || 0,
        recording_account: getCell(row, 22),
        expected_payment_date: parseDate(getCell(row, 23)),
        urgent_payment: getCell(row, 24).toLowerCase() === 'da' || getCell(row, 24).toLowerCase() === 'true',
        posting_account: getCell(row, 25),
      },
    };

    records.push(record);
  }

  if (records.length === 0) {
    throw new Error('Excel fajl ne sadrži ni jedan zapis');
  }

  return { header, records };
};

export const parseExcel = (xmlContent: string): ParsedExcelData => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  const parserError = xmlDoc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error('Excel fajl nije validan XML format');
  }

  const worksheets = xmlDoc.getElementsByTagName('Worksheet');
  let dataSheet: Element | null = null;
  let headerSheet: Element | null = null;

  for (let i = 0; i < worksheets.length; i++) {
    const ws = worksheets[i];
    const name = ws.getAttribute('ss:Name') || ws.getAttribute('name') || '';
    if (name === 'Zapisi') dataSheet = ws;
    if (name === 'Zaglavlje') headerSheet = ws;
  }

  if (!dataSheet) {
    throw new Error('Excel fajl nema list "Zapisi" — provjerite da li je fajl izvezen iz ove aplikacije');
  }

  const header: Header = {
    cumulative_reason_code: '',
    budget_year: '',
    budget_user_id: '',
    currency_code: '',
    treasury: '',
  };

  if (headerSheet) {
    const rows = headerSheet.getElementsByTagName('Row');
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].getElementsByTagName('Cell');
      if (cells.length === 0) continue;

      const hdrMap: number[] = [];
      let hdrIdx = 0;
      for (let c = 0; c < cells.length; c++) {
        const ssIndex = cells[c].getAttribute('ss:Index');
        if (ssIndex) hdrIdx = parseInt(ssIndex, 10) - 1;
        hdrMap[hdrIdx] = c;
        hdrIdx++;
      }

      const hdrText = (idx: number): string => {
        const pos = hdrMap[idx];
        if (pos === undefined) return '';
        const dataEl = cells[pos].getElementsByTagName('Data')[0];
        return (dataEl?.textContent || '').trim();
      };

      const label = hdrText(0);
      const value = hdrText(1);
      const key = HEADER_LABELS[label];
      if (key) header[key] = value;
    }
  }

  const allRows = dataSheet.getElementsByTagName('Row');
  if (allRows.length < 2) {
    throw new Error('Excel fajl ne sadrži ni jedan zapis');
  }

  // First row is the header row — skip it
  const records: Record[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const cells = row.getElementsByTagName('Cell');
    if (cells.length < 1) continue;

    const cellIndexMap: number[] = [];
    let runningIndex = 0;
    for (let c = 0; c < cells.length; c++) {
      const ssIndex = cells[c].getAttribute('ss:Index');
      if (ssIndex) {
        runningIndex = parseInt(ssIndex, 10) - 1;
      }
      cellIndexMap[runningIndex] = c;
      runningIndex++;
    }

    const cellText = (idx: number): string => {
      const cellPos = cellIndexMap[idx];
      if (cellPos === undefined) return '';
      const dataEl = cells[cellPos].getElementsByTagName('Data')[0];
      return (dataEl?.textContent || '').trim();
    };

    const seqStr = cellText(0);
    const seqNum = seqStr ? parseInt(seqStr, 10) : undefined;

    const record: Record = {
      id: crypto.randomUUID(),
      sequence_number: isNaN(seqNum as number) ? undefined : seqNum,
      reason_code: cellText(1),
      external_id: cellText(2),
      recipient: cellText(3),
      recipient_place: cellText(4),
      account_number: cellText(5),
      invoice_number: cellText(6),
      invoice_type: cellText(7),
      invoice_date: parseDate(cellText(8)),
      due_date: parseDate(cellText(9)),
      contract_number: cellText(10),
      payment_code: cellText(11),
      credit_model: cellText(12),
      credit_reference_number: cellText(13),
      payment_basis: cellText(14),
      notes: '',
      class_group: cellText(26),
      item: {
        budget_user_id: cellText(15),
        program_code: cellText(16),
        project_code: cellText(17),
        economic_classification_code: cellText(18),
        source_of_funding_code: cellText(19),
        function_code: cellText(20),
        amount: parseFloat(cellText(21)) || 0,
        recording_account: cellText(22),
        expected_payment_date: parseDate(cellText(23)),
        urgent_payment: cellText(24).toLowerCase() === 'da' || cellText(24).toLowerCase() === 'true',
        posting_account: cellText(25),
      },
    };

    records.push(record);
  }

  if (records.length === 0) {
    throw new Error('Excel fajl ne sadrži ni jedan zapis');
  }

  return { header, records };
};

export const importExcelFile = async (file: File): Promise<ParsedExcelData> => {
  const lowerName = file.name.toLowerCase();

  // .xlsx and .xls are binary — use SheetJS
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true });
    return parseFromWorkbook(wb);
  }

  // .xml — could be SpreadsheetML 2003 or could be our export format
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content || !content.trim()) {
          reject(new Error('Fajl je prazan'));
          return;
        }

        // If it looks like SpreadsheetML 2003 (has <Workbook>), parse as XML
        if (content.includes('<Workbook') || content.includes('<?mso-application')) {
          const parsedData = parseExcel(content);
          resolve(parsedData);
          return;
        }

        // Otherwise try SheetJS (handles CSV, HTML table, etc.)
        const wb = XLSX.read(content, { type: 'string', cellDates: false, raw: true });
        resolve(parseFromWorkbook(wb));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Greška pri čitanju fajla — pokušajte ponovo'));
    };

    reader.readAsText(file, 'UTF-8');
  });
};
