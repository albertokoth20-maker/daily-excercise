# Form & Function

Form & Function is a responsive fitness web app for selecting a workout focus, viewing recommended exercises and nutrition guidance, timing a workout, and tracking progress.

It also includes a login experience and optional daily workout reminders through Supabase, email, and browser push notifications.

## Features

- Workout plans for six body areas:
  - Upper body
  - Chest
  - Core
  - Legs
  - Glutes
  - Full body
- Separate men's and women's exercise-photo views
- Exercise equipment, sets, repetitions, and duration guidance
- Flexible meal and portion suggestions
- Custom workout timer from 1 to 180 minutes
- Pause, resume, reset, and early-stop support
- Progress dashboard with recent workouts and seven-day activity
- Reveal-on-scroll page animations
- Supabase email sign-in, sign-up verification, Google OAuth, and password reset
- Daily email and browser push-reminder settings
- Installable PWA experience with offline app-shell caching

## Project structure

```text
index.html                       Main workout planner
dashboard.html                   Progress and reminder dashboard
login.html                       Authentication page
manifest.webmanifest              PWA manifest
service-worker.js                Offline cache and push-notification handling
assets/
  app-config.js                  Public Supabase/PWA configuration
  supabase-client.js             Supabase browser client
  pwa.js                         Install and service-worker setup
  reveal.js                      Scroll-reveal behavior
  login-athlete-background.png   Login page background
  login-athlete.jpg              Login card athlete image
  login-glass-background.png     Alternative glass-morphism background
  runner-background.png          Main page runner background
  exercises/                     Men's and women's exercise photos
supabase/
  migrations/                    Reminder database migration
  functions/                     Reminder delivery Edge Function
  schedule-reminders.sql         Scheduled delivery setup
BACKEND_SETUP.md                  Supabase, email, and push setup guide
```

## Run locally

The app can be served with any static web server. Python's server is a simple option:

```powershell
cd C:\Users\Admin\Desktop\daily-exercise
python -m http.server 4173
```

Open `http://localhost:4173/` in a browser.

For full PWA behavior, use `localhost` or deploy over HTTPS. A `file://` URL cannot reliably register the service worker or deliver push notifications.

## Data storage

Workout history and the selected timer duration are stored in browser `localStorage`. They are not synchronized across devices or included in the reminder database.

Daily reminder preferences and push subscriptions require Supabase. Until provider values are configured, the app shows setup guidance instead of claiming that live email or push delivery is active.

## Configure authentication and reminders

1. Add the public Supabase URL and anon key to `assets/app-config.js`.
2. Add the public VAPID key to the same configuration file.
3. Create/apply the Supabase migration.
4. Deploy the reminder Edge Function.
5. Configure Resend, VAPID secrets, cron scheduling, and authentication redirect URLs.

Follow the complete provider instructions in [BACKEND_SETUP.md](BACKEND_SETUP.md).

Never place a Supabase service-role key, Resend API key, VAPID private key, or cron secret in browser JavaScript.

## PWA installation

1. Deploy the app over HTTPS or open it on `localhost`.
2. Open the Dashboard.
3. Sign in.
4. Choose the reminder time and delivery methods.
5. Install the app from the browser menu.
6. Grant notification permission and enable push on the device.

## Browser support

The app uses modern browser APIs including service workers, Web Push, and Supabase Auth. Push behavior varies by browser and device, and installed PWA support is strongest on HTTPS.
