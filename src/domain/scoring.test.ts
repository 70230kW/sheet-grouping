import { describe, expect, it } from 'vitest'
import { DEFAULT_REVENUE, DEFAULT_WEIGHTS } from './defaults'
import { parseRevenueLevel, tokenize, tokensOverlap } from './normalize'
import { evaluateIsland, evaluatePair } from './scoring'
import { islandCount, localSearch, optimize } from './optimize'
import { parseDelimited } from '../data/csv'
import { rowsToParticipants, toTable } from '../data/mapping'
import { DEFAULT_MAPPING } from './defaults'
import { SAMPLE_TSV } from '../data/sample'
import type { Participant } from '../types'

function p(over: Partial<Participant> & { id: string }): Participant {
  return {
    name: over.id,
    categories: [],
    revenueRaw: '',
    revenueLevel: null,
    areas: [],
    wants: [],
    connects: [],
    strengths: [],
    note: '',
    ...over,
  }
}

describe('normalize', () => {
  it('tokenizes with Japanese separators', () => {
    expect(tokenize('レンタカー、中古車販売／整備')).toEqual(['レンタカー', '中古車販売', '整備'])
  })
  it('matches partial tokens', () => {
    expect(tokensOverlap(['中古車'], ['中古車販売'])).toEqual(['中古車販売'])
    expect(tokensOverlap(['保険'], ['レンタカー'])).toEqual([])
  })
  it('parses revenue ranks and numbers', () => {
    expect(parseRevenueLevel('A', DEFAULT_REVENUE)).toBe(3)
    expect(parseRevenueLevel('ｂ', DEFAULT_REVENUE)).toBe(2)
    expect(parseRevenueLevel('12億円', DEFAULT_REVENUE)).toBe(3)
    expect(parseRevenueLevel('0.5億', DEFAULT_REVENUE)).toBe(0)
    expect(parseRevenueLevel('50', DEFAULT_REVENUE)).toBe(4)
    expect(parseRevenueLevel('', DEFAULT_REVENUE)).toBeNull()
    expect(parseRevenueLevel('不明', DEFAULT_REVENUE)).toBeNull()
  })
})

describe('scoring', () => {
  it('penalizes same area', () => {
    const a = p({ id: 'a', areas: ['東京'] })
    const b = p({ id: 'b', areas: ['東京'] })
    const issues = evaluatePair(a, b, DEFAULT_WEIGHTS)
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('error')
    expect(issues[0].delta).toBe(-DEFAULT_WEIGHTS.areaConflict)
  })
  it('penalizes revenue gap beyond tolerance, extreme adds more', () => {
    const a = p({ id: 'a', revenueLevel: 0, revenueRaw: 'D' })
    const b = p({ id: 'b', revenueLevel: 1, revenueRaw: 'C' })
    const c = p({ id: 'c', revenueLevel: 2, revenueRaw: 'B' })
    const d = p({ id: 'd', revenueLevel: 4, revenueRaw: 'S' })
    expect(evaluatePair(a, b, DEFAULT_WEIGHTS)).toHaveLength(0)
    const ac = evaluatePair(a, c, DEFAULT_WEIGHTS)
    expect(ac[0].delta).toBe(-DEFAULT_WEIGHTS.revenueGap)
    expect(ac[0].severity).toBe('warn')
    const ad = evaluatePair(a, d, DEFAULT_WEIGHTS)
    expect(ad[0].delta).toBe(-DEFAULT_WEIGHTS.revenueGap * 3 - DEFAULT_WEIGHTS.revenueExtreme)
    expect(ad[0].severity).toBe('error')
  })
  it('rewards connect matches in both directions', () => {
    const a = p({ id: 'a', categories: ['レンタカー'], connects: ['中古車販売店'] })
    const b = p({ id: 'b', categories: ['中古車販売'], connects: ['レンタカー'] })
    const issues = evaluatePair(a, b, DEFAULT_WEIGHTS)
    const good = issues.filter((i) => i.severity === 'good')
    expect(good).toHaveLength(2)
    expect(good.every((i) => i.delta === DEFAULT_WEIGHTS.connectMatch)).toBe(true)
  })
  it('rewards diversity and penalizes dominance', () => {
    const byId = new Map<string, Participant>()
    const members = ['a', 'b', 'c', 'd'].map((id, i) =>
      p({ id, categories: [i < 3 ? 'レンタカー' : '整備'] }),
    )
    members.forEach((m) => byId.set(m.id, m))
    const ev = evaluateIsland({ id: 'i', label: '1', memberIds: members.map((m) => m.id) }, byId, DEFAULT_WEIGHTS)
    const div = ev.issues.find((i) => i.message.startsWith('業態の多様性'))
    const dom = ev.issues.find((i) => i.message.startsWith('業態の偏り'))
    expect(div?.delta).toBe(DEFAULT_WEIGHTS.diversity)
    expect(dom?.delta).toBe(-DEFAULT_WEIGHTS.dominance)
  })
})

describe('optimize', () => {
  it('computes island count', () => {
    expect(islandCount(23, 6)).toBe(4)
    expect(islandCount(6, 6)).toBe(1)
    expect(islandCount(0, 6)).toBe(1)
  })
  it('separates same-area companies when possible', () => {
    const ps = [
      p({ id: 'a', areas: ['東京'] }),
      p({ id: 'b', areas: ['東京'] }),
      p({ id: 'c', areas: ['大阪'] }),
      p({ id: 'd', areas: ['大阪'] }),
    ]
    const islands = optimize(ps, DEFAULT_WEIGHTS, { capacity: 2, islandCount: 2, restarts: 3, seed: 1 })
    expect(islands).toHaveLength(2)
    for (const isl of islands) {
      expect(isl.memberIds).toHaveLength(2)
      const areas = isl.memberIds.map((id) => ps.find((x) => x.id === id)!.areas[0])
      expect(new Set(areas).size).toBe(2)
    }
  })
  it('local search improves a bad manual arrangement', () => {
    const ps = [
      p({ id: 'a', areas: ['東京'] }),
      p({ id: 'b', areas: ['東京'] }),
      p({ id: 'c', areas: ['大阪'] }),
      p({ id: 'd', areas: ['大阪'] }),
    ]
    const byId = new Map(ps.map((x) => [x.id, x]))
    const bad = [
      { id: 'island-1', label: '1', memberIds: ['a', 'b'] },
      { id: 'island-2', label: '2', memberIds: ['c', 'd'] },
    ]
    const improved = localSearch(bad, byId, DEFAULT_WEIGHTS, { capacity: 2 })
    expect(improved[0].memberIds.includes('a') && improved[0].memberIds.includes('b')).toBe(false)
  })
  it('respects locked islands', () => {
    const ps = ['a', 'b', 'c', 'd'].map((id) => p({ id, areas: ['東京'] }))
    const initial = [
      { id: 'island-1', label: '1', memberIds: ['a', 'b'] },
      { id: 'island-2', label: '2', memberIds: ['c', 'd'] },
    ]
    const out = optimize(ps, DEFAULT_WEIGHTS, {
      capacity: 2,
      islandCount: 2,
      restarts: 2,
      seed: 1,
      initial,
      lockedIslandIds: new Set(['island-1']),
    })
    const locked = out.find((i) => i.id === 'island-1')!
    expect([...locked.memberIds].sort()).toEqual(['a', 'b'])
  })
  it('runs end-to-end on sample data without area conflicts', () => {
    const table = toTable(parseDelimited(SAMPLE_TSV))
    const { participants, missing } = rowsToParticipants(table, DEFAULT_MAPPING, DEFAULT_REVENUE)
    expect(missing).toEqual([])
    expect(participants).toHaveLength(23)
    const n = islandCount(participants.length, 6)
    const islands = optimize(participants, DEFAULT_WEIGHTS, { capacity: 6, islandCount: n, restarts: 4, seed: 42 })
    const byId = new Map(participants.map((x) => [x.id, x]))
    const total = islands.reduce((s, i) => s + i.memberIds.length, 0)
    expect(total).toBe(23)
    for (const isl of islands) {
      expect(isl.memberIds.length).toBeLessThanOrEqual(6)
      const ev = evaluateIsland(isl, byId, DEFAULT_WEIGHTS)
      expect(ev.issues.filter((i) => i.message.startsWith('商圏重複'))).toHaveLength(0)
    }
  })
})
