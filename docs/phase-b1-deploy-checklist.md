# Phase B1 Deploy Checklist

Before merging to staging, confirm these environment variables are set in Vercel:

- [ ] `DATABASE_URL` — Neon connection string (added automatically via Vercel Marketplace)
- [ ] `TWILIO_ACCOUNT_SID` — from Twilio console
- [ ] `TWILIO_AUTH_TOKEN` — from Twilio console
- [ ] `TWILIO_FROM_NUMBER` — E.164 format e.g. +17025461344
- [ ] `SEED_SECRET` — any random string (e.g. `openssl rand -hex 32`); protects the seed endpoint

After first Vercel deploy:
- [ ] Run `scripts/migrate-b1.sql` in Neon console (creates page_content and sms_signups tables)
- [ ] Hit `POST /api/seed-content` with header `x-seed-secret: <your SEED_SECRET>` once to seed the DB
  - Example: `curl -X POST https://your-site.vercel.app/api/seed-content -H "x-seed-secret: <secret>"`
  - Response should be `{ "ok": true, "seeded": N, "total": N }` where N is the number of content rows
- [ ] Verify content shows in all overlays and legal pages
