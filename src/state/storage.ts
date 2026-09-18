import type { Island, Participant, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../domain/defaults'

const SETTINGS_KEY = 'rentacar-seating:settings:v1'
const DATA_KEY = 'rentacar-seating:data:v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      weights: { ...DEFAULT_SETTINGS.weights, ...(parsed.weights ?? {}) },
      revenue: { ...DEFAULT_SETTINGS.revenue, ...(parsed.revenue ?? {}) },
      mapping: { ...DEFAULT_SETTINGS.mapping, ...(parsed.mapping ?? {}) },
      sheets: { ...DEFAULT_SETTINGS.sheets, ...(parsed.sheets ?? {}) },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export interface PersistedData {
  rawValues: string[][]
  participants: Participant[]
  islands: Island[]
  title: string
}

export function loadData(): PersistedData | null {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    return raw ? (JSON.parse(raw) as PersistedData) : null
  } catch {
    return null
  }
}

export function saveData(d: PersistedData) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}
