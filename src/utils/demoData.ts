import { Record, Header } from '../types/records';

const recipients = [
  'Ljubinka Nestorović', 'Milan Stanković', 'Gordana Petrović', 'Zoran Marković', 'Vesna Jovanović',
  'Predrag Nikolić', 'Snežana Stojanović', 'Dragan Ilić', 'Mirjana Pavlović', 'Slobodan Đorđević',
  'Tatjana Simić', 'Branko Milić', 'Jelena Radosavljević', 'Miroslav Antić', 'Danica Popović',
  'Radosav Knežević', 'Biljana Zorić', 'Tomislav Vidić', 'Nada Lukić', 'Sava Marinković',
  'Milica Tasić', 'Radomir Janković', 'Slavica Gajić', 'Miodrag Vuković', 'Verica Ristić',
  'Živorad Mićović', 'Ljiljana Bošković', 'Novak Drašković', 'Smiljana Trifunović', 'Milenko Obradović',
];

const places = ['Beograd', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin', 'Pančevo', 'Čačak', 'Kraljevo', 'Leskovac', 'Šabac'];
const programs = ['2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010'];
const economicCodes = ['472717', '472718', '472719', '421221', '421222', '421223', '451111', '451112'];
const reasonCodes = ['PO07', 'PO08', 'PO09', 'PO10'];
const invoiceTypes = ['Račun', 'Predračun', 'Avansni račun'];
const accountPrefixes = ['160', '170', '180', '190', '200', '210'];
const fundingSources = ['1', '2', '3'];
const functionCodes = ['301', '302', '303', '401', '402'];

function randomDate(year: number, monthMin: number, monthMax: number): string {
  const month = Math.floor(Math.random() * (monthMax - monthMin + 1)) + monthMin;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomAmount(): number {
  const tiers = [5000, 10000, 15000, 25000, 50000, 75000, 100000, 150000, 200000, 300000];
  const base = tiers[Math.floor(Math.random() * tiers.length)];
  const variance = Math.floor(Math.random() * 5000);
  return base + variance;
}

export function generateDemoRecords(count: number = 55): { records: Record[]; header: Header } {
  const year = 2026;
  const header: Header = {
    cumulative_reason_code: 'P001',
    budget_year: year.toString(),
    budget_user_id: '01547',
    currency_code: 'RSD',
    treasury: '601',
  };

  const records: Record[] = [];

  for (let i = 0; i < count; i++) {
    const recipient = recipients[i % recipients.length];
    const place = places[Math.floor(Math.random() * places.length)];
    const program = programs[Math.floor(Math.random() * programs.length)];
    const econCode = economicCodes[Math.floor(Math.random() * economicCodes.length)];
    const reasonCode = reasonCodes[Math.floor(Math.random() * reasonCodes.length)];
    const invoiceDate = randomDate(year, 1, 9);
    const dueDate = randomDate(year, 1, 12);
    const amount = randomAmount();
    const urgent = Math.random() < 0.12;
    const zeroAmount = Math.random() < 0.05;
    const hasError = Math.random() < 0.06;

    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    const yyyy = new Date().getFullYear();
    const externalId = `${String(i + 1).padStart(4, '0')}-${mm}/${yyyy}`;

    records.push({
      id: crypto.randomUUID(),
      sequence_number: i + 1,
      reason_code: hasError ? '' : reasonCode,
      external_id: externalId,
      recipient: hasError ? '' : recipient,
      recipient_place: place,
      account_number: `${accountPrefixes[Math.floor(Math.random() * accountPrefixes.length)]}-${String(Math.floor(Math.random() * 900000) + 100000)}`,
      invoice_number: `${String(i + 1).padStart(4, '0')}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/${year}`,
      invoice_type: invoiceTypes[Math.floor(Math.random() * invoiceTypes.length)],
      invoice_date: invoiceDate,
      due_date: dueDate,
      contract_number: `${year}-${String(Math.floor(Math.random() * 999) + 100)}`,
      payment_code: String(Math.floor(Math.random() * 900) + 100),
      credit_model: Math.random() < 0.3 ? '97' : '',
      credit_reference_number: Math.random() < 0.3 ? `${String(Math.floor(Math.random() * 9000000) + 1000000)}` : '',
      payment_basis: `Osnov plaćanja ${i + 1}`,
      notes: Math.random() < 0.2 ? `Beleška za zapis ${i + 1}` : '',
      class_group: Math.random() < 0.4 ? `Razred ${Math.floor(Math.random() * 5) + 1}` : '',
      item: {
        budget_user_id: '01547',
        program_code: program,
        project_code: Math.random() < 0.3 ? `${year}${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}` : '',
        economic_classification_code: econCode,
        source_of_funding_code: fundingSources[Math.floor(Math.random() * fundingSources.length)],
        function_code: functionCodes[Math.floor(Math.random() * functionCodes.length)],
        amount: zeroAmount ? 0 : amount,
        recording_account: `${String(Math.floor(Math.random() * 900) + 100)}`,
        expected_payment_date: randomDate(year, 1, 12),
        urgent_payment: urgent,
        posting_account: `${String(Math.floor(Math.random() * 900) + 100)}`,
      },
    });
  }

  return { records, header };
}
