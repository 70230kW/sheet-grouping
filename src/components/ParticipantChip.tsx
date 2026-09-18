import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Participant } from '../types'

interface Props {
  participant: Participant
  flagged?: 'error' | 'warn' | 'good' | null
  disabled?: boolean
}

export function ParticipantChip({ participant, flagged, disabled }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: participant.id,
    disabled,
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chip ${flagged ? `chip-${flagged}` : ''} ${disabled ? 'chip-disabled' : ''}`}
      {...listeners}
      {...attributes}
      title={[
        participant.name,
        `業態: ${participant.categories.join('・') || '-'}`,
        `売上: ${participant.revenueRaw || '-'}`,
        `商圏: ${participant.areas.join('・') || '-'}`,
        `やりたい: ${participant.wants.join('・') || '-'}`,
        `繋げたい: ${participant.connects.join('・') || '-'}`,
      ].join('\n')}
    >
      <div className="chip-name">{participant.name}</div>
      <div className="chip-meta">
        <span className="tag tag-cat">{participant.categories[0] ?? '業態不明'}</span>
        <span className="tag tag-rev">{participant.revenueRaw || '規模?'}</span>
        <span className="tag tag-area">{participant.areas[0] ?? 'エリア?'}</span>
      </div>
    </div>
  )
}
