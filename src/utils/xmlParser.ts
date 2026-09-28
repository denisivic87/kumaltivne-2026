import { Record, Header } from '../types/records';

export interface ParsedXMLData {
  header: Header;
  records: Record[];
}

const getChildElementText = (parent: Element, tagName: string): string => {
  // First try: direct child element search via children collection
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i].tagName === tagName || children[i].localName === tagName) {
      const text = children[i].textContent || '';
      return text.replace(/\s+/g, ' ').trim();
    }
  }

  // Fallback: getElementsByTagName (searches all descendants)
  const els = parent.getElementsByTagName(tagName);
  if (els.length > 0) {
    const text = els[0].textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  return '';
};

export const parseXML = (xmlContent: string): ParsedXMLData => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  const parserError = xmlDoc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    const errText = parserError[0].textContent || 'Nepoznata XML greška';
    throw new Error(`XML nije validan: ${errText.substring(0, 200)}`);
  }

  const commitmentsList = xmlDoc.getElementsByTagName('commitments');
  if (commitmentsList.length === 0) {
    throw new Error('XML nema element <commitments> — provjerite strukturu fajla');
  }
  const commitmentsElement = commitmentsList[0];

  const header: Header = {
    cumulative_reason_code: commitmentsElement.getAttribute('cumulative_reason_code') || '',
    budget_year: commitmentsElement.getAttribute('budget_year') || '',
    budget_user_id: commitmentsElement.getAttribute('budget_user_id') || '',
    currency_code: commitmentsElement.getAttribute('currency_code') || '',
    treasury: commitmentsElement.getAttribute('treasury') || ''
  };

  const commitmentElements = xmlDoc.getElementsByTagName('commitment');
  if (commitmentElements.length === 0) {
    throw new Error('XML ne sadrži ni jedan <commitment> element');
  }

  const records: Record[] = [];

  for (let i = 0; i < commitmentElements.length; i++) {
    const commitment = commitmentElements[i];

    // Find the <item> child element
    let itemElement: Element | null = null;
    const commitChildren = commitment.children;
    for (let j = 0; j < commitChildren.length; j++) {
      if (commitChildren[j].tagName === 'item' || commitChildren[j].localName === 'item') {
        itemElement = commitChildren[j];
        break;
      }
    }

    // Fallback: getElementsByTagName
    if (!itemElement) {
      const itemElements = commitment.getElementsByTagName('item');
      if (itemElements.length > 0) {
        itemElement = itemElements[0];
      }
    }

    if (!itemElement) {
      throw new Error(`Zapis ${i + 1} nema <item> element`);
    }

    const sequenceAttr = commitment.getAttribute('sequence_number');
    const sequenceNumber = sequenceAttr ? parseInt(sequenceAttr, 10) : undefined;

    const record: Record = {
      id: crypto.randomUUID(),
      sequence_number: isNaN(sequenceNumber as number) ? undefined : sequenceNumber,
      reason_code: commitment.getAttribute('reason_code') || '',
      external_id: commitment.getAttribute('external_id') || '',
      recipient: commitment.getAttribute('recipient') || '',
      recipient_place: commitment.getAttribute('recipient_place') || '',
      account_number: commitment.getAttribute('account_number') || '',
      invoice_number: commitment.getAttribute('invoice_number') || '',
      invoice_type: commitment.getAttribute('invoice_type') || '',
      invoice_date: commitment.getAttribute('invoice_date') || '',
      due_date: commitment.getAttribute('due_date') || '',
      contract_number: commitment.getAttribute('contract_number') || '',
      payment_code: commitment.getAttribute('payment_code') || '',
      credit_model: commitment.getAttribute('credit_model') || '',
      credit_reference_number: commitment.getAttribute('credit_reference_number') || '',
      payment_basis: commitment.getAttribute('payment_basis') || '',
      notes: '',
      class_group: '',
      item: {
        budget_user_id: getChildElementText(itemElement, 'budget_user_id'),
        program_code: getChildElementText(itemElement, 'program_code'),
        project_code: getChildElementText(itemElement, 'project_code'),
        economic_classification_code: getChildElementText(itemElement, 'economic_classification_code'),
        source_of_funding_code: getChildElementText(itemElement, 'source_of_funding_code'),
        function_code: getChildElementText(itemElement, 'function_code'),
        amount: parseFloat(getChildElementText(itemElement, 'amount')) || 0,
        recording_account: getChildElementText(itemElement, 'recording_account'),
        expected_payment_date: getChildElementText(itemElement, 'expected_payment_date'),
        urgent_payment: getChildElementText(itemElement, 'urgent_payment').toLowerCase() === 'true',
        posting_account: getChildElementText(itemElement, 'posting_account')
      }
    };

    records.push(record);
  }

  return { header, records };
};

export const importXMLFile = (file: File): Promise<ParsedXMLData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const xmlContent = event.target?.result as string;
        if (!xmlContent || !xmlContent.trim()) {
          reject(new Error('Fajl je prazan'));
          return;
        }
        const parsedData = parseXML(xmlContent);
        resolve(parsedData);
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
