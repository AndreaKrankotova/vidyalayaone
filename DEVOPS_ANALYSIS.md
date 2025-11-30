# DevOps Analýza Projektu VidyalayaOne

**Autor:** Andrea Krankotova  
**Dátum:** 25. november 2025  
**Branch:** feat/profiling

---

## 1. GitHub Actions

**Názov služby:** GitHub Actions  
**Fázy vývoja:** Continuous Integration (CI) + Continuous Deployment (CD)

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

**Ako sa používa v projekte:**

### Development Dockerfile (`Dockerfile`)
- **Účel:** Lokálny vývoj s hot-reload
- **Base image:** `node:22.16.0-alpine`
- **Proces:**
  - Inštalácia pnpm cez corepack
  - Copy root package files + packages + service kód
  - `pnpm install --frozen-lockfile`
  - Build shared packages: `pnpm build:packages`
  - Prisma client generation: `pnpm db:generate`
  - Dev command: `pnpm dev` (ts-node-dev s hot-reload)
- **Použitie:** Lokálne testovanie a vývoj

### Production Dockerfile (`Dockerfile.prod`)
- **Účel:** Optimalizovaný production build
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

## 5. pnpm Workspaces

**Názov služby:** pnpm Workspaces  
**Fázy vývoja:** Dependency Management, Build Orchestration, Monorepo Management

**Ako sa používa v projekte:**

### Workspace štruktúra
```yaml
packages:
  - apps/*
  - packages/*
```

### Shared packages
- `@vidyalayaone/common-middleware`
- `@vidyalayaone/common-utils`
- `@vidyalayaone/logger`

**Workspace protocol:** `workspace:*` v dependencies

### Build orchestration
- **Build packages:** `pnpm run --recursive --filter "./packages/**" build`
- **Build all:** `pnpm -r run build`
- **Test all apps:** `pnpm --filter "./apps/*" run test`
- **Start specific app:** `pnpm --filter @vidyalayaone/$APP dev`

### Výhody v projekte
- Zdieľané závislosti (disk space saving)
- Konzistentné verzie naprieč workspace
- Fast installs
- Automatické linking medzi packages

### Konfiguračné súbory
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml` (lockfile pre reproducible builds)
- `package.json` (root scripts)

---

## 6. TypeScript

**Názov služby:** TypeScript Compiler  
**Fázy vývoja:** Build, Type Checking, Code Quality

**Ako sa používa v projekte:**

### Build process
- **Transpilation:** TypeScript → JavaScript
- **Command:** `tsc` (v každej službe)
- **Output:** `dist/` directory

### Shared konfigurácia
- **Base config:** `tsconfig.base.json` (root)
- **Extended configs:** Každá služba/package má vlastný `tsconfig.json`

### Type checking
- **Development:** Automaticky v IDE
- **Build time:** `tsc --noEmit` pre type checking bez output
- **Pre-build:** `rimraf dist` (cleanup)

### Test konfigurácia
- `tsconfig.test.json` pre Jest
- Separate config pre test files

---

## 7. Prisma ORM

**Názov služby:** Prisma  
**Fázy vývoja:** Database Management, Migrations, Code Generation, Seeding

**Ako sa používa v projekte:**

### Code Generation
- **Command:** `pnpm db:generate` → `prisma generate`
- **Output:** Prisma Client v `node_modules/@prisma/client`
- **Timing:** 
  - Development: Pri zmene schema
  - Build: V Dockerfile pred compilation
  - CI/CD: Part of build process

### Database Migrations
- **Development:** `pnpm db:migrate` → `prisma migrate dev`
- **Production:** `prisma migrate deploy` (v deployment process)
- **Reset:** `pnpm db:reset` → `prisma migrate reset`

### Database Studio
- **Command:** `pnpm db:studio` → `prisma studio --port 5556`
- **Účel:** GUI pre database management
- **Unique ports:** auth-service: 5556, profile-service: iný port

### Seeding
- **Command:** `pnpm db:seed`
- **Script:** `ts-node-dev prisma/seed.ts`
- **Účel:** Inicializácia testovacích/základných dát

### V Docker build
```dockerfile
RUN pnpm db:generate  # Generuje Prisma Client
COPY prisma ./prisma  # Copy schema + migrations
COPY node_modules/prisma ./node_modules/prisma  # Runtime prisma
```

### Schema files
- `apps/auth-service/prisma/schema.prisma`
- `apps/profile-service/prisma/schema.prisma`
- `apps/school-service/prisma/schema.prisma`
- `apps/attendance-service/prisma/schema.prisma`
- `apps/payment-service/prisma/schema.prisma`

---

## 8. Jest

**Názov služby:** Jest Testing Framework  
**Fázy vývoja:** Testing (Unit & Integration), Coverage Reporting

**Ako sa používa v projekte:**

### Test execution
- **Run tests:** `pnpm test` → `jest --passWithNoTests`
- **Watch mode:** `pnpm test:watch` → `jest --watch`
- **Coverage:** `pnpm test:coverage` → `jest --coverage`

### Konfigurácia
```typescript
preset: 'ts-jest'
testEnvironment: 'node'
testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts']
```

### TypeScript integration
- **Transformer:** `ts-jest`
- **Config:** `tsconfig.test.json`
- **Module extensions:** ts, js, json

### Coverage
- **Collect from:** `src/**/*.ts`
- **Ignore:** `src/**/*.d.ts`, `/node_modules/`, `/dist/`
- **Output:** `coverage/` directory

### V CI/CD pipeline
- Part of `pnpm --filter "./apps/*" run test` (root script)
- Runs v GitHub Actions pri každom push

### Konfiguračné súbory
- `apps/auth-service/jest.config.ts`
- `apps/profile-service/jest.config.ts`

---

## 9. ESLint

**Názov služby:** ESLint  
**Fázy vývoja:** Code Quality, Linting, Static Analysis

**Ako sa používa v projekte:**

### Lint execution
- **Lint:** `pnpm lint` → `eslint src/**/*.ts` alebo `eslint .`
- **Auto-fix:** `pnpm lint:fix` → `eslint src/**/*.ts --fix`

### TypeScript integration
- **Parser:** `@typescript-eslint/parser`
- **Plugin:** `@typescript-eslint/eslint-plugin`

### React/Frontend specific
- **Plugins:**
  - `eslint-plugin-react-hooks`
  - `eslint-plugin-react-refresh`

### Konfiguračné súbory
- Backend: `apps/auth-service/.eslintrc.js`
- Frontend: `apps/platform-frontend/eslint.config.js`

### V development workflow
- IDE integration (real-time feedback)
- Pre-commit checks (môže byť)
- Part of code review process

---

## 10. Prettier

**Názov služby:** Prettier  
**Fázy vývoja:** Code Formatting

**Ako sa používa v projekte:**

### Format execution
- **Command:** `pnpm format` → `prettier --write src/**/*.ts`
- **Účel:** Automatické formátovanie kódu

### Výhody
- Konzistentný code style v celom projekte
- Eliminuje style debates v code reviews
- Automatická integrácia s IDE

### Konfiguračné súbory
- `apps/auth-service/.prettierrc`

---

## 11. Vite

**Názov služby:** Vite  
**Fázy vývoja:** Build Tool, Development Server (Frontend)

**Ako sa používa v projekte:**

### Development server
- **Command:** `pnpm dev` → `vite`
- **Port:** 8081 (platform-frontend), iný pre school-frontend
- **Features:**
  - Hot Module Replacement (HMR)
  - Fast refresh
  - Host: `::`  (IPv6)

### Build process
- **Production:** `pnpm build` → `vite build`
- **Development build:** `pnpm build:dev` → `vite build --mode development`
- **Output:** Optimalizovaný bundle

### Plugins
- **React:** `@vitejs/plugin-react-swc` (rýchla compilation)
- **Component Tagger:** `lovable-tagger` (development only)

### Path aliases
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

### Preview
- **Command:** `pnpm preview` → `vite preview`
- **Účel:** Test production build lokálne

### Konfiguračné súbory
- `apps/platform-frontend/vite.config.ts`
- `apps/school-frontend/vite.config.ts`

---

## 12. Git & GitHub

**Názov služby:** Git + GitHub  
**Fázy vývoja:** Version Control, Code Collaboration, Issue Tracking

**Ako sa používa v projekte:**

### Repository
- **Owner:** AndreaKrankotova
- **Name:** vidyalayaone
- **Current branch:** feat/profiling

### Branch strategy
- **Main branch:** `main` (production)
- **Feature branches:** `feat/*`
- **CI/CD trigger:** Push na `main`

### Issue tracking
- **Issue templates:** `.github/ISSUE_TEMPLATE/simple_issue_template.md`
- **Purpose:** Štandardizované reportovanie bugov a feature requests

### .gitignore
**Vylúčené:**
- `node_modules/`
- `.env` súbory (okrem `.env.example`)
- Build artifacts: `dist/`, `build/`, `.next/`
- Coverage: `coverage/`, `.nyc_output/`
- Logs: `*.log`
- Prisma generated: `**/src/generated/`
- Kubernetes secrets: `k8s-manifests/secrets/*`

### Code collaboration
- Pull requests
- Code reviews
- Branch protection (pravdepodobne na main)

---

## 13. Autocannon

**Názov služby:** Autocannon  
**Fázy vývoja:** Performance Testing, Load Testing, Benchmarking

**Ako sa používa v projekte:**

### Benchmark execution
- **Command:** `pnpm benchmark`
- **Process:**
  1. `pnpm build` (build production code)
  2. `node dist/scripts/login-benchmark.js`

### Použitie v auth-service
- **Script:** `apps/auth-service/scripts/login-benchmark.ts`
- **Účel:** Load testing login endpointu
- **Metriky:** Requests/sec, latency, throughput

### TypeScript support
- **Types:** `@types/autocannon`
- **Development:** TypeScript, Runtime: JavaScript

### Performance monitoring
- Identifikácia bottleneckov
- Validácia optimalizácií
- Regression testing

---

## 14. Nginx

**Názov služby:** Nginx  
**Fázy vývoja:** Web Server, Reverse Proxy, Static File Serving (Production)

**Ako sa používa v projekte:**

### V production Docker images (Frontend)
- **Účel:** Serving built React aplikácií
- **Process:**
  1. Build stage: Vite build → `dist/` directory
  2. Production stage: 
     - Base: `nginx:alpine`
     - Copy: `dist/` → `/usr/share/nginx/html`
     - Config: Custom nginx config

### Konfigurácia
- **SPA routing:** Redirect all requests → `index.html`
- **Static files:** Efficient serving
- **Gzip:** Compression (pravdepodobne)

### Konfiguračné súbory
- `apps/platform-frontend/nginx.default.conf`
- `apps/school-frontend/nginx.default.conf`

### Production deployment
- Nginx beží v frontend containers v Kubernetes
- Port 80 exposed
- Ingress → Nginx → Static files

---

## 15. Rimraf

**Názov služby:** Rimraf  
**Fázy vývoja:** Build Cleanup

**Ako sa používa v projekte:**

### Pre-build cleanup
- **Command:** `pnpm prebuild` → `rimraf dist`
- **Hook:** Runs automatically pred `pnpm build`
- **Účel:** 
  - Odstránenie starých build artifacts
  - Clean build environment
  - Zabránenie konfliktom starých/nových súborov

### Cross-platform
- Funguje na Windows, Linux, macOS
- Alternative k `rm -rf` (Unix) / `rmdir /s` (Windows)

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
│  • Docker build (multi-stage Dockerfile.prod)                  │
│    - pnpm install (deps)                                        │
│    - pnpm build:packages (shared packages)                     │
│    - prisma generate (DB client)                               │
│    - tsc (TypeScript → JavaScript)                             │
│    - pnpm deploy --prod (prune deps)                           │
│  • Docker tag for registry                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  REGISTRY STAGE                                                 │
│  • Push to GCP Artifact Registry                               │
│    asia-south2-docker.pkg.dev/vidyalayaone/...                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT STAGE                                               │
│  • Install kubectl + gke-gcloud-auth-plugin                    │
│  • Get GKE cluster credentials                                 │
│  • kubectl rollout restart deployment                          │
│    (vidyalayaone-cluster / vidyalayaone-prod namespace)       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  KUBERNETES ORCHESTRATION                                       │
│  • Pull new image from Artifact Registry                       │
│  • Rolling update (2 replicas)                                 │
│  • Health checks (readiness + liveness probes)                │
│  • ConfigMaps & Secrets injection                              │
│  • Service discovery (ClusterIP)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  INGRESS & LOAD BALANCING                                       │
│  • Google Cloud Load Balancer (GCE Ingress)                    │
│  • TLS termination (vidyalayaone.com + subdomains)            │
│  • Routing:                                                     │
│    - / → Frontend services                                     │
│    - /api/ → API Gateway                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCTION (vidyalayaone.com)                                  │
│  ✓ High availability (replicas)                                │
│  ✓ Auto-scaling                                                 │
│  ✓ Health monitoring                                            │
│  ✓ HTTPS enabled                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kontinuálne procesy

### Monitoring & Logging
- **Kubernetes health probes:** Automatická detekcia nefunkčných podov
- **Application logs:** Morgan HTTP logging, custom logger package
- **Error tracking:** Log files (`auth.log`, `profile.log`)

### Testing Strategy
- **Unit tests:** Jest (pri každom push)
- **Integration tests:** Jest
- **Load tests:** Autocannon benchmarks
- **Manual testing:** Prisma Studio pre DB inspection

### Code Quality Gates
1. **Pre-commit:** ESLint, Prettier (IDE level)
2. **CI/CD:** Tests (pass/fail)
3. **Code review:** GitHub Pull Requests
4. **Type safety:** TypeScript compilation

---

## Záver

Projekt VidyalayaOne má kompletnú DevOps infraštruktúru pokrývajúcu všetky fázy vývoja:

- ✅ **Version Control:** Git + GitHub
- ✅ **CI/CD:** GitHub Actions
- ✅ **Build:** Docker, TypeScript, Vite, pnpm
- ✅ **Test:** Jest, Autocannon
- ✅ **Quality:** ESLint, Prettier
- ✅ **Deploy:** Kubernetes (GKE), GCP Artifact Registry
- ✅ **Infrastructure:** Google Cloud Platform
- ✅ **Database:** Prisma migrations & code generation
- ✅ **Monitoring:** Health checks, logging

Pipeline je plne automatizovaný od git push až po produkčné nasadenie s rolling updates a zero-downtime deployment.
