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
src/controllers/acceptStudentApplication.ts
  - Approves the student, creates the enrollment, calls auth-service, and sends login credentials via email.
  - If email fails, the request still returns 200.

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
