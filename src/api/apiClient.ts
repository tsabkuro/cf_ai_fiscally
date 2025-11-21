let sessionId: string | null = null

export type Transaction = {
  id: string
  date: string
  description: string
  amountCents: number
  category: string
}

export type Summary = {
  totalMonthCents: number
  byCategory: Record<string, number>
  topDeltas: Array<{ category: string; deltaCents: number }>
}

export type ChatRequest = { message: string }
export type ChatResponse = { reply: string }
export type AiAddRequest = { instruction: string }
export type AiAddResponse = { added: boolean; response: Transaction | string }
export type AiAddServerResponse = { added: boolean; transaction?: Transaction; result?: any }

const cents = (n: number) => Math.round(n)

const API_BASE = (import.meta.env.VITE_API_BASE ?? import.meta.env.BASE_URL ?? '').replace(/\/$/, '')

export async function listTransactions(): Promise<Transaction[]> {
  return await request<Transaction[]>(`/api/transactions`, { method: 'GET' })
}

export type CreateTransactionInput = {
  description: string
  amountCents: number
  category?: string
  date?: string
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return await request<Transaction>(`/api/transaction`, {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      amountCents: cents(input.amountCents),
      date: input.date,
    }),
  })
}

export async function getSummary(): Promise<Summary> {
  const txs = await listTransactions()
  const byCategory: Record<string, number> = {}
  for (const t of txs) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amountCents
  const totalMonthCents = txs.reduce((sum, t) => sum + t.amountCents, 0)
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const topDeltas = topCategories.map(([category, amount]) => ({ category, deltaCents: amount }))
  return { totalMonthCents, byCategory, topDeltas }
}

const request = async <T>(path: string, opts?: RequestInit) => {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  if (sessionId) url.searchParams.set('session', sessionId)

  const res = await fetch(url.toString(), {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  })

  sessionId = res.headers.get('X-Session-Id') ?? sessionId

  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function chat({ message }: ChatRequest): Promise<ChatResponse> {
  return await request(`/api/chat`, { method: 'POST', body: JSON.stringify({ message }) })
}

export async function aiAddTransaction({ instruction }: AiAddRequest): Promise<AiAddResponse> {
  const res = await request<AiAddServerResponse>(`/api/chat/add`, {
    method: 'POST',
    body: JSON.stringify({ instruction }),
  })

  if (res.added && res.transaction) {
    return { added: true, response: res.transaction }
  }

  const msg =
    res.result?.response ??
    res.result?.response_text ??
    'Unable to parse. Please correct your message'
  return { added: false, response: msg }
}

export async function resetData(): Promise<void> {
  await request(`/api/reset`, { method: 'POST' })
}

export const mockApi = {
  listTransactions,
  createTransaction,
  getSummary,
  chat,
  aiAddTransaction,
  resetData,
}
