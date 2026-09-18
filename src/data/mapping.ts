import type { ColumnMapping, Participant, RevenueSettings } from '../types'
import { normalizeText, parseRevenueLevel, tokenize } from '../domain/normalize'

export interface Table {
  headers: string[]
  rows: string[][]
}

export function toTable(values: string[][]): Table {
  if (values.length === 0) return { headers: [], rows: [] }
  const [headers, ...rows] = values
  return { headers: headers.map((h) => h.trim()), rows }
}

/** ヘッダー名からインデックスを引く（正規化して部分一致も許容） */
export function findColumn(headers: string[], name: string): number {
  if (!name) return -1
  const target = normalizeText(name)
  const exact = headers.findIndex((h) => normalizeText(h) === target)
  if (exact >= 0) return exact
  return headers.findIndex((h) => normalizeText(h).includes(target) || target.includes(normalizeText(h)))
}

/** 列の候補を自動推定（設定画面の初期値用） */
export function guessMapping(headers: string[], current: ColumnMapping): ColumnMapping {
  const candidates: Record<keyof ColumnMapping, string[]> = {
    name: ['会社名', '企業名', '社名', '法人名'],
    category: ['業態', '業種', '主な業態'],
    revenue: ['売上規模', '売上', '年商', 'ランク'],
    area: ['商圏', 'エリア', '所在地', '地域', '都道府県'],
    wants: ['やりたい事業', '今後', '新規事業'],
    connects: ['繋げたい', 'つなげたい', 'マッチング希望'],
    strengths: ['強み', '特徴'],
    note: ['備考', 'メモ'],
  }
  const result = { ...current }
  for (const key of Object.keys(candidates) as (keyof ColumnMapping)[]) {
    if (findColumn(headers, current[key]) >= 0) continue
    const hit = candidates[key].find((c) => findColumn(headers, c) >= 0)
    if (hit) {
      const idx = findColumn(headers, hit)
      result[key] = headers[idx]
    }
  }
  return result
}

export function rowsToParticipants(
  table: Table,
  mapping: ColumnMapping,
  revenue: RevenueSettings,
): { participants: Participant[]; missing: (keyof ColumnMapping)[] } {
  const idx: Record<keyof ColumnMapping, number> = {
    name: findColumn(table.headers, mapping.name),
    category: findColumn(table.headers, mapping.category),
    revenue: findColumn(table.headers, mapping.revenue),
    area: findColumn(table.headers, mapping.area),
    wants: findColumn(table.headers, mapping.wants),
    connects: findColumn(table.headers, mapping.connects),
    strengths: findColumn(table.headers, mapping.strengths),
    note: findColumn(table.headers, mapping.note),
  }
  const missing = (Object.keys(idx) as (keyof ColumnMapping)[]).filter(
    (k) => idx[k] < 0 && k !== 'strengths' && k !== 'note',
  )
  const get = (row: string[], k: keyof ColumnMapping) => (idx[k] >= 0 ? (row[idx[k]] ?? '').trim() : '')

  const participants: Participant[] = []
  table.rows.forEach((row, i) => {
    const name = get(row, 'name')
    if (!name) return
    const revenueRaw = get(row, 'revenue')
    participants.push({
      id: `p-${i + 1}-${normalizeText(name).slice(0, 12)}`,
      name,
      categories: tokenize(get(row, 'category')),
      revenueRaw,
      revenueLevel: parseRevenueLevel(revenueRaw, revenue),
      areas: tokenize(get(row, 'area')),
      wants: tokenize(get(row, 'wants')),
      connects: tokenize(get(row, 'connects')),
      strengths: tokenize(get(row, 'strengths')),
      note: get(row, 'note'),
    })
  })
  return { participants, missing }
}
