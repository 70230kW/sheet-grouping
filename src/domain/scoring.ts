import type {
  Island,
  IslandEvaluation,
  IslandIssue,
  Participant,
  PlanEvaluation,
  Weights,
} from '../types'
import { tokensExact, tokensOverlap } from './normalize'

/** 2 社間の評価。島スコアはペアの合計 + 島全体の項目 */
export function evaluatePair(a: Participant, b: Participant, w: Weights): IslandIssue[] {
  const issues: IslandIssue[] = []
  const ids = [a.id, b.id]

  // --- 同一商圏 ---
  const areaHits = tokensExact(a.areas, b.areas)
  if (areaHits.length > 0) {
    issues.push({
      severity: 'error',
      message: `商圏重複: ${a.name} × ${b.name}（${areaHits.join('・')}）`,
      participantIds: ids,
      delta: -w.areaConflict,
    })
  }

  // --- 売上規模の乖離 ---
  if (a.revenueLevel != null && b.revenueLevel != null) {
    const gap = Math.abs(a.revenueLevel - b.revenueLevel)
    if (gap > w.revenueTolerance) {
      let delta = -w.revenueGap * (gap - w.revenueTolerance)
      let severity: IslandIssue['severity'] = 'warn'
      if (gap >= w.revenueExtremeGap) {
        delta -= w.revenueExtreme
        severity = 'error'
      }
      issues.push({
        severity,
        message: `売上規模差 ${gap}: ${a.name}（${a.revenueRaw}） × ${b.name}（${b.revenueRaw}）`,
        participantIds: ids,
        delta,
      })
    }
  }

  // --- 繋げたい企業マッチ（双方向） ---
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    const hits = tokensOverlap(x.connects, [...y.categories, ...y.strengths])
    if (hits.length > 0) {
      issues.push({
        severity: 'good',
        message: `繋げたい企業マッチ: ${x.name} → ${y.name}（${hits.join('・')}）`,
        participantIds: ids,
        delta: w.connectMatch * hits.length,
      })
    }
  }

  // --- やりたい事業 × 業態 親和性（双方向） ---
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    const hits = tokensOverlap(x.wants, y.categories)
    if (hits.length > 0) {
      issues.push({
        severity: 'good',
        message: `やりたい事業の親和性: ${x.name} → ${y.name}（${hits.join('・')}）`,
        participantIds: ids,
        delta: w.affinityMatch * hits.length,
      })
    }
  }

  return issues
}

/** 島全体の項目（多様性・偏り） */
export function evaluateIslandWhole(members: Participant[], w: Weights): IslandIssue[] {
  const issues: IslandIssue[] = []
  if (members.length < 2) return issues

  const counts = new Map<string, number>()
  for (const m of members) {
    const primary = m.categories[0] ?? '(未設定)'
    counts.set(primary, (counts.get(primary) ?? 0) + 1)
  }
  const distinct = counts.size
  if (distinct > 1 && w.diversity !== 0) {
    issues.push({
      severity: 'good',
      message: `業態の多様性: ${distinct} 業態`,
      participantIds: members.map((m) => m.id),
      delta: w.diversity * (distinct - 1),
    })
  }
  let maxCat = ''
  let maxCount = 0
  for (const [cat, c] of counts) {
    if (c > maxCount) {
      maxCount = c
      maxCat = cat
    }
  }
  const half = Math.floor(members.length / 2)
  if (maxCount > half && members.length >= 3) {
    const over = maxCount - half
    issues.push({
      severity: 'warn',
      message: `業態の偏り: 「${maxCat}」が ${maxCount}/${members.length} 社`,
      participantIds: members.filter((m) => (m.categories[0] ?? '(未設定)') === maxCat).map((m) => m.id),
      delta: -w.dominance * over,
    })
  }
  return issues
}

export function evaluateIsland(
  island: Island,
  byId: Map<string, Participant>,
  w: Weights,
): IslandEvaluation {
  const members = island.memberIds.map((id) => byId.get(id)).filter((p): p is Participant => !!p)
  const issues: IslandIssue[] = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      issues.push(...evaluatePair(members[i], members[j], w))
    }
  }
  issues.push(...evaluateIslandWhole(members, w))
  const score = issues.reduce((s, x) => s + x.delta, 0)
  return { islandId: island.id, score, issues }
}

/** 島スコアのみ高速計算（最適化ループ用） */
export function islandScore(memberIds: string[], byId: Map<string, Participant>, w: Weights): number {
  const members = memberIds.map((id) => byId.get(id)).filter((p): p is Participant => !!p)
  let s = 0
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      for (const iss of evaluatePair(members[i], members[j], w)) s += iss.delta
    }
  }
  for (const iss of evaluateIslandWhole(members, w)) s += iss.delta
  return s
}

export function evaluatePlan(
  islands: Island[],
  participants: Participant[],
  w: Weights,
): PlanEvaluation {
  const byId = new Map(participants.map((p) => [p.id, p]))
  const evals = islands.map((isl) => evaluateIsland(isl, byId, w))
  return { total: evals.reduce((s, e) => s + e.score, 0), islands: evals }
}
