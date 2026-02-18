# Fuel-Track-360 Technical Documentation

## 1. Project Overview
**Fuel-Track-360** is a comprehensive SaaS platform designed for fuel logistics management in Haiti. It provides real-time tracking of fuel distribution from terminal to station, ensuring compliance, safety (Safe-to-Load checklists), and variance monitoring.

The system consists of three main components:
1.  **Web Dashboard (Next.js)**: For dispatchers, managers, and admins to oversee operations.
2.  **Backend API (NestJS)**: The core logic handling authentication, data validation, database interactions, and cloud storage.
3.  **Mobile App (Flutter)**: For drivers and field operators to perform inspections and track deliveries (even offline).

---

## 2. System Architecture

### Technology Stack
*   **Frontend**: Next.js 14, React, Tailwind CSS, Shadcn/UI, React Query.
*   **Backend**: NestJS, TypeORM, PostgreSQL, Firebase Admin SDK.
*   **Database**: PostgreSQL 15 (via Docker or Cloud SQL).
*   **Storage**: Google Cloud Storage (for photos and signatures).
*   **Authentication**: Firebase Authentication (JWT) + RBAC.
*   **Infrastructure**: Docker Compose for local dev; Terraform for GCP deployment.

### High-Level Data Flow
1.  **User Authentication**: Users sign in via Firebase Auth. The ID token is passed to the API in the `Authorization` header.
2.  **API Gateway**: The NestJS API validates the token using `FirebaseAuthGuard` and checks permissions with `RolesGuard`.
3.  **Data Processing**: Controllers use DTOs (Data Transfer Objects) to validate input before passing data to Services.
4.  **Persistence**: Services interact with PostgreSQL via TypeORM Repositories.
5.  **File Storage**: Photos (e.g., S2L inspections) are uploaded to Google Cloud Storage (GCS). The API generates Signed URLs for secure access.

---

## 3. Backend API (NestJS)

The API is structured into modular domains using NestJS modules.

### Core Modules
*   **Auth Module**: Handles user registration, profile retrieval, and role management.
    *   *Guards*: `FirebaseAuthGuard` (token validation), `RolesGuard` (RBAC).
    *   *Decorators*: `@CurrentUser()`, `@Roles('ADMIN', 'DRIVER', etc.)`.
    *   *Entities*: `UserEntity`.
*   **Organization Module**: Manages companies (`OrganizationEntity`) and their assets (`StationEntity`).
    *   *DTOs*: `CreateStationDto`, `UpdateOrganizationDto`.
*   **Manifest Module**: Tracks fuel shipments.
    *   *Key Entity*: `ManifestEntity`.
    *   *Status Workflow*: `CREATED` → `LOADING` → `IN_TRANSIT` → `ARRIVED` → `DISCHARGING` → `COMPLETED` (or `CANCELLED`).
    *   *Validation*: strict enum checks for `ProductType` (`GASOLINE`, `DIESEL`, etc.) and `Status`.
*   **S2L (Safe-to-Load) Module**: Manages safety checklists and inspections.
    *   *Process*: Drivers complete a checklist (DRAFT). Photos are uploaded. Supervisor reviews and APPROVES/REJECTS.
    *   *Entities*: `S2LChecklistEntity`, `S2LPhotoEntity`.
    *   *DTOs*: `CreateS2LDto`, `AddPhotoDto`.
*   **Fleet Module**: GPS tracking and vehicle management (`TruckEntity`).
*   **Storage Module**: Interacts with Google Cloud Storage.
    *   *Features*: Uploads photos/signatures, generates Signed URLs for secure viewing.

### Data Validation (DTOs)
All API endpoints use **class-validator** DTOs to ensure data integrity.
Example `CreateManifestDto`:
```typescript
class CreateManifestDto {
    @IsUUID() s2l_id: string;
    @IsEnum(['GASOLINE', 'DIESEL', 'KEROSENE', 'LPG']) product_type: string;
    // ...
}
```

---

## 4. Frontend Dashboard (Web)

The web application is built with **Next.js** (App Router) and focuses on a clean, responsive, and data-rich interface.

### Project Structure (`web/src`)
*   `app/(dashboard)`: Protected routes requiring authentication.
    *   `/manifests`: Master-detail view of delivery manifests.
    *   `/s2l`: Table view of safety checklists with approval workflow.
    *   `/settings`: Organization and application preferences.
    *   `/users`: User management and role assignment.
*   `components/ui`: Reusable UI components based on **Shadcn/UI** (Card, Button, Badge, Table, Dialog).
    *   *Customizations*: Added `success`, `warning`, `destructive` variants to `Button` and `Badge` for semantic clarity.
*   `hooks`: Custom React hooks for data fetching (wrapping React Query).
    *   `useManifest`: Fetches manifests list/details.
    *   `useSignedUrl`: Generates GCS signed URLs for displaying images.
    *   `useAuth`: Manages Firebase session state.
*   `types`: TypeScript definitions mirroring backend DTOs and Entities.

### Key Pages & Features
1.  **Manifests Page**: 
    *   Displays a list of active and past shipments.
    *   Supports filtering by status (including `CANCELLED`).
    *   Visualizes progress (Loading → Transit → Delivery).
2.  **S2L Inspections**:
    *   Supervisors review submitted checklists.
    *   View uploaded photos via secure signed URLs.
    *   Approve or Reject with notes.
3.  **User Management**:
    *   Admins can view team members and assign roles.
    *   Visual indicators for active/inactive status.

---

## 5. Security & Access Control

*   **Authentication**: Firebase Auth handles identity (email/password).
*   **Authorization**: NestJS `RolesGuard` enforces role-based access.
    *   *Roles*: `OWNER`, `ADMIN`, `SUPERVISOR`, `DISPATCHER`, `finANCE`, `DRIVER`.
*   **Data Isolation**: All major entities (`Manifest`, `Truck`, `Station`) are scoped by `organization_id`. API endpoints automatically filter queries by the authenticated user's organization.

---

## 6. Deployment & Infrastructure

### Local Development
1.  **Prerequisities**: Node.js 18+, Docker.
2.  **Start Services**: `docker-compose up -d` (Postgres).
3.  **Run Backend**: `cd api && npm run start:dev`.
4.  **Run Frontend**: `cd web && npm run dev`.

### Production (GCP)
*   **Compute**: Cloud Run (serverless containers used for both API and Web).
*   **Database**: Cloud SQL (PostgreSQL).
*   **Storage**: Cloud Storage (Buckets for photos/signatures).
*   **CI/CD**: GitHub Actions workflows to build and deploy.

### Environment Variables
Key variables required in `.env`:
*   `DATABASE_URL`: Connection string for Postgres.
*   `FIREBASE_PROJECT_ID`: For Auth verification.
*   `GCP_PROJECT_ID`: For Google Cloud resources.
*   `GCS_BUCKET_PHOTOS`: Bucket name for upload.
