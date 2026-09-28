import type { GameCase } from './case'
import { parseCase } from './case'

const STORAGE_KEY = 'last-seen-online:v0.3'
const LEGACY_KEYS = ['last-seen-online:v0.2', 'last-seen-online:v0.1']

export interface SaveData {
  saveVersion: 3
  caseData: GameCase
  currentPageId: string
  history: string[]
  historyIndex: number
  visitedPageIds: string[]
  discoveredEvidenceIds: string[]
  savedEvidenceIds: string[]
  establishedRelationIds: string[]
  unlockedFactIds: string[]
  completedPuzzleIds: string[]
  timelineOrders: Record<string, string[]>
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function validIds(value: unknown, allowed: Set<string>): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string' && allowed.has(id)) &&
    new Set(value).size === value.length
}

function parseSave(value: unknown): SaveData | null {
  if (!record(value) || value.saveVersion !== 3) return null
  const caseData = parseCase(value.caseData)
  const pages = new Set(caseData.pages.map((item) => item.id))
  const evidence = new Set(caseData.evidence.map((item) => item.id))
  const relations = new Set(caseData.relations.map((item) => item.id))
  const facts = new Set(caseData.facts.map((item) => item.id))
  const puzzles = new Set(caseData.puzzles.map((item) => item.id))
  const history = value.history
  const index = value.historyIndex
  if (!Array.isArray(history) || !history.length || !history.every((id) => pages.has(id)) ||
    !Number.isInteger(index) || typeof index !== 'number' || index < 0 || index >= history.length ||
    history[index] !== value.currentPageId || !validIds(value.visitedPageIds, pages) ||
    !validIds(value.discoveredEvidenceIds, evidence) || !validIds(value.savedEvidenceIds, evidence) ||
    !validIds(value.establishedRelationIds, relations) || !validIds(value.unlockedFactIds, facts) ||
    !validIds(value.completedPuzzleIds, puzzles) || !record(value.timelineOrders)) return null
  const discovered = value.discoveredEvidenceIds as string[]
  if (!(value.savedEvidenceIds as string[]).every((id) => discovered.includes(id))) return null
  const orders = value.timelineOrders as Record<string, unknown>
  if (Object.entries(orders).some(([id, order]) => !puzzles.has(id) ||
    !Array.isArray(order) || !order.every((item) => typeof item === 'string' && evidence.has(item)) ||
    new Set(order).size !== order.length)) return null
  return { ...value, caseData } as SaveData
}

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseSave(JSON.parse(raw) as unknown) : null
  } catch { return null }
}

export function hasLegacySave(): boolean {
  try { return LEGACY_KEYS.some((key) => localStorage.getItem(key) !== null) }
  catch { return false }
}

export function writeSave(save: SaveData): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); return true }
  catch { return false }
}

export function clearCurrentSave(): void {
  localStorage.removeItem(STORAGE_KEY)
}
