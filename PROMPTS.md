# PROMPTS

This project leveraged AI-assisted development through the following high-level prompts:

1. **Initial environment questions:** Clarified how `import.meta.env.BASE_URL` works in Vite and how to configure `.env` files for dev/prod.
2. **Worker integration guidance:** Asked for step-by-step setup to keep secrets safe while wiring the Cloudflare Worker, Durable Object, and AI bindings.
3. **CORS troubleshooting:** Diagnosed cross-origin issues when the front end called `/api/chat` before the proxy was configured.
4. **Durable Object storage workflow:** Discussed how to route both chat and transaction logging through the same DO instance and how to parse payloads.
5. **AI tool-call wiring:** Requested examples on defining Workers AI tools, parsing tool-call arguments, and forwarding them to `/api/transaction`.
6. **Session handling & testing:** Ensured the `session` query/headers were reused across `/api/*` endpoints so the DO history stayed consistent.
7. **Deployment guidance:** Asked how to deploy the Worker/Durable Object and front end on Cloudflare’s free tier.

These prompts guided the iterative implementation
