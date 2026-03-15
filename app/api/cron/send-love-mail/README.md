## Folder: `app/api/cron/send-love-mail`

Route: `GET /api/cron/send-love-mail`

Purpose:
- Cron-only endpoint for **sending the daily Morning Love Mail email**.
- Designed to be triggered by Vercel Cron with a secret bearer token.

Current behavior:
- Auth:
  - Expects header `Authorization: Bearer ${process.env.CRON_SECRET}`.
  - Returns `401` JSON if the token does not match.
- Data source:
  - Reads a single `Subscription` object from `data/subscription.json`.
  - Assumes the file exists and matches the `Subscription` type.
- Content generation:
  - Uses a mocked `weather` string and curated `newsSummary` list.
  - Builds a structured prompt encoding:
    - city + weather,
    - selected news mood,
    - wife & sender personas,
    - tone and constraints.
  - Calls OpenAI (`responses.create` with `gpt-5`) to generate the love line.
  - Falls back to a safe default sentence if OpenAI fails.
- Email sending:
  - Uses Resend, with env vars:
    - `RESEND_API_KEY`
    - `MAIL_FROM`
  - Sends HTML email to `subscription.recipientEmail`.

Planned improvements:
- Handle missing / invalid `data/subscription.json` gracefully (e.g. 404/400 instead of crash).
- Optionally extract shared send + prompt logic for reuse by manual send endpoints.

