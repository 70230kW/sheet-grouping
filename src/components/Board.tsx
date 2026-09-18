import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { evaluatePlan } from '../domain/scoring'
import type { Island, Participant, Settings } from '../types'
import { IslandCard } from './IslandCard'
import { ParticipantChip } from './ParticipantChip'

interface Props {
  participants: Participant[]
  islands: Island[]
  settings: Settings
  lockedIds: Set<string>
  onChangeIslands: (islands: Island[]) => void
  onToggleLock: (id: string) => void
  onRegenerate: () => void
  onImproveCurrent: () => void
  onIslandCountChange: (n: number) => void
  onCapacityChange: (n: number) => void
  onPrint: () => void
}

const POOL_ID = '__pool__'

function Pool({ members }: { members: Participant[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID })
  return (
    <section ref={setNodeRef} className={`pool ${isOver ? 'island-over' : ''}`}>
      <header className="island-header">
        <span className="island-label-static">未配置</span>
        <span className="island-count">{members.length}</span>
      </header>
      <div className="island-members">
        {members.map((m) => (
          <ParticipantChip key={m.id} participant={m} />
        ))}
        {members.length === 0 && <div className="island-empty">全員配置済み</div>}
      </div>
    </section>
  )
}

export function Board(props: Props) {
  const { participants, islands, settings, lockedIds, onChangeIslands } = props
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])
  const evaluation = useMemo(() => evaluatePlan(islands, participants, settings.weights), [islands, participants, settings.weights])
  const assigned = useMemo(() => new Set(islands.flatMap((i) => i.memberIds)), [islands])
  const pool = participants.filter((p) => !assigned.has(p.id))

  const errorCount = evaluation.islands.reduce((s, e) => s + e.issues.filter((i) => i.severity === 'error').length, 0)
  const warnCount = evaluation.islands.reduce((s, e) => s + e.issues.filter((i) => i.severity === 'warn').length, 0)

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const pid = String(e.active.id)
    const target = e.over ? String(e.over.id) : null
    if (!target) return
    const from = islands.find((i) => i.memberIds.includes(pid))
    if (from && lockedIds.has(from.id)) return
    if (target !== POOL_ID && lockedIds.has(target)) return
    if (from?.id === target) return
    const next = islands.map((i) => ({ ...i, memberIds: i.memberIds.filter((m) => m !== pid) }))
    if (target !== POOL_ID) {
      const to = next.find((i) => i.id === target)
      if (!to) return
      to.memberIds.push(pid)
    }
    onChangeIslands(next)
  }

  const active = activeId ? byId.get(activeId) : null

  return (
    <div className="board">
      <div className="toolbar">
        <label>
          島の数
          <input type="number" min={1} max={50} value={islands.length} onChange={(e) => props.onIslandCountChange(Number(e.target.value))} />
        </label>
        <label>
          定員
          <input type="number" min={2} max={12} value={settings.islandCapacity} onChange={(e) => props.onCapacityChange(Number(e.target.value))} />
        </label>
        <button type="button" className="btn primary" onClick={props.onRegenerate} disabled={participants.length === 0}>
          自動配置（再生成）
        </button>
        <button type="button" className="btn" onClick={props.onImproveCurrent} disabled={participants.length === 0} title="現在の配置を起点に swap 最適化のみ実行（固定島は維持）">
          現在の配置を改善
        </button>
        <button type="button" className="btn" onClick={props.onPrint} disabled={islands.length === 0}>
          印刷 / PDF
        </button>
        <div className="summary">
          <span className="summary-score">合計スコア {evaluation.total >= 0 ? '+' : ''}{evaluation.total}</span>
          <span className="badge badge-error">⚠ {errorCount}</span>
          <span className="badge badge-warn">△ {warnCount}</span>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="islands-grid">
          {islands.map((isl) => {
            const ev = evaluation.islands.find((e) => e.islandId === isl.id)!
            const members = isl.memberIds.map((id) => byId.get(id)).filter((p): p is Participant => !!p)
            return (
              <IslandCard
                key={isl.id}
                island={isl}
                members={members}
                evaluation={ev}
                capacity={settings.islandCapacity}
                locked={lockedIds.has(isl.id)}
                onToggleLock={() => props.onToggleLock(isl.id)}
                onRename={(label) => onChangeIslands(islands.map((i) => (i.id === isl.id ? { ...i, label } : i)))}
              />
            )
          })}
        </div>
        <Pool members={pool} />
        <DragOverlay>{active ? <ParticipantChip participant={active} /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
