import { DEFAULT_SETTINGS, WEIGHT_LABELS } from '../domain/defaults'
import { guessMapping } from '../data/mapping'
import type { ColumnMapping, Settings, Weights } from '../types'

interface Props {
  settings: Settings
  headers: string[]
  onChange: (s: Settings) => void
}

const MAPPING_LABELS: Record<keyof ColumnMapping, string> = {
  name: '会社名（必須）',
  category: '業態',
  revenue: '売上規模',
  area: '所在地・商圏エリア',
  wants: '今後やりたい事業',
  connects: '繋げたい企業・業種',
  strengths: '強み・特徴（任意）',
  note: '備考（任意）',
}

export function SettingsPanel({ settings, headers, onChange }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v })
  const w = settings.weights

  return (
    <div className="panel settings">
      <h2>設定</h2>

      <section className="card">
        <h3>Google スプレッドシート連携</h3>
        <div className="form-grid">
          <label>
            認証方式
            <select value={settings.sheets.authMode} onChange={(e) => set('sheets', { ...settings.sheets, authMode: e.target.value as 'oauth' | 'apikey' })}>
              <option value="oauth">OAuth（Google アカウントでログイン・推奨）</option>
              <option value="apikey">API キー（リンク共有された公開シートのみ）</option>
            </select>
          </label>
          {settings.sheets.authMode === 'oauth' ? (
            <label>
              OAuth クライアント ID
              <input value={settings.sheets.clientId} onChange={(e) => set('sheets', { ...settings.sheets, clientId: e.target.value.trim() })} placeholder="xxxx.apps.googleusercontent.com" />
            </label>
          ) : (
            <label>
              API キー
              <input value={settings.sheets.apiKey} onChange={(e) => set('sheets', { ...settings.sheets, apiKey: e.target.value.trim() })} placeholder="AIza…" />
            </label>
          )}
          <label>
            スプレッドシート URL または ID
            <input value={settings.sheets.spreadsheetId} onChange={(e) => set('sheets', { ...settings.sheets, spreadsheetId: e.target.value.trim() })} placeholder="https://docs.google.com/spreadsheets/d/…" />
          </label>
          <label>
            シート名（空欄 = 先頭シート）
            <input value={settings.sheets.sheetName} onChange={(e) => set('sheets', { ...settings.sheets, sheetName: e.target.value })} placeholder="参加者一覧" />
          </label>
        </div>
        <p className="muted small">設定はこのブラウザの localStorage にのみ保存されます。Google Cloud 側の設定手順は docs/SETUP.md を参照。</p>
      </section>

      <section className="card">
        <h3>列マッピング</h3>
        <p className="muted small">スプレッドシートのヘッダー名を指定します（部分一致可）。</p>
        {headers.length > 0 && (
          <button type="button" className="btn ghost" onClick={() => set('mapping', guessMapping(headers, settings.mapping))}>
            読み込んだヘッダーから自動推定
          </button>
        )}
        <div className="form-grid">
          {(Object.keys(MAPPING_LABELS) as (keyof ColumnMapping)[]).map((k) => (
            <label key={k}>
              {MAPPING_LABELS[k]}
              <input list="header-list" value={settings.mapping[k]} onChange={(e) => set('mapping', { ...settings.mapping, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <datalist id="header-list">
          {headers.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
      </section>

      <section className="card">
        <h3>売上規模の判定</h3>
        <p className="muted small">ランク表記（S/A/B…）はレベルに変換。数値（億円）はしきい値で判定します。レベル差がスコアに使われます。</p>
        <div className="form-grid">
          <label>
            ランク → レベル（例: S=4, A=3）
            <input
              value={settings.revenue.ranks.map((r) => `${r.label}=${r.level}`).join(', ')}
              onChange={(e) => {
                const ranks = e.target.value
                  .split(/[,、]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => {
                    const [label, lv] = s.split('=')
                    return { label: (label ?? '').trim(), level: Number(lv) }
                  })
                  .filter((r) => r.label && !Number.isNaN(r.level))
                set('revenue', { ...settings.revenue, ranks })
              }}
            />
          </label>
          <label>
            数値しきい値（億円・昇順、例: 1, 3, 10, 30）
            <input
              value={settings.revenue.numericThresholds.join(', ')}
              onChange={(e) => {
                const ths = e.target.value
                  .split(/[,、]/)
                  .map((s) => Number(s.trim()))
                  .filter((n) => !Number.isNaN(n))
                  .sort((a, b) => a - b)
                set('revenue', { ...settings.revenue, numericThresholds: ths })
              }}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>スコアリングの重み</h3>
        <p className="muted small">ペナルティ項目は正の値で入力（内部で減点）。0 にするとその項目を無視します。</p>
        <div className="form-grid">
          {(Object.keys(WEIGHT_LABELS) as (keyof Weights)[]).map((k) => (
            <label key={k} title={WEIGHT_LABELS[k].help}>
              {WEIGHT_LABELS[k].label}
              <input type="number" step={1} value={w[k]} onChange={(e) => set('weights', { ...w, [k]: Number(e.target.value) })} />
              <span className="help">{WEIGHT_LABELS[k].help}</span>
            </label>
          ))}
        </div>
        <div className="row">
          <label>
            最適化の試行回数
            <input type="number" min={1} max={50} value={settings.restarts} onChange={(e) => set('restarts', Number(e.target.value))} />
          </label>
          <button type="button" className="btn ghost" onClick={() => onChange({ ...settings, weights: DEFAULT_SETTINGS.weights, revenue: DEFAULT_SETTINGS.revenue })}>
            重みを初期値に戻す
          </button>
        </div>
      </section>
    </div>
  )
}
