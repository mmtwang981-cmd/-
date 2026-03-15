# Morning Love Mail - Agent Rules

## Product Goal
Build an MVP called Morning Love Mail.

The product generates one morning love line every day based on:
- city weather
- selected important news
- wife's persona
- sender persona
- tone/style constraints

Then it sends the generated line to a target email.

## Current Stage
We are building MVP only.

## Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Route Handlers
- Local JSON storage for MVP
- OpenAI API for text generation
- Resend for email sending
- Vercel Cron for scheduling

## Product Constraints
- Single-user only
- No auth system
- No database yet unless necessary
- No overengineering
- Keep implementation simple and shippable

## UX Style
- High-end
- Minimal
- Warm
- Calm
- Not like an admin dashboard
- Feels like an AI-native premium product

## Content Quality Requirements
Generated love lines must be:
- natural
- gentle
- restrained
- not cheesy
- not like ad copy
- not like generic AI text
- around 50 to 90 Chinese characters
- should lightly reflect weather/news mood
- should include a tiny daily-life caring touch

## Persona Context
Recipient:
- Works at LVMH and Tiffany
- Has jewelry startup experience
- Has an art background
- Sensitive to aesthetics, materiality, detail, and brand narrative

Sender:
- Intelligent driving product manager
- Cares about technology trends, product judgment, complex systems
- Rational but wants warmth in expression

## Engineering Rules
- Prefer small focused files
- Reuse server logic where possible
- Do not expose secrets to client side
- Keep API responses typed when useful
- Add basic error handling
- Preserve current working features unless task explicitly changes them

## Workflow Rules
When given a task:
1. Inspect existing files first
2. Make the minimum necessary edits
3. Explain which files were changed
4. Mention how to test the change
5. Do not refactor unrelated parts

