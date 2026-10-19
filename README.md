# Stylista

Your personal stylist. Every morning it checks the weather where you'll be, your calendar and your week, picks two or three looks from what's **clean** in your closet, and sends you the top one as a notification (and optionally a text with the outfit collage).

- **Today**: the morning's looks with the weather, your calendar, an after-work swap and what to pack (e.g. yoga). "Wearing this" marks the pieces dirty.
- **Closet**: tap any piece to flip clean ↔ dirty; **Laundry day** makes everything clean again. Add pieces by photo; Claude fills in the details.
- **Outfits**: saved go-to looks. When one is fully clean, it can show up as a morning option.
- **More**: notification time and channels, your week and events, weather places and calendar links, lookbook (style DNA from inspiration screenshots), closet gaps, and your body/fabric profile.

Built with Next.js, Supabase (accounts, data, photos) and the Claude API. Weather comes from [Open-Meteo](https://open-meteo.com) (free, no key).

## Set it up (about 20 minutes, once)

### 1. Supabase (database, sign-in, photos)
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste all of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run.
3. **Authentication → Email Templates → Magic Link**: add the line `Your code: {{ .Token }}` to the template. (On iPhone, a Home Screen app can't receive the sign-in link, so you type the code instead.)
4. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.

### 2. Claude API key
Create one at [console.anthropic.com](https://console.anthropic.com) → API keys.

### 3. Notification keys
On any computer with Node installed: `npx web-push generate-vapid-keys`. Keep both keys.

### 4. Deploy on Vercel
1. [vercel.com/new](https://vercel.com/new) → import this repository.
2. Add every variable from [`.env.example`](.env.example) (the Twilio ones are optional). For `CRON_SECRET`, use any long random string. Set `APP_URL` to the address Vercel gives you (deploy once, add it, redeploy).
3. Back in Supabase, **Authentication → URL Configuration**: set Site URL to your `APP_URL`.

### 5. Turn on the morning job
In this GitHub repo: **Settings → Secrets and variables → Actions**
- Secrets: `APP_URL` and `CRON_SECRET` (same values as on Vercel).
- Variables: `MORNING_JOB_ENABLED` = `true`.

The [morning workflow](.github/workflows/morning.yml) pings the app every 15 minutes; the app sends each person's look once their chosen time has passed.

### 6. On your phone
1. Open your `APP_URL` in Safari → Share → **Add to Home Screen**, then open Stylista from the Home Screen.
2. Sign in with your email code.
3. **More → Morning notification**: set the time → **Turn on for this device** → **Send me a test**.
4. **More → Weather & calendar**: set home and work (a ZIP code always works) and paste your calendar link.
5. Add your clothes in **Closet** (you can select lots of photos at once).

### Optional: text messages with the collage
iPhone notifications from web apps show text only. To get the outfit picture right in the notification, create a [Twilio](https://twilio.com) account, buy a number with MMS, complete US carrier registration (A2P 10DLC or toll-free verification), then set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM` on Vercel. Turn on texts in **More → Morning notification**.

## Sharing it
Anyone with the link can create an account and get their own closet. Each person's data is private to them (row-level security). AI calls are billed to your Claude API key.

## Develop
```bash
cp .env.example .env.local   # fill in
npm install
npm run dev
npm test                     # unit tests: weather, calendar, time zones
```
