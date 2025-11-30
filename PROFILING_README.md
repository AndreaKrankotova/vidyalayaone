# 🎯 Profiling úloha - Implementácia dokončená

## ✅ Status: READY TO USE

Kompletný profiling setup pre CPU/time profiláciu login endpointu v **auth-service** je pripravený.

---

## 📁 Lokácia

Všetky profiling súbory sú v:
```
apps/auth-service/
```

---

## 📖 Dokumentácia

### 🌟 Hlavné súbory (začni tu):

1. **`apps/auth-service/PROFILING_SETUP_COMPLETE.md`**
   - Overview setupu
   - Zoznam všetkých vytvorených súborov
   - Quick links

2. **`apps/auth-service/PROFILING_QUICKSTART.md`** ⭐
   - **Step-by-step návod**
   - Všetky príkazy
   - Troubleshooting

---

## 🚀 Quick Start

```powershell
# 1. Prejdi do auth-service
cd apps/auth-service

# 2. Vytvor test usera
pnpm seed:test-user

# 3. Spusti server (terminál 1)
pnpm dev

# 4. Spusti load test (terminál 2)
pnpm load:login

# 5. Otvor dokumentáciu a postupuj
# PROFILING_QUICKSTART.md - pre návod
# docs/PROFILING.md - pre zapisovanie výsledkov
```

---

## 🎯 Úloha

### Zadanie
Vykonať profiláciu (profiling), nájsť bottleneck, optimalizovať a zmerať zlepšenie.

### Riešenie
- **Typ profilácie**: CPU/time
- **Endpoint**: POST /api/v1/login
- **Bottleneck**: bcrypt.compare (12 salt rounds)
- **Optimalizácia**: Zníženie na 10 rounds
- **Očakávané zlepšenie**: 20-40% zníženie latencií


---

## 🛠️ Čo bolo vytvorené

### Skripty (3)
- `scripts/seed-test-user.ts` - Seed test používateľa
- `scripts/load-test-login.ts` - HTTP load test ( Meria kapacitu servera - Koľko prihlásení server zvládne?)
- `scripts/login-benchmark.ts` - Performance benchmark (Meria presný výkon konkrétnej operácie)

### NPM príkazy (2)
- `pnpm seed:test-user` - Vytvorí test usera
- `pnpm load:login` - Load test

### Dokumentácia (3)
- `PROFILING_SETUP_COMPLETE.md` - Setup overview
- `PROFILING_QUICKSTART.md` - Step-by-step návod
- `docs/PROFILING.md` - Template pre výsledky

### Utility (1)
- `src/utils/prismaQueryLogger.ts` - DB query logging

### Konfigurácia (3)
- `package.json` - Nové skripty + dependencies
- `.env.example` - Dokumentovaný BCRYPT_SALT_ROUNDS
- `.gitignore` - Vylúčené profiling súbory

---

## 📊 Proces profilácie

```
1. BASELINE (12 rounds)
   ├── Load test → meranie latencií
   ├── Benchmark → detailné metriky
   └── Zápis výsledkov

2. OPTIMALIZÁCIA
   └─ BCRYPT_SALT_ROUNDS: 12 → 10

3. RE-MERANIE (10 rounds)
   ├── Load test → nové latency
   ├── Benchmark → nové metriky
   ├── Console.time() → bcrypt časové merania
   └─ Zápis výsledkov

4. POROVNANIE
   ├── Tabuľka pred vs. po
   ├── Percentuálne zlepšenie
   ├── Screenshoty flamegraphov
   └── Záver
```
