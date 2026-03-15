# Deploy To Vercel

This project is ready to deploy to Vercel, with one important distinction:

- local development stores the subscription in `data/subscription.json`
- deployed production stores the subscription in Vercel Blob through `BLOB_READ_WRITE_TOKEN`

## Before You Deploy

Make sure you already have:
- a verified Resend sending domain
- a sender address such as `noreply@yourdomain.com`
- an OpenAI API key
- a Vercel account

Optional but recommended:
- a `GNEWS_API_KEY` for more stable news results

## 1. Push The Project To GitHub

Commit the project and push it to a GitHub repository that Vercel can import.

## 2. Create A Blob Store In Vercel

In the Vercel dashboard:

1. Open `Storage`
2. Create a new `Blob` store
3. Connect it to this project

Vercel will inject `BLOB_READ_WRITE_TOKEN` into the project environment variables.

## 3. Import The Project Into Vercel

1. Open Vercel
2. Click `Add New...` -> `Project`
3. Import the GitHub repository
4. Keep the framework preset as `Next.js`

No special build command is needed.

## 4. Configure Environment Variables

In `Project Settings` -> `Environment Variables`, add:

- `CRON_SECRET`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `GNEWS_API_KEY` (optional)

Recommended examples:

```bash
CRON_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_xxx
MAIL_FROM=noreply@yourdomain.com
OPENAI_API_KEY=sk-proj-xxx
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
GNEWS_API_KEY=
```

## 5. Deploy

Trigger the first deployment from Vercel. After it succeeds:

1. open the production URL
2. save a subscription once from the homepage
3. use `立即测试发信` to verify real delivery

## 6. Cron Behavior

This project uses `vercel.json` to trigger:

- `/api/cron/send-love-mail`
- every minute

The server route then checks the saved `sendTime` in Asia/Shanghai and only sends on the matching minute.

## 7. Production Checks

After deployment, verify:

1. homepage loads
2. save subscription works
3. preview works
4. manual test send works
5. next scheduled send arrives at the configured time

## Notes

- If `BLOB_READ_WRITE_TOKEN` is missing, deployed changes to the subscription will not persist correctly on Vercel.
- `MAIL_FROM` must belong to a verified Resend domain.
- If OpenAI times out, the app falls back to a safe generated line and still sends the email.
