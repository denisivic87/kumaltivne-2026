# Brzi Vodič - Brisanje Spoljašnjih ID-eva

## Problem koji rešava
Potreba za brisanjem svih vrednosti u koloni "SPOLJAŠNJI ID" jednim klikom.

## Rešenje - Dugme za Brisanje

### 🔄 Obriši spoljašnje ID-eve (Tirkizno dugme)
**Šta radi:** Briše SVE vrednosti iz kolone "Spoljašnji ID" i postavlja ih na prazno

**Kako koristiti:**
1. Kliknite dugme "🔄 Obriši spoljašnje ID-eve"
2. Pojavi se detaljan modal sa upozorenjem i opisom akcije:
   - Trenutni ID-evi
   - Napomena da će svi biti obrisani (prazno)
   - Upozorenje da je akcija nepovratna
3. Kliknite "Da, restartuj" ili "Otkaži"
4. Sačekajte da se obrada završi (dugme će pokazati "Brisanje...")
5. Videćete poruku: "✓ Obrisano! N spoljašnjih ID-eva očišćeno."

**Pre:**
```
382-03/2026
384-03/2026
385-03/2026
390-03/2026
```

**Posle:**
```
(prazno)
(prazno)
(prazno)
(prazno)
```

---

## Gde se nalazi dugme?

Dugme se nalazi u drugom redu kontrola, desno od dugmeta "Obriši sve":

```
[Pregled formi] [Grupno menjanje] [PDF pregled] [Obriši sve] [🔄 Obriši spoljašnje ID-eve]
```

---

## Važne Napomene

- ⚠️ Akcija je **NEPOVRATNA** - ne može se poništiti
- 🔒 Operacija radi sa **SVIM** zapisima u bazi (ne samo vidljivim)
- ⏱️ Poruke automatski nestaju posle 5 sekundi
- 🔄 Dugme je disabled tokom obrade (prikazuje loading)
- 📊 Zapisi ostaju, samo se briše kolona "Spoljašnji ID"

---

## Preporučeni Tok Rada

### Scenario 1: Potrebno je očistiti sve spoljašnje ID-eve
```
1. Kliknite "🔄 Obriši spoljašnje ID-eve"
2. Potvrdite akciju u modalu
3. Svi spoljašnji ID-evi su sada prazni
4. Nastavite sa radom
```

### Scenario 2: Pre izvoza XML-a
```
1. Proverite da li su spoljašnji ID-evi potrebni
2. Ako nisu, obrišite ih dugmetom
3. Izvezite XML
```

---

## FAQ

**Q: Da li se brišu zapisi?**
A: NE! Brišu se samo vrednosti u koloni "Spoljašnji ID". Svi zapisi ostaju netaknuti.

**Q: Da li mogu da poništim akciju?**
A: Ne, akcija je nepovratna. Zato postoji modal sa detaljnim upozorenjem.

**Q: Šta ako imam 1000+ zapisa?**
A: Funkcionalnost radi sa bilo kojim brojem zapisa. Samo će trajati malo duže.
