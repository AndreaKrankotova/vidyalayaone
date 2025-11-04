# Testing guide

This repo uses Jest for backend unit tests (TypeScript via ts-jest) in apps/auth-service and apps/profile-service.

## Prerequisites
- Node and pnpm installed
- From the repo root, install deps:
  - pnpm install

## Run tests

- Profile-service tests
  - pnpm --filter @vidyalayaone/profile-service test

- Auth-service tests
  - pnpm --filter @vidyalayaone/auth-service test

## Watch mode

- Profile-service
  - pnpm --filter @vidyalayaone/profile-service test:watch

- Auth-service
  - pnpm --filter @vidyalayaone/auth-service test:watch

## Coverage

- Profile-service coverage report
  - pnpm --filter @vidyalayaone/profile-service test:coverage

- Auth-service coverage report
  - pnpm --filter @vidyalayaone/auth-service test:coverage

Coverage output is shown in the terminal and a summary JSON/LCOV is available in coverage/ inside each service.

## What’s covered

Profile-service :

src/services/studentCredentialsEmail.ts
  - Calls internal auth-service endpoints with the correct path, headers (X-Internal-Request), and timeout.
  - Propagates axios errors (the rejection bubbles up).

src/controllers/createStudent.ts
  - Creates a student transactionally, calls auth-service to create the user, and sends login credentials via email.
  - If email sending fails, the request still ends with 201 (best‑effort email).

  - Non-school context → 400; missing schoolId → 400; missing permission → 403.
  - Duplicate admission number → 400; no guardians derivable → 400; auth user creation fails → 400.
  - Transaction P2002 → 400 with auth rollback; generic transaction error → 500 with auth rollback.
  - Validation failure returns early (no DB/auth calls).

src/controllers/acceptStudentApplication.ts
  - Approves the student, creates the enrollment, calls auth-service, and sends login credentials via email.
  - If email fails, the request still returns 200.

  - Missing id param → 400; non-school context → 400; missing schoolId → 400; no permission → 403.
  - Body validation fails → 400; pending student not found → 404; duplicate admission number → 400.
  - Missing email/phone for user creation → 400; auth user creation fails → 400; transaction failure after user creation → 500.

  src/controllers/createStudentApplication.ts
  - Creates application with guardians/documents; returns 201 with created data.
  - Derives guardians from father/mother/guardian; default relation GUARDIAN; supports null dateOfBirth branch.
  - Documents: skips null entries; no base64 → empty url; fileSize converted to BigInt.
  - Validation failure returns early; maps Prisma P2002 to 400 (thrown from transaction or inside callback); unexpected transaction error → 500; outer catch on post-fetch → 500.

Auth-service :

src/controllers/sendStudentCredentialsEmail.ts
  - 403 for non-internal requests; 400 for invalid body; 200 on success; 500 without leaking credentials.
  
src/controllers/createUserForStudent.ts
  - createUserForStudent: 403 guard, 400 validation, 400 if username exists, 400 if role doesn’t exist, 201 success (isEmailVerified = true), P2002 → 400, other errors → 500.
  - deleteUser (in the same file): 403 without internal header, 400 without userId, 200 success, P2025 → 404, other errors → 500.

src/services/studentCredentialsEmail.ts
  - Sends email via EmailService with the correct subject and HTML (contains username and password); propagates EmailService errors.

src/services/emailService.ts
  - sendMail sends via transporter and logs success.
  - On error logs and throws “Failed to send email”.
  - sendOTPEmail: correct subject/HTML; includes the OTP and expiration from config.

src/controllers/login.ts
  - Validation fails early; role not found → 500; platform context without permission → 403; invalid password → 401.
  - Success: generates access/refresh tokens; 
  - Unexpected DB error during token save → 500.

src/controllers/logout.ts
  - Validation fails early; token present is deleted and returns 200; token not found → 404; unexpected error still returns 200 (masked success).
