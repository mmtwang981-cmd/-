## Folder: `app/api/preview`

Route: `POST /api/preview`

Purpose:
- Generate a **preview** of the morning love line based on the current form input.
- Does **not** persist any subscription data.
- Used by the main page’s “测试生成” button for fast feedback while tuning copy and personas.

Current behavior (MVP):
- Accepts JSON body with:
  - `city`
  - `tone`
  - `wifePersona`
  - `userPersona`
  - `constraints`
- Derives:
  - a simple mock `weather` string from `city`,
  - a `tag` combining tone and personas,
  - a synthetic `loveLine` using simple rules (no OpenAI call yet).
- Returns a JSON response consumed directly by the client-side preview card.

Future improvements:
- Reuse the same prompt-building and content constraints as the cron route.
- Optionally call OpenAI for a more realistic preview, with a safe fallback when keys are missing.

