# 🎉 PROFILING SETUP - KOMPLETNÝ SUMÁR

## ✅ Implementácia DOKONČENÁ

Dátum: November 23, 2025  
Branch: feat/profiling  
Status: **READY TO USE** 🚀

---

## 📦 VYTVORENÉ SÚBORY (15 súborov)

### 🔧 Profiling Skripty (3)
```
apps/auth-service/scripts/
├── seed-test-user.ts         # Seed script pre test používateľa
├── load-test-login.ts         # Autocannon HTTP load test
└── login-benchmark.ts         # Performance benchmark s metrikami
```

### 📖 Dokumentácia (6)
```
apps/auth-service/
├── PROFILING_SETUP_COMPLETE.md    # Setup overview a quick links
├── PROFILING_QUICKSTART.md        # ⭐ Step-by-step návod
├── PROFILING_CHECKLIST.md         # Checklist pre postup
├── docs/
│   ├── PROFILING.md               # ⭐ Template pre výsledky
│   └── images/
│       └── README.md              # Návod na screenshoty

/root/
└── PROFILING_README.md            # Root level overview
```

### 🛠️ Utility a Konfigurácia (6)
```
apps/auth-service/
├── src/utils/
│   └── prismaQueryLogger.ts       # DB query performance logging
├── profiles/
│   └── README.md                  # Info o profile outputs
├── package.json                   # ⚡ 5 nových NPM skriptov
├── .env.example                   # Dokumentovaný BCRYPT_SALT_ROUNDS
└── .gitignore                     # Profiling súbory excluded
```

---

## ⚡ NOVÉ NPM PRÍKAZY (5)

```json
{
  "seed:test-user": "Vytvorí test usera pre load testing",
  "load:login": "HTTP load test cez autocannon (30s, 50 connections)",
  "profile:cpu": "Node.js CPU profiler (raw .cpuprofile)",
  "profile:flame": "Clinic flame - flamegraph vizualizácia",
  "profile:heap": "Clinic heap profiler - memory analýza"
}
```

Spustenie:
```powershell
pnpm <script-name>
# napr.: pnpm load:login
```

---

## 📦 DEPENDENCIES (2 nainštalované)

- ✅ **autocannon@7.15.0** - HTTP benchmarking tool
- ✅ **clinic@13.0.0** - Performance profiling toolkit
  - clinic flame (CPU flamegraph)
  - clinic heapprofiler (memory)

Status: **Nainštalované cez `pnpm install`** ✅

---

## 🎯 WORKFLOW - AKO POUŽIŤ

### 1️⃣ Prvý krát (setup)
```powershell
cd apps/auth-service

# Nainštaluj (už hotové ✅)
pnpm install

# Vytvor test usera
pnpm seed:test-user
```

### 2️⃣ Baseline meranie (12 rounds)
```powershell
# Terminal 1 - spusti server
pnpm dev

# Terminal 2 - spusti load test
pnpm load:login

# Po build - flamegraph
pnpm build
pnpm profile:flame
```

### 3️⃣ Optimalizácia
```powershell
# Zmeň v .env:
BCRYPT_SALT_ROUNDS=10

# Reštartuj server
```

### 4️⃣ Re-meranie (10 rounds)
```powershell
# Zopakuj všetky testy z kroku 2
pnpm load:login
pnpm profile:flame
```

### 5️⃣ Dokumentácia
```powershell
# Vyplň template:
docs/PROFILING.md

# Ulož screenshoty:
docs/images/flame-before.png
docs/images/flame-after.png
```

---

## 📚 DOKUMENTÁCIA - KDE NÁJDEŠ ČO

| Súbor | Účel | Kedy použiť |
|-------|------|-------------|
| **PROFILING_QUICKSTART.md** | 🌟 Hlavný návod | Začínaš, potrebuješ presné kroky |
| **docs/PROFILING.md** | 🌟 Template pre výsledky | Zapisuješ merania a výsledky |
| **PROFILING_CHECKLIST.md** | ✅ Checklist | Kontrola postupu |
| **PROFILING_SETUP_COMPLETE.md** | ℹ️ Setup overview | Orientácia čo bolo vytvorené |
| **PROFILING_README.md** (root) | 📄 Sumár projektu | Root level info |

---

## 🏆 OČAKÁVANÉ VÝSLEDKY

### Bottleneck
- **bcrypt.compare** bude zaberať **~60% CPU času**
- S 12 salt rounds = 4096 iterácií hashu
- Trvanie: ~100-150ms na request

### Po optimalizácii (10 rounds)
- Zníženie na 1024 iterácií (~75% menej výpočtov)
- **Očakávané zlepšenie:**
  - p50 latency: **-20% až -25%**
  - p95 latency: **-20% až -40%**
  - Throughput: **+20% až +30%**
  - bcrypt CPU %: **-15 až -20 percentage points**

### Bodovanie úlohy
- ✅ Nájdenie bottlenecku: **2/2 body**
- ✅ Meranie pred/po: **2/2 body**
- ✅ Zlepšenie metriky: **3/3 body**
- 🏆 **SPOLU: 7/7 bodov**

---

## 🔍 VERIFIKÁCIA SETUPU

Skontroluj že všetko funguje:

```powershell
cd apps/auth-service

# Dependencies?
ls node_modules/autocannon        # ✅
ls node_modules/clinic            # ✅

# Skripty?
ls scripts/seed-test-user.ts      # ✅
ls scripts/load-test-login.ts     # ✅
ls scripts/login-benchmark.ts     # ✅

# Dokumentácia?
ls PROFILING_QUICKSTART.md        # ✅
ls docs/PROFILING.md              # ✅
ls PROFILING_CHECKLIST.md         # ✅

# NPM skripty?
pnpm run | grep profile           # Malo by ukázať 5 skriptov ✅
pnpm run | grep seed              # seed:test-user ✅
pnpm run | grep load              # load:login ✅
```

Všetko ✅? **Môžeš začať!**

---

## 🎬 ĎALŠÍ KROK

### Otvor a prečítaj:
```
apps/auth-service/PROFILING_QUICKSTART.md
```

Tento súbor obsahuje **presný step-by-step postup** od začiatku do konca.

---

## 📊 QUICK REFERENCE - Všetky príkazy

```powershell
# === SETUP (jednorázovo) ===
cd apps/auth-service
pnpm install                      # ✅ HOTOVÉ
pnpm seed:test-user               # Vytvor test usera

# === SERVER ===
pnpm dev                          # Spusti auth-service
pnpm build                        # Build pre profiling

# === LOAD TESTING ===
pnpm load:login                   # HTTP load test
node dist/scripts/login-benchmark.js  # Benchmark

# === CPU PROFILING ===
pnpm profile:flame                # Flamegraph (odporúčané)
pnpm profile:cpu                  # Raw .cpuprofile

# === MEMORY (voliteľné) ===
pnpm profile:heap                 # Memory profiling

# === DATABASE ===
pnpm db:studio                    # Prisma Studio UI
pnpm db:migrate                   # Spusti migrácie
pnpm db:clean                     # Vyčisti DB
```

---

## 🛠️ TROUBLESHOOTING

### Časté problémy a riešenia:

**❌ "Server is not responding"**
```powershell
# Skontroluj či beží:
netstat -an | findstr 3001

# Spusti ak nebeží:
pnpm dev
```

**❌ "Test user already exists"**
```
✅ To je OK! Môžeš pokračovať.
```

**❌ "Cannot find module autocannon"**
```powershell
pnpm install
```

**❌ "Database connection failed"**
```powershell
# Skontroluj .env DATABASE_URL
# Spusti PostgreSQL:
docker-compose up -d postgres
```

**❌ "Clinic flame doesn't open"**
```powershell
# Použite alternatívu:
pnpm profile:cpu
# Otvor *.cpuprofile v Chrome DevTools
```

---

## 📁 ADRESÁROVÁ ŠTRUKTÚRA

```
apps/auth-service/
├── scripts/                          # 🔧 Profiling skripty
│   ├── seed-test-user.ts
│   ├── load-test-login.ts
│   └── login-benchmark.ts
├── src/
│   └── utils/
│       └── prismaQueryLogger.ts      # 🛠️ Utility
├── docs/
│   ├── PROFILING.md                  # 📝 Template pre výsledky
│   └── images/                       # 📸 Screenshoty
│       ├── README.md
│       ├── flame-before.png (vytvor)
│       └── flame-after.png (vytvor)
├── profiles/                         # 📊 Profiling výstupy
│   └── README.md
├── PROFILING_SETUP_COMPLETE.md       # ℹ️ Setup info
├── PROFILING_QUICKSTART.md           # ⭐ Hlavný návod
├── PROFILING_CHECKLIST.md            # ✅ Checklist
├── package.json                      # ⚡ Nové skripty
├── .env.example                      # 📄 Config dokumentácia
└── .gitignore                        # 🚫 Excluded files

root/
└── PROFILING_README.md               # 📄 Root level sumár
```

---

## 🎓 TIPS PRE ÚSPEŠNÚ PROFILÁCIU

### Pre presné merania:
1. ✅ Zatvor ostatné aplikácie (minimalizuj CPU load)
2. ✅ Opakuj testy 2-3x (vezmi median)
3. ✅ Počkaj na warmup (prvých 5-10s ignoruj)
4. ✅ Stabilné prostredie (rovnaký HW, DB, nastavenia)

### Pri dokumentovaní:
1. ✅ Screenshot flamegraphu (zoom na bcrypt area)
2. ✅ Presné čísla (p50, p95, p99, throughput)
3. ✅ Percentá zlepšenia (vypočítaj zmenu v %)
4. ✅ Kontext (BCRYPT_SALT_ROUNDS hodnota)

---

## ✅ CHECKLIST PRED ODOVZDANÍM

- [ ] Prečítal som `PROFILING_QUICKSTART.md`
- [ ] Vykonal som baseline meranie (12 rounds)
- [ ] Flamegraph screenshot before (`docs/images/flame-before.png`)
- [ ] Optimalizoval som (zmenil na 10 rounds)
- [ ] Vykonal som re-meranie (10 rounds)
- [ ] Flamegraph screenshot after (`docs/images/flame-after.png`)
- [ ] Vyplnil som `docs/PROFILING.md` kompletne:
  - [ ] Baseline čísla
  - [ ] Post-optimization čísla
  - [ ] Tabuľka porovnania
  - [ ] Screenshoty flamegraphov
  - [ ] Záver
- [ ] Dosiahol som merateľné zlepšenie (>15%)
- [ ] Všetky 3 kritériá splnené (7/7 bodov)

---

## 🎉 VŠETKO PRIPRAVENÉ!

**Status:** ✅ Setup kompletný  
**Dependencies:** ✅ Nainštalované  
**Dokumentácia:** ✅ Vytvorená  
**Ready:** ✅ Môžeš začať s profiláciou

### Tvoj ďalší krok:

**Otvor:** `apps/auth-service/PROFILING_QUICKSTART.md`

---

**Vytvorené:** November 23, 2025  
**Branch:** feat/profiling  
**Autor:** Andrea Krankotova  
**Projekt:** vidyalayaone - auth-service profiling

**🚀 HODNĚ ŠTĚSTÍ!**
