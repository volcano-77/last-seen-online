import type { GameCase } from './case'
import { parseCase } from './case'

const STORAGE_KEY = 'last-seen-online:v0.1'

export interface SaveData {
  caseData: GameCase
  currentPageId: string
  history: string[]
  historyIndex: number
  collectedClueIds: string[]
  note: string
}

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const save = value as SaveData
    const caseData = parseCase(save.caseData)
    const pageIds = new Set(caseData.pages.map((page) => page.id))
    const clueIds = new Set(caseData.clues.map((clue) => clue.id))
    if (!pageIds.has(save.currentPageId) || !Array.isArray(save.history) ||
      !save.history.every((id) => pageIds.has(id)) ||
      !Number.isInteger(save.historyIndex) || save.historyIndex < 0 ||
      save.historyIndex >= save.history.length ||
      save.history[save.historyIndex] !== save.currentPageId ||
      !Array.isArray(save.collectedClueIds) ||
      !save.collectedClueIds.every((id) => clueIds.has(id)) ||
      typeof save.note !== 'string') return null
    return { ...save, caseData }
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
}
