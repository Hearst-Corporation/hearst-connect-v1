# System Doctrine

## Product Identity

This repository is the front-end application for Hearst Connect V1.

It owns user-facing surfaces for:

- marketing entry
- Connect login and invitation request
- admin console for Connect operations
- account dashboard for the signed-in account

## Integration Boundary

This front is intentionally isolated from Operations Platform coupling.

- No `/handoff` route exists in `src/app`.
- No Connect entitlement check from Hearst Platform is implemented here.
- Connect sign-in is independent and account-scoped to Connect backend identities.

## Upstream Services

- Primary authority: `hearst-connect-backend` (auth + business data)
- Numeric side engine: mining-note service (`MINING_NOTE_API_URL`)

No other backend is treated as a source of business truth by default.

## Change Boundary

Doctrine and tooling updates must stay outside product code unless a separate mission explicitly asks for product behavior changes.
