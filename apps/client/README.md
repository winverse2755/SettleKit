# SettleKit Client

Next.js frontend for SettleKit.

## Setup

1. Copy `.env.example` to `.env.local`
2. Set `BACKEND_URL`:
   - **Local development**: `BACKEND_URL=https://seedier-reese-nomographic.ngrok-free.dev` (default)
   - **With ngrok**: `BACKEND_URL=https://your-ngrok-url.ngrok-free.dev`

## Running

- **Client only**: `npm run dev` (from repo root) or `npm run dev` (from apps/client)
- **Client + Backend**: `npm run dev:all` (from repo root) — runs both skit-backend and the Next.js client

When using `dev:all`, ensure `BACKEND_URL=https://seedier-reese-nomographic.ngrok-free.dev` in `.env.local`.
