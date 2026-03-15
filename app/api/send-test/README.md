## Folder: `app/api/send-test`

Route: `POST /api/send-test`

Purpose:
- Send a test Morning Love Mail immediately from the current form data.
- Reuses the same generation and Resend pipeline as the cron route.
- Does not wait for the saved `sendTime` window.

Request body:
- Same shape as the subscription form:
  - `recipientEmail`
  - `city`
  - `sendTime`
  - `tone`
  - `wifePersona`
  - `userPersona`
  - `constraints`

Response:
- Returns the generated `loveLine`, resolved `weather`, selected `newsSummary`,
  and real/simulated send result.
