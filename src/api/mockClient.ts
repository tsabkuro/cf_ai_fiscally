let sessionId: string | null = null

export type Transaction = {
  id: string
  date: string
  description: string
  amountCents: number
  category: string
  notes?: string
}

export type Summary = {
  totalMonthCents: number
  byCategory: Record<string, number>
  topDeltas: Array<{ category: string; deltaCents: number }>
}

export type ChatRequest = { message: string }
export type ChatResponse = { reply: string }
export type AiAddRequest = { instruction: string }
export type AiAddResponse = { reply: string; transaction: Transaction }

let transactions: Transaction[] = []

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const cents = (n: number) => Math.round(n)

const nextId = () => `t-${crypto.randomUUID()}`

const API_BASE = (import.meta.env.VITE_API_BASE ?? import.meta.env.BASE_URL ?? '').replace(/\/$/, '')

export async function listTransactions(): Promise<Transaction[]> {
  await delay(80)
  return [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export type CreateTransactionInput = {
  description: string
  amountCents: number
  category?: string
  notes?: string
  date?: string
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  await delay(120)
  const tx: Transaction = {
    id: nextId(),
    date: input.date ?? new Date().toISOString().slice(0, 10),
    description: input.description,
    amountCents: cents(input.amountCents),
    category: input.category ?? 'Uncategorized',
    notes: input.notes,
  }
  transactions = [tx, ...transactions]

  await request(`/api/transaction`, { method: 'POST', body: JSON.stringify(tx) })

  return tx
}

export async function getSummary(): Promise<Summary> {
  await delay(60)
  const byCategory: Record<string, number> = {}
  for (const t of transactions) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amountCents
  }
  const totalMonthCents = transactions.reduce((sum, t) => sum + t.amountCents, 0)

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const topDeltas = topCategories.map(([category, amount]) => ({
    category,
    deltaCents: amount,
  }))

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

function parseInstruction(instruction: string) {
  const amountMatch = instruction.match(/(?:costs?|for|at)\s*\$?([\d,.]+)/i)
  const categoryMatch = instruction.match(/in\s+(.+?)\s+category/i)
  const descriptionMatch = instruction.match(/add\s+([^,]+?)(?:,| in\b|$)/i)

  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : NaN
  const amountCents = Number.isFinite(amount) ? cents(amount * 100) : 0
  const category = categoryMatch ? categoryMatch[1].trim() : 'Uncategorized'
  const description = descriptionMatch ? descriptionMatch[1].trim() : instruction.trim()

  return { amountCents, category, description }
}

export async function aiAddTransaction({ instruction }: AiAddRequest): Promise<AiAddResponse> {
  await delay(120)
  const parsed = parseInstruction(instruction)

  const transaction = await createTransaction({
    description: parsed.description || 'Untitled',
    amountCents: parsed.amountCents || 0,
    category: parsed.category,
    notes: 'Added via AI instruction',
  })

  const friendlyAmount = `$${(transaction.amountCents / 100).toFixed(2)}`
  const reply = [
    `Received: "${instruction}".`,
    `Added "${transaction.description}" to ${transaction.category} for ${friendlyAmount}.`,
    'This is a mock AI add flow; wire up to Workers AI later.',
  ].join(' ')

  return { reply, transaction }
}

export async function resetData(): Promise<void> {
  await delay(50)
  transactions = []
}

export const mockApi = {
  listTransactions,
  createTransaction,
  getSummary,
  chat,
  aiAddTransaction,
  resetData,
}
