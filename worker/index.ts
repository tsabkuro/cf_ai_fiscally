import { Hono } from 'hono'

export interface Env {
  AI: Ai
  SESSION_DO: DurableObjectNamespace
}

type ChatBody = {
  notes?: string
  message?: string
  template?: string
}

type ChatHistoryEntry = {
  role: 'user' | 'assistant'
  content: string
  notes?: string
  template?: string
  ts: number
}

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

const app = new Hono<{ Bindings: Env }>()

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

export class SessionDo {
  private state: DurableObjectState
  private env: Env

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
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

    if (!body.message) {
      return new Response('Missing "message" in request body', { status: 400 })
    }

    const historyJson = (await this.state.storage.get<string>('history')) ?? '[]'

    let history: ChatHistoryEntry[] = []
    try {
      history = JSON.parse(historyJson)
    } catch {
      history = []
    }

    history.push({
      role: 'user',
      content: body.message,
      notes: body.notes,
      template: body.template,
      ts: Date.now(),
    })

    const messages = [
      { role: 'system', content: 'You give insights into spending habits' },
      ...history.map(({ role, content }) => ({ role, content })),
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
