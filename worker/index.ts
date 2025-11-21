import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'

export interface Env {
  AI: Ai
  SESSION_DO: DurableObjectNamespace
}

type TransactionPayload = {
  description: string
  amountCents: number
  category?: string
  notes?: string
  date?: string
}

type ChatPayload = {
  message?: string
} & Partial<TransactionPayload>

type ChatHistoryEntry = {
  role: 'user' | 'assistant'
  description?: string
  amount?: number
  category?: string
  notes?: string
  date?: string
  content?: string
  ts: number
}

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

const app = new Hono<{ Bindings: Env }>()

// TODO: add another app.post for the one-shot model that just adds transactions.

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

app.post('/api/transaction', async (c) => {
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

app.post('/api/reset', async (c) => {
  const sessionId = c.req.query('session') ?? crypto.randomUUID()
  const stub = c.env.SESSION_DO.get(c.env.SESSION_DO.idFromName(sessionId))

  const forwarded = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
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

    if (url.pathname == '/api/reset') {
      await this.state.storage.put('history', '[]')
      return Response.json({
        sessionId: this.state.id.toString()
      })
    }

    let parsedBody: unknown;
    try {
      parsedBody = await request.json()
    } catch (err) {
      return new Response('Invalid JSON body', { status: 400 })
    }

    if (url.pathname == '/api/transaction') {
      // add transaction to history
      const tx = parsedBody as Partial<TransactionPayload>
      if (typeof tx.description !== 'string' || typeof tx.amountCents !== 'number') {
        return new Response('Missing description or amountCents', { status: 400 })
      }

      const entryDate = tx.date ?? new Date(tx.date ?? Date.now()).toISOString()
      const entry: ChatHistoryEntry = {
        role: 'user',
        description: tx.description,
        amount: tx.amountCents / 100,
        category: tx.category ?? 'Uncategorized',
        notes: tx.notes,
        date: entryDate,
        ts: Date.now(),
        content: `On ${entryDate} - ${tx.description} (${tx.category ?? 'Uncategorized'}) for $${(tx.amountCents / 100).toFixed(2)}${tx.notes ? ` — ${tx.notes}` : ''}`,
      }

      const historyJson = (await this.state.storage.get<string>('history')) ?? '[]'
      let history: ChatHistoryEntry[] = []
      try {
        history = JSON.parse(historyJson)
      } catch {
        console.error('History not found, resetting before logging transaction')
        history = []
      }
      history.push(entry)
      console.log("history now", history)
      await this.state.storage.put('history', JSON.stringify(history))
      return new Response(null, { status: 204 })
    }

    if (url.pathname == '/api/chat') {
      // reply based on history
      const body = parsedBody as ChatPayload
      const incomingMessage = typeof body.message === 'string' ? body.message.trim() : undefined
      if (!incomingMessage) {
        return new Response('Missing "message"', { status: 400 })
      }

      const historyJson = (await this.state.storage.get<string>('history')) ?? '[]'
      let history: ChatHistoryEntry[] = []
      try {
        history = JSON.parse(historyJson)
      } catch {
        console.error("History not found")
        history = []
      }

      console.log("history", history)

      const userEntry: ChatHistoryEntry = {
        role: 'user',
        ts: Date.now(),
        content: incomingMessage,
      }

      const messages = [
        {
          role: 'system',
          content: [
            'You are a financial assistant embedded in a personal budgeting app.',
            'Review the users spending, and answer their questions based on their transactions',
            'Always reference the data we already have (no guessing).',
            'If we have no data, let the user know they should add transactions first',
            'Act like a cold calculating machine with no emotion',
            'Reply in a single paragraph with a maximum of 3 sentences',
            'If necessary, reply in bullet points up to a maximum of 3',
            'If the user asks for financial advice, review the users spending, point out the top-2 categories, and suggest one actionable change',
          ].join(' ')
        },
        ...history.map((entry) => ({
          role: entry.role,
          content:
            entry.content ??
            `On ${entry.date} - ${entry.description ?? ''} (${entry.category ?? 'Uncategorized'}) for $${((entry.amount ?? 0)).toFixed(2)}${entry.notes ? ` — ${entry.notes}` : ''}`,
        })),
        { role: userEntry.role, content: userEntry.content ?? '' },
      ]

      const aiReply = await this.env.AI.run(MODEL, { messages })
      const replyText =
        typeof aiReply === 'string'
          ? aiReply
          : (aiReply as { response?: string; response_text?: string }).response ??
            (aiReply as { response_text?: string }).response_text ??
            (aiReply as any).toString()

      history.push(userEntry)
      history.push({ role: 'assistant', content: replyText, ts: Date.now() })

      await this.state.storage.put('history', JSON.stringify(history))

      return Response.json({
        reply: replyText,
        sessionId: this.state.id.toString(),
        history,
      })
    }

    return new Response('Not found', { status: 404 })
  }
}
