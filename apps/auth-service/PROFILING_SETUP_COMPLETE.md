# 🎯 Profiling Setup Kompletný - Ready to Use!

## ✅ Čo je pripravené

Kompletný profiling setup pre CPU/time profiláciu login endpointu v `auth-service`.

###  Vytvorené súbory

#### Skripty
-  `scripts/seed-test-user.ts` - Vytvára test používateľa pre benchmark
-  `scripts/load-test-login.ts` - Autocannon load test
-  `scripts/login-benchmark.ts` - Detailný performance benchmark

#### Utility
-  `src/utils/prismaQueryLogger.ts` - Helper pre meranie DB queries

#### Konfigurácia
-  `package.json` - Nové NPM skripty:
  - `pnpm seed:test-user` - Seed test usera
  - `pnpm load:login` - Load test
-  `.env.example` - Dokumentovaný BCRYPT_SALT_ROUNDS

---

## 🚀 Ako začať (3 JEDNODUCHÉ KROKY)

### Krok 1: Prečítaj si quick start guide
```powershell
# Otvor v editore:
PROFILING_QUICKSTART.md
```
**Tento súbor obsahuje kompletný step-by-step návod so všetkými príkazmi.** ⭐

### Krok 2: Vytvor test používateľa
```powershell
cd apps/auth-service
pnpm seed:test-user
```

### Krok 3: Spusti profiling
```powershell
# V jednom termináli - spusti server:
pnpm dev

# V druhom termináli - spusti load test:
pnpm load:login
```

**Potom postupuj podľa `PROFILING_QUICKSTART.md`** 

---

##  Dependencies nainštalované

-  `autocannon@7.15.0` - HTTP load testing

Všetky potrebné balíky sú už nainštalované cez `pnpm install`. 

---

## 📖 Detailné inštrukcie

Pozri **PROFILING_QUICKSTART.md** pre komplexný step-by-step návod:
1. Baseline meranie (12 salt rounds)
2. Console.time() detailné merania
3. Optimalizácia (zníženie na 10 rounds)
4. Re-meranie
5. Porovnanie výsledkov

---

## 🎯 Očakávané výsledky

### Bottleneck
- **bcrypt.compare** zaberá ~60% CPU času
- Spôsobené 12 salt rounds (4096 iterácií)

### Optimalizácia
- Zníženie z 12 na 10 rounds (1024 iterácií)
- ~75% menej výpočtov


---

## 📊 Príkazy pre profiling

```powershell
# Príprava
pnpm seed:test-user          # Vytvor test usera
pnpm dev                     # Spusti server

# Meranie
pnpm load:login              # Load test (autocannon)
pnpm build                   # Build pre profiling
pnpm benchmark

# Utility
pnpm db:studio               # Otvor DB
pnpm db:clean                # Vyčisti DB
```


---

## 🔧 Troubleshooting

### Server sa nespustí
```powershell
# Check DB connection
pnpm db:studio
```

---

## 📚 Odkazy

- **Quick Start**: `PROFILING_QUICKSTART.md`
- **Hlavná dokumentácia**: `docs/PROFILING.md`

---

## ✨ Next Steps

1.  **Prečítaj** `PROFILING_QUICKSTART.md`
2.  **Spusti** baseline meranie
4.  **Optimalizuj** (zmeň na 10 rounds)
5.  **Zmeraj** znova
6.  **Porovnaj** a dokumentuj zlepšenie

---

Ak máš otázky, pozri `PROFILING_QUICKSTART.md` alebo `docs/PROFILING.md`.
