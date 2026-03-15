## Folder: `app/api/activity`

Route: `GET /api/activity`

Purpose:
- Read the recent operational history for Morning Love Mail.
- Returns:
  - latest 30 send records
  - latest 30 generation records

Usage:
- Used by the homepage diagnostics panel to help inspect production behavior.
- Data is persisted locally in development and in Vercel Blob in production.
