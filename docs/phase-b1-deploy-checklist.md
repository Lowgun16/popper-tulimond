# Phase B1 Deploy Checklist

Before merging to staging, confirm these environment variables are set in Vercel:

- [ ] `DATABASE_URL` — Neon connection string (added automatically via Vercel Marketplace)
- [ ] `TWILIO_ACCOUNT_SID` — from Twilio console
- [ ] `TWILIO_AUTH_TOKEN` — from Twilio console
- [ ] `TWILIO_FROM_NUMBER` — E.164 format e.g. +17025461344

After first Vercel deploy:
- [ ] Run `scripts/migrate-b1.sql` in Neon console (creates page_content and sms_signups tables)
- [ ] Hit `POST /api/seed-content` once to seed the DB
- [ ] Verify content shows in all overlays and legal pages
