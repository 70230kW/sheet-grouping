import type { RevenueSettings } from '../types'

/** 全角→半角、空白除去、小文字化 */
export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** 「、」「,」「/」「・」「;」「改行」で分割してトークン化 */
export function tokenize(s: string | undefined | null): string[] {
  if (!s) return []
  return s
    .split(/[、,，/／・;；\n|｜]+/)
    .map((t) => normalizeText(t))
    .filter((t) => t.length > 0)
}

/** a のどれかが b のどれかを含む／含まれる（部分一致） */
export function tokensOverlap(a: string[], b: string[]): string[] {
  const hits: string[] = []
  for (const x of a) {
    for (const y of b) {
      if (x === y || x.includes(y) || y.includes(x)) {
        hits.push(x.length >= y.length ? x : y)
      }
    }
  }
  return Array.from(new Set(hits))
}

/** 完全一致のみ */
export function tokensExact(a: string[], b: string[]): string[] {
  const setB = new Set(b)
  return Array.from(new Set(a.filter((x) => setB.has(x))))
}

/**
 * 売上規模の文字列をレベルに変換。
 * 1. ランク表記（S/A/B…）に一致すればそのレベル
 * 2. 数値（億円想定）が含まれていればしきい値で判定
 * 3. どちらも不可なら null
 */
export function parseRevenueLevel(raw: string, settings: RevenueSettings): number | null {
  const norm = normalizeText(raw)
  if (!norm) return null
  for (const r of settings.ranks) {
    if (norm === normalizeText(r.label)) return r.level
  }
  const num = parseJapaneseNumber(norm)
  if (num != null) {
    let level = 0
    for (const th of settings.numericThresholds) {
      if (num >= th) level += 1
    }
    return level
  }
  return null
}

/** "12億" "1,200百万円" "3.5億円" "500万" などを億円単位の数値に変換 */
export function parseJapaneseNumber(norm: string): number | null {
  const m = norm.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(億|百万|万|千万)?/)
  if (!m) return null
  const v = parseFloat(m[1])
  if (Number.isNaN(v)) return null
  switch (m[2]) {
    case '億':
      return v
    case '千万':
      return v / 10
    case '百万':
      return v / 100
    case '万':
      return v / 10000
    default:
      // 単位なし: 「億円」列想定。値が大きすぎる場合は百万円とみなす
      return v >= 10000 ? v / 100 : v
  }
}
