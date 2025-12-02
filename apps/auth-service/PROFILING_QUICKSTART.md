# Profiling Setup - Quick Start Guide

## 🎯 Cieľ

Vykonať CPU profiláciu login endpointu, identifikovať bottleneck (bcrypt), optimalizovať a zmerať zlepšenie.

---

## 📦 1. Inštalácia dependencies

```powershell
cd apps/auth-service
pnpm install
```

Toto nainštaluje:
- `autocannon` - HTTP load testing

---

## 🗄️ 2. Príprava databázy

Uisti sa, že máš spustenú PostgreSQL databázu. Ak nie:

```powershell
Spusť Docker Desktop (Engine running).
Spusť databázu (ak už nebežia):
docker start vidyalayaone-postgres

---

## 👤 3. Vytvor test používateľa

```powershell
pnpm seed:test-user
```

**Výstup:**
```
✅ Test user created successfully!
   Username: profiling_test_user
   Password: TestPassword123!
```

---

## 🚀 4. Spusti auth service

**V jednom termináli:**

```powershell
pnpm dev
```

Počkaj kým uvidíš:
```
 Auth service running on port 3001
```

---

## 📊 5. BASELINE MERANIE (12 salt rounds)

**V druhom termináli:**

### 5a. Load test (autocannon)

```powershell
pnpm load:login
```

**Zaznamenaj si:**
- p50, p95, p99 latency
- Throughput (req/s)
- Počet chýb (errors)

### 5b. Benchmark script

```powershell
pnpm build
node dist/scripts/login-benchmark.js
alebo 
pnpm benchmark
```

**Zaznamenaj si:**
- Average, p50, p95, p99 latency
- Throughput

### 5b. Detailné meranie login req

**Manuálny test:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"; "x-context"="platform"} -Body '{"username":"profiling_test_user","password":"TestPassword123!"}'
```

Alebo použi Postman/Thunder Client.

**V termináli servera uvidíš:**
```
1️⃣  Validation: 0.XXX ms
2️⃣  Fetch user from DB: XX.XXX ms
3️⃣  Fetch role from DB: X.XXX ms
4️⃣  bcrypt.compare (BOTTLENECK?): XXX.XXX ms  ← HLAVNÝ BOTTLENECK
5️⃣  Generate JWT tokens: X.XXX ms
⏱️   TOTAL login time: XXX.XXX ms
```


---

## 🔧 6. OPTIMALIZÁCIA

### Zmeň bcrypt salt rounds z 12 na 10:

**Možnosť A: V .env súbore**

```bash
# apps/auth-service/.env
BCRYPT_SALT_ROUNDS=10
```

**Možnosť B: Priamo v kóde**

```typescript
// src/config/config.ts (riadok 82)
bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
//                                                            ^^ zmeň z '12' na '10'
```

### Reštartuj server

```powershell
# Zastav server (Ctrl+C) a spusti znova
pnpm dev
```

---

## 📈 7. MERANIE PO OPTIMALIZÁCII (10 salt rounds)

Zopakuj všetky kroky z kroku 5:

### 7a. Load test
```powershell
pnpm load:login
```

### 7b. Benchmark
```powershell
node dist/scripts/login-benchmark.js
```

### 7c. Console.time() merania
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"; "x-context"="platform"} -Body '{"username":"profiling_test_user","password":"TestPassword123!"}'
```

Porovnaj bcrypt čas s predšlým meraním.


## ✅ 8. ZÁVER

### Splnené kritériá:

-  **Bottleneck identifikovaný**: `bcrypt.compare` (~60% času operácie)
-  **Meranie pred/po**
-  **Zlepšenie**:  zníženie latencií, zvýšenie throughputu


---

## 🛠️ Troubleshooting

### Server sa nespustí
```powershell
# Skontroluj či je DB pripojená
pnpm db:studio
```

### Test user už existuje
```
 Test user 'profiling_test_user' already exists
```
To je OK! Môžeš pokračovať s testami.

### Autocannon errors
Uisti sa, že:
1. Server beží na porte 3001
2. Test user existuje
3. Database je prístupná

---

## 📚 Ďalšie príkazy

```powershell
# Vyčistiť DB
pnpm db:clean

# Znova vytvoriť test usera
pnpm seed:test-user
```

---

## 🎓 Tips pre presné meranie

1. **Zatvor ostatné aplikácie** - minimalizuj background procesov
2. **Opakuj 2-3x** - vezmi median hodnôt
3. **Čakaj na warmup** - prvých 5-10s môže byť nestabilných
4. **Stabilné prostredie** - rovnaká DB, rovnaký hardware
5. **Logovanie** - sleduj terminal pre chyby počas testov

---

