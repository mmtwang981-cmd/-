## Folder: `app/api`

This folder holds all API route handlers for the Morning Love Mail MVP.

Routing:
- Each subfolder under `app/api` defines a route handler using the Next.js App Router convention.
- Files named `route.ts` export HTTP methods (`GET`, `POST`, etc.) for the corresponding endpoint.

Current responsibilities:
- `/api/preview` – generate a preview love line for the current form inputs (no persistence, preview-only).
- `/api/cron/send-love-mail` – cron-safe endpoint that:
  - reads the stored subscription from local JSON,
  - uses OpenAI to generate a love line (with fallback),
  - sends the email through Resend.

Planned responsibilities:
- `/api/subscribe` – save / update the single-user subscription into local JSON storage.
- (Optionally) manual send/test endpoints that reuse the same send pipeline as the cron route.

