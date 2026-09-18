import type { Island, Participant, Weights } from '../types'
import { islandScore } from './scoring'

/** 決定論的な擬似乱数（mulberry32） */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function islandCount(participantCount: number, capacity: number): number {
  return Math.max(1, Math.ceil(participantCount / capacity))
}

export function makeIslands(count: number): Island[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `island-${i + 1}`,
    label: `${i + 1}`,
    memberIds: [],
  }))
}

export interface OptimizeOptions {
  capacity: number
  islandCount: number
  restarts: number
  seed?: number
  /** 固定する島（memberIds を変更しない） */
  lockedIslandIds?: Set<string>
  /** 初期配置（指定があればこれを起点に局所探索） */
  initial?: Island[]
}

/**
 * 「配置しにくさ」: 商圏の重複相手が多い・売上レベルが極端 な参加者ほど先に配置する
 */
function difficulty(p: Participant, all: Participant[]): number {
  let d = 0
  for (const q of all) {
    if (q.id === p.id) continue
    if (p.areas.some((a) => q.areas.includes(a))) d += 3
  }
  if (p.revenueLevel != null) {
    const levels = all.map((q) => q.revenueLevel).filter((x): x is number => x != null)
    const mean = levels.reduce((s, x) => s + x, 0) / Math.max(1, levels.length)
    d += Math.abs(p.revenueLevel - mean)
  }
  return d
}

/** 貪欲法: 難しい参加者から、追加時のスコア増分が最大の島へ */
function greedy(
  participants: Participant[],
  byId: Map<string, Participant>,
  w: Weights,
  opts: OptimizeOptions,
  rng: () => number,
): Island[] {
  const islands = makeIslands(opts.islandCount)
  const order = [...participants]
    .map((p) => ({ p, d: difficulty(p, participants) + rng() * 2 }))
    .sort((a, b) => b.d - a.d)
    .map((x) => x.p)

  for (const p of order) {
    let best = -1
    let bestDelta = -Infinity
    for (let i = 0; i < islands.length; i++) {
      const isl = islands[i]
      if (isl.memberIds.length >= opts.capacity) continue
      const before = islandScore(isl.memberIds, byId, w)
      const after = islandScore([...isl.memberIds, p.id], byId, w)
      // 空いている島を少し優先して人数を均す
      const balance = (opts.capacity - isl.memberIds.length) * 0.01 + rng() * 0.001
      const delta = after - before + balance
      if (delta > bestDelta) {
        bestDelta = delta
        best = i
      }
    }
    if (best < 0) {
      // 定員超過（島数不足）: 最小人数の島に入れる
      best = islands.reduce((mi, isl, i, arr) => (isl.memberIds.length < arr[mi].memberIds.length ? i : mi), 0)
    }
    islands[best].memberIds.push(p.id)
  }
  return islands
}

/** 局所探索: 島間の swap / move で改善が無くなるまで繰り返す */
export function localSearch(
  islands: Island[],
  byId: Map<string, Participant>,
  w: Weights,
  opts: Pick<OptimizeOptions, 'capacity' | 'lockedIslandIds'>,
  maxIter = 200,
): Island[] {
  const isl = islands.map((x) => ({ ...x, memberIds: [...x.memberIds] }))
  const locked = opts.lockedIslandIds ?? new Set<string>()
  const scores = isl.map((x) => islandScore(x.memberIds, byId, w))

  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false
    for (let i = 0; i < isl.length; i++) {
      if (locked.has(isl[i].id)) continue
      for (let j = i + 1; j < isl.length; j++) {
        if (locked.has(isl[j].id)) continue
        // swap
        for (let a = 0; a < isl[i].memberIds.length; a++) {
          for (let b = 0; b < isl[j].memberIds.length; b++) {
            const mi = [...isl[i].memberIds]
            const mj = [...isl[j].memberIds]
            const tmp = mi[a]
            mi[a] = mj[b]
            mj[b] = tmp
            const si = islandScore(mi, byId, w)
            const sj = islandScore(mj, byId, w)
            if (si + sj > scores[i] + scores[j] + 1e-9) {
              isl[i].memberIds = mi
              isl[j].memberIds = mj
              scores[i] = si
              scores[j] = sj
              improved = true
            }
          }
        }
        // move i -> j / j -> i（定員に空きがある場合）
        for (const [from, to] of [
          [i, j],
          [j, i],
        ] as const) {
          if (isl[to].memberIds.length >= opts.capacity) continue
          // 人数が偏りすぎる移動は避ける（移動後に差が 2 を超える場合は不可）
          if (isl[from].memberIds.length - 1 < isl[to].memberIds.length + 1 - 2) continue
          for (let a = 0; a < isl[from].memberIds.length; a++) {
            const mf = isl[from].memberIds.filter((_, k) => k !== a)
            const mt = [...isl[to].memberIds, isl[from].memberIds[a]]
            const sf = islandScore(mf, byId, w)
            const st = islandScore(mt, byId, w)
            if (sf + st > scores[from] + scores[to] + 1e-9) {
              isl[from].memberIds = mf
              isl[to].memberIds = mt
              scores[from] = sf
              scores[to] = st
              improved = true
              break
            }
          }
        }
      }
    }
    if (!improved) break
  }
  return isl
}

export function totalScore(islands: Island[], byId: Map<string, Participant>, w: Weights): number {
  return islands.reduce((s, isl) => s + islandScore(isl.memberIds, byId, w), 0)
}

/** 貪欲法 + 局所探索をランダムリスタートで複数回実行し、最良解を返す */
export function optimize(participants: Participant[], w: Weights, opts: OptimizeOptions): Island[] {
  const byId = new Map(participants.map((p) => [p.id, p]))
  const seed = opts.seed ?? Date.now()
  let best: Island[] | null = null
  let bestScore = -Infinity

  if (opts.initial) {
    const ls = localSearch(opts.initial, byId, w, opts)
    const s = totalScore(ls, byId, w)
    best = ls
    bestScore = s
  }

  const locked = opts.lockedIslandIds ?? new Set<string>()
  const lockedIslands = (opts.initial ?? []).filter((x) => locked.has(x.id))
  const lockedMemberIds = new Set(lockedIslands.flatMap((x) => x.memberIds))
  const free = participants.filter((p) => !lockedMemberIds.has(p.id))
  const freeIslandCount = Math.max(0, opts.islandCount - lockedIslands.length)

  for (let r = 0; r < Math.max(1, opts.restarts); r++) {
    const rng = makeRng(seed + r * 7919)
    if (freeIslandCount === 0) break
    const g = greedy(free, byId, w, { ...opts, islandCount: freeIslandCount }, rng)
    // ロック島の ID と衝突しないよう再採番
    const usedIds = new Set(lockedIslands.map((x) => x.id))
    let n = 1
    for (const isl of g) {
      while (usedIds.has(`island-${n}`)) n++
      isl.id = `island-${n}`
      isl.label = `${n}`
      usedIds.add(isl.id)
      n++
    }
    const merged = [...lockedIslands, ...g].sort((a, b) => Number(a.label) - Number(b.label))
    const ls = localSearch(merged, byId, w, opts)
    const s = totalScore(ls, byId, w)
    if (s > bestScore) {
      bestScore = s
      best = ls
    }
  }
  return best ?? makeIslands(opts.islandCount)
}
