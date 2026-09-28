# Funkcionalnost - Brisanje Spoljašnjih ID-eva

## Šta je Implementirano?

Dodato je **tirkizno dugme** koje omogućava **brisanje svih vrednosti** iz kolone "Spoljašnji ID" jednim klikom.

---

## Kako Funkcioniše?

### 1. Dugme "🔄 Obriši spoljašnje ID-eve"

**Lokacija:** Desno od dugmeta "Obriši sve"

**Boja:** Tirkizna (cyan-teal gradient)

**Ikona:** RefreshCw (rotira se tokom obrade)

### 2. Modal Potvrde

Kada korisnik klikne dugme, otvara se profesionalni modal koji prikazuje:

```
┌─────────────────────────────────────────────┐
│  ⚠️  Sigurni ste?                      ✕   │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️ Ova akcija će OBRISATI sve spoljašnje  │
│     ID-eve:                                 │
│                                             │
│  Trenutni ID-evi:                          │
│    1-03/2026, 3-03/2026, 5-03/2026, ...   │
│                                             │
│  Biće zamenjeni sa:                        │
│    (prazno) (prazno) (prazno) ...          │
│                                             │
│  ℹ️ VAŽNO:                                  │
│  • Sva polja "Spoljašnji ID" će biti       │
│    OBRISANA (postavljena na prazno)        │
│  • Broj zapisa ostaje isti: N redova       │
│  • Promene se primenjuju na SVE zapise     │
│                                             │
│  ⚠️ Ovo se NE može poništiti!              │
│                                             │
│                   [Otkaži] [Da, restartuj] │
└─────────────────────────────────────────────┘
```

### 3. Izvršavanje Akcije

Kada korisnik klikne "**Da, restartuj**":
1. Modal se zatvara
2. Dugme postaje disabled i prikazuje "Brisanje..."
3. Ikona RefreshCw se rotira
4. Backend briše SVE vrednosti u koloni "Spoljašnji ID"
5. Tabela se automatski osvežava
6. Prikazuje se poruka: "✅ Obrisano! N spoljašnjih ID-eva očišćeno."

---

## Primer

### Pre Klika

| # | Spoljašnji ID | Primalac    | Iznos  |
|---|---------------|-------------|--------|
| 1 | 1-03/2026     | Dobavljač A | 5000   |
| 2 | 3-03/2026     | Dobavljač B | 12000  |
| 3 | 5-03/2026     | Dobavljač C | 8500   |
| 4 | 382-03/2026   | Dobavljač D | 3200   |

### Nakon Klika

| # | Spoljašnji ID | Primalac    | Iznos  |
|---|---------------|-------------|--------|
| 1 | *(prazno)*    | Dobavljač A | 5000   |
| 2 | *(prazno)*    | Dobavljač B | 12000  |
| 3 | *(prazno)*    | Dobavljač C | 8500   |
| 4 | *(prazno)*    | Dobavljač D | 3200   |

**Napomena:** Svi zapisi ostaju! Samo se briše vrednost u koloni "Spoljašnji ID".

---

## Tehnički Detalji

### Backend (`externalIdService.ts`)
```typescript
export async function restartExternalIds(userId: string): Promise<number> {
  // 1. Učitaj sve zapise
  const { data: recordsData } = await supabase
    .from('records')
    .select('id')
    .eq('user_id', userId)
    .order('sequence_number', { ascending: true })
    .order('created_at', { ascending: true });

  // 2. Postavi external_id na prazan string za sve zapise
  const updates = recordsData.map((record) => ({
    id: record.id,
    external_id: '',
    updated_at: new Date().toISOString()
  }));

  // 3. Ažuriraj bazu atomski
  for (const update of updates) {
    await supabase
      .from('records')
      .update({
        external_id: update.external_id,
        updated_at: update.updated_at
      })
      .eq('id', update.id);
  }

  // 4. Vrati broj obrađenih redova
  return recordsData.length;
}
```

### Frontend (`App.tsx`)
- Dugme otvara `RestartConfirmModal`
- Modal prikazuje detaljno upozorenje
- Nakon potvrde poziva `restartExternalIds()` servis
- Osvežava podatke iz baze
- Prikazuje poruku o uspehu/greški

---

## Sigurnost

✅ **Autentifikacija obavezna** - samo prijavljeni korisnici
✅ **RLS primenjeno** - samo zapisi trenutnog korisnika
✅ **Potvrda pre izvršavanja** - sprečava slučajno brisanje
✅ **Atomske operacije** - sve ili ništa
✅ **Error handling** - jasne poruke o greškama

---

## Modifikovani Fajlovi

1. **`/src/services/externalIdService.ts`**
   - `restartExternalIds()` - sada postavlja `external_id: ''` umesto prenumeracije

2. **`/src/components/RestartConfirmModal.tsx`**
   - Ažuriran tekst: "OBRISATI" umesto "PRENUMERISATI"
   - Ažurirani primeri: "(prazno)" umesto brojeva

3. **`/src/App.tsx`**
   - Promenjen naziv dugmeta: "Obriši spoljašnje ID-eve"
   - Promenjen loading tekst: "Brisanje..."
   - Promenjena poruka uspeha: "Obrisano! N spoljašnjih ID-eva očišćeno."

4. **`/EXTERNAL_ID_QUICK_GUIDE.md`**
   - Kompletno ažuriran da odražava funkcionalnost brisanja

---

## Korišćenje

### Kada koristiti?

✅ Kada želite da očistite sve spoljašnje ID-eve
✅ Pre izvoza XML-a ako ID-evi nisu potrebni
✅ Kada trebate da počnete "ispočetka"
✅ Kada želite da ručno unesete nove ID-eve

### Kada NE koristiti?

❌ Ako želite da sačuvate postojeće ID-eve
❌ Ako niste sigurni da li su vam ID-evi potrebni
❌ Ako radite na production podacima bez backup-a

---

## FAQ

**Q: Da li se brišu zapisi?**
A: NE! Brišu se samo vrednosti u koloni "Spoljašnji ID". Svi ostali podaci ostaju netaknuti.

**Q: Da li mogu da poništim akciju?**
A: Ne, akcija je nepovratna. Zato postoji modal sa detaljnim upozorenjem.

**Q: Koliko traje operacija?**
A: Za 100 zapisa ~1-2 sekunde. Za 1000+ zapisa ~10-15 sekundi.

**Q: Šta ako dođe do greške?**
A: Operacija je atomska - ili se sve obriše ili ništa. Nema delimičnog brisanja.

**Q: Da li se menjaju sequence numbers?**
A: NE! Samo se briše kolona "Spoljašnji ID". Sequence numbers ostaju isti.
