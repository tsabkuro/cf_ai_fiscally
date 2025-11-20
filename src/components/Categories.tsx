import { useMemo } from 'react'
import type { Transaction } from '../api/mockClient'

type CategoryStat = {
  name: string
  totalCents: number
  count: number
}

export type CategoriesProps = {
  transactions: Transaction[]
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export function Categories({ transactions }: CategoriesProps) {
  const stats = useMemo<CategoryStat[]>(() => {
    const map = new Map<string, CategoryStat>()
    for (const tx of transactions) {
      const key = tx.category || 'Uncategorized'
      const existing = map.get(key) ?? { name: key, totalCents: 0, count: 0 }
      existing.totalCents += tx.amountCents
      existing.count += 1
      map.set(key, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents)
  }, [transactions])

  return (
    <div className="card">
      <p className="eyebrow">Categories</p>
      <h3>Where the money goes</h3>
      <div className="pill-grid">
        {stats.map((cat) => (
          <div className="pill-row" key={cat.name}>
            <div>
              <div className="title">{cat.name}</div>
              <div className="muted">{cat.count} item{cat.count === 1 ? '' : 's'}</div>
            </div>
            <div className="right">{formatMoney(cat.totalCents)}</div>
          </div>
        ))}
        {stats.length === 0 && <div className="empty">No categories yet.</div>}
      </div>
    </div>
  )
}

export default Categories
