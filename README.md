# 🚀 Fuel-Track-360 (FT360)

> Digital backbone for Haiti-based fuel distributors — Offline-first, GCP-native, multilingual

[![API CI](https://github.com/YOUR_USERNAME/fuel-track-360/actions/workflows/ci-api.yml/badge.svg)](https://github.com/YOUR_USERNAME/fuel-track-360/actions/workflows/ci-api.yml)
[![Mobile CI](https://github.com/YOUR_USERNAME/fuel-track-360/actions/workflows/ci-mobile.yml/badge.svg)](https://github.com/YOUR_USERNAME/fuel-track-360/actions/workflows/ci-mobile.yml)
[![Web CI](https://github.com/YOUR_USERNAME/fuel-track-360/actions/workflows/ci-web.yml/badge.svg)](https://github.com/YOUR_USERNAME/fuel-track-360/actions/workflows/ci-web.yml)

---

## 📋 Overview

Fuel-Track-360 is an enterprise SaaS platform for fuel logistics management, built for the challenging connectivity conditions of Haiti. The system provides:

- **Safe to Load (S2L)** — Mandatory compliance gate before fuel truck dispatch
- **Fleet Tracking** — Real-time GPS tracking with geofencing
- **Offline-First Architecture** — Full functionality with zero internet access
- **Multilingual** — French (primary), English, Haitian Creole

## 📚 Documentation

For detailed technical documentation, including API modules, frontend structure, and entity relationships, please refer to [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md).

## 🏗️ Architecture

```
fuel-track-360/
├── packages/shared/    # Shared TypeScript types & constants
├── mobile/             # Flutter — Android field app (offline-first)
├── api/                # NestJS — Backend API (Cloud Run)
├── web/                # Next.js — Supervisor Dashboard (Cloud Run)
└── infra/              # Terraform + Docker + Scripts
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Flutter (Dart) + Drift (SQLite) + Riverpod |
| API | NestJS (TypeScript) + TypeORM + PostgreSQL |
| Web | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Auth | Firebase Authentication (Phone OTP + Email) |
| Database | Cloud SQL PostgreSQL 15 + PostGIS |
| Storage | Google Cloud Storage |
| Hosting | Cloud Run (auto-scaling) |
| IaC | Terraform |
| CI/CD | GitHub Actions + Cloud Build |

---

## 🚀 Quick Start

### Prerequisites

- Node.js v20+
- Flutter SDK 3.x
- Docker & Docker Compose
- Google Cloud SDK (`gcloud`)
- Terraform CLI
- Firebase CLI (`firebase-tools`)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/fuel-track-360.git
cd fuel-track-360

# Install shared package
cd packages/shared && npm install && npm run build && cd ../..

# Install API
cd api && npm install && cd ..

# Install Web
cd web && npm install && cd ..

# Install Mobile
cd mobile && flutter pub get && cd ..
```

### 2. Local Development

```bash
# Start Firebase emulators (auth)
firebase emulators:start --only auth

# Start API (development mode)
cd api
cp .env.example .env  # Edit with your local values
npm run start:dev

# Start Web dashboard
cd web
npm run dev

# Start Mobile (Android emulator required)
cd mobile
flutter run
```

### 3. Environment Variables

Copy `.env.example` to `.env` in the `/api` directory and configure:

```env
DATABASE_URL=postgresql://ft360_app:password@localhost:5432/ft360
FIREBASE_PROJECT_ID=fuel-track-360
GCS_BUCKET_PHOTOS=ft360-photos
GCS_BUCKET_SIGNATURES=ft360-signatures
```

---

## 📱 Modules

### Safe to Load (S2L)

The S2L module enforces safety compliance before any fuel truck dispatch:

1. ✅ Complete all checklist items (all must pass)
2. 📸 Capture minimum 3 photos (FRONT, REAR, + one more)
3. ✍️ Digital signature
4. 📍 GPS verification against geofence
5. 🔄 Works fully offline — syncs when connected

### Fleet Tracking

Real-time GPS tracking with intelligent geofencing:

- Background GPS logging even when app is minimized
- Geofence validation for S2L and discharge operations
- Route replay and history
- Speed and heading tracking

---

## 🌍 Localization

The application supports three languages:

| Code | Language | Usage |
|------|----------|-------|
| `fr` | French | Primary — all UI and documentation |
| `en` | English | Secondary — admin/technical users |
| `ht` | Haitian Creole | Field workers and drivers |

---

## 🔐 Roles

| Role | Permissions |
|------|-------------|
| `DRIVER` | Create/submit S2L, view own manifests, GPS tracked |
| `DISPATCHER` | + Create manifests, view fleet map |
| `SUPERVISOR` | + Approve/reject S2L, view all fleet & audit |
| `FINANCE` | Read-only operations, financial reports (MFA) |
| `ADMIN` | + Manage users/stations/trucks, system config (MFA) |
| `OWNER` | Full access including organization settings (MFA) |

---

## 📦 Deployment

### GCP Resources

```bash
# Initialize Terraform
cd infra/terraform
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars

# Deploy API
cd ../../api
./scripts/deploy-api.sh

# Deploy Web
cd ../web
./scripts/deploy-web.sh
```

### Generate Android APK

```bash
cd mobile
flutter build apk --release
# APK at: build/app/outputs/flutter-apk/app-release.apk
```

---

## 🧪 Testing

```bash
# API tests
cd api && npm test

# Web tests
cd web && npm test

# Mobile tests
cd mobile && flutter test
```

---

## 📄 License

Proprietary — All rights reserved.

---

*Phase 1 — Foundation | February 2026*
