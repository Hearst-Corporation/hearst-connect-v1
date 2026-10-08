# Auth And Tenancy Doctrine

## Auth Authority

Authentication authority is the Connect backend endpoint:

- `POST {HEARST_API_URL}/api/v1/auth/login`

The frontend does not mint API tokens and does not validate passwords locally.

## Session Handling

- Session cookie name: `hearst_session`
- Cookie payload contains backend token + identity
- Cookie is encrypted and authenticated (AES-256-GCM) using `AUTH_SECRET`
- Cookie is `httpOnly`, `sameSite=lax`, `secure` in production
- Cookie expiration is aligned with backend token expiration

## Role Mapping

- Backend `admin` opens frontend owner session
- Backend `investor` is refused for admin console access

This repo is an admin-first Connect surface and does not open Platform member flows.

## Tenancy Model

- Connect account space is independent from Hearst Platform account sessions.
- Platform cookies do not authenticate Connect.
- Connect logout only clears Connect session state.

## Handoff Reality

Confirmed current state for this repo:

- `/handoff` route is absent.
- No active handoff receiver is implemented.
- Cross-product jump from Hearst App remains non-operational here without a dedicated handoff feature mission.
