import { useState, type FormEvent } from 'react'
import type { CreateTransactionInput } from '../api/mockClient'

export type QuickAddProps = {
  onCreate: (input: CreateTransactionInput) => Promise<void>
}

export function QuickAdd({ onCreate }: QuickAddProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!description || !amount) return
    setSubmitting(true)
    try {
      await onCreate({
        description,
        amountCents: Math.round(parseFloat(amount) * 100),
        category: category || 'Uncategorized',
        notes: note || undefined,
      })
      setDescription('')
      setAmount('')
      setCategory('')
      setNote('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Quick add</p>
      <h3>Add a transaction</h3>
      <form className="stack" onSubmit={handleSubmit}>
        <div className="grid-2">
          <label className="field">
            <span>Description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
          <label className="field">
            <span>Amount (USD)</span>
            <input
              value={amount}
              type="number"
              step="0.01"
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Groceries" required />
          </label>
          <label className="field">
            <span>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
          </label>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add transaction'}
        </button>
      </form>
    </div>
  )
}

export default QuickAdd
