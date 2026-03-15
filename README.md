# Morning Love Mail

Morning Love Mail is a single-user MVP that generates one restrained morning love line in Chinese and sends it by email.

It combines:
- city weather
- selected news signals
- recipient persona
- sender persona
- tone and writing constraints

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI API
- Resend
- GitHub Actions cron trigger
- Local JSON for local development
- Vercel Blob for deployed persistence

## Local Development

1. Create `.env.local` from `.env.example`.
2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Required:
- `CRON_SECRET`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `OPENAI_API_KEY`

Production on Vercel also needs:
- `BLOB_READ_WRITE_TOKEN`

Optional:
- `GNEWS_API_KEY`
  If absent, the app falls back to Google News RSS and then to curated fallback lines.

## Current Product Flows

- Save a single subscription from the homepage
- Generate a preview love line
- Send a manual test email immediately
- Send the scheduled morning email through `/api/cron/send-love-mail`

## Scheduling Model

- Local development: you can hit the cron route manually
- Production on Vercel Hobby: GitHub Actions calls the cron route every 5 minutes
- The server sends only once per day and accepts a 5-minute window around the configured `sendTime`

## Deployment

Detailed Vercel deployment steps live in `docs/deploy-vercel.md`.
