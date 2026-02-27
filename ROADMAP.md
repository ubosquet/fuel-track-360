# FT360 — Product Roadmap & Implementation Plan

> **How to use this file:**
> Open this file at the start of a new session and say:
> _"Read ROADMAP.md and implement [Phase X / Feature Y]"_
> Everything needed to implement each item is documented here.
> Status markers: `[ ]` = not started · `[~]` = in progress · `[x]` = done

---

## Project Overview

**Fuel-Track-360 (FT360)** is a fuel logistics SaaS built for the Haitian market.
It digitizes the manual paper trail for bulk fuel delivery from terminals to stations.

**Stack:**
- `api/` — NestJS (TypeScript), TypeORM, PostgreSQL, Firebase Auth
- `web/` — Next.js 14 (App Router), React Query, Axios, Firebase Auth
- `mobile/` — Flutter (Dart), Riverpod, Drift (SQLite), offline-first sync engine
- `infra/` — Docker Compose (dev), GCP (prod via App Hosting/Cloud Run)

**Core business flow:**
1. Driver arrives at terminal → creates **S2L Checklist** (Safe-to-Load) on phone
2. Supervisor reviews & approves the S2L on the dashboard
3. Dispatcher creates a **Manifest** linked to the approved S2L
4. Truck loads fuel, drives to station, discharges
5. System tracks GPS, flags volume variances > 2%, maintains audit trail

**Current code quality:**
- 90/90 unit tests passing
- All security hardening complete (see `api/src` — no known critical issues)
- Phone-based GPS working end-to-end

---

## ✅ Phase 0 — Foundation (COMPLETE)

- [x] NestJS API with Firebase JWT authentication
- [x] Multi-tenant isolation (all queries scoped to `organization_id`)
- [x] S2L checklist lifecycle (DRAFT → SUBMITTED → APPROVED/REJECTED)
- [x] Manifest lifecycle with state machine (CREATED → LOADING → IN_TRANSIT → ARRIVED → DISCHARGING → COMPLETED/FLAGGED)
- [x] Phone-based GPS batching (`POST /fleet/gps/batch`)
- [x] Offline sync engine (Flutter ↔ API via `POST /sync/batch`)
- [x] Photo upload to GCS (camera on phone → GCS → metadata in DB)
- [x] Geofence validation (driver must be within radius of station to create S2L)
- [x] Audit journal (immutable event log for compliance)
- [x] `GET /audit` endpoint (SUPERVISOR/ADMIN/OWNER only, org-scoped)
- [x] PostgreSQL advisory lock for manifest number generation (race-condition safe)
- [x] Swagger API docs at `/api/docs`
- [x] Next.js dashboard with S2L list, fleet status, audit trail pages
- [x] Flutter app with S2L creation, signature capture, photo upload, offline queue

---

## 🔵 Phase 2a — Hardware GPS Device Integration

> **Context:** Currently GPS comes from the driver's phone (Flutter app → `POST /fleet/gps/batch`).
> The problem: if the driver leaves the truck, phone dies, or driver is separated from the truck,
> we lose truck position entirely.
>
> **Solution:** Install a physical GPS tracker in the truck cab, wired to the fuse box and ignition.
>
> **Recommended hardware:** Queclink GV350MG (~$55/unit)
> - Supports HTTPS POST (JSON) directly to an API endpoint — no protocol gateway needed
> - 4G LTE + 2G fallback, IP67, internal 12-24hr battery backup
> - Ignition detection, power-cut alert, tampering alert
> - Configured via SMS commands to POST to `POST /api/v1/fleet/gps/device/ingest`
>
> **Authentication:** Hardware devices use a pre-shared `X-Device-Key` header (64-char hex).
> NOT Firebase JWT — devices have no browser. Each device has a unique key stored in `gps_devices` table.

### Tasks

- [ ] **Create `GpsDeviceEntity`** at `api/src/modules/fleet/entities/gps-device.entity.ts`

  ```typescript
  @Entity('gps_devices')
  export class GpsDeviceEntity {
      @PrimaryGeneratedColumn('uuid') id: string;
      @Column({ type: 'uuid' }) organization_id: string;
      @Column({ type: 'uuid', nullable: true }) truck_id: string;
      @Column({ type: 'varchar', length: 100, unique: true }) device_imei: string;
      @Column({ type: 'varchar', length: 50 }) device_model: string;  // 'QUECLINK_GV350MG'
      @Column({ type: 'varchar', length: 64, unique: true }) api_key: string;
      @Column({ type: 'boolean', default: true }) is_active: boolean;
      @Column({ type: 'varchar', length: 100, nullable: true }) sim_iccid: string;
      @Column({ type: 'timestamptz', nullable: true }) last_seen_at: Date;
      @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  }
  ```

- [ ] **Update `GpsLogEntity`** at `api/src/modules/fleet/entities/gps-log.entity.ts`
  — Add columns: `source: 'PHONE' | 'DEVICE'`, `device_imei`, `accuracy_m`, `speed_kmh`, `heading_deg`, `ignition_on`

- [ ] **Update `TruckEntity`** — Add `last_gps_source: 'PHONE' | 'DEVICE'` column

- [ ] **Create `DeviceApiKeyGuard`** at `api/src/common/guards/device-api-key.guard.ts`
  — Reads `X-Device-Key` header, looks up `gps_devices` table, attaches device to request
  — Throws `UnauthorizedException` if key is missing or invalid

- [ ] **Create `@DeviceInfo()` decorator** at `api/src/common/decorators/device-info.decorator.ts`
  — Similar to `@CurrentUser()`, extracts device from request object

- [ ] **Create `DeviceGpsPayloadDto`** — maps Queclink JSON format:
  ```typescript
  // Queclink sends: { imei, eventCode, lat, lng, speed, heading, accuracy, ignition, reportTime }
  // This DTO validates and types the Queclink JSON payload
  ```

- [ ] **Add `POST /fleet/gps/device/ingest`** in `fleet.controller.ts`
  — No Firebase auth, uses `DeviceApiKeyGuard` instead
  — Calls `fleetService.ingestDeviceGps(device, payload)`

- [ ] **Add `ingestDeviceGps()` to `FleetService`**
  — Validates the IMEI in payload matches the device's registered IMEI
  — Inserts GPS log with `source: 'DEVICE'`
  — Updates `trucks.current_lat/lng` ONLY if hardware is more recent than last GPS
  — Source priority rule: **device always wins over phone** if device reported in last 5 min

- [ ] **Device management CRUD** in new `GpsDeviceController`:
  ```
  POST   /fleet/devices              Register device (ADMIN/OWNER)
  GET    /fleet/devices              List org's devices
  GET    /fleet/devices/:id          Device details
  PUT    /fleet/devices/:id          Update (assign to truck, etc.)
  DELETE /fleet/devices/:id          Deactivate (soft delete)
  POST   /fleet/devices/:id/rotate-key   Generate new API key (returns it ONCE)
  ```

- [ ] **Write unit tests** for `ingestDeviceGps()`, `DeviceApiKeyGuard`, key rotation

- [ ] **Generate TypeORM migration** for the new tables/columns

---

## 🔵 Phase 2b — Push Notification Alerts

> **Context:** Hardware GPS devices send event codes for critical events.
> These should trigger real-time alerts to the Owner/Admin dashboard and eventually mobile.
>
> **Implementation:** Use Firebase Cloud Messaging (FCM).
> The dashboard registers its service worker for FCM push.
> The API sends a push notification via `firebase-admin` when a critical event arrives.

### Queclink Event Codes to Handle

| eventCode | Name | Alert level |
|---|---|---|
| `06` | External power cut | 🔴 CRITICAL — probable theft |
| `FF` | Device tamper | 🔴 CRITICAL |
| `3A` | Low internal battery | 🟡 WARNING |
| `02` | Speeding | 🟡 WARNING |
| `23` | Ignition ON | 🔵 INFO — log only |
| `24` | Ignition OFF | 🔵 INFO — log only |
| `0E` | Geofence entry | 🔵 INFO — validate against stations |
| `0F` | Geofence exit | 🟡 WARNING — unexpected? |

### Tasks

- [ ] **Create `AlertService`** at `api/src/modules/alert/alert.service.ts`
  — Wraps `firebase-admin` messaging
  — `sendToOrg(orgId, title, body, data)` — sends to all OWNER/ADMIN FCM tokens for that org
  — `sendToUser(userId, title, body, data)` — targeted push

- [ ] **Create `FcmTokenEntity`** — stores FCM push tokens per user per device
  ```
  user_id, token, platform ('WEB' | 'ANDROID' | 'IOS'), created_at, last_active_at
  ```

- [ ] **Add `POST /auth/fcm-token`** — endpoint for dashboard/mobile to register their FCM token

- [ ] **Process event codes in `ingestDeviceGps()`**:
  ```typescript
  if (eventCode === '06') {   // Power cut
      await this.alertService.sendToOrg(orgId, '⚠️ Power Cut Alert',
          `Truck ${truck.plate_number} lost power — possible theft`, { truckId });
      await this.auditService.log({ event_type: 'TRUCK_POWER_CUT_ALERT', ... });
  }
  ```

- [ ] **Dashboard notification bell** — `GET /alerts` endpoint + notification panel in Next.js header
  — Persist alerts to DB (`alerts` table with `read_at` field)
  — Mark as read via `PUT /alerts/:id/read`

---

## 🔵 Phase 2c — Real-Time WebSocket Live Map

> **Context:** Dashboard currently shows last-known truck position (polling every 60s).
> This phase adds a WebSocket connection so positions update in real time on a live map.
>
> **Implementation:** NestJS `@WebSocketGateway` with Socket.IO adapter.
> When a GPS update arrives (phone OR device), the API broadcasts to the org's room.
> Dashboard connects to the WebSocket and moves truck markers in real time.

### Tasks

- [ ] **Install Socket.IO** in the API: `npm install @nestjs/websockets @nestjs/platform-socket.io socket.io`

- [ ] **Create `GpsGateway`** at `api/src/modules/fleet/gps.gateway.ts`
  ```typescript
  @WebSocketGateway({ namespace: '/fleet', cors: true })
  export class GpsGateway {
      @WebSocketServer() server: Server;

      // Called by FleetService after any GPS update
      broadcastPosition(organizationId: string, truckId: string, lat: number, lng: number, source: string) {
          this.server.to(`org:${organizationId}`).emit('truck:position', { truckId, lat, lng, source, ts: Date.now() });
      }

      @SubscribeMessage('join')
      handleJoin(client: Socket, payload: { token: string; orgId: string }) {
          // Verify Firebase JWT, then join room
          client.join(`org:${payload.orgId}`);
      }
  }
  ```

- [ ] **Call `gpsGateway.broadcastPosition()`** after every GPS insert in `FleetService`

- [ ] **Dashboard WebSocket client** at `web/src/hooks/useFleetLive.ts`
  — Connects to WebSocket with Firebase token
  — Maintains an in-memory map of `truckId → { lat, lng, updatedAt }`
  — Returns the live positions for the map component

- [ ] **Live map component** at `web/src/app/(dashboard)/fleet/MapView.tsx`
  — Embed Google Maps or Mapbox (Google Maps recommended — Haiti coverage is decent)
  — Show truck markers with plate number labels
  — Color-coded by status (IDLE=grey, LOADING=orange, IN_TRANSIT=blue, etc.)
  — Click truck marker → sidebar with manifest details
  — Draw last 20 GPS points as a polyline "trail"

- [ ] **Geofence overlays** — draw station geofence circles on the map

---

## 🔵 Phase 3 — Advanced Features (Future)

> These are planned but not yet designed. Design them before implementing.

### S2L GPS Proximity Enforcement (RULE 4)
> **What:** Before submitting an S2L, the API should verify the driver is within
> the station's geofence radius. Currently the geofence guard checks on S2L *creation*
> but RULE 4 says it should also be validated at *submission* time.
>
> **How:** Add a geofence check in `S2LService.submit()` using the `gps_lat/gps_lng`
> from the `SubmitS2LDto`. If the driver is >500m from the station, throw `BadRequestException`.

- [ ] In `S2LService.submit()`, call `geofenceService.isWithinStation(gps_lat, gps_lng, s2l.station_id)`
- [ ] If outside radius, return error: `"You must be at the station to submit this checklist"`

### Driver Behavior Scoring
> Use GPS speed + harsh events from hardware device to score drivers
- [ ] `driver_score` table: `driver_id, org_id, period, score, events_count`
- [ ] Scoring algorithm: deduct points for speeding, power cuts, geofence violations
- [ ] Dashboard page: Driver Scoreboard

### CAN-Bus Fuel Level Integration
> Queclink GV350MG has CAN-bus support — can read actual fuel tank level from truck's computer.
> Cross-reference with manifest `volume_loaded_liters` to detect fuel theft en route.
- [ ] Add `fuel_level_pct` to `GpsLogEntity`
- [ ] Alert if fuel drops unexpectedly between LOADING and ARRIVED states

### E2E Test Suite
> Currently 90/90 unit tests. Zero E2E tests.
> Requires: Docker test database + Firebase Auth emulator
- [ ] Set up `docker-compose.test.yml` with isolated DB + Firebase emulator
- [ ] Write E2E tests for critical flows: register→login→createS2L→submit→approve→createManifest
- [ ] Add to CI pipeline (GitHub Actions)

### Mobile App — Manifest Tracking Screen
> Driver should see their active manifest status on the phone
- [ ] `GET /manifests/active` — returns the driver's current in-progress manifest
- [ ] Manifest status timeline screen in Flutter (shows current state, what's next)

### Multi-Language Compliance Reports
> PDF report generation in French, Haitian Creole, English
> For regulatory submission to BMPAD (Bureau de Monétisation des Programmes d'Aide au Développement)
- [ ] Use `pdfmake` or `puppeteer` in a Cloud Function
- [ ] `GET /reports/s2l/:id/pdf` — generates a signed S2L compliance PDF
- [ ] `GET /reports/manifests/monthly` — monthly manifest summary report

---

## Architecture Notes (for context when resuming)

### GPS Dual-Source Priority Rule
When both phone and hardware report position for the same truck:
- **Hardware device always wins** — it's more reliable
- Phone position is only used if no device has reported in the last 5 minutes
- Both sources always write to `gps_logs` (full history preserved)

### Tenant Isolation Pattern
Every service method that queries data MUST include `organization_id` in the WHERE clause.
Pattern used throughout: `findOneOrFail(id, organizationId)` throws `NotFoundException` (not `ForbiddenException`) — this prevents revealing entity existence to other orgs.

### Audit Log Pattern
Every state-changing operation must call `auditService.log(...)`. 
Always pass `actorRole` from the JWT payload — never hardcode it. See `s2l.service.ts` and `manifest.service.ts` for the pattern.

### Manifest Number Format
`FT360-YYYYMMDD-NNNN` — sequential per day per org, generated with PostgreSQL advisory lock:
```sql
SELECT pg_advisory_xact_lock(hashtext(organization_id || CURRENT_DATE::text))
```
See `manifest.service.ts → generateManifestNumber()`.

### Sync Engine (Mobile)
Flutter: `SyncEngine` in `mobile/lib/core/sync/sync_engine.dart`
- Posts to `POST /sync/batch` (relative path — `dio` baseUrl already includes `/api/v1`)
- Batch size: 50 operations per sync cycle
- Exponential backoff: 30s → 1min → 2min → 4min → 8min → 15min (cap)
- Photo uploads are handled separately in `_processPhotoQueue()`
- API URL configured via `--dart-define=API_URL=http://...` at build time

### Key Environment Variables
```bash
# API (api/.env)
APP_PORT=3000
APP_ENV=development           # Controls TypeORM synchronize
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ft360
DATABASE_USER=ft360_app
DATABASE_PASSWORD=ft360_dev_password
FIREBASE_PROJECT_ID=your-project-id
GCS_BUCKET_PHOTOS=ft360-photos
GCS_BUCKET_SIGNATURES=ft360-signatures
GCP_PROJECT_ID=your-gcp-project

# Web (web/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Mobile (--dart-define at flutter run)
API_URL=http://10.0.2.2:3000/api/v1   # Android emulator
API_URL=http://127.0.0.1:3000/api/v1  # iOS simulator
```

### Running Locally
```bash
# Start DB + API + Web
docker compose up -d

# API only (with hot reload)
cd api && npm run start:dev

# Web only
cd web && npm run dev

# Run unit tests
cd api && npx jest --forceExit

# Flutter mobile
cd mobile && flutter run --dart-define=API_URL=http://10.0.2.2:3000/api/v1
```
