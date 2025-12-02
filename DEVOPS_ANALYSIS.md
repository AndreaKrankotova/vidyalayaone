# DevOps Analýza Projektu VidyalayaOne

**Autor:** Andrea Krankotova  
**Dátum:** 25. november 2025  
**Branch:** feat/profiling

---

## 1. GitHub Actions

**Názov služby:** GitHub Actions  
**Fázy vývoja:** Continuous Integration (CI) + Continuous Deployment (CD)

**Čo to je:**  
GitHub Actions je automatizačný nástroj zabudovaný priamo v GitHub-e. Umožňuje vytvárať automatické pracovné postupy (workflows), ktoré sa spúšťajú pri určitých udalostiach (napr. push kódu, vytvorenie pull requestu).

**Na čo sa používa:**  
Automatizuje proces od napísania kódu po nasadenie na produkciu. Ušetrí čas vývojárom — namiesto manuálneho buildovania a nasadzovania aplikácií GitHub Actions to spraví automaticky pri každom push-e do main vetvy.

**Ako sa používa v projekte:**
- **Build fáza:**
  - Checkout kódu z repository
  - Autentifikácia s GCP pomocou service account (`GCP_SA_KEY` secret)
  - Setup gcloud CLI
  - Konfigurácia Docker pre GCP Artifact Registry (`gcloud auth configure-docker`)
  - Build Docker obrazov s production Dockerfile: `docker build -f apps/*/Dockerfile.prod -t *:prod .`
  - Tag obrazov: `docker tag *:prod asia-south2-docker.pkg.dev/vidyalayaone/vidyalayaone-repo/*:latest`

- **Deploy fáza:**
  - Push Docker obrazov do GCP Artifact Registry
  - Inštalácia kubectl a gke-gcloud-auth-plugin
  - Získanie credentials pre GKE cluster
  - Rollout restart deployment v Kubernetes: `kubectl rollout restart deployment/*-deployment -n vidyalayaone-prod`

- **Trigger:**
  - Push na `main` vetvu
  - Zmeny v cestách: `apps/*/**`, `packages/**`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `package.json`, `tsconfig.base.json`

- **Konfiguračné súbory:**
  - `.github/workflows/auth-service-cicd.yml`
  - `.github/workflows/api-gateway-cicd.yml`
  - `.github/workflows/attendance-service-cicd.yml`
  - `.github/workflows/profile-service-cicd.yml`
  - `.github/workflows/school-service-cicd.yml`
  - `.github/workflows/platform-frontend-cicd.yml`
  - `.github/workflows/school-frontend-cicd.yml`

- **Runner:** `ubuntu-latest`
- **Environment:** `production`

---

## 2. Docker

**Názov služby:** Docker  
**Fázy vývoja:** Build, Containerization, Local Development, Production Deployment

**Čo to je:**  
Docker je nástroj, ktorý balí aplikáciu a všetky jej závislosti do "kontajnera" — ako prepravný kontajner na loď. Kontajner obsahuje všetko potrebné na beh aplikácie (kód, knižnice, nastavenia), takže funguje rovnako na každom počítači.

**Na čo sa používa:**  
Zaručuje, že aplikácia bude fungovať rovnako na lokálnom počítači vývojára, na testovacom serveri aj v produkcii. Odstraňuje problém "u mňa to funguje, ale na serveri nie". Uľahčuje nasadenie a škálovanie aplikácií.

**Ako sa používa v projekte:**

### Development Dockerfile (`Dockerfile`)
- **Účel:** Lokálny vývoj s hot-reload
- **Base image:** `node:22.16.0-alpine`
- **Proces:**
  - Inštalácia pnpm cez corepack (`pnpm@10.12.1`)
  - Copy root package files + packages + service kód
  - `pnpm install --frozen-lockfile`
  - Build shared packages: `pnpm build:packages`
  - Prisma client generation: `pnpm db:generate`
  - Dev command: `pnpm dev` (ts-node-dev s hot-reload)
- **Použitie:** Lokálne testovanie a vývoj

### Production Dockerfile (`Dockerfile.prod`)
- **Účel:** Optimalizovaný production build
- **Base image:** `node:22-alpine`
- **Multi-stage build:**
  1. **base stage:** Node.js + pnpm setup + non-root user (appuser)
  2. **deps stage:** Inštalácia všetkých dependencies
  3. **build stage:** 
     - Build shared packages
     - Copy service source
     - `pnpm db:generate` + `pnpm run build` (TypeScript → JavaScript)
  4. **prune stage:** `pnpm deploy --filter=@vidyalayaone/* --prod` (iba production deps)
  5. **production stage:**
     - Copy pruned deps + built dist + prisma client
     - Non-root user execution
     - Healthcheck: `curl -f http://localhost:*/health`
     - Command: `node dist/server.js`

- **Security:**
  - Non-root user (uid 1001, gid 1001)
  - Minimálny image size
  - Health checks pre Kubernetes

- **Optimalizácie:**
  - Layer caching
  - Viacstupňový build
  - Len production dependencies v runtime image

---

## 3. Kubernetes (Google Kubernetes Engine)

**Názov služby:** Kubernetes (GKE)  
**Fázy vývoja:** Container Orchestration, Deployment, Scaling, Service Discovery, Load Balancing

**Čo to je:**  
Kubernetes (skrátene K8s) je systém na správu Docker kontajnerov. Je to ako dirigent orchestra — riadi, kedy a kde sa kontajnery spúšťajú, automaticky ich reštartuje pri páde, distribuuje záťaž medzi viacero kópií aplikácie. GKE je verzia Kubernetes spravovaná Google Cloud.

**Na čo sa používa:**  
Automaticky spravuje veľké množstvo kontajnerov v produkcii. Ak aplikácia spadne, Kubernetes ju automaticky reštartuje. Ak je veľká záťaž, dokáže automaticky pridať viac kópií aplikácie. Zabezpečuje vysokú dostupnosť (aplikácia beží non-stop).

**Ako sa používa v projekte:**

### Cluster konfigurácia
- **Cluster name:** `vidyalayaone-cluster`
- **Zone:** `asia-south2-a`
- **Project:** `vidyalayaone`
- **Namespace:** `vidyalayaone-prod`

### Deployments (7 služieb)
**Príklad: `auth-service-deployment`**
```yaml
replicas: 2  # High availability
selector:
  matchLabels:
    app: auth-service
```

**Container spec:**
- **Image:** `asia-south2-docker.pkg.dev/vidyalayaone/vidyalayaone-repo/auth-service:latest`
- **ImagePullPolicy:** Always
- **Port:** 3001
- **Environment:**
  - ConfigMap: `auth-service-config`
  - Secret: `auth-service-secret`

**Health checks:**
- **Readiness probe:**
  - HTTP GET `/health` port 3001
  - initialDelaySeconds: 5
  - periodSeconds: 10
  - failureThreshold: 3
- **Liveness probe:**
  - HTTP GET `/health` port 3001
  - initialDelaySeconds: 10
  - periodSeconds: 20
  - failureThreshold: 5

**Resources:**
- **Requests:** CPU 100m, Memory 128Mi
- **Limits:** CPU 500m, Memory 512Mi

### Services
- **Type:** ClusterIP (internal communication)
- **Port mapping:** Service port → Container port

### Ingress
- **Class:** `gce` (Google Cloud Load Balancer)
- **Static IP:** `vidyalayaone-cluster-ip`
- **TLS:**
  - Hosts: `vidyalayaone.com`, `www.vidyalayaone.com`, `*.vidyalayaone.com`
  - Secret: `vidyalayaone-cert`
- **Routing:**
  - `/` → platform-frontend / school-frontend
  - `/api/` → api-gateway

### ConfigMaps
- Uloženie environment variables pre každú službu
- Súbory: `k8s-manifests/configmaps/*-config.yaml`

---

## 4. Google Cloud Platform (GCP)

**Názov služby:** Google Cloud Platform  
**Fázy vývoja:** Cloud Infrastructure, Container Registry, Managed Services

**Čo to je:**  
GCP je cloudová platforma od Google — súbor služieb a nástrojov na hosting aplikácií, úložisko dát, servery a infraštruktúru. Je to ako prenájom výkonných počítačov a služieb od Google namiesto vlastných serverov.

**Na čo sa používa:**  
Hosting celého projektu v cloude (aplikácie bežia na Google serveroch). Poskytuje úložisko Docker obrazov (Artifact Registry), spravované Kubernetes klastre (GKE), databázy, load balancery a ďalšie služby. Platí sa len za to, čo sa používa.

**Ako sa používa v projekte:**

### GCP Artifact Registry
- **Účel:** Docker image registry
- **Location:** `asia-south2-docker.pkg.dev`
- **Repository:** `vidyalayaone/vidyalayaone-repo`
- **Images:** 
  - `auth-service:latest`
  - `api-gateway:latest`
  - `attendance-service:latest`
  - `profile-service:latest`
  - `school-service:latest`
  - `platform-frontend:latest`
  - `school-frontend:latest`

### GKE (Google Kubernetes Engine)
- **Managed Kubernetes cluster**
- **Auto-scaling**
- **Integration s Cloud Load Balancing**

### IAM & Security
- **Service Account:** Pre CI/CD authentication
- **Secret:** `GCP_SA_KEY` v GitHub Secrets
- **Permissions:** Push do Artifact Registry, deploy na GKE

### Networking
- **Static IP:** `vidyalayaone-cluster-ip`
- **TLS Certificates:** Managed certificates pre HTTPS
- **Load Balancer:** Automaticky cez Ingress

---


## Súhrn DevOps Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPER WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Git Push → GitHub (main branch)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions CI/CD Pipeline                                  │
│  • Checkout code                                                │
│  • Authenticate with GCP                                        │
│  • Configure Docker for Artifact Registry                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  BUILD STAGE                                                    │
│  • Docker build (multi-stage Dockerfile.prod)                   │
│    - pnpm install (deps)                                        │
│    - pnpm build:packages (shared packages)                      │
│    - prisma generate (DB client)                                │
│    - tsc (TypeScript → JavaScript)                              │
│    - pnpm deploy --prod (prune deps)                            │
│  • Docker tag for registry                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  REGISTRY STAGE                                                 │
│  • Push to GCP Artifact Registry                                │
│    asia-south2-docker.pkg.dev/vidyalayaone/...                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT STAGE                                               │
│  • Install kubectl + gke-gcloud-auth-plugin                     │
│  • Get GKE cluster credentials                                  │
│  • kubectl rollout restart deployment                           │
│    (vidyalayaone-cluster / vidyalayaone-prod namespace)         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  KUBERNETES ORCHESTRATION                                       │
│  • Pull new image from Artifact Registry                        │
│  • Rolling update (2 replicas)                                  │
│  • Health checks (readiness + liveness probes)                  │
│  • ConfigMaps & Secrets injection                               │
│  • Service discovery (ClusterIP)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  INGRESS & LOAD BALANCING                                       │
│  • Google Cloud Load Balancer (GCE Ingress)                     │
│  • TLS termination (vidyalayaone.com + subdomains)              │
│  • Routing:                                                     │
│    - / → Frontend services (platform/school)                    │
│    - /api/ → API Gateway                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCTION (vidyalayaone.com)                                  │
│  ✓ High availability (replicas: 2)                              │
│  ✓ Auto-healing (Kubernetes restarts)                           │
│  ✓ Health monitoring (liveness + readiness probes)              │
│  ✓ HTTPS enabled (TLS certificates)                             │
│  ✓ Zero-downtime deployment (rolling updates)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Záver

Projekt VidyalayaOne má DevOps infraštruktúru postavenú na moderných cloudových technológiách:

### **Hlavné DevOps nástroje:**
-  **CI/CD:** GitHub Actions — plne automatizovaný deployment pipeline
-  **Containerizácia:** Docker — multi-stage builds, security best practices
-  **Orchestrácia:** Kubernetes (GKE) — high availability, auto-healing, scaling
-  **Cloud Infrastructure:** Google Cloud Platform — Artifact Registry, GKE, Load Balancing

### **Vlastnosti pipeline:**
- **Automatizovaný:** Push na main → automatický deployment do produkcie
- **Bezpečný:** Non-root kontajnery, secrets management, TLS encryption
- **Škálovateľný:** Kubernetes auto-scaling, load balancing
- **Spoľahlivý:** Health checks, rolling updates, zero-downtime deployment
- **Optimalizovaný:** Multi-stage builds, image layer caching, production-only dependencies


Pipeline je production-ready a pokrýva všetky základné DevOps praktiky moderného cloud-native projektu.

