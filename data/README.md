## Folder: `data`

This folder is used for **local JSON storage** in the MVP phase.

Planned file:
- `subscription.json`
  - Stores the single-user subscription used by the cron send endpoint.
  - Shape matches the `Subscription` type in `app/api/cron/send-love-mail/route.ts`:
    - `recipientEmail`
    - `city`
    - `sendTime`
    - `tone`
    - `wifePersona`
    - `userPersona`
    - `constraints`

Usage rules:
- Treated as **single-user, last-write-wins** storage.
- Written by the future `/api/subscribe` route.
- Read by `GET /api/cron/send-love-mail` when sending the daily email.
- Do not commit real personal data; in production, replace with a proper database.

