import type { ColumnMapping, RevenueSettings, Settings, SheetsSettings, Weights } from '../types'

/**
 * 重みの初期案。
 * 基準感覚: 「同一商圏 1 ペア」 ≒ 「繋げたい企業マッチ 2〜3 件分」を打ち消す。
 * 極端な売上乖離は商圏バッティングと同程度に嫌う。
 */
export const DEFAULT_WEIGHTS: Weights = {
  areaConflict: 30,
  revenueGap: 8,
  revenueTolerance: 1,
  revenueExtremeGap: 3,
  revenueExtreme: 20,
  connectMatch: 12,
  affinityMatch: 6,
  diversity: 4,
  dominance: 10,
}

/** 売上規模: ランク表記 or 数値（億円） */
export const DEFAULT_REVENUE: RevenueSettings = {
  ranks: [
    { label: 'S', level: 4 },
    { label: 'A', level: 3 },
    { label: 'B', level: 2 },
    { label: 'C', level: 1 },
    { label: 'D', level: 0 },
  ],
  // 億円: <1, 1-3, 3-10, 10-30, 30+ → level 0..4
  numericThresholds: [1, 3, 10, 30],
}

export const DEFAULT_MAPPING: ColumnMapping = {
  name: '会社名',
  category: '業態',
  revenue: '売上規模',
  area: '所在地・商圏エリア',
  wants: '今後やりたい事業',
  connects: '繋げたい企業・業種',
  strengths: '強み・特徴',
  note: '備考',
}

export const DEFAULT_SHEETS: SheetsSettings = {
  authMode: 'oauth',
  clientId: '',
  apiKey: '',
  spreadsheetId: '',
  sheetName: '',
}

export const DEFAULT_SETTINGS: Settings = {
  weights: DEFAULT_WEIGHTS,
  revenue: DEFAULT_REVENUE,
  mapping: DEFAULT_MAPPING,
  sheets: DEFAULT_SHEETS,
  islandCapacity: 6,
  restarts: 8,
}

export const WEIGHT_LABELS: Record<keyof Weights, { label: string; help: string }> = {
  areaConflict: { label: '同一商圏ペナルティ', help: '同じ島に同一エリアの企業がいるペアごとに減点' },
  revenueGap: { label: '売上規模ギャップ ペナルティ', help: '許容差を超えたレベル差 1 ごとに減点（ペアごと）' },
  revenueTolerance: { label: '売上レベル 許容差', help: 'この差までは減点しない（1 = 隣接ランクは OK）' },
  revenueExtremeGap: { label: '極端な乖離とみなす差', help: 'この差以上で追加減点' },
  revenueExtreme: { label: '極端な乖離 追加ペナルティ', help: '上記に該当するペアごとに減点' },
  connectMatch: { label: '繋げたい企業マッチ 加点', help: '「繋げたい企業・業種」が他社の業態/強みに一致するごとに加点' },
  affinityMatch: { label: 'やりたい事業 親和性 加点', help: '「今後やりたい事業」が他社の業態に一致するごとに加点' },
  diversity: { label: '業態多様性 加点', help: '島内のユニーク業態数 − 1 ごとに加点' },
  dominance: { label: '業態偏り ペナルティ', help: '同一業態が過半数を超えた人数ごとに減点' },
}
