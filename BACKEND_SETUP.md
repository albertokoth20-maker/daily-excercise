# Authentication and workout reminders

The login, email verification, password reset, and reminder screens are wired for Supabase Auth, Supabase Edge Functions, Resend, and Web Push. The repository has no provider credentials, so live email and push delivery remain inactive until the steps below are completed.

## 1. Configure the public browser settings

Edit `assets/app-config.js` with the Supabase project URL, the project's public anon key, and the VAPID public key:

```js
window.FORM_FUNCTION_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY",
  vapidPublicKey: "YOUR_VAPID_PUBLIC_KEY"
};
```

Only the URL, public anon key, and VAPID public key belong in this file. Never put the Supabase service-role key, Resend API key, VAPID private key, or cron secret in browser code.

## 2. Configure Supabase Auth

1. Create a Supabase project and enable email confirmations.
2. In **Authentication → Email Templates → Confirm signup**, include the `{{ .Token }}` template variable so the six-digit code is visible in the email (for example: `<p>Your verification code is {{ .Token }}</p>`). The page verifies it with the email OTP flow.
3. Keep the **Reset Password** email link enabled. Add the deployed `login.html` URL to the project's allowed redirect URLs.
4. Configure the project Site URL and redirect allow-list for the deployed site and local HTTPS/localhost development URL.
5. To deliver Auth verification and password-reset emails reliably, configure custom SMTP using your verified Resend domain.
6. For Google sign-in, create a Google OAuth web client and configure its client ID and secret in **Authentication → Providers → Google**. Add the site origin and Supabase callback URL to the Google OAuth client.

## 3. Create the reminder tables

Install the Supabase CLI, link this folder to the project, and apply the migration:

```text
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration creates the user profile, daily reminder preferences, and push-subscription tables with row-level security enabled.

## 4. Configure email and push delivery

Verify a sender domain in Resend. Generate a Web Push VAPID key pair (for example, with `npx web-push generate-vapid-keys`) and keep its private key server-side. Then set the Edge Function secrets from the project root:

```text
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY
supabase secrets set EMAIL_FROM="Form & Function <workouts@YOUR_VERIFIED_DOMAIN>"
supabase secrets set APP_BASE_URL=https://YOUR_DOMAIN/
supabase secrets set CRON_SECRET=YOUR_LONG_RANDOM_SECRET
supabase secrets set VAPID_SUBJECT=mailto:YOUR_CONTACT_EMAIL
supabase secrets set VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
supabase secrets set VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
supabase functions deploy send-workout-reminders
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into `assets/app-config.js`.

## 5. Schedule daily delivery

In `supabase/schedule-reminders.sql`, replace `YOUR_PROJECT_REF` and `REPLACE_WITH_THE_CRON_SECRET` with the project URL and the exact `CRON_SECRET` value set above. Run the SQL once in the Supabase SQL Editor. It schedules the function every minute; the function sends at each user's selected local time and allows a 15-minute retry window.

## 6. Install and enable notifications

Deploy the site over HTTPS. `file://` pages cannot register a service worker or receive Web Push. Sign in, open **Dashboard**, select the daily time and delivery methods, and save. For push, install the site from the browser's install/Add to Home Screen menu, choose **Enable push notifications**, and grant permission. Email and push can be enabled independently.

The dashboard's workout history is still stored in the browser's local storage; authentication currently protects reminder settings and does not sync workout history across devices.
