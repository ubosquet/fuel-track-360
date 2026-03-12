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

## 🔵 Phase 4 — AI & Machine Learning Features (Future)

> **Context:** Leverage AI to target the biggest pain points in high-risk environments like Haiti: fraud reduction, safety, and dispatcher efficiency.

### 1. Fuel Theft Prediction (Advanced Variance Analysis)
> **What:** Replace the static 2% variance rule with a predictive, dynamic fuel budget model.
> **How:** Train an AI model on historical route topography, traffic patterns, delivery time, and the specific truck's historical fuel economy. If the volume discharged falls outside the AI's predicted margin of error, flag it instantly for high-probability theft.

### 2. Smart OCR for Receipt Verification
> **What:** Eliminate manual data-entry fraud ("fat finger" errors) when drivers input loaded/discharged volumes.
> **How:** Integrate an AI Vision/OCR module in the mobile app or API. When a driver uploads a photo of the loading ticket or station receipt, the AI reads the printed volume, cross-checks it against the driver's input, and flags any mismatch before the supervisor approves.

### 3. Danger Zone Avoidance & Dynamic Routing
> **What:** Unpredictable security conditions on the road require real-time re-routing and alerts.
> **How:** Train an anomaly detection model on the fleet's historical GPS telemetry to learn normal traffic flows. If a truck enters an area with historically high incident rates or suddenly deviates from a known safe route into a "danger zone", trigger a `CRITICAL` alert to the dispatcher.

### 4. Driver Fatigue & Behavior Scoring
> **What:** Reduce accident liability for highly flammable cargo.
> **How:** Correlate hardware GPS telemetry (harsh braking, rapid acceleration, speeding) with continuous hours driven. Calculate a real-time **Fatigue and Risk Score**. Automatically notify dispatchers to mandate a break if a driver exceeds safety thresholds.

### 5. Automated "Ghost Station" Detection
> **What:** Detect illegal, off-the-books fuel drops or falsified S2L locations without manually geofencing every possible point.
> **How:** Use clustering algorithms on historical GPS stop data to learn where trucks *actually* deliver fuel. Detect if a truck stops for 30+ minutes at an "unmapped" location, or suggest refining existing station geofence radiuses based on real-world drop points.

### 6. Creole Voice-to-Text Dispatching
> **What:** Drivers shouldn't be typing status updates while driving; literacy and typing speed vary.
> **How:** Add an audio-note feature to the Flutter app. Use an AI audio model fine-tuned for Haitian Creole to transcribe the note, categorize the issue (Traffic, Security, Mechanical), and log it as structured text on the dashboard.

---

## 🔵 Phase 5 — Role-Based Enterprise AI (ERP Layer)

> **Context:** Elevating FT360 from a logistics tracker into an intelligent Enterprise Resource Planning (ERP) platform by delivering specialized AI insights to every role in the business.

### 💼 Business Owners & Leaders
**1. Executive "Co-Pilot" (Conversational Analytics)**
- **What:** Chat with the data instead of building complex dashboards. "Why did delivery margins drop in the North last week?"
- **How:** RAG (Retrieval-Augmented Generation) connected to the Analytics metrics. The AI explains that 40% more idle time and a 1.5% variance increase caused the margin drop.
**2. Strategic Demand & Supply Forecasting**
- **What:** Anticipating market needs to buy fuel at the right price.
- **How:** Predictive model analyzing consumption, weather, and scraped local news (roadblocks, strikes) to advise preemptive stockups at specific stations.

### 💰 Finance & Payroll
**1. Automated Performance-Based Payroll**
- **What:** Dynamic salaries based on safety and speed instead of a flat rate.
- **How:** Calculate exactly how much time was spent driving vs. idling. Merge this with the Driver Risk Score (Phase 4) and Zero-Variance deliveries to calculate the period's performance bonus automatically.
**2. Per-Trip Profitability Engine (Margin Optimization)**
- **What:** Granular, real-time ROI for every single delivery.
- **How:** Calculate exact driver wages + fuel burned by the truck + maintenance wear vs. the delivery revenue, showing the Finance team exactly which routes bleed cash.

### 📦 Procurement & Maintenance (Terminal Ops)
**1. Smart Inventory Replenishment**
- **What:** AI creates purchase orders before an underground tank goes dry.
- **How:** Monitor the daily "burn rate" of fuel at every station. Auto-draft terminal purchase orders to optimize bulk-buy discounts while minimizing dead inventory cash flow.
**2. Predictive Fleet Maintenance**
- **What:** Fixing trucks before they break down on a dangerous route.
- **How:** Deep analysis of hardware GPS (mileage, harsh braking, heavy loads) to predict when a truck specifically needs brakes, tires, or an engine check, alerting mechanics instantly.

### 🎧 Dispatchers
**1. Intelligent Auto-Routing & Dispatching**
- **What:** Remove the guesswork of manual truck assignment.
- **How:** When a station needs fuel, the AI recommends the optimal Truck-Driver pair based on proximity, tank capacity, driver's remaining safety hours, and route familiarity.
**2. Real-Time Incident Triage Assistant**
- **What:** Assisting dispatchers instantly during road crises.
- **How:** If a roadblock is reported, the AI flashes a detour recommendation and offers a one-click button to text the new route to the driver and alert the receiving station of the new ETA.

### ⛽ Station Owners (Customers / Franchisees)
**1. Automated "Dry-Out" Alerts**
- **What:** Preventing lost revenue from empty pumps.
- **How:** Predictive model sends a WhatsApp/SMS alert: *"Based on sales, you will run out of Diesel at 4:00 PM tomorrow. Reply 'YES' to automatically request a 10,000L refill."*
**2. Live ETA & Discrepancy Prevention**
- **What:** Total transparency and trust.
- **How:** Highly accurate ETAs via traffic modeling. If the Smart OCR (Phase 4) detects the truck was loaded with 9,900L instead of 10,000L, it texts the station owner the *actual* amount *before* the truck arrives, preventing arguments at discharge.

---

## 🔵 Phase 6 — Day 2 Operations (Next Update Priorities)

> **Context:** Features essential for scale, managing external stakeholders, and handling edge cases in the field.

### 1. Subcontractor / "Owner-Operator" Portals (For Dispatch & Owners)
- **What:** A restricted access level for rented/subcontracted trucks.
- **How:** An independent driver downloads the app but only sees their specific S2L and Manifest. They cannot see the organizational dashboard, analytics, or other trucks. This digitizes non-company trucks without leaking organizational data.

### 2. A "Read-Only" Customer Portal / Tracking Link (For Station Owners)
- **What:** Live tracking links for customers, similar to Uber or Amazon.
- **How:** When a manifest is dispatched, the system automatically texts a self-destructing web link to the Station Owner. They click the link to see a live map of their specific truck and ETA without needing to log in, drastically reducing support calls to dispatch.

### 3. Shift Handoffs & Multi-Driver Manifests
- **What:** Allowing a manifest to transfer custody mid-trip (e.g., driver change on long routes or truck breakdown).
- **How:** Driver A generates a "Transfer" QR code on their phone. Driver B scans it, and the API instantly transfers the custody of the fuel and the GPS tracking responsibility to Driver B.

---

## 🔵 Product Backlog (Future Considerations)

### 1. The "Petty Cash" & Expense Tracker
- **What:** Digitizing driver expenses (tolls, parking, emergency repairs).
- **How:** A module in the mobile app where drivers snap a photo of a receipt or log cash expenses tied directly to the Manifest ID, simplifying accounting reconciliation.

### 2. Offline Maps & Turn-by-Turn Navigation
- **What:** Assisting drivers in off-grid delivery locations.
- **How:** Pre-caching vector maps (like Mapbox or OpenStreetMap) for delivery regions directly onto the device to provide offline turn-by-turn navigation.

### 3. Document Expiry Management
- **What:** Preventing revenue loss due to expired documents blocking terminal access.
- **How:** Upload and track expiry dates for driver's licenses, truck insurance, and terminal badges. The dashboard flashes indicators 30 days before expiry to alert Compliance/HR.

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
