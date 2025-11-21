# Fiscally

Fiscally is a Vite + React front end paired with a Cloudflare Worker + Durable Object that powers AI-assisted transaction tracking and chat insights. The Worker uses Cloudflare’s AI tooling to interpret free-form instructions, add transactions, and maintain per-session history, while the UI provides a simple budgeting dashboard.

Live site: https://fiscally-4hs.pages.dev/

## Features

- **AI Add:** Free-form instructions are parsed by a Cloudflare AI model that calls a tool to create transactions.
- **Chat Insights:** A Durable Object stores per-session history so the chatbot can reference the latest spending data.
- **Quick Add & Dashboard:** Manual entry, summaries, and tables remain available for traditional bookkeeping.

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the Worker locally**
   ```bash
   npx wrangler dev worker/index.ts
   ```
   Wrangler serves the API/Durable Object at `http://localhost:8787`.
3. **Run the Vite dev server**
   ```bash
   npm run dev
   ```
   Vite proxies `/api/*` requests to the Worker (configure via `vite.config.ts`). Visit the printed URL (usually `http://localhost:5173`).

Make sure `.env` sets `VITE_API_BASE=/` for local proxying.

## Testing AI flows

- **AI Add:** Use the “AI add” card, type an instruction (e.g., “Add coffee in food & drink for $4.50”), and watch the Worker add the transaction.
- **Chat:** Use the “Chat about your spend” card to ask follow-up questions; the Durable Object already includes any transactions added via AI or manual entry for the current session.

For more details, see `worker/index.ts` and `src/api/apiClient.ts`.
