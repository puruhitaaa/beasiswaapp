# Codebase guide by test case

This guide explains how the codebase works from frontend to backend, organized around the Playwright test suite. Use these sections as talking points during architecture reviews, technical interviews, or client presentations.

---

## Architecture overview

The application uses an event-ready microservice layout with a React single-page frontend.

- Frontend (`apps/web`): React 19, TanStack Router for file-based routing, TanStack Query for server state cache, and an external reactive store (`AppStore`) for offline and fallback support.
- API Gateway (`apps/api-gateway`): Fastify server. It handles CORS, rate limiting (100 req/minute in production), JWT token verification, and reverse proxy routing. It removes client-supplied identity headers like `x-user-id` and `x-user-role`, re-attaching verified values before proxying to upstream services.
- RBAC service (`apps/service-rbac`): User accounts, session management, Argon2 password hashing, and role permissions.
- Master data service (`apps/service-master`): Scholarship programs, requirements, quota limits, and administrative criteria.
- Transaction service (`apps/service-transaksi`): Application lifecycle state machine, multi-step draft saves, verifikator reviews, and weighted interview scoring.
- Document service (`apps/service-dokumen`): File uploads, file inspection via magic numbers, anti-malware guards, and access-token-protected download endpoints.
- Contracts package (`packages/contracts`): Shared Zod validation schemas and TypeScript types used across both the browser and Node services.

---

## 01. Applicant portal and registration wizard

Test file: `tests/e2e/01-applicant-portal.spec.ts`

### 1.1 Public landing and program catalog

#### What the test covers
The public visitor visits `/`, views the scholarship catalog cards, clicks "Lihat Detail & Daftar", and inspects requirements inside the detail modal.

#### Frontend layer
- Route: `apps/web/src/routes/index.tsx`.
- Component: `apps/web/src/components/cards/ProgramCard.tsx` renders individual program summaries (dates, quota, training method).
- Modal: `apps/web/src/components/modals/applicant/ProgramDetailModal.tsx` renders full program descriptions and document requirements.
- Hook: `useBeasiswaList()` queries the backend with TanStack Query.

#### Network and gateway layer
- Browser issues `GET /api/master/programs`.
- The gateway passes public `GET` requests directly to `service-master` without requiring an authorization header.

#### Backend layer
- Service: `apps/service-master`.
- Controller: Reads active scholarship records from the database.
- Database: Queries table `beasiswa_programs` where `isActive = true`.

#### Talking points
- Public endpoints need no session tokens, but the gateway still applies rate limits to prevent catalog scraping.
- Program requirements shown in the modal come directly from the master schema, so applicants see exact file rules before registering.

---

### 1.2 Public applicant registration

#### What the test covers
A new applicant opens the registration modal, enters a 16-digit NIK, full name, email, password, submits the form, and is redirected to `/applicant`.

#### Frontend layer
- Component: `apps/web/src/components/modals/applicant/RegisterModal.tsx`.
- Form validation: Zod schema in `packages/contracts` checks for an exact 16-digit numeric string for NIK, a valid email format, and matching password confirmation.
- State: On success, sets authentication state and redirects to `/applicant` using TanStack Router.

#### Network and gateway layer
- Browser issues `POST /api/auth/register`.
- Gateway strips any inbound `x-user-role` header to prevent role escalation.
- Gateway proxies request to `UPSTREAM_RBAC_URL`.

#### Backend layer
- Service: `apps/service-rbac`.
- The controller checks for duplicate NIK and duplicate email records.
- Password hashing uses Argon2id.
- On creation, the service generates a signed JWT session cookie with role `applicant`.

#### Talking points
- NIK uniqueness prevents a single citizen from creating multiple accounts.
- The browser never sets user roles. The backend explicitly forces newly registered accounts into the `applicant` role.

---

### 1.3 Applicant four-step wizard with autosave and submission

#### What the test covers
A registered applicant selects a program, completes Step 1 (biodata), Step 2 (education), Step 3 (document uploads with SVG rejection), agrees to the terms in Step 4, and submits the application.

#### Frontend layer
- Route: `apps/web/src/routes/applicant.tsx`.
- Component: `apps/web/src/components/modals/applicant/WizardModal.tsx`.
- Step 1: Validates NIK, full name, address, phone number, and birth details via `step1BiodataSchema`.
- Step 2: Validates last education level, institution, and major via `step2PendidikanSchema`.
- Step 3: Checks file type on the client. It rejects `.svg` files on the spot with a security alert. Valid files (PDF, JPG, PNG under 2MB) trigger upload requests.
- Step 4: Checks required legal agreement checkbox. Submitting calls `transaksiApi.submitApplication(id)`.

#### Network and gateway layer
- Gateway verifies the JWT session token.
- Gateway injects verified `x-user-id` and `x-user-role=applicant` headers before forwarding requests.
- Document uploads route to `service-dokumen` at `/api/dokumen/upload`.
- Form step updates route to `service-transaksi` at `/api/transaksi/:id/step1`, `/step2`, and `/submit`.

#### Backend layer
- Document service (`apps/service-dokumen`): Inspects the initial binary bytes (magic numbers) of each file. It rejects SVG files and executable scripts even if renamed to `.pdf` or `.png`. Files are stored in object storage with unique UUID keys.
- Transaction service (`apps/service-transaksi`):
  - `initApplication`: Creates an application row with status `DRAFT` and a unique tracking code.
  - `saveStep1`, `saveStep2`: Updates the record with JSON payload fragments.
  - `submitApplication`: Validates that required documents are attached, then updates the status from `DRAFT` to `SUBMITTED`.

#### Talking points
- Autosave protects users against lost progress during multi-step forms.
- File security operates at two tiers. The client provides immediate UI feedback on file size and extension, while the document service reads the binary header to prevent malicious upload attacks.
- Once submitted, the application enters the queue for administrative verification.

---

### 1.4 State locking and read-only mode

#### What the test covers
An applicant with a submitted application clicks "Lihat Data Terkirim". The modal opens with all inputs disabled and displays a read-only warning.

#### Frontend layer
- Component: `WizardModal.tsx` rendered with `readOnly={true}`.
- All input fields, select dropdowns, and file upload buttons receive the `disabled` attribute.
- The submit button is hidden, replaced by a simple close button.

#### Network and gateway layer
- Browser requests `GET /api/transaksi/my-active`.
- Returns the current application record with status `SUBMITTED`.

#### Backend layer
- Service: `apps/service-transaksi`.
- State machine rules prevent mutations on records in `SUBMITTED` status. If an applicant attempts to send a `PATCH` request directly, the service rejects the request with HTTP 403 Forbidden.

#### Talking points
- Immutability guarantees fairness. Applicants cannot alter their data or replace submitted files while administrators review them.

---

## 02. Verifikator review and administrative decisions

Test file: `tests/e2e/02-verifikator-review.spec.ts`

### 2.1 Verifikator login and dashboard queue

#### What the test covers
A verifikator logs in, views verification metric cards (pending, revision, approved, rejected), and inspects the applicant table.

#### Frontend layer
- Route: `apps/web/src/routes/verifikator.tsx`.
- Component: `apps/web/src/components/layout/NavbarInternal.tsx` displays the active verifikator identity.
- Metric cards calculate totals across the current verification workload.
- Table displays applicants awaiting administrative review.

#### Network and gateway layer
- Gateway verifies `x-user-role` is `verifikator`, `admin`, or `superadmin`.
- Non-staff tokens receive HTTP 403.

#### Backend layer
- Service: `apps/service-transaksi`.
- Endpoint: `GET /api/transaksi/verifikasi/queue`.
- Query returns applications matching status `SUBMITTED` or `REVISI`.

#### Talking points
- The gateway acts as the first line of role enforcement. Unauthorized requests never reach internal microservices.

---

### 2.2 Multi-tab document inspection and revision decision

#### What the test covers
The verifikator opens the applicant workspace, reviews personal data, inspects uploaded files, marks a flawed document as "Revisi" with a specific reason, and submits the revision decision.

#### Frontend layer
- Component: `apps/web/src/components/modals/verifikator/VerifikasiModal.tsx`.
- Split workspace: The left pane displays applicant data and document status checklist. The right pane displays the active file preview.
- Per-document decision: For each requirement, the verifikator clicks "Sesuai" or "Revisi". Selecting "Revisi" displays a required text note field.

#### Network and gateway layer
- Document previews request `GET /api/dokumen/:id/view?token=...`.
- Decision submission sends `POST /api/transaksi/:id/verifikasi`.

#### Backend layer
- Service: `apps/service-dokumen`: Generates short-lived, signed file access tokens so files remain private.
- Service: `apps/service-transaksi`:
  - Validates that every rejected item includes a descriptive explanation.
  - Updates the application status from `SUBMITTED` to `REVISI`.
  - Saves the verifikator note and timestamp into the verification history.

#### Talking points
- Revisions are specific, not generic. Instead of rejecting the entire application, the verifikator flags the exact invalid document.
- File URLs are never public. They use signed URLs that expire automatically.

---

### 2.3 Approval decision (LOLOS_ADMIN)

#### What the test covers
The verifikator reviews an application, marks all required documents as "Sesuai", selects decision "Disetujui", and submits. The application status changes to `LOLOS_ADMIN`.

#### Frontend layer
- Component: `VerifikasiModal.tsx`.
- Verifikator verifies that every document is valid.
- Decision select dropdown set to "disetujui".

#### Backend layer
- Service: `apps/service-transaksi`.
- State machine transition: `SUBMITTED` or `REVISI` -> `LOLOS_ADMIN`.
- Verifies that zero documents are marked as rejected before allowing the transition.
- Candidates with `LOLOS_ADMIN` automatically exit the verifikator queue and enter the interviewer queue.

#### Talking points
- State transitions are strictly enforced in backend code, not just on the client. The backend verifies that no document has pending revision notes before permitting the `LOLOS_ADMIN` status.

---

## 03. Revision handling and selective re-upload

Test file: `tests/e2e/03-revision-handling.spec.ts`

### 3.1 Revision alert and selective form unlock

#### What the test covers
An applicant with a revision status logs in, sees the revision alert card, clicks "Perbaiki Data", lands on Step 3 of the wizard, sees approved documents locked, uploads a replacement for the rejected file, and resubmits.

#### Frontend layer
- Route: `apps/web/src/routes/applicant.tsx`.
- Component: `WizardModal.tsx` receives the application with status `REVISI`.
- Initial step logic: Detects status `REVISI` and opens directly on Step 3 (documents).
- Selective locking: Documents previously marked "Sesuai" show a green "Disetujui" badge with the file upload input disabled. The rejected document displays the verifikator's note and an enabled upload input.

#### Backend layer
- Service: `apps/service-transaksi`:
  - Returns document checklist items with their individual verification status (`isSesuai`, `catatanRevisi`).
  - Upon submission, transitions status from `REVISI` back to `SUBMITTED`.

#### Talking points
- Selective unlocking reduces friction. The applicant does not have to re-enter biodata or re-upload valid files.
- The applicant can only edit documents that the verifikator rejected.

---

## 04. Interviewer scoring and weighted calculation

Test file: `tests/e2e/04-interviewer-scoring.spec.ts`

### 4.1 Interviewer login and queue

#### What the test covers
An interviewer logs in, reviews the candidate queue, and sees only applicants who have passed administrative verification (`LOLOS_ADMIN`).

#### Frontend layer
- Route: `apps/web/src/routes/wawancara.tsx`.
- Displays metrics and the table of candidates assigned for interview.

#### Backend layer
- Service: `apps/service-transaksi`.
- Endpoint: `GET /api/transaksi/wawancara/queue`.
- Query filters records strictly by `status = 'LOLOS_ADMIN'`.

#### Talking points
- Clean separation of concerns. Interviewers never spend time on applicants with incomplete or invalid paperwork.

---

### 4.2 Weighted scoring calculation and final decision

#### What the test covers
The interviewer opens the scoring modal, enters scores across three rubrics (Communication 30%, Technical 40%, Commitment 30%), verifies the automatic weighted average calculation, adds qualitative notes, sets decision to "Lulus", and submits.

#### Frontend layer
- Component: `apps/web/src/components/modals/interviewer/WawancaraModal.tsx`.
- Formula implemented on client: `(skorKomunikasi * 0.3) + (skorTeknis * 0.4) + (skorKomitmen * 0.3)`.
- Real-time calculation: Updates the read-only final score field as the interviewer types.

#### Backend layer
- Service: `apps/service-transaksi`.
- Re-calculates the weighted score server-side to prevent client tampering.
- Updates candidate status to `LULUS_DITERIMA` (or `TIDAK_LOLOS`).
- Saves score breakdown and interviewer comments into table `penilaian_wawancara`.

#### Talking points
- The client calculates the score for user feedback, but the backend recalculates it independently before writing to the database.
- Standardized rubrics ensure objective evaluations across different interviewers.

---

## 05. Graduation announcement and re-registration

Test file: `tests/e2e/05-announcement-and-reregistration.spec.ts`

### 5.1 Graduation banner and re-registration confirmation

#### What the test covers
The accepted applicant logs in, views the celebration banner, downloads the official acceptance letter (SK), clicks "Konfirmasi / Daftar Ulang", confirms attendance, and completes the process.

#### Frontend layer
- Route: `apps/web/src/routes/applicant.tsx`.
- When status is `LULUS_DITERIMA`, renders the green acceptance banner with action buttons.
- SK download: Generates a formatted printable document with official stamps.
- Component: `apps/web/src/components/modals/applicant/DaftarUlangModal.tsx`.
  - Applicant selects attendance commitment ("bersedia" or "tidak_bersedia").
  - Adds notes and confirms.

#### Backend layer
- Service: `apps/service-transaksi`.
- Endpoint: `POST /api/transaksi/:id/daftar-ulang`.
- Transitions status to `DAFTAR_ULANG`.
- Records attendance confirmation and timestamp for quota tracking.

#### Talking points
- The re-registration step confirms that accepted candidates will attend, allowing administrators to reallocate unused seats to waitlisted candidates if needed.

---

## 06. Administrator management and audit

Test file: `tests/e2e/06-admin-management.spec.ts`

### 6.1 Dashboard statistics

#### What the test covers
Administrator views system metrics: total applicants, candidates in verification, administrative passes, and accepted students.

#### Architecture
- Route: `apps/web/src/routes/admin.tsx`.
- Aggregates counts across programs and statuses via `service-transaksi` and `service-master`.

---

### 6.2 Selection results and Excel export

#### What the test covers
Administrator reviews the final applicant ranking table and triggers an Excel or CSV data export.

#### Architecture
- Route: `apps/web/src/routes/admin.tsx`.
- Backend generates a spreadsheet payload containing NIK, candidate name, program, scores, and admission status.
- Used for official reporting to funding bodies or ministry stakeholders.

---

### 6.3 Master data CRUD for programs and requirements

#### What the test covers
Administrator creates, updates, and reviews scholarship programs and document requirements.

#### Architecture
- Service: `apps/service-master`.
- Gateway enforces that only users with `role = admin` or `superadmin` can issue `POST`, `PUT`, `PATCH`, or `DELETE` requests to `/api/master/*`.

---

### 6.4 System settings, internal users, and role permissions

#### What the test covers
Administrator manages staff accounts (verifikators, interviewers, admins) and configures menu access permissions.

#### Architecture
- Service: `apps/service-rbac`.
- Controls which user IDs hold staff roles, enabling dynamic menu rendering across internal dashboards.

---

## 07. Complete lifecycle relay test

Test file: `tests/e2e/07-complete-lifecycle-handshake.spec.ts`

### What the test proves
This test executes the full scholarship lifecycle in a single test run without human intervention.

```
[Stage 1: Applicant]
Register account -> fill 4-step wizard -> upload docs -> submit application
       │
       ▼
[Stage 2: Verifikator]
Login -> inspect queue -> reject 1 blurry document with revision note -> submit
       │
       ▼
[Stage 3: Applicant]
Login -> see alert -> upload clean replacement document -> resubmit
       │
       ▼
[Stage 4: Verifikator]
Login -> approve all documents -> status becomes LOLOS_ADMIN
       │
       ▼
[Stage 5: Interviewer]
Login -> find candidate in queue -> input weighted scores (90.0) -> pass candidate
       │
       ▼
[Stage 6: Applicant]
Login -> see acceptance banner -> confirm re-registration attendance
       │
       ▼
[Stage 7: Administrator]
Login -> audit results table -> verify data export
```

### Presentation talking point
When presenting this test, emphasize that it demonstrates true multi-role integration. Rather than testing each page in isolation with mocked inputs, this test walks through all five user personas and four microservices in a single unbroken relay.
