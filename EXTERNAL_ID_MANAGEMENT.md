# Upravljanje Spoljašnjim ID-evima

## Pregled

Aplikacija sada sadrži dve nove funkcionalnosti za upravljanje kolonom "SPOLJAŠNJI ID" koja koristi format `[BROJ]-03/2026`.

## Nove Funkcionalnosti

### 1. Restartuj redni redosled

**Dugme:** Tirkizna boja, ikona RefreshCw

**Funkcionalnost:**
- Učitava SVE zapise iz baze podataka (ne samo vidljive na stranici)
- Prenumerira SPOLJAŠNJI ID kolonu: `1-03/2026`, `2-03/2026`, `3-03/2026`, ..., `N-03/2026`
- Snima sve promene direktno u bazu podataka atomski (sve ili ništa)
- Automatski osvežava tabelu sa novim podacima
- Prikazuje zelenu potvrdu: "Restartovano! N redova obrađeno."

**Upotreba:**
1. Kliknite na dugme "Restartuj redni redosled"
2. Pojavi se modal sa detaljnim opisom akcije:
   - **Trenutni ID-evi:** Prikazuje primer trenutnih ID-eva sa rupama
   - **Novi ID-evi:** Prikazuje kako će ID-evi izgledati nakon prenumeracije
   - **Važne informacije:**
     - Svi brojevi će biti sekvencijalni od 1 do N
     - Format (-03/2026) ostaje nepromenjen
     - Promene se primenjuju na sve zapise u bazi
   - **Upozorenje:** Akcija je nepovratna
3. Odaberite "Da, restartuj" za potvrdu ili "Otkaži" za prekid
4. Sačekajte da se obrada završi (dugme će prikazati "Restartovanje..." sa spinner ikonom)
5. Nakon uspešne obrade, videćete zelenu poruku potvrde

**Napomene:**
- Ova akcija je NEPOVRATNA
- Obrada se vrši direktno u bazi podataka
- Svi zapisi se prenumerišu od 1 do N bez rupa

### 2. Proveri redne brojeve

**Dugme:** Zelena boja, ikona CheckCircle

**Funkcionalnost:**
- Učitava SVE zapise iz baze podataka
- Proverava da li su svi ID-evi u ispravnom formatu `[BROJ]-03/2026`
- Proverava da li su brojevi od 1 do N bez ponavljanja
- Proverava da li postoje rupe u nizu

**Rezultati:**

✅ **Ako je sve OK:**
```
Redni brojevi su ispravni! (1 do N)
```

❌ **Ako postoje problemi:**
```
Pronađeni problemi:
- Nedostaju brojevi: [lista]
- Duplikati: [lista]
- Pogrešan format: [broj redova]
```

**Upotreba:**
1. Kliknite na dugme "Proveri redne brojeve"
2. Sačekajte da se validacija završi (dugme će prikazati "Proveravam...")
3. Rezultat će biti prikazan kao zelena ili crvena poruka

## Tehnički Detalji

### Format Spoljašnjeg ID-a
- **Format:** `[REDNI_BROJ]-03/2026`
- **Primer:** `1-03/2026`, `2-03/2026`, `382-03/2026`
- **Mesec i godina:** Fiksni (03/2026)

### Karakteristike
- **Atomske Operacije:** Sve promene se izvršavaju kao jedna transakcija (sve ili ništa)
- **Direktna Obrada Baze:** Sve operacije se vrše direktno sa bazom podataka, ne sa UI-jem
- **Loading State:** Dugmad su disabled tokom obrade sa vizuelnim indikatorima
- **Poruke:** Automatski nestaju posle 5 sekundi ili korisnik može da klikne X
- **Paginacija:** Funkcionalnosti rade sa SVIM zapisima, ne samo onim vidljivim na trenutnoj stranici

## Primeri Upotrebe

### Scenario 1: Popravljanje Rupa u Redosledu

**Situacija:**
```
Trenutni ID-evi: 382-03/2026, 384-03/2026, 385-03/2026, 390-03/2026
```

**Akcija:**
1. Kliknite "Proveri redne brojeve" - videćete probleme
2. Kliknite "Restartuj redni redosled"
3. Potvrdite akciju

**Rezultat:**
```
Novi ID-evi: 1-03/2026, 2-03/2026, 3-03/2026, 4-03/2026
```

### Scenario 2: Validacija Pre Izvoza

**Akcija:**
1. Pre izvoza XML-a, kliknite "Proveri redne brojeve"
2. Ako postoje problemi, kliknite "Restartuj redni redosled"
3. Ponovo proverite da su ID-evi ispravni
4. Izvezite XML

## Sigurnost

- Sve operacije zahtevaju autentifikaciju korisnika
- Prompt za potvrdu pre restartovanja ID-eva
- Operacije se izvršavaju samo na zapisima trenutnog korisnika
- Automatska validacija prava pristupa

## Greške i Rešavanje Problema

### "Nema zapisa za obradu"
**Uzrok:** Nema zapisa u bazi za trenutnog korisnika
**Rešenje:** Dodajte zapise pre nego što pokušate da restartujete ID-eve

### "Greška pri učitavanju"
**Uzrok:** Problem sa bazom podataka ili mrežom
**Rešenje:** Proverite internet konekciju i pokušajte ponovo

### Poruka o greški pri validaciji
**Uzrok:** Postoje problemi sa formatom ili redosledom ID-eva
**Rešenje:** Koristite "Restartuj redni redosled" da popravite sve probleme odjednom
