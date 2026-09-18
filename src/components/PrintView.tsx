import type { Island, Participant } from '../types'

interface Props {
  title: string
  islands: Island[]
  participants: Participant[]
}

export function PrintView({ title, islands, participants }: Props) {
  const byId = new Map(participants.map((p) => [p.id, p]))
  return (
    <div className="print-view">
      <h1 className="print-title">{title || '座席表'}</h1>
      <div className="print-grid">
        {islands.map((isl) => (
          <section key={isl.id} className="print-island">
            <h2>島 {isl.label}</h2>
            <ol>
              {isl.memberIds.map((id) => {
                const p = byId.get(id)
                if (!p) return null
                return (
                  <li key={id}>
                    <span className="print-name">{p.name}</span>
                    <span className="print-meta">
                      {p.categories[0] ?? ''}
                      {p.areas[0] ? ` / ${p.areas[0]}` : ''}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
