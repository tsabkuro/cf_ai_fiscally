import { useState } from 'react'
import { mockApi } from '../api/apiClient'

export function AiChat() {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await mockApi.chat({ message })
      setReply(res.reply)
      setMessage('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Ask</p>
      <h3>Chat about your spend</h3>
      <form className="stack" onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. What did I spend most on this week?"
        />
        <button type="submit" disabled={sending}>
          {sending ? 'Thinking…' : 'Send'}
        </button>
      </form>
      {reply && <p className="muted chat-reply">{reply}</p>}
    </div>
  )
}

export default AiChat
