# WhatsApp Business Inbox

Frontend demo for a WhatsApp-style customer support inbox, built with React, Vite, TypeScript, and Tailwind CSS v4.

## Features

- Mobile-first responsive inbox and chat layout.
- Global WhatsApp account selector.
- Conversation search and unread indicators.
- Incoming/outgoing message bubbles.
- Local simulated replies (no message is sent to WhatsApp).
- Demo data isolated in `src/data/mockData.ts`.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm run typecheck
npm run build
```

## Backend integration boundary

The current UI uses local demo data because a secure Inbox read endpoint is not available yet. Do not query the WhatsApp tables directly from the browser while RLS has no frontend policies.

The existing send function can be integrated behind a frontend service after its request/response contract and authentication are verified. Until then, the composer only appends a local demo message and clearly labels it as a simulation.

Environment variables in Vite are public browser values. Only a Supabase project URL and anon key may be configured here when needed. Never expose a service-role key, WhatsApp access token, or other server secret in frontend code or `VITE_*` variables.

## Structure

```
src/
  data/mockData.ts
  App.tsx
  main.tsx
  styles.css
  types.ts
```
