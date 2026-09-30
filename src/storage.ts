import type { CasePage, GameCase } from './case'
import { loadDefaultCase, loadDemoCase, loadMockCase, parseCase } from './case'

const CURRENT_KEY = 'last-seen-online:v0.4:current'
const CASE_KEY = 'last-seen-online:v0.4:case:'
const CUSTOM_SOURCE_KEY = 'last-seen-online:v0.4:custom-source:'
const DEFAULT_CASE_ID = 'case-01-missing-person'
const LEGACY_KEYS = ['last-seen-online:v0.3', 'last-seen-online:v0.2', 'last-seen-online:v0.1']

// This is progress only. Case pages, prose, media and evidence descriptions are loaded separately.
export interface SaveData {
  saveVersion: 4
  caseId: string
  caseSchemaVersion: GameCase['schemaVersion']
  phaseId?: string
  currentPageId: string
  history: string[]
  historyIndex: number
  visitedPageIds: string[]
  discoveredEvidenceIds: string[]
  savedEvidenceIds: string[]
  establishedRelationIds: string[]
  unlockedFactIds: string[]
  checkpointIds: string[]
  completedPuzzleIds: string[]
  timelineOrders: Record<string, string[]>
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function keptIds(value: unknown, allowed: Set<string>): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string =>
    typeof id === 'string' && allowed.has(id)))] : []
}
export function makeSave(caseData: GameCase): SaveData {
  return { saveVersion: 4, caseId: caseData.id, caseSchemaVersion: caseData.schemaVersion,
    phaseId: caseData.phaseId, currentPageId: caseData.startPageId,
    history: [caseData.startPageId], historyIndex: 0, visitedPageIds: [caseData.startPageId],
    discoveredEvidenceIds: [], savedEvidenceIds: [], establishedRelationIds: [],
    unlockedFactIds: [], checkpointIds: [], completedPuzzleIds: [], timelineOrders: {} }
}
function allowedPage(page: CasePage, save: SaveData, caseData: GameCase): boolean {
  const gate = page.unlockConditions
  const directlyAllowed = !gate ||
    (gate.evidenceIds || []).every((id) => save.discoveredEvidenceIds.includes(id)) &&
    (gate.relationIds || []).every((id) => save.establishedRelationIds.includes(id)) &&
    (gate.factIds || []).every((id) => save.unlockedFactIds.includes(id)) &&
    (gate.puzzleIds || []).every((id) => save.completedPuzzleIds.includes(id))
  const unlockers = [
    ...caseData.relations.filter((relation) => relation.unlocks?.pageIds?.includes(page.id))
      .map((relation) => save.establishedRelationIds.includes(relation.id)),
    ...caseData.puzzles.filter((puzzle) => puzzle.unlocks?.pageIds?.includes(page.id))
      .map((puzzle) => save.completedPuzzleIds.includes(puzzle.id)),
  ]
  return directlyAllowed && (!unlockers.length || unlockers.some(Boolean))
}

function restoreSave(raw: unknown, caseData: GameCase): SaveData {
  const clean = makeSave(caseData)
  if (!record(raw) || raw.saveVersion !== 4) return clean
  // Earlier v0.4 records embedded caseData. Read only its identity, never its content.
  const embedded = record(raw.caseData) ? raw.caseData : null
  const oldId = typeof raw.caseId === 'string' ? raw.caseId : embedded?.id
  const oldSchema = raw.caseSchemaVersion ?? embedded?.schemaVersion ?? 2
  if (oldId !== caseData.id || oldSchema !== caseData.schemaVersion ||
    raw.phaseId !== caseData.phaseId) return clean

  const pageIds = new Set(caseData.pages.map((item) => item.id))
  const evidenceIds = new Set(caseData.evidence.map((item) => item.id))
  const relationIds = new Set(caseData.relations.map((item) => item.id))
  const factIds = new Set(caseData.facts.map((item) => item.id))
  const puzzleIds = new Set(caseData.puzzles.map((item) => item.id))
  const checkpointIds = new Set(caseData.checkpoints)
  const discoveredEvidenceIds = keptIds(raw.discoveredEvidenceIds, evidenceIds)
  const history = Array.isArray(raw.history) ? raw.history.filter((id): id is string =>
    typeof id === 'string' && pageIds.has(id)) : []
  const index = Number.isInteger(raw.historyIndex) ? raw.historyIndex as number : -1
  const currentPageId = typeof raw.currentPageId === 'string' && pageIds.has(raw.currentPageId) ?
    raw.currentPageId : caseData.startPageId
  const hasValidHistory = history.length > 0 && index >= 0 && index < history.length &&
    history[index] === currentPageId
  const orders: Record<string, string[]> = {}
  if (record(raw.timelineOrders)) for (const [id, value] of Object.entries(raw.timelineOrders)) {
    const puzzle = caseData.puzzles.find((item) => item.id === id && item.type === 'timeline')
    if (puzzle && Array.isArray(value) && value.length === puzzle.evidenceIds.length &&
      value.every((entry) => typeof entry === 'string' && puzzle.evidenceIds.includes(entry)) &&
      new Set(value).size === value.length) orders[id] = value as string[]
  }
  const restored: SaveData = {
    ...clean, currentPageId: hasValidHistory ? currentPageId : caseData.startPageId,
    history: hasValidHistory ? history : [caseData.startPageId],
    historyIndex: hasValidHistory ? index : 0,
    visitedPageIds: keptIds(raw.visitedPageIds, pageIds),
    discoveredEvidenceIds,
    savedEvidenceIds: keptIds(raw.savedEvidenceIds, new Set(discoveredEvidenceIds)),
    establishedRelationIds: keptIds(raw.establishedRelationIds, relationIds),
    unlockedFactIds: keptIds(raw.unlockedFactIds, factIds),
    checkpointIds: keptIds(raw.checkpointIds, checkpointIds),
    completedPuzzleIds: keptIds(raw.completedPuzzleIds, puzzleIds),
    timelineOrders: orders,
  }
  const current = caseData.pages.find((item) => item.id === restored.currentPageId)
  if (!current || !allowedPage(current, restored, caseData)) {
    restored.currentPageId = caseData.startPageId
    restored.history = [caseData.startPageId]
    restored.historyIndex = 0
  }
  restored.visitedPageIds = [...new Set([...restored.visitedPageIds, restored.currentPageId])]
  return restored
}

async function loadCaseById(id: string, oldRecord: unknown): Promise<GameCase> {
  if (id === DEFAULT_CASE_ID) return loadDefaultCase()
  if (id === 'developer-mock-001') return loadMockCase()
  if (id === 'demo-001') return loadDemoCase()
  const source = localStorage.getItem(`${CUSTOM_SOURCE_KEY}${id}`)
  if (source) return parseCase(JSON.parse(source) as unknown)
  // One-time recovery for an imported v0.4 test Case whose only copy was inside its old save.
  if (record(oldRecord) && record(oldRecord.caseData)) {
    const imported = parseCase(oldRecord.caseData)
    if (imported.id !== id) throw new Error('旧 Case ID 不一致。')
    writeCustomCase(imported)
    return imported
  }
  throw new Error(`找不到 Case：${id}`)
}

export async function loadCurrentSession(): Promise<{ caseData: GameCase; save: SaveData }> {
  let current = DEFAULT_CASE_ID
  let raw: unknown = null
  try {
    current = localStorage.getItem(CURRENT_KEY) || DEFAULT_CASE_ID
    const stored = localStorage.getItem(`${CASE_KEY}${current}`)
    raw = stored ? JSON.parse(stored) as unknown : null
  } catch { /* Corrupt progress is reset below; the Case source remains separate. */ }
  try {
    const caseData = await loadCaseById(current, raw)
    return { caseData, save: restoreSave(raw, caseData) }
  } catch {
    const caseData = await loadDefaultCase()
    return { caseData, save: makeSave(caseData) }
  }
}

export function hasLegacySave(): boolean {
  try { return LEGACY_KEYS.some((key) => localStorage.getItem(key) !== null) }
  catch { return false }
}
export function writeSave(save: SaveData): boolean {
  try {
    localStorage.setItem(`${CASE_KEY}${save.caseId}`, JSON.stringify(save))
    localStorage.setItem(CURRENT_KEY, save.caseId)
    return true
  } catch { return false }
}
export function writeCustomCase(caseData: GameCase): boolean {
  if ([DEFAULT_CASE_ID, 'developer-mock-001', 'demo-001'].includes(caseData.id)) return true
  try { localStorage.setItem(`${CUSTOM_SOURCE_KEY}${caseData.id}`, JSON.stringify(caseData)); return true }
  catch { return false }
}
export function clearCurrentSave(): void {
  try {
    const current = localStorage.getItem(CURRENT_KEY)
    if (current) localStorage.removeItem(`${CASE_KEY}${current}`)
    localStorage.removeItem(CURRENT_KEY)
  } catch { /* The app can still start with in-memory progress. */ }
}
