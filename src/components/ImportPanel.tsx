import { useState } from 'react'
import { parseDelimited } from '../data/csv'
import { toTable } from '../data/mapping'
import { SAMPLE_TSV } from '../data/sample'
import { fetchSheetValues } from '../data/sheets'
import type { ColumnMapping, Participant, Settings } from '../types'

interface Props {
  settings: Settings
  rawValues: string[][]
  participants: Participant[]
  missing: (keyof ColumnMapping)[]
  onLoaded: (values: string[][], source: string) => void
}

export function ImportPanel({ settings, rawValues, participants, missing, onLoaded }: Props) {
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('')

  async function loadFromSheets() {
    setBusy(true)
    setError(null)
    try {
      const values = await fetchSheetValues(settings.sheets)
      if (values.length === 0) throw new Error('シートにデータがありません')
      onLoaded(values, 'Google スプレッドシート')
      setSource('Google スプレッドシート')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function loadPasted() {
    const values = parseDelimited(pasted)
    if (values.length < 2) {
      setError('ヘッダー行 + 1 行以上のデータを貼り付けてください')
      return
    }
    setError(null)
    onLoaded(values, '貼り付け')
    setSource('貼り付け')
  }

  function loadSample() {
    onLoaded(parseDelimited(SAMPLE_TSV), 'サンプルデータ')
    setSource('サンプルデータ')
    setError(null)
  }

  const table = toTable(rawValues)
  const sheetsReady =
    settings.sheets.spreadsheetId &&
    (settings.sheets.authMode === 'apikey' ? settings.sheets.apiKey : settings.sheets.clientId)

  return (
    <div className="panel">
      <h2>データ取り込み</h2>
      <div className="import-sources">
        <div className="card">
          <h3>Google スプレッドシート</h3>
          <p className="muted">
            設定タブでクライアント ID / API キーとシート ID を入力してください。
            {settings.sheets.authMode === 'oauth' ? ' 初回は Google のログイン画面が開きます（読み取り専用権限）。' : ''}
          </p>
          <button type="button" className="btn primary" onClick={loadFromSheets} disabled={busy || !sheetsReady}>
            {busy ? '読み込み中…' : 'シートから読み込む'}
          </button>
          {!sheetsReady && <p className="muted small">未設定の項目があります</p>}
        </div>
        <div className="card">
          <h3>コピー & ペースト</h3>
          <p className="muted">スプレッドシートの範囲（ヘッダー行を含む）をコピーしてここに貼り付けてください。</p>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={6} placeholder={'会社名\t業態\t売上規模\t…'} />
          <div className="row">
            <button type="button" className="btn" onClick={loadPasted} disabled={!pasted.trim()}>
              貼り付けデータを取り込む
            </button>
            <button type="button" className="btn ghost" onClick={loadSample}>
              サンプルデータで試す
            </button>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {table.headers.length > 0 && (
        <>
          <h3>
            取り込み結果 {source && <span className="muted small">（{source}）</span>}: {participants.length} 社
          </h3>
          {missing.length > 0 && (
            <div className="alert alert-warn">
              次の列が見つかりません: {missing.map((k) => settings.mapping[k] || k).join('、')}。設定タブの列マッピングを確認してください。
            </div>
          )}
          <div className="table-wrap">
            <table className="preview">
              <thead>
                <tr>
                  <th>会社名</th>
                  <th>業態</th>
                  <th>売上規模（レベル）</th>
                  <th>商圏</th>
                  <th>やりたい事業</th>
                  <th>繋げたい企業</th>
                  <th>強み</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.categories.join('・')}</td>
                    <td>
                      {p.revenueRaw}
                      {p.revenueLevel == null ? <span className="tag tag-warn">判定不能</span> : <span className="muted"> (L{p.revenueLevel})</span>}
                    </td>
                    <td>{p.areas.join('・')}</td>
                    <td>{p.wants.join('・')}</td>
                    <td>{p.connects.join('・')}</td>
                    <td>{p.strengths.join('・')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
