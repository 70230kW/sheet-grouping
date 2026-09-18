import { useEffect, useMemo, useState } from 'react'
import { Board } from './components/Board'
import { ImportPanel } from './components/ImportPanel'
import { PrintView } from './components/PrintView'
import { SettingsPanel } from './components/SettingsPanel'
import { rowsToParticipants, toTable } from './data/mapping'
import { islandCount, makeIslands, optimize } from './domain/optimize'
import { loadData, loadSettings, saveData, saveSettings } from './state/storage'
import type { Island, Settings } from './types'

type Tab = 'import' | 'board' | 'settings'

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [rawValues, setRawValues] = useState<string[][]>(() => loadData()?.rawValues ?? [])
  const [islandsState, setIslands] = useState<Island[]>(() => loadData()?.islands ?? [])
  const [title, setTitle] = useState(() => loadData()?.title ?? 'レンタカー研究会 座席表')
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>(() => (loadData()?.islands?.length ? 'board' : 'import'))

  const table = useMemo(() => toTable(rawValues), [rawValues])
  const { participants, missing } = useMemo(
    () => rowsToParticipants(table, settings.mapping, settings.revenue),
    [table, settings.mapping, settings.revenue],
  )

  // 参加者が変わった場合に備え、島に残っている不明 ID を除外した配置を使う
  const islands = useMemo(() => {
    const ids = new Set(participants.map((p) => p.id))
    return islandsState.map((i) => ({ ...i, memberIds: i.memberIds.filter((m) => ids.has(m)) }))
  }, [islandsState, participants])

  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveData({ rawValues, participants, islands, title }), [rawValues, participants, islands, title])


  function regenerate(count?: number) {
    const n = count ?? (islands.length || islandCount(participants.length, settings.islandCapacity))
    const result = optimize(participants, settings.weights, {
      capacity: settings.islandCapacity,
      islandCount: n,
      restarts: settings.restarts,
      seed: Date.now(),
      initial: lockedIds.size ? islands : undefined,
      lockedIslandIds: lockedIds,
    })
    setIslands(result)
  }

  function improveCurrent() {
    const result = optimize(participants, settings.weights, {
      capacity: settings.islandCapacity,
      islandCount: islands.length,
      restarts: 0,
      initial: islands,
      lockedIslandIds: lockedIds,
    })
    setIslands(result)
  }

  function handleLoaded(values: string[][]) {
    setRawValues(values)
    const { participants: ps } = rowsToParticipants(toTable(values), settings.mapping, settings.revenue)
    const n = islandCount(ps.length, settings.islandCapacity)
    setLockedIds(new Set())
    setIslands(
      optimize(ps, settings.weights, {
        capacity: settings.islandCapacity,
        islandCount: n,
        restarts: settings.restarts,
        seed: Date.now(),
      }),
    )
    setTab('board')
  }

  function changeIslandCount(n: number) {
    if (!Number.isFinite(n) || n < 1) return
    if (n === islands.length) return
    if (n > islands.length) {
      const extra = makeIslands(n).slice(islands.length)
      setIslands([...islands, ...extra])
    } else {
      // 減らす場合: 末尾の島のメンバーは未配置に戻す
      setIslands(islands.slice(0, n))
    }
  }

  function toggleLock(id: string) {
    setLockedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>座席表作成</h1>
        <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="座席表タイトル" />
        <nav className="tabs">
          <button type="button" className={tab === 'import' ? 'active' : ''} onClick={() => setTab('import')}>
            1. データ
          </button>
          <button type="button" className={tab === 'board' ? 'active' : ''} onClick={() => setTab('board')} disabled={participants.length === 0}>
            2. 座席表
          </button>
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
            設定
          </button>
        </nav>
      </header>

      <main className="no-print">
        {tab === 'import' && (
          <ImportPanel settings={settings} rawValues={rawValues} participants={participants} missing={missing} onLoaded={handleLoaded} />
        )}
        {tab === 'board' && (
          <Board
            participants={participants}
            islands={islands}
            settings={settings}
            lockedIds={lockedIds}
            onChangeIslands={setIslands}
            onToggleLock={toggleLock}
            onRegenerate={() => regenerate()}
            onImproveCurrent={improveCurrent}
            onIslandCountChange={changeIslandCount}
            onCapacityChange={(n) => n >= 2 && setSettings({ ...settings, islandCapacity: n })}
            onPrint={() => window.print()}
          />
        )}
        {tab === 'settings' && <SettingsPanel settings={settings} headers={table.headers} onChange={setSettings} />}
      </main>

      <div className="print-only">
        <PrintView title={title} islands={islands} participants={participants} />
      </div>
    </div>
  )
}
