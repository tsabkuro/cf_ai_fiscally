import { useState } from 'react'
import { mockApi } from '../api/mockClient'

type AiAddProps = {
  onCreated: () => Promise<void>
}

export function AiAdd({ onCreated }: AiAddProps) {
  const [instruction, setInstruction] = useState('')
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!instruction.trim()) return
    setSubmitting(true)
    try {
      const res = await mockApi.aiAddTransaction({ instruction })
      if (res.added && typeof res.response !== 'string') {
        const tx = res.response
        const friendlyAmount = `$${(tx.amountCents / 100).toFixed(2)}`
        setReply(`Added ${tx.description} in ${tx.category} for ${friendlyAmount}.`)
        setInstruction('')
        await onCreated()
      } else if (typeof res.response === 'string') {
        setReply(res.response)
      } else {
        setReply('Unable to add that transaction. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">AI add</p>
      <h3>Add by writing a sentence</h3>
      <form className="stack" onSubmit={handleSubmit}>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='e.g. "add coffee, in food & drink category. costs 4.50"'
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Ask AI to add it'}
        </button>
      </form>
      {reply && <p className="muted chat-reply">{reply}</p>}
    </div>
  )
}

export default AiAdd
