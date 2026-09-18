/** 参加者（1社1名想定。複数名参加の場合は行を分ける） */
export interface Participant {
  id: string
  /** 会社名 */
  name: string
  /** 業態（複数可・トークン化済み） */
  categories: string[]
  /** 売上規模の元の表記（"A" や "12億" など） */
  revenueRaw: string
  /** 売上規模レベル（0 = 小 … 大）。判定不能なら null */
  revenueLevel: number | null
  /** 所在地・商圏エリア（複数可・トークン化済み） */
  areas: string[]
  /** 今後やりたい事業（タグ） */
  wants: string[]
  /** 繋げたい企業・業種（タグ） */
  connects: string[]
  /** 任意: 強み・特徴（繋げたい企業のマッチ対象に含める） */
  strengths: string[]
  /** 任意: 備考 */
  note: string
}

/** スコアリングの重み。正 = 加点、ペナルティ項目は正の値を「引く」 */
export interface Weights {
  /** 同一商圏ペナルティ（ペアごと） */
  areaConflict: number
  /** 売上規模ギャップ ペナルティ（許容超過 1 レベルごと） */
  revenueGap: number
  /** 許容する売上レベル差（この差までは無罰） */
  revenueTolerance: number
  /** 極端な乖離とみなすレベル差（この差以上で追加ペナルティ） */
  revenueExtremeGap: number
  /** 極端な乖離の追加ペナルティ */
  revenueExtreme: number
  /** 「繋げたい企業」マッチ加点（マッチごと） */
  connectMatch: number
  /** 「やりたい事業」×他社業態 親和性加点（マッチごと） */
  affinityMatch: number
  /** 業態多様性 加点（島内のユニーク業態数 − 1 ごと） */
  diversity: number
  /** 業態偏りペナルティ（過半数を超えた人数ごと） */
  dominance: number
}

export interface RevenueRankDef {
  /** ランク表記（例: "S", "A", "10億以上"） */
  label: string
  /** レベル（大きいほど売上大） */
  level: number
}

export interface RevenueSettings {
  /** ランク表記 → レベル。上から順に大きい売上 */
  ranks: RevenueRankDef[]
  /** 数値（億円）判定のしきい値。昇順。level = しきい値を超えた個数 */
  numericThresholds: number[]
}

export interface ColumnMapping {
  name: string
  category: string
  revenue: string
  area: string
  wants: string
  connects: string
  strengths: string
  note: string
}

export type SheetsAuthMode = 'oauth' | 'apikey'

export interface SheetsSettings {
  authMode: SheetsAuthMode
  /** OAuth クライアント ID（Web アプリケーション） */
  clientId: string
  /** API キー（公開シート用） */
  apiKey: string
  /** スプレッドシート ID または URL */
  spreadsheetId: string
  /** シート名（空欄なら先頭シート） */
  sheetName: string
}

export interface Settings {
  weights: Weights
  revenue: RevenueSettings
  mapping: ColumnMapping
  sheets: SheetsSettings
  /** 1島の定員 */
  islandCapacity: number
  /** 最適化の試行回数（ランダムリスタート） */
  restarts: number
}

export interface Island {
  id: string
  label: string
  memberIds: string[]
}

export type IssueSeverity = 'error' | 'warn' | 'good'

export interface IslandIssue {
  severity: IssueSeverity
  /** 表示用メッセージ */
  message: string
  /** 関係する参加者 ID */
  participantIds: string[]
  /** スコアへの寄与（正 = 加点） */
  delta: number
}

export interface IslandEvaluation {
  islandId: string
  score: number
  issues: IslandIssue[]
}

export interface PlanEvaluation {
  total: number
  islands: IslandEvaluation[]
}
