# Nova Funkcionalnost - Restartovanje Spoljašnjih ID-eva

## Šta je Novo?

Dodato je **profesionalno rešenje** za upravljanje spoljašnjim ID-evima koje automatski popravlja rupe u redosledu numeracije.

---

## Kako Izgleda?

### Dugme "🔄 Restartuj redni redosled"

**Lokacija:** Sekcija kontrola, drugi red, između "Obriši sve" i "Proveri redne brojeve"

**Izgled:**
```
[Pregled formi] [Grupno menjanje] [PDF pregled] [Obriši sve] [🔄 Restartuj redni redosled] [✓ Proveri redne brojeve]
                                                                  ↑↑↑ NOVO DUGME ↑↑↑
```

**Stil:**
- Tirkizna boja (cyan to teal gradient)
- Ikona: 🔄 RefreshCw (rotira se tokom obrade)
- Hover efekti i shadow

---

## Kako Radi?

### 1. Klik na Dugme
Kada korisnik klikne "🔄 Restartuj redni redosled", otvara se **modal sa detaljnim opisom**.

### 2. Modal sa Potvrdom

```
┌────────────────────────────────────────────────────┐
│  ⚠️  Sigurni ste?                             ✕    │
├────────────────────────────────────────────────────┤
│                                                    │
│  ⚠️ Ova akcija će PRENUMERISATI sve redove:       │
│                                                    │
│  Trenutni ID-evi:                                 │
│    (npr. 1-03/2026, 3-03/2026, 5-03/2026, ...)   │
│                                                    │
│  Biće zamenjeni sa:                               │
│    (1-03/2026, 2-03/2026, 3-03/2026, ...)        │
│                                                    │
│  ℹ️ VAŽNO:                                         │
│  • Svi brojevi će biti postavljeni                │
│    sekvencijalno od 1 do N                        │
│  • Mesec i godina (-03/2026) ostaju isti          │
│  • Promene se primenjuju na SVE zapise u bazi     │
│                                                    │
│  ⚠️ Ovo se NE može poništiti!                     │
│                                                    │
│                          [Otkaži] [Da, restartuj] │
└────────────────────────────────────────────────────┘
```

**Tri Sekcije:**
1. **Žuta sekcija** - Opis trenutnih i novih ID-eva
2. **Plava sekcija** - Lista ključnih tačaka
3. **Crvena sekcija** - Upozorenje da je akcija nepovratna

### 3. Potvrda Akcije

Ako korisnik klikne "**Da, restartuj**":
- Modal se zatvara
- Dugme postaje disabled i prikazuje "Restartovanje..."
- Ikona RefreshCw se rotira
- Backend obrađuje sve zapise
- Tabela se automatski osvežava

### 4. Rezultat

**Uspeh:**
```
✅ Restartovano! 150 redova obrađeno.
```
(zelena poruka, automatski nestaje posle 5 sekundi)

**Greška:**
```
❌ Greška: [opis greške]
```
(crvena poruka, automatski nestaje posle 5 sekundi)

---

## Primeri

### Pre Restartovanja

| # | Spoljašnji ID | Primalac |
|---|---------------|----------|
| 1 | 1-03/2026     | Dobavljač A |
| 2 | 3-03/2026     | Dobavljač B |
| 3 | 5-03/2026     | Dobavljač C |
| 4 | 7-03/2026     | Dobavljač D |
| 5 | 382-03/2026   | Dobavljač E |

**Problem:** Rupe u nizu (1, 3, 5, 7, 382)

### Nakon Restartovanja

| # | Spoljašnji ID | Primalac |
|---|---------------|----------|
| 1 | 1-03/2026     | Dobavljač A |
| 2 | 2-03/2026     | Dobavljač B |
| 3 | 3-03/2026     | Dobavljač C |
| 4 | 4-03/2026     | Dobavljač D |
| 5 | 5-03/2026     | Dobavljač E |

**Rešenje:** Sekvencijalni niz (1, 2, 3, 4, 5)

---

## Tehnički Detalji

### Backend Operacije
1. Učitavanje svih zapisa iz baze (po `user_id`)
2. Sortiranje po `sequence_number` i `created_at`
3. Prenumeracija: `external_id = "[index + 1]-03/2026"`
4. Atomsko ažuriranje u bazi (sve ili ništa)
5. Vraćanje broja obrađenih redova

### Frontend Operacije
1. Prikazivanje modala za potvrdu
2. Čekanje korisničkog odgovora
3. Pozivanje backend servisa
4. Učitavanje fresh podataka iz baze
5. Sortiranje i prikazivanje u UI
6. Prikazivanje poruke o rezultatu

### Sigurnost
- ✅ Autentifikacija obavezna
- ✅ RLS (Row Level Security) automatski primenjeno
- ✅ Samo zapisi trenutnog korisnika
- ✅ Potvrda pre izvršavanja
- ✅ Error handling na svim nivoima

---

## Korišćenje

### Scenario 1: Nakon Brisanja Redova
```
1. Obrišite neke redove → ostaju rupe u ID-evima
2. Kliknite "🔄 Restartuj redni redosled"
3. Potvrdite u modalu
4. Svi ID-evi su ponovo 1, 2, 3, ... N
```

### Scenario 2: Pre Izvoza XML-a
```
1. Kliknite "✓ Proveri redne brojeve"
2. Ako postoje problemi, kliknite "🔄 Restartuj redni redosled"
3. Potvrdite akciju
4. Ponovo proverite da su ID-evi ispravni
5. Izvezite XML
```

### Scenario 3: Periodično Održavanje
```
Jednom mesečno:
1. Kliknite "✓ Proveri redne brojeve"
2. Ako je potrebno, restartujte
3. Nastavite sa normalnim radom
```

---

## UX Prednosti

✅ **Vizuelno Jasno** - Modal sa bojama i ikonama
✅ **Sigurno** - Potvrda pre izvršavanja
✅ **Informativno** - Detaljan opis šta će se dogoditi
✅ **Responsive** - Loading state tokom obrade
✅ **Feedback** - Jasne poruke o uspehu/greški
✅ **Automatsko** - Sve se dešava jednim klikom
✅ **Nepovratno** - Ali sa jasnim upozorenjem

---

## Povezane Funkcionalnosti

1. **"✓ Proveri redne brojeve"** - Validacija ID-eva pre restartovanja
2. **Sequence Integrity Monitor** - Automatska provera integriteta
3. **Import XML** - Prenumeracija nakon importa
4. **Bulk Operations** - Grupno ažuriranje zapisa

---

## FAQ

**Q: Šta će se dogoditi sa mojim podacima?**
A: Samo SPOLJAŠNJI ID kolona će biti promenjena. Svi drugi podaci ostaju netaknuti.

**Q: Da li mogu da poništim akciju?**
A: Ne, akcija je nepovratna. Zato postoji modal sa detaljnim upozorenjem.

**Q: Šta ako imam 1000+ zapisa?**
A: Funkcionalnost radi sa bilo kojim brojem zapisa. Samo će trajati malo duže.

**Q: Da li format datuma može da se promeni?**
A: Trenutno je format "03/2026" fiksan. Mesec i godina ostaju konstantni.

**Q: Šta ako dođe do greške tokom obrade?**
A: Promene su atomske - ili se sve ažurira ili ništa. Nema delimičnih ažuriranja.

---

## Dodatni Resursi

- 📖 **Detaljna dokumentacija:** `EXTERNAL_ID_MANAGEMENT.md`
- 🚀 **Brzi vodič:** `EXTERNAL_ID_QUICK_GUIDE.md`
- 🔧 **Tehnička implementacija:** `EXTERNAL_ID_IMPLEMENTATION_SUMMARY.md`
