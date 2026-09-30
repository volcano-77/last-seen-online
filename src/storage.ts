import type { CasePage, GameCase } from './case'
import { loadDefaultCase, loadDemoCase, loadMockCase, parseCase } from './case'
import { currentEntry, makeEntry, makeTab } from './browserState'
import type { BrowserTab, HistoryEntry, PageState } from './browserState'
import { canVisitPage } from './siteData'

const CURRENT_KEY = 'last-seen-online:v0.5:current'
const CASE_KEY = 'last-seen-online:v0.5:case:'
const CUSTOM_SOURCE_KEY = 'last-seen-online:v0.5:custom-source:'
const DEFAULT_CASE_ID = 'case-01-missing-person'
const LEGACY_KEYS = ['last-seen-online:v0.3', 'last-seen-online:v0.2', 'last-seen-online:v0.1']

// This is progress only. Case pages, prose, media and evidence descriptions are loaded separately.
export interface SaveData {
  saveVersion: 6
  caseId: string
  caseSchemaVersion: GameCase['schemaVersion']
  phaseId?: string
  tabs: BrowserTab[]
  activeTabId: string
  visitedPageIds: string[]
  discoveredEvidenceIds: string[]
  savedEvidenceIds: string[]
  establishedRelationIds: string[]
  unlockedFactIds: string[]
  checkpointIds: string[]
  completedPuzzleIds: string[]
  timelineOrders: Record<string, string[]>
  recordDateView: boolean
  viewedMediaIds: string[]
  learnedTools: string[]
  clippings: { id: string; pageId: string; text: string }[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function keptIds(value: unknown, allowed: Set<string>): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string =>
    typeof id === 'string' && allowed.has(id)))] : []
}
export function makeSave(caseData: GameCase): SaveData {
  const tab = makeTab(caseData.pages.find((page) => page.id === caseData.startPageId)!)
  return { saveVersion: 6, caseId: caseData.id, caseSchemaVersion: caseData.schemaVersion,
    phaseId: caseData.phaseId, tabs: [tab], activeTabId: tab.id, visitedPageIds: [caseData.startPageId],
    discoveredEvidenceIds: [], savedEvidenceIds: [], establishedRelationIds: [],
    unlockedFactIds: [], checkpointIds: [], completedPuzzleIds: [], timelineOrders: {},
    viewedMediaIds: [], learnedTools: [], clippings: [], recordDateView: false }
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
  return canVisitPage(page, save) && directlyAllowed && (!unlockers.length || unlockers.some(Boolean))
}

function restoreState(raw: unknown): PageState {
  if (!record(raw)) return {}
  return { searchInput: typeof raw.searchInput === 'string' ? raw.searchInput.slice(0, 100) : undefined,
    searchQuery: typeof raw.searchQuery === 'string' ? raw.searchQuery.slice(0, 100) : undefined,
    searchSubmitted: raw.searchSubmitted === true,
    channel: typeof raw.channel === 'string' ? raw.channel.slice(0, 32) : undefined,
    openObjectIds: Array.isArray(raw.openObjectIds) ? raw.openObjectIds.filter((id): id is string => typeof id === 'string').slice(0, 100) : [] }
}
function restoreTabs(raw: Record<string, unknown>, caseData: GameCase): BrowserTab[] {
  const source = raw.saveVersion === 5 ? [{ id: 'migrated-v05', title: '', history: raw.history,
    historyIndex: raw.historyIndex, lastUsed: Date.now() }] : raw.tabs
  if (!Array.isArray(source)) return []
  const tabs: BrowserTab[] = []
  for (const value of source) {
    if (!record(value) || !Array.isArray(value.history)) continue
    const history: HistoryEntry[] = []
    let historyIndex = 0
    for (let index = 0; index < value.history.length; index++) {
      const item = value.history[index]
      const pageId = typeof item === 'string' ? item : record(item) ? item.pageId : undefined
      const page = caseData.pages.find((page) => page.id === pageId)
      if (!page) continue
      if (index <= Number(value.historyIndex || 0)) historyIndex = history.length
      const entry = makeEntry(page)
      if (record(item)) {
        entry.id = typeof item.id === 'string' ? item.id : entry.id
        entry.scrollY = typeof item.scrollY === 'number' && Number.isFinite(item.scrollY) ? Math.max(0, item.scrollY) : 0
        entry.state = restoreState(item.state)
        entry.state.openObjectIds = keptIds(entry.state.openObjectIds, new Set(page.objects?.map((o) => o.id) || []))
        entry.anchorId = typeof item.anchorId === 'string' && (item.anchorId === 'thread-main' || page.objects?.some((o) => o.id === item.anchorId)) ? item.anchorId : undefined
      } else if (page.kind === 'search' && typeof raw.searchQuery === 'string') {
        entry.state = { searchInput: raw.searchQuery.slice(0, 32), searchQuery: raw.searchQuery.slice(0, 32), searchSubmitted: true }
      }
      history.push(entry)
    }
    if (!history.length) continue
    const id = typeof value.id === 'string' && !tabs.some((tab) => tab.id === value.id) ? value.id : crypto.randomUUID()
    tabs.push({ id, title: caseData.pages.find((p) => p.id === history[historyIndex].pageId)!.title, history, historyIndex,
      lastUsed: typeof value.lastUsed === 'number' && Number.isFinite(value.lastUsed) ? value.lastUsed : Date.now(),
      openerTabId: typeof value.openerTabId === 'string' ? value.openerTabId : undefined })
  }
  return tabs.map((tab) => ({ ...tab, openerTabId: tabs.some((item) => item.id === tab.openerTabId && item.id !== tab.id) ? tab.openerTabId : undefined }))
}
export function restoreSave(raw: unknown, caseData: GameCase): SaveData {
  const clean = makeSave(caseData)
  if (!record(raw) || (raw.saveVersion !== 5 && raw.saveVersion !== 6)) return clean
  if (raw.caseId !== caseData.id || raw.caseSchemaVersion !== caseData.schemaVersion ||
    raw.phaseId !== caseData.phaseId) return clean

  const pageIds = new Set(caseData.pages.map((item) => item.id))
  const evidenceIds = new Set(caseData.evidence.map((item) => item.id))
  const relationIds = new Set(caseData.relations.map((item) => item.id))
  const factIds = new Set(caseData.facts.map((item) => item.id))
  const puzzleIds = new Set(caseData.puzzles.map((item) => item.id))
  const checkpointIds = new Set(caseData.checkpoints)
  const discoveredEvidenceIds = keptIds(raw.discoveredEvidenceIds, evidenceIds)
  const tabs = restoreTabs(raw, caseData)
  const orders: Record<string, string[]> = {}
  if (record(raw.timelineOrders)) for (const [id, value] of Object.entries(raw.timelineOrders)) {
    const puzzle = caseData.puzzles.find((item) => item.id === id && item.type === 'timeline')
    if (puzzle && Array.isArray(value) && value.length === puzzle.evidenceIds.length &&
      value.every((entry) => typeof entry === 'string' && puzzle.evidenceIds.includes(entry)) &&
      new Set(value).size === value.length) orders[id] = value as string[]
  }
  const restored: SaveData = {
    ...clean, tabs: tabs.length ? tabs : clean.tabs,
    activeTabId: tabs.some((tab) => tab.id === raw.activeTabId) ? raw.activeTabId as string : (tabs[0]?.id || clean.activeTabId),
    visitedPageIds: keptIds(raw.visitedPageIds, pageIds),
    discoveredEvidenceIds,
    savedEvidenceIds: keptIds(raw.savedEvidenceIds, new Set(discoveredEvidenceIds)),
    establishedRelationIds: keptIds(raw.establishedRelationIds, relationIds),
    unlockedFactIds: keptIds(raw.unlockedFactIds, factIds),
    checkpointIds: keptIds(raw.checkpointIds, checkpointIds),
    completedPuzzleIds: keptIds(raw.completedPuzzleIds, puzzleIds),
    timelineOrders: orders,
    recordDateView: raw.recordDateView === true,
    viewedMediaIds: keptIds(raw.viewedMediaIds, new Set(caseData.pages.flatMap((page) =>
      [page.media, ...(page.objects || []).map((item) => item.media)].flatMap((item) => item?.id ? [item.id] : [])))),
    learnedTools: keptIds(raw.learnedTools, new Set(['archive'])),
    clippings: Array.isArray(raw.clippings) ? raw.clippings.filter((item) => record(item) &&
      typeof item.id === 'string' && typeof item.pageId === 'string' && pageIds.has(item.pageId) &&
      typeof item.text === 'string' && item.text.length > 0 && item.text.length <= 180).slice(-30) as SaveData['clippings'] : [],
  }
  restored.tabs = restored.tabs.map((tab) => {
    const current = caseData.pages.find((page) => page.id === tab.history[tab.historyIndex].pageId)
    return current && allowedPage(current, restored, caseData) ? tab : { ...tab, title: clean.tabs[0].title,
      history: [makeEntry(caseData.pages.find((p) => p.id === caseData.startPageId)!)], historyIndex: 0 }
  })
  restored.visitedPageIds = [...new Set([...restored.visitedPageIds, currentEntry(restored).pageId])]
  return restored
}

async function loadCaseById(id: string): Promise<GameCase> {
  if (id === DEFAULT_CASE_ID) return loadDefaultCase()
  if (id === 'developer-mock-001') return loadMockCase()
  if (id === 'demo-001') return loadDemoCase()
  const source = localStorage.getItem(`${CUSTOM_SOURCE_KEY}${id}`)
  if (source) return parseCase(JSON.parse(source) as unknown)
  throw new Error(`找不到 Case：${id}`)
}

export async function loadCurrentSession(): Promise<{ caseData: GameCase; save: SaveData }> {
  // Explicit development routes remain available without putting a Case loader in the player's browser.
  const developerCase = new URLSearchParams(window.location.search).get('case')
  let current = developerCase === 'mock' ? 'developer-mock-001' : developerCase === 'legacy' ? 'demo-001' : DEFAULT_CASE_ID
  let raw: unknown = null
  try {
    const stored = localStorage.getItem(`${CASE_KEY}${current}`)
    raw = stored ? JSON.parse(stored) as unknown : null
  } catch { /* Corrupt progress is reset below; the Case source remains separate. */ }
  try {
    const caseData = await loadCaseById(current)
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
export function resetCaseSave(caseData: GameCase): SaveData | null {
  const fresh = makeSave(caseData)
  try {
    // Replace this Case's progress atomically; keep other saves and Case sources intact.
    localStorage.setItem(`${CASE_KEY}${caseData.id}`, JSON.stringify(fresh))
    return fresh
  } catch { return null }
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
