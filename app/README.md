## Folder: `app`

This folder contains the Next.js App Router entry for Morning Love Mail.

- **Routing model**: App Router (`app/` based routes, server + client components).
- **Current scope**: Single-page MVP for configuring and previewing the morning love mail subscription, plus API route handlers.

Key responsibilities:
- Render the main subscription configuration page (`page.tsx`), including:
  - subscription form (recipient email, send time, city, tone, personas, constraints),
  - high-end, minimal, warm visual style,
  - preview area for the generated love line.
- Expose backend route handlers under `app/api/**` for:
  - generating preview love lines,
  - sending daily emails via cron,
  - (later) saving and managing the single-user subscription.

