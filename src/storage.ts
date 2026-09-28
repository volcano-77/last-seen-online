import type { GameCase } from './case'
import { parseCase } from './case'

const STORAGE_KEY = 'last-seen-online:v0.2'
const LEGACY_KEY = 'last-seen-online:v0.1'

export interface Scrap {
  id: string
  pageId: string
  title: string
  excerpt: string
  note: string
  savedAt: string
}

export interface SaveData {
  caseData: GameCase
  currentPageId: string
  history: string[]
  historyIndex: number
  scraps: Scrap[]
  note: string
  conclusion: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSave(value: unknown): SaveData | null {
  if (!isRecord(value)) return null
  const caseData = parseCase(value.caseData)
  const pageIds = new Set(caseData.pages.map((page) => page.id))
  const history = value.history
  const historyIndex = value.historyIndex
  const currentPageId = value.currentPageId
  if (!Array.isArray(history) || !history.every((id) => typeof id === 'string' && pageIds.has(id)) ||
    !Number.isInteger(historyIndex) || typeof historyIndex !== 'number' ||
    historyIndex < 0 || historyIndex >= history.length ||
    history[historyIndex] !== currentPageId) return null

  const rawScraps = value.scraps === undefined ? [] : value.scraps
  if (!Array.isArray(rawScraps) || !rawScraps.every((item) => isRecord(item) &&
    typeof item.id === 'string' && typeof item.pageId === 'string' && pageIds.has(item.pageId) &&
    typeof item.title === 'string' && typeof item.excerpt === 'string' &&
    typeof item.note === 'string' && typeof item.savedAt === 'string')) return null

  return {
    caseData,
    currentPageId: currentPageId as string,
    history,
    historyIndex,
    scraps: rawScraps as Scrap[],
    note: typeof value.note === 'string' ? value.note : '',
    conclusion: typeof value.conclusion === 'string' ? value.conclusion : '',
  }
}

export function readSave(): SaveData | null {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current) {
      const parsed = parseSave(JSON.parse(current) as unknown)
      if (parsed) return parsed
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    return legacy ? parseSave(JSON.parse(legacy) as unknown) : null
  } catch {
    return null
  }
}

export function writeSave(save: SaveData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
    return true
  } catch {
    return false
  }
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_KEY)
}
