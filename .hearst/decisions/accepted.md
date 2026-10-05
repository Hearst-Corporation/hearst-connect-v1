# Accepted Decisions

## HC-AD-001 Backend-First Authentication

Status: ACCEPTED

Decision:
`hearst-connect-backend` is the single authentication authority through `/api/v1/auth/login`.

Operational consequence:
Frontend does not verify passwords locally and does not mint API auth tokens.

## HC-AD-002 Encrypted Server Session Cookie

Status: ACCEPTED

Decision:
Session state is sealed in `hearst_session` with authenticated encryption using `AUTH_SECRET`.

Operational consequence:
Backend token remains server-side and is never exposed to browser JavaScript.

## HC-AD-003 No Product Data Fallbacks

Status: ACCEPTED

Decision:
Configuration and upstream failures must surface explicit named states, not substitute business values.

Operational consequence:
Unavailable and not-configured states are first-class runtime outputs.

## HC-AD-004 No `/handoff` In Connect Front

Status: ACCEPTED (current architecture)

Decision:
This repository has no `/handoff` route and does not receive cross-product handoff codes.

Operational consequence:
Connect sign-in remains an independent flow with its own backend-authenticated account domain.

## HC-AD-005 Endpoint Registry As Call Boundary

Status: ACCEPTED

Decision:
Backend calls are constrained to routes declared in `src/lib/backend/endpoints.ts`.

Operational consequence:
Route usage is auditable and discoverable from one canonical registry.
