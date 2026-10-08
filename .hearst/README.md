# Hearst Connect V1 Doctrine

## Scope

This doctrine applies only to the repository `hearst-connect-v1`.

## Repository Role

`hearst-connect-v1` is the standalone Connect front application. It serves:

- public marketing surface (`/`)
- auth screens (`/login`, `/register`)
- administration console (`/admin/**`)
- signed-in account view (`/account`)

This front is not part of Hearst App handoff flows and not coupled to Operations Platform runtime.

## Current Runtime Snapshot

- Framework runtime: Next.js 16 + React 19, server-first data access
- Primary backend: `hearst-connect-backend` through `HEARST_API_URL`
- Secondary numeric engine: mining-note origin through `MINING_NOTE_API_URL`
- Local default dev port: `4600`
- Validation gate in this repo: `pnpm check` (`next build && tsc --noEmit`)
- No lint script and no test script wired in `package.json`

## Read Order

1. `.hearst/doctrine/system.md`
2. `.hearst/doctrine/runtime.md`
3. `.hearst/doctrine/auth-tenancy.md`
4. `.hearst/doctrine/data.md`
5. `.hearst/doctrine/surfaces.md`
6. `.hearst/decisions/accepted.md`
7. `.hearst/decisions/open.md`
8. `.hearst/rules/general.md`
9. `.hearst/tools/claude.md`
10. `.hearst/tools/cursor.md`
11. `.hearst/tools/codex.md`

## Source Of Truth Policy

Doctrine content lives in `.hearst/` only. Pointer files (`CLAUDE.md`, `.cursor/rules/hearst.mdc`, `AGENTS.md`) must not duplicate this doctrine.
