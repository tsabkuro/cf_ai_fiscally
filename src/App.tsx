import { useEffect, useState } from 'react'
import { mockApi, type Transaction, type Summary, type CreateTransactionInput } from './api/apiClient'
import StatsDashboard from './components/StatsDashboard'
import SpendingsTable from './components/SpendingsTable'
import Categories from './components/Categories'
import QuickAdd from './components/Spending'
import AiChat from './components/AiChat'
import AiAdd from './components/AiAdd'
import './App.css'

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const [txs, sum] = await Promise.all([mockApi.listTransactions(), mockApi.getSummary()])
    setTransactions(txs)
    setSummary(sum)
    setLoading(false)
  }

  async function handleCreate(input: CreateTransactionInput) {
    await mockApi.createTransaction(input)
    await refresh()
  }

  async function handleReset() {
    setLoading(true)
    try {
      await mockApi.resetData()
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Fiscally</p>
          <h1>Stay on top of your spending</h1>
        </div>
        <div className="hero-actions">
          <button onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh data'}</button>
          <button onClick={handleReset} disabled={loading}>Reset data</button>
        </div>
      </header>

      <StatsDashboard summary={summary} transactions={transactions} />

      <div className="section grid-2">
        <QuickAdd onCreate={handleCreate} />
        <AiAdd onCreated={refresh} />
      </div>

      <div className="section grid-2">
        <Categories transactions={transactions} />
        <AiChat />
      </div>

      <div className="section">
        <SpendingsTable transactions={transactions} onCreate={handleCreate} />
      </div>
    </div>
  )
}

export default App
