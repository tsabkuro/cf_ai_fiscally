import type { Summary, Transaction } from '../api/apiClient'

type StatsDashboardProps = {
  summary: Summary | null
  transactions: Transaction[]
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export function StatsDashboard({ summary, transactions }: StatsDashboardProps) {
  const totalTx = transactions.length
  const avg = totalTx ? summary ? summary.totalMonthCents / totalTx : 0 : 0
  const topCategory = summary
    ? Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0]
    : undefined

  return (
    <div className="grid-3">
      <div className="card">
        <p className="eyebrow">This month</p>
        <h3>{summary ? formatMoney(summary.totalMonthCents) : '—'}</h3>
        <p className="muted">Total spend across all categories.</p>
      </div>
      <div className="card">
        <p className="eyebrow">Average Transaction Amount</p>
        <h3>{totalTx ? formatMoney(avg) : '—'}</h3>
        <p className="muted">Based on {totalTx || 'no'} transactions.</p>
      </div>
      <div className="card">
        <p className="eyebrow">Top category</p>
        <h3>{topCategory ? topCategory[0] : '—'}</h3>
        <p className="muted">{topCategory ? formatMoney(topCategory[1]) : 'Add transactions to see more.'}</p>
      </div>
    </div>
  )
}

export default StatsDashboard
