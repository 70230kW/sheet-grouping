import { useDroppable } from '@dnd-kit/core'
import type { Island, IslandEvaluation, IslandIssue, Participant } from '../types'
import { ParticipantChip } from './ParticipantChip'

interface Props {
  island: Island
  members: Participant[]
  evaluation: IslandEvaluation
  capacity: number
  locked: boolean
  onToggleLock: () => void
  onRename: (label: string) => void
}

function worstFlag(issues: IslandIssue[], pid: string): 'error' | 'warn' | 'good' | null {
  let flag: 'error' | 'warn' | 'good' | null = null
  for (const iss of issues) {
    if (!iss.participantIds.includes(pid)) continue
    if (iss.severity === 'error') return 'error'
    if (iss.severity === 'warn') flag = 'warn'
    else if (iss.severity === 'good' && flag === null) flag = 'good'
  }
  return flag
}

export function IslandCard({ island, members, evaluation, capacity, locked, onToggleLock, onRename }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: island.id })
  const errors = evaluation.issues.filter((i) => i.severity === 'error')
  const warns = evaluation.issues.filter((i) => i.severity === 'warn')
  const goods = evaluation.issues.filter((i) => i.severity === 'good')
  const over = members.length > capacity
  const cls = ['island', isOver ? 'island-over' : '', errors.length ? 'island-error' : warns.length ? 'island-warn' : '', locked ? 'island-locked' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section ref={setNodeRef} className={cls}>
      <header className="island-header">
        <input
          className="island-label"
          value={island.label}
          onChange={(e) => onRename(e.target.value)}
          aria-label="島の名前"
        />
        <span className={`island-count ${over ? 'over' : ''}`}>
          {members.length}/{capacity}
        </span>
        <span className={`island-score ${evaluation.score < 0 ? 'neg' : 'pos'}`}>
          {evaluation.score >= 0 ? '+' : ''}
          {evaluation.score}
        </span>
        <button type="button" className={`btn-icon ${locked ? 'active' : ''}`} onClick={onToggleLock} title="この島を固定（再配置の対象外）">
          {locked ? '🔒' : '🔓'}
        </button>
      </header>
      <div className="island-members">
        {members.map((m) => (
          <ParticipantChip key={m.id} participant={m} flagged={worstFlag(evaluation.issues, m.id)} disabled={locked} />
        ))}
        {members.length === 0 && <div className="island-empty">ここにドロップ</div>}
      </div>
      {(errors.length > 0 || warns.length > 0 || over) && (
        <ul className="issues">
          {over && <li className="issue issue-error">定員超過（{members.length}/{capacity}）</li>}
          {errors.map((i, k) => (
            <li key={`e${k}`} className="issue issue-error">
              {i.message} <span className="delta">{i.delta}</span>
            </li>
          ))}
          {warns.map((i, k) => (
            <li key={`w${k}`} className="issue issue-warn">
              {i.message} <span className="delta">{i.delta}</span>
            </li>
          ))}
        </ul>
      )}
      {goods.length > 0 && (
        <details className="goods">
          <summary className="issue issue-good">
            マッチ {goods.length} 件 <span className="delta">+{goods.reduce((s, i) => s + i.delta, 0)}</span>
          </summary>
          <ul className="issues">
            {goods.map((i, k) => (
              <li key={`g${k}`} className="issue issue-good">
                {i.message} <span className="delta">+{i.delta}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
