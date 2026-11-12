# Changelog

## 1.1.0 — 2026-11-11

Changes since `option-help_user` / `v1.0.0`:

- Added guided onboarding tours across the app, including contextual positioning and a focused tour for recovering deleted transactions.
- Added Supabase Auth email/password registration, sign-in, email confirmation, password recovery, and secure SSR sessions while retaining the existing finance profile IDs and ownership records.
- Added a one-time migration for existing Argon2 password hashes into Supabase Auth.
- Added authentication setup and deployment guidance, plus Supabase-specific Prisma migration commands.
- Updated the app name and wallet icon to Personal Finance.
- Added terms and privacy pages and tightened authentication/session handling.

This release requires Supabase Auth environment configuration and database migrations before deployment. See [AUTHENTICATION.md](./AUTHENTICATION.md).
