import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'

export interface Env {
  AI: Ai
  SESSION_DO: DurableObjectNamespace
}

type ChatBody = {
  description?: string
  amount?: number
  category?: string
  notes?: string
}

type ChatHistoryEntry = {
  role: 'user' | 'assistant'
  description?: string
  amount?: number
  category?: string
  notes?: string
  content?: string
  ts: number
}

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

const app = new Hono<{ Bindings: Env }>()

// add another app.post for the one-shot model that just adds transactions.

app.post('/api/chat', async (c) => {
  const sessionId = c.req.query('session') ?? crypto.randomUUID()
  const stub = c.env.SESSION_DO.get(c.env.SESSION_DO.idFromName(sessionId))

  const forwarded = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  })

  const resp = await stub.fetch(forwarded)
  const response = new Response(resp.body, resp)
  response.headers.set('X-Session-Id', sessionId)
  return response
})

app.get('/api/health', (c) => c.json({ ok: true }))

export default app

export class SessionDo extends DurableObject {
  protected state: DurableObjectState
  protected env: Env

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)

    this.state = state;
    this.env = env
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname !== '/api/chat') {
      return new Response('Not found', { status: 404 })
    }

    let body: ChatBody
    try {
      body = await request.json()
    } catch (err) {
      return new Response('Invalid JSON body', { status: 400 })
    }

    if (!body.description) {
      return new Response('Missing "description" in request body', { status: 400 })
    } else if (!body.amount) {
      return new Response('Missing "amount" n request body', {status: 400 })
    }

    const historyJson = (await this.state.storage.get<string>('history')) ?? '[]'

    let history: ChatHistoryEntry[] = []
    try {
      history = JSON.parse(historyJson)
    } catch {
      console.error("History not found")
      history = []
    }

    const formattedAmount = ((body.amount ?? 0) / 100).toFixed(2)
    const userContent = `${body.description} (${body.category ?? 'Uncategorized'}) for $${formattedAmount}${body.notes ? ` — ${body.notes}` : ''}`

    history.push({
      role: 'user',
      description: body.description,
      amount: body.amount,
      category: body.category,
      notes: body.notes,
      ts: Date.now(),
      content: userContent,
    })

    const messages = [
      {
        role: 'system',
        content: [
          'You are a financial assistant embedded in a personal budgeting app.',
          'Review the users spending, and answer their questions based on their transactions',
          'Always reference the data we already have (no guessing).',
          'If we have no data, let the user know they should add transactions first',
          'Act like a cold calculating machine with no emotion',
          'Reply in two short paragraphs followed by 2 bullet recommendations.',
        ].join(' ')
      },
      ...history.map((entry) => ({
        role: entry.role,
        content:
          entry.content ??
          `${entry.description ?? ''} (${entry.category ?? 'Uncategorized'}) for $${((entry.amount ?? 0) / 100).toFixed(2)}${entry.notes ? ` — ${entry.notes}` : ''}`,
      })),
    ]

    const aiReply = await this.env.AI.run(MODEL, { messages })
    const replyText =
      typeof aiReply === 'string'
        ? aiReply
        : (aiReply as { response?: string; response_text?: string }).response ??
          (aiReply as { response_text?: string }).response_text ??
          (aiReply as any).toString()

    history.push({ role: 'assistant', content: replyText, ts: Date.now() })

    await this.state.storage.put('history', JSON.stringify(history))

    return Response.json({
      reply: replyText,
      sessionId: this.state.id.toString(),
      history,
    })
  }
}
