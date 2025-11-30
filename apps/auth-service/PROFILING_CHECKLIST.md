# ✅ Profiling Checklist - Krok za krokom

Použite tento checklist na kontrolu postupu pri vykonávaní profilácie.

---

## 📋 PRÍPRAVA

- [ ] Prečítal som `PROFILING_QUICKSTART.md`
- [ ] PostgreSQL databáza beží
- [ ] Migrácie sú spustené (`pnpm db:migrate`)
- [ ] Dependencies sú nainštalované (`pnpm install`)
- [ ] Vytvoril som test usera (`pnpm seed:test-user`)

---

## 🔬 FÁZA 1: BASELINE MERANIE (12 salt rounds)

### Setup
- [ ] Server beží na porte 3001 (`pnpm dev`)
- [ ] `.env` obsahuje `BCRYPT_SALT_ROUNDS=12` (alebo default)
- [ ] Test user existuje v databáze

### Merania
- [ ] Spustil som load test (`pnpm load:login`)
- [ ] Zaznamenal som:
  - [ ] p50 latency: _____ ms
  - [ ] p95 latency: _____ ms
  - [ ] p99 latency: _____ ms
  - [ ] Throughput: _____ req/s
  - [ ] Počet errors: _____

- [ ] Spustil som benchmark (`node dist/scripts/login-benchmark.js`)
- [ ] Zaznamenal som:
  - [ ] Average latency: _____ ms
  - [ ] p50: _____ ms
  - [ ] p95: _____ ms
  - [ ] Throughput: _____ req/s

- [ ] Vytvoril som build (`pnpm build`)
- [ ] Spustil som flamegraph (`pnpm profile:flame`)
- [ ] Analyzoval som flamegraph:
  - [ ] bcrypt.compare CPU %: _____
  - [ ] Identifikoval som bottleneck: bcrypt.compare
  - [ ] Screenshot uložený: `docs/images/flame-before.png`

### Dokumentácia
- [ ] Všetky baseline hodnoty zapísané v `docs/PROFILING.md`
- [ ] Sekcia "Baseline meranie" kompletná
- [ ] Sekcia "Identifikácia bottlenecku" vyplnená

---

## 🔧 FÁZA 2: OPTIMALIZÁCIA

- [ ] Zmenil som `BCRYPT_SALT_ROUNDS=10` v `.env`
  **ALEBO**
- [ ] Zmenil som default v `src/config/config.ts` na '10'

- [ ] Reštartoval som server (Ctrl+C, potom `pnpm dev`)
- [ ] Overil som že nová hodnota sa používa (log pri štarte)

- [ ] Zapísal som zmenu do `docs/PROFILING.md` sekcia "Implementovaná optimalizácia"

---

## 📈 FÁZA 3: MERANIE PO OPTIMALIZÁCII (10 salt rounds)

### Setup
- [ ] Server beží s novým nastavením (10 rounds)
- [ ] Test user stále existuje

### Merania (zopakuj všetky testy)
- [ ] Spustil som load test (`pnpm load:login`)
- [ ] Zaznamenal som:
  - [ ] p50 latency: _____ ms
  - [ ] p95 latency: _____ ms
  - [ ] p99 latency: _____ ms
  - [ ] Throughput: _____ req/s
  - [ ] Počet errors: _____

- [ ] Spustil som benchmark (`node dist/scripts/login-benchmark.js`)
- [ ] Zaznamenal som:
  - [ ] Average latency: _____ ms
  - [ ] p50: _____ ms
  - [ ] p95: _____ ms
  - [ ] Throughput: _____ req/s

- [ ] Spustil som flamegraph (`pnpm profile:flame`)
- [ ] Analyzoval som flamegraph:
  - [ ] bcrypt.compare CPU %: _____
  - [ ] Porovnal som s baseline
  - [ ] Screenshot uložený: `docs/images/flame-after.png`

### Dokumentácia
- [ ] Všetky post-optimization hodnoty zapísané v `docs/PROFILING.md`
- [ ] Sekcia "Meranie po optimalizácii" kompletná

---

## 📊 FÁZA 4: POROVNANIE A VYHODNOTENIE

### Výpočty
- [ ] Vypočítal som absolútne zmeny (pred - po):
  - [ ] p50 latency: _____ ms rozdiel
  - [ ] p95 latency: _____ ms rozdiel
  - [ ] Throughput: _____ req/s rozdiel

- [ ] Vypočítal som percentuálne zmeny:
  - [ ] p50: _____% zlepšenie
  - [ ] p95: _____% zlepšenie
  - [ ] Throughput: _____% zvýšenie
  - [ ] bcrypt CPU: _____ percentage points zníženie

### Dokumentácia
- [ ] Tabuľka "Porovnanie výsledkov" vyplnená
- [ ] Screenshoty flamegraphov priložené
- [ ] Sekcia "Záver" napísaná:
  - [ ] Zhrnutie bottlenecku
  - [ ] Popis optimalizácie
  - [ ] Dosiahnuté zlepšenie
  - [ ] Bezpečnostné úvahy

---

## 🏆 FINALIZÁCIA

### Kontrola dokumentácie
- [ ] `docs/PROFILING.md` je kompletný:
  - [ ] Všetky sekcie vyplnené
  - [ ] Tabuľky obsahujú reálne hodnoty
  - [ ] Grafy/vizualizácie vytvorené
  - [ ] Screenshoty priložené
  - [ ] Záver napísaný

### Kontrola bodov
- [ ] **Bottleneck identifikovaný** (2 body)
  - bcrypt.compare jasne identifikovaný vo flamegraphe
  - % CPU času zdokumentovaný

- [ ] **Meranie pred/po** (2 body)
  - Detailné metriky pre oba stavy
  - Presné hodnoty v tabuľke

- [ ] **Zlepšenie metriky** (3 body)
  - Merateľné zlepšenie latencií
  - Zvýšenie throughputu
  - Zníženie CPU % v bcrypt

### Súbory na odovzdanie
- [ ] `docs/PROFILING.md` - hlavná dokumentácia
- [ ] `docs/images/flame-before.png` - flamegraph pred
- [ ] `docs/images/flame-after.png` - flamegraph po
- [ ] Voliteľne: `profiles/*.json` - raw data

---

## ✅ HOTOVO!

- [ ] Všetky checkboxy sú zaškrtnuté
- [ ] Dokumentácia je kompletná
- [ ] Výsledky sú presvedčivé
- [ ] Splnil som všetky kritériá úlohy

**🎉 Gratulujeme! Profiling je dokončený.**

---

## 📝 Poznámky

Sem si môžeš zapísať dôležité pozorovania počas profilácie:

```
[Tvoje poznámky tu...]




```

---

**Vytvorené:** November 23, 2025  
**Pre úlohu:** Profilácia auth-service login endpoint  
**Max. body:** 7/7
