# Authentication setup

## Authentication model

The application uses Supabase Auth for Google OAuth and email/password sign-in and stores the Supabase session in secure cookies through `@supabase/ssr`. The existing `users` table remains the finance profile table. `auth_user_id` links that profile to Supabase Auth while keeping the profile ID and all existing finance `owner_id` values unchanged.

Existing Argon2 password hashes can be imported into Supabase Auth. `scripts/migrate-users-to-supabase-auth.ts` performs this one-time link and clears the old hash from the application profile only after Supabase accepts it. It refuses to attach a legacy profile to an unrelated Supabase Auth account with the same email.

## Environment and Supabase setup

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for local development and Vercel.
2. Set `APP_URL` to the production origin and for local development. Vercel Preview deployments use the current `VERCEL_URL` automatically. In Supabase Auth URL Configuration, set the Site URL to the production origin and allow `/auth/callback` for production, local development, and any Preview hosts used for testing.
3. Enable email confirmations and configure a working custom SMTP provider in Supabase Dashboard under **Authentication → Emails → SMTP Settings**. Verify the sender address/domain with that provider and allow the application's `/auth/callback` URL in **Authentication → URL Configuration → Redirect URLs**. Supabase Auth sends signup verification and password recovery messages; setting `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` in the app's `.env` does not configure Supabase. Those app variables are only used by Nodemailer for password-change and duplicate-registration notices.
4. Verify `.env.supabase` points to the intended Supabase PostgreSQL database, then run `npm run db:status:supabase`. Review the pending migrations before applying them with `npm run db:deploy:supabase`.
5. Generate Prisma Client with `npm run db:generate`.
6. For an existing database, add `SUPABASE_SERVICE_ROLE_KEY` to the local `.env` temporarily, then run `npm run auth:migrate-users`. This imports existing Argon2 hashes and preserves profile IDs and finance ownership. Do not add this service key to Vercel or expose it in client code; remove it from local configuration after the import.
7. Set the Supabase URL and publishable key in Vercel's environment for Preview and Production, then deploy the application.

`AUTH_SECRET` is still used to hash rate-limit identifiers. Turnstile is required once login throttling asks for a CAPTCHA. Existing accounts should be linked before deploying the new sign-in flow.

## Google OAuth

1. In Google Cloud, configure the OAuth consent screen and create a Web application OAuth client. Add the Supabase callback URL shown under **Authentication → Sign In / Providers → Google** (typically `https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI. Add test users if the Google app is in testing mode.
2. Enable Google under Supabase **Authentication → Sign In / Providers**, and enter the Google client ID and secret there. Do not put the Google secret in application code or browser environment variables.
3. Allow the application callback URL (for example `http://localhost:3000/auth/callback` and `https://your-domain/auth/callback`) under Supabase **Authentication → URL Configuration → Redirect URLs**, including any preview origins. Set `APP_URL` to the corresponding origin as described above.

The login page asks users to accept the terms before starting Google sign-in. A first successful sign-in creates a finance profile. Supabase may link Google to an existing verified Supabase account; the application uses its existing profile only when the Supabase user ID matches. An existing profile with the same email but a different or missing Supabase user ID is never linked automatically; migrate or resolve it with the administrator first.