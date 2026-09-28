# XML Generator - Brzi Vodič za Developere

## 🎯 Korišćenje

### **1. Osnovni XML Export**
```typescript
import { generateXML, downloadXML } from './utils/xmlGenerator';

// Generiši XML sa automatskom sanitizacijom
const xml = generateXML(header, records);

// Preuzmi XML fajl
downloadXML(xml, 'commitments_2026-03-24.xml');
```

### **2. Pre-Export Validacija**
```typescript
import { validateUniqueExternalIds } from './utils/dataSanitizer';

// Proveri da li ima duplikata PRE generisanja
const externalIds = records.map(r => r.external_id);
const check = validateUniqueExternalIds(externalIds);

if (!check.isValid) {
  alert(`GREŠKA: Duplirani ID-evi: ${check.duplicates.join(', ')}`);
  return;
}

// Nastavi sa XML generisanjem
const xml = generateXML(header, records);
```

---

## 📋 Dostupne Funkcije

### **dataSanitizer.ts**

#### `sanitizeInvoiceNumber(invoiceNumber: string): string`
Čisti format invoice_number polja.

**Primeri:**
```typescript
sanitizeInvoiceNumber("110/2026")  // → "110-26"
sanitizeInvoiceNumber("110/26")    // → "110-26"
sanitizeInvoiceNumber("110")       // → "110"
```

---

#### `sanitizeExternalId(userExternalId, sequenceNumber, fallbackIndex): string`
Generiše ili validira external_id.

**Prioriteti:**
1. Ako korisnik uneo ID → koristi ga
2. Ako postoji `sequence_number` → koristi ga
3. Inače → koristi `fallbackIndex + 1`

**Primeri:**
```typescript
sanitizeExternalId("ABC-123", 130, 0)  // → "ABC-123" (user input)
sanitizeExternalId("", 130, 0)         // → "130" (sequence)
sanitizeExternalId("", null, 5)        // → "6" (fallback)
```

---

#### `validateUniqueExternalIds(externalIds: string[]): { isValid, duplicates }`
Validira jedinstvene external_id vrednosti.

**Primer:**
```typescript
const ids = ["130", "140", "130", "150"];
const result = validateUniqueExternalIds(ids);

console.log(result.isValid);     // false
console.log(result.duplicates);  // ["130"]
```

---

#### `sanitizeString(value: string, defaultValue = ''): string`
Trim i normalizacija string polja.

**Primeri:**
```typescript
sanitizeString("  test  ")    // → "test"
sanitizeString("")            // → ""
sanitizeString(null, "N/A")   // → "N/A"
```

---

## ⚠️ VAŽNA PRAVILA

### **❌ NIKADA Nemojte:**
```typescript
// ❌ BAD: Mutiranje external_id
record.external_id = record.sequence_number + '-' + record.invoice_number;

// ❌ BAD: Direktno formatiranje bez sanitizacije
const xml = `<invoice_number>${record.invoice_number}</invoice_number>`;

// ❌ BAD: Korišćenje globalnih varijabli u petljama
let externalId = '';
records.forEach(r => {
  externalId = r.sequence_number; // Isti ID za sve!
});
```

### **✅ UVEK Uradite:**
```typescript
// ✅ GOOD: Koristite sanitizer funkcije
const cleanId = sanitizeExternalId(record.external_id, record.sequence_number, index);

// ✅ GOOD: Pure functions sa spread operator
const processedRecord = {
  ...record,
  external_id: cleanId,
  invoice_number: sanitizeInvoiceNumber(record.invoice_number)
};

// ✅ GOOD: Validacija pre export-a
const check = validateUniqueExternalIds(ids);
if (!check.isValid) throw new Error("Duplikati!");
```

---

## 🐛 Debugging

### **Problem: Duplirani external_id**
```typescript
// 1. Proveri da li sequence_number ima duplikate
const sequences = records.map(r => r.sequence_number);
console.log(new Set(sequences).size !== sequences.length);

// 2. Proveri da li ima null vrednosti
const nullSeq = records.filter(r => !r.sequence_number);
console.log("Null sequence_number:", nullSeq.length);

// 3. Koristi validaciju
const ids = records.map(r => r.external_id);
const check = validateUniqueExternalIds(ids);
console.log("Duplikati:", check.duplicates);
```

### **Problem: Loš format invoice_number**
```typescript
// Pre sanitizacije
console.log("Pre:", record.invoice_number);  // "110/2026"

// Posle sanitizacije
const clean = sanitizeInvoiceNumber(record.invoice_number);
console.log("Posle:", clean);  // "110-26"
```

---

## 🔧 Kako Dodati Novo Polje u XML

### **Korak 1: Dodaj u Type**
```typescript
// src/types/records.ts
export interface Record {
  // ... existing fields
  new_field: string;  // ← Dodaj ovde
}
```

### **Korak 2: Dodaj Sanitizaciju (ako je potrebno)**
```typescript
// src/utils/dataSanitizer.ts
export const sanitizeNewField = (value: string): string => {
  // Tvoja logika
  return value.trim().toUpperCase();
};
```

### **Korak 3: Dodaj u XML Generator**
```typescript
// src/utils/xmlGenerator.ts
const processedRecords = records.map((record, index) => ({
  ...record,
  new_field: sanitizeNewField(record.new_field)  // ← Dodaj ovde
}));

const buildCommitmentXML = (rec: Record): string => {
  return [
    // ...
    ` new_field="${escapeXML(rec.new_field)}"`,  // ← Dodaj ovde
    // ...
  ].join('\n');
};
```

---

## 📚 Reference

- **XML Generator:** `src/utils/xmlGenerator.ts`
- **Sanitizacija:** `src/utils/dataSanitizer.ts`
- **Validacija:** `src/utils/validation.ts`
- **Tehnički Izvještaj:** `XML_GENERATOR_REFACTORING_REPORT.md`

---

**Last Updated:** 2026-03-24
**Version:** 2.0 (Refactored)
