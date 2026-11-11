# Authentication setup

## Authentication model

The application uses Supabase Auth for email/password sign-in and stores the Supabase session in secure cookies through `@supabase/ssr`. The existing `users` table remains the finance profile table. `auth_user_id` links that profile to Supabase Auth while keeping the profile ID and all existing finance `owner_id` values unchanged.

Existing Argon2 password hashes can be imported into Supabase Auth. `scripts/migrate-users-to-supabase-auth.ts` performs this one-time link and clears the old hash from the application profile only after Supabase accepts it. It refuses to attach a legacy profile to an unrelated Supabase Auth account with the same email.

## Environment and Supabase setup

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for local development and Vercel.
2. Set `APP_URL` to the current application origin. In Supabase Auth URL Configuration, set the Site URL to the production origin and allow the callback URLs `/auth/callback`, plus the local development callback.
3. Enable email confirmations and configure custom SMTP in Supabase Auth. Supabase Auth sends signup verification and password recovery messages. The Nodemailer settings in `.env` are only used for password-change and duplicate-registration notices.
4. Verify `.env.supabase` points to the intended Supabase PostgreSQL database, then run `npm run db:status:supabase`. Review the pending migrations before applying them with `npm run db:deploy:supabase`.
5. Generate Prisma Client with `npm run db:generate`.
6. For an existing database, add `SUPABASE_SERVICE_ROLE_KEY` to the local `.env` temporarily, then run `npm run auth:migrate-users`. This imports existing Argon2 hashes and preserves profile IDs and finance ownership. Do not add this service key to Vercel or expose it in client code; remove it from local configuration after the import.
7. Set the Supabase URL and publishable key in Vercel's environment for Preview and Production, then deploy the application.

`AUTH_SECRET` is still used to hash rate-limit identifiers. Turnstile is required once login throttling asks for a CAPTCHA. Existing accounts should be linked before deploying the new sign-in flow.