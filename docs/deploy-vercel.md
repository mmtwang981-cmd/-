# Deploy To Vercel Hobby

This project is ready for Vercel Hobby, but it does not use Vercel Cron.

Instead:
- Vercel hosts the app
- Vercel Blob stores the subscription in production
- GitHub Actions calls the cron endpoint every 5 minutes

This avoids the Vercel Hobby cron limitation.

## Before You Deploy

Make sure you already have:
- a verified Resend sending domain
- a sender address such as `noreply@yourdomain.com`
- an OpenAI API key
- a Vercel account
- a GitHub repository for this project

Optional but recommended:
- a `GNEWS_API_KEY` for more stable news results

## 1. Import The GitHub Repo Into Vercel

1. Open Vercel
2. Click `Add New...` -> `Project`
3. Import the GitHub repository
4. Keep the framework preset as `Next.js`
5. Deploy once

## 2. Create A Blob Store

In the Vercel dashboard:

1. Open `Storage`
2. Create a new `Blob` store
3. Connect it to this project

This gives the project a `BLOB_READ_WRITE_TOKEN`.

## 3. Configure Vercel Environment Variables

In `Project Settings` -> `Environment Variables`, add:

- `CRON_SECRET`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `GNEWS_API_KEY` (optional)

Example values:

```bash
CRON_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_xxx
MAIL_FROM=noreply@morning-love.xin
OPENAI_API_KEY=sk-proj-xxx
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
GNEWS_API_KEY=
```

After saving environment variables, redeploy once.

## 4. Add GitHub Repository Secrets

Open the GitHub repository:

`Settings` -> `Secrets and variables` -> `Actions`

Create these secrets:

- `CRON_ENDPOINT_URL`
  Example: `https://your-project-name.vercel.app`
- `CRON_SECRET`
  Use the exact same value as the Vercel environment variable

## 5. Enable GitHub Actions Scheduler

This repository includes:

- `.github/workflows/cron-send-love-mail.yml`

It runs every 5 minutes and calls:

- `/api/cron/send-love-mail`

with:

- `Authorization: Bearer $CRON_SECRET`

## 6. Important Scheduling Behavior

Because GitHub Actions runs every 5 minutes:

- the backend accepts a 5-minute send window
- the backend records send state and only sends once per day

So if the saved send time is `08:03`, the `08:05` GitHub Actions run will still send it.

## 7. Production Checks

After deployment:

1. open the production homepage
2. save a subscription once
3. click `立即测试发信`
4. in GitHub, open `Actions` and manually run `Cron Send Love Mail` once if you want to test the scheduled route

## Notes

- If `BLOB_READ_WRITE_TOKEN` is missing, production subscription updates will not persist.
- `MAIL_FROM` must belong to a verified Resend domain.
- If OpenAI times out, the app falls back to a safe generated line and still sends the email.
