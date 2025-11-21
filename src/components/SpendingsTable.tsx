import { useMemo, type FormEvent } from 'react'
import type { CreateTransactionInput, Transaction } from '../api/mockClient'

export type SpendingsTableProps = {
  transactions: Transaction[]
  onCreate: (input: CreateTransactionInput) => Promise<void>
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export function SpendingsTable({ transactions, onCreate }: SpendingsTableProps) {
  const rows = useMemo(() => {
    return [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [transactions])

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const description = String(form.get('description') || '')
    const amount = Number(form.get('amount') || 0)
    const category = String(form.get('category') || '') || 'Uncategorized'
    const date = String(form.get('date') || new Date().toISOString().slice(0, 10))

    if (!description || !amount) return

    await onCreate({
      description,
      amountCents: Math.round(amount * 100),
      category,
      date,
    })
    e.currentTarget.reset()
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Transactions</p>
          <h3>Recent spend</h3>
        </div>
        <form className="inline-form" onSubmit={handleCreate}>
          <input name="description" placeholder="Description" required />
          <input name="amount" type="number" step="0.01" placeholder="Amount" required />
          <input name="category" placeholder="Category" />
          <input name="date" type="date" />
          <button type="submit">Add</button>
        </form>
      </div>

      <div className="table shell">
        <div className="table-head">
          <span>Description</span>
          <span>Category</span>
          <span className="right">Amount</span>
          <span className="right">Date</span>
        </div>
        <div className="table-body">
          {rows.map((tx) => (
            <div className="table-row" key={tx.id}>
              <div>
                <div className="title">{tx.description}</div>
              </div>
              <span className="pill">{tx.category}</span>
              <span className="right">{formatMoney(tx.amountCents)}</span>
              <span className="right muted">{tx.date}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="empty">No transactions yet.</div>}
        </div>
      </div>
    </div>
  )
}

export default SpendingsTable
