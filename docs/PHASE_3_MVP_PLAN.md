# FT360 — Phase 3: MVP Validation & Pilot Launch Plan

> **Date:** February 18, 2026
> **Status:** Phase 3A — Code Completion In Progress
> **Goal:** Validate the MVP with a real fuel logistics operator in Haiti

---

## 📍 Where We Are (Phases 1–2 Complete)

### ✅ Built & Compiling
| Layer | What's Done |
|-------|-------------|
| **API (NestJS)** | Auth, S2L CRUD, photo upload to GCS, Swagger docs, sync batch endpoint, audit logging, geofence guard |
| **Mobile (Flutter)** | Offline-first Drift DB, S2L checklist with real camera + 70% JPEG compression, sync engine with exponential backoff, photo upload service |
| **Web (Next.js)** | Dashboard with real API data, S2L list with approve/reject mutations, React Query hooks, Firebase auth |
| **Infra (Terraform)** | Cloud Run, Cloud SQL (Postgres), GCS buckets, VPC, Secret Manager |

### ⚠️ Known Gaps (Must Fix Before Pilot)
1. ~~S2L screen needs `ConsumerStatefulWidget` conversion for full Drift DB persistence~~ ✅
2. ~~Signature capture widget not wired (package is in pubspec)~~ ✅
3. ~~Payload validation on sync service~~ ✅
4. `flutter pub get` + `build_runner build` needed for Drift codegen
5. PostGIS geofencing (currently Haversine in JS)

---

## 🚀 Phase 3: MVP Validation Roadmap

### Phase 3A — Code Completion (1–2 weeks)

**Priority 1: Complete the Mobile Offline Flow**
- [x] Convert `S2LChecklistScreen` to `ConsumerStatefulWidget`
- [x] Wire `_submitS2L()` to actually write to Drift DB + SyncQueue
- [x] Insert photos into `S2lPhotos` table with local paths
- [x] Wire the `SignaturePad` widget for real signature capture (`signature: ^5.5.0`)
- [x] Save signature to local file → queue for upload
- [x] Add `syncNow()` to SyncEngine for immediate sync after submission
- [ ] Test full offline → online sync cycle

**Priority 2: Harden the API**
- [x] Add `class-validator` DTOs to the sync batch endpoint (`SyncBatchDto`, `SyncOperationDto`)
- [x] Add payload size limits (5MB JSON body limit in `main.ts`)
- [x] Add DTOs for S2L submit/review endpoints (`SubmitS2LDto`, `ReviewS2LDto`)
- [x] Add rate limiting (`@nestjs/throttler`: 100 req/min default, 20 req/min for sync)
- [ ] Implement proper error codes (not just 500s)
- [x] Add health check endpoint (`GET /health`)

**Priority 3: Complete the Dashboard**
- [x] S2L detail view (click a row → see photos, checklist items, signature, timeline)
- [x] Photo viewer with signed URL loading from GCS
- [x] Basic manifest list page (connected to API with filters)
- [ ] User management page (list users, roles)
- [ ] Organization settings page

**Priority 4: Infrastructure**
- [ ] Set up staging environment on GCP
- [ ] Configure CI/CD (GitHub Actions → Cloud Run)
- [ ] Set up error monitoring (Sentry or Cloud Error Reporting)
- [ ] Set up structured logging (Cloud Logging)
- [ ] Configure database backups (automated Cloud SQL backups)

---

### Phase 3B — Testing Strategy (1 week, parallel with 3A)

#### 1. Unit Tests

**API (NestJS):**
```bash
# Run from /api
npm test
```

| Test | What to verify |
|------|---------------|
| `s2l.service.spec.ts` | S2L creation with dedup (same sync_id), status transitions (DRAFT→SUBMITTED→APPROVED), photo minimum enforcement, signature requirement |
| `storage.service.spec.ts` | GCS upload mock, signed URL generation, path format |
| `sync.service.spec.ts` | Batch processing, conflict detection, idempotency |

**Mobile (Flutter):**
```bash
# Run from /mobile
flutter test
```

| Test | What to verify |
|------|---------------|
| `photo_service_test.dart` | Compression output size < 500KB, file format is JPEG, cleanup works |
| `sync_engine_test.dart` | Queue processing order (FIFO), retry logic, backoff timing, photo upload integration |
| `database_test.dart` | S2L insert/query, photo foreign key relationship, sync status tracking |

#### 2. Integration Tests

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Happy Path S2L** | Create S2L → Add 3 photos → Sign → Submit → Approve | Status goes DRAFT→SUBMITTED→APPROVED, photos visible in GCS |
| **Offline Submit** | Turn off WiFi → Complete S2L → Turn on WiFi | S2L + photos sync within 60s of reconnect |
| **Conflict Resolution** | Submit same sync_id twice | Second request returns existing record (idempotent) |
| **Photo Compression** | Take 4K photo from camera | Uploaded file < 500KB, dimensions ≤ 1280px |
| **Auth Flow** | Login → API calls → Token expiry → Auto-refresh | Seamless re-auth without user interaction |
| **Rejection Flow** | Submit S2L → Supervisor rejects → Driver sees rejection | Driver gets notification, can create new S2L |

#### 3. End-to-End (E2E) Testing

**Manual Test Script for Field Testing:**

```
┌─────────────────────────────────────────────────────┐
│  E2E Test: Driver Daily Workflow                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Driver logs in on mobile                         │
│  2. Arrives at terminal                              │
│  3. GPS auto-detects station (geofence check)        │
│  4. Opens S2L → selects truck                        │
│  5. Completes 20-item checklist                      │
│  6. Takes 3+ photos (FRONT, REAR, COMPARTMENT)      │
│  7. Signs on screen                                  │
│  8. Submits S2L                                      │
│  9. Supervisor sees S2L on web dashboard             │
│ 10. Supervisor approves/rejects with notes           │
│ 11. Driver receives result                           │
│                                                      │
│  Timing target: < 8 minutes total                    │
│  Network: Test on both WiFi and 3G                   │
└─────────────────────────────────────────────────────┘
```

#### 4. Performance & Stress Testing

| Metric | Target | How to test |
|--------|--------|-------------|
| Photo upload (3G) | < 15s per photo | Throttle network to 500kbps |
| S2L submission (offline → sync) | < 60s after reconnect | Toggle airplane mode |
| API response time (S2L list) | < 500ms for 100 records | Apache Bench or k6 |
| Dashboard load time | < 3s initial, < 1s subsequent | Lighthouse audit |
| Concurrent users | 50 simultaneous drivers | k6 load test |
| Database query (with joins) | < 100ms | PostgreSQL EXPLAIN ANALYZE |

---

### Phase 3C — KPIs & Success Metrics

#### Technical KPIs (measure during pilot)

| KPI | Target | How to Measure | Why It Matters |
|-----|--------|----------------|----------------|
| **Sync Success Rate** | > 98% | Count COMPLETED vs FAILED in sync_queue | Core reliability metric — if sync fails, data is lost |
| **Photo Upload Success Rate** | > 95% | Count synced vs unsynced in s2l_photos | Photos are the compliance evidence |
| **Average Photo Size** | 200–400 KB | AVG(file_size_bytes) from s2l_photos | Too large = slow uploads in Haiti, too small = useless quality |
| **Sync Latency (offline→server)** | < 5 minutes | processed_at - queued_at in sync_queue | How quickly does data reach supervisors |
| **API Error Rate** | < 1% | 5xx responses / total responses | Server stability |
| **API P95 Latency** | < 1s | Cloud Run metrics | User experience |
| **App Crash Rate** | 0 crashes / day | Firebase Crashlytics | Mobile stability |
| **Database Size Growth** | < 50MB / driver / month | Drift DB file size | Storage management on low-end devices |

#### Business KPIs (measure during pilot)

| KPI | Target | How to Measure | Why It Matters |
|-----|--------|----------------|----------------|
| **S2L Completion Rate** | > 90% of departures | S2L records created vs scheduled departures | Compliance adoption |
| **Time to Complete S2L** | < 8 minutes | submitted_at - created_at | Driver doesn't want to spend 20min on paperwork |
| **Supervisor Review Time** | < 2 hours | reviewed_at - submitted_at | Bottleneck detection |
| **Rejection Rate** | < 15% | REJECTED count / total submitted | If too high, training issue; if too low, rubber-stamping |
| **Daily Active Users** | 100% of active drivers | Firebase Analytics daily active users | Adoption rate |
| **Offline Usage %** | Track only | Percentage of S2Ls created offline | Validates the offline-first architecture investment |

#### SQL Queries to Pull KPIs

```sql
-- Sync success rate (last 7 days)
SELECT
  COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / COUNT(*) AS sync_success_pct,
  COUNT(*) AS total_syncs
FROM sync_queue
WHERE queued_at > NOW() - INTERVAL '7 days';

-- Average photo size and upload time
SELECT
  ROUND(AVG(file_size_bytes) / 1024.0) AS avg_kb,
  MIN(file_size_bytes / 1024) AS min_kb,
  MAX(file_size_bytes / 1024) AS max_kb,
  COUNT(*) AS total_photos
FROM s2l_photos
WHERE uploaded_at > NOW() - INTERVAL '7 days';

-- S2L completion time
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM (submitted_at - created_at)) / 60.0), 1) AS avg_minutes,
  COUNT(*) AS submitted_count
FROM s2l_checklists
WHERE status IN ('SUBMITTED', 'APPROVED', 'REJECTED')
  AND submitted_at > NOW() - INTERVAL '7 days';

-- Supervisor review time
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600.0), 1) AS avg_hours,
  COUNT(*) AS reviewed_count
FROM s2l_checklists
WHERE reviewed_at IS NOT NULL
  AND reviewed_at > NOW() - INTERVAL '7 days';

-- Rejection rate
SELECT
  COUNT(*) FILTER (WHERE status = 'REJECTED') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('APPROVED', 'REJECTED')), 0) AS rejection_pct
FROM s2l_checklists
WHERE reviewed_at > NOW() - INTERVAL '7 days';
```

---

## 📋 Your Personal Action Checklist

### This Week (Feb 18–24)
- [ ] Run `flutter pub get` in `/mobile`
- [ ] Run `flutter pub run build_runner build` to regenerate Drift files
- [x] Convert S2L screen to `ConsumerStatefulWidget` ✅
- [ ] Test the API locally: `docker-compose up` → Swagger at `localhost:3000/api/docs`
- [ ] Create a test Firebase project if you haven't already
- [ ] Create 2 test users in Firebase Auth (1 driver, 1 supervisor)
- [ ] Set `GCS_BUCKET_PHOTOS` in your `.env` to a real GCS bucket

### Next Week (Feb 25–Mar 3)
- [ ] Run the full E2E test script above (driver flow → supervisor approval)
- [ ] Test offline flow: airplane mode → create S2L → reconnect → verify sync
- [ ] Take 10 test photos and verify compression (check file sizes in GCS)
- [ ] Set up Sentry or Firebase Crashlytics for error monitoring
- [ ] Deploy to staging on GCP: `terraform apply` + Cloud Run deploy

### Pilot Prep (Mar 3–10)
- [ ] Identify 1 fuel logistics company in Haiti for pilot
- [ ] Target: 3–5 drivers, 1–2 supervisors, 1 admin
- [ ] Install the Flutter app on driver phones (APK sideload or Firebase App Distribution)
- [ ] Give supervisors access to the web dashboard
- [ ] Create a 1-page "quick start" guide in French/Creole
- [ ] Set up a WhatsApp group for pilot feedback

### During Pilot (Mar 10–31, 3 weeks)
- [ ] Monitor KPI dashboard daily (build a simple admin page or use SQL queries above)
- [ ] Collect feedback via WhatsApp group
- [ ] Track and fix bugs within 24 hours
- [ ] Weekly summary: KPIs + user feedback + bugs fixed
- [ ] At week 3: decide GO/NO-GO for wider rollout

---

## 🗺️ Phase 4 Preview (Post-Pilot)

Once the MVP pilot validates the core S2L flow, Phase 4 focuses on the **full delivery lifecycle**:

| Feature | Priority | Description |
|---------|----------|-------------|
| **Manifest Management** | 🔴 Critical | Full loading → transit → discharge → reconciliation flow |
| **Live Fleet Tracking** | 🔴 Critical | WebSocket-powered real-time map on dashboard |
| **Fuel Variance Alerts** | 🟡 High | Auto-flag deliveries with >2% volume variance |
| **Driver Scorecards** | 🟡 High | Performance metrics per driver (completion time, rejection rate) |
| **Multi-org Tenancy** | 🟡 High | Onboard multiple fuel companies |
| **Push Notifications** | 🔵 Medium | Notify drivers of approval/rejection, supervisors of new submissions |
| **Offline Maps** | 🔵 Medium | Download Haiti road maps for offline navigation |
| **PDF Reports** | 🔵 Medium | Generate compliance reports for regulatory bodies |
| **Billing & Subscription** | 🔵 Medium | Stripe integration for SaaS billing |

---

## 🏗️ Recommended Architecture for Scale

```
Current (MVP):                    Target (Scale):
1 Cloud Run instance              3+ Cloud Run instances (auto-scaling)
1 Cloud SQL (single zone)         Cloud SQL HA (multi-zone)
1 GCS bucket                      GCS with CDN (Cloud CDN)
No caching                        Redis (Memorystore) for sessions + cache
No queue                          Cloud Tasks for async photo processing
No monitoring                     Cloud Monitoring + Sentry + PagerDuty
Manual deploy                     GitHub Actions CI/CD
```

---

*This document is the source of truth for Phase 3 planning. Update it as tasks are completed.*
