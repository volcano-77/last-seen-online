import type { CasePage, GameCase } from './case'
import { loadDefaultCase, loadDemoCase, loadMockCase, parseCase } from './case'
import { currentEntry, makeEntry, makeTab } from './browserState'
import type { BrowserTab, HistoryEntry, PageState } from './browserState'
import { canVisitPage } from './siteData'
import { emptyFinalReview, emptyReviewItem, REVIEW_CLAIMS, REVIEW_GATE_FACT_IDS, REVIEW_LEVELS, reviewClaim } from './finalReview'
import type { FinalReviewProgress, ReviewItemProgress, ReviewLevel } from './finalReview'
import { channelSourcesReady, DELIVERY_CHANNELS, emptyMaterialDelivery, finalReviewComplete, finalReviewSourceIds, MATERIAL_PACKAGE_ID } from './materialDelivery'
import type { DeliveryChannelId, DeliveryReceipt, MaterialDeliveryProgress } from './materialDelivery'

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
  finalReview: FinalReviewProgress
  materialDelivery: MaterialDeliveryProgress
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
    viewedMediaIds: [], learnedTools: [], clippings: [], recordDateView: false,
    finalReview: emptyFinalReview(), materialDelivery: emptyMaterialDelivery() }
}
function allowedPage(page: CasePage, save: SaveData, caseData: GameCase): boolean {
  const gate = page.unlockConditions
  const directlyAllowed = !gate ||
    (gate.evidenceIds || []).every((id) => save.discoveredEvidenceIds.includes(id)) &&
    (gate.relationIds || []).every((id) => save.establishedRelationIds.includes(id)) &&
    (gate.factIds || []).every((id) => save.unlockedFactIds.includes(id)) &&
    (gate.puzzleIds || []).every((id) => save.completedPuzzleIds.includes(id)) &&
    (gate.materialPackageGenerated !== true || save.materialDelivery.generated) &&
    (gate.dualDeliveryComplete !== true || save.materialDelivery.dualDeliveryComplete) &&
    (gate.postDeliveryResponseUnlocked !== true || save.materialDelivery.postDeliveryResponseUnlocked) &&
    (gate.wangEditorRecordUnlocked !== true || save.materialDelivery.wangEditorRecordUnlocked)
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
  const rawReview = record(raw.finalReview) ? raw.finalReview : {}
  const rawItems = record(rawReview.items) ? rawReview.items : {}
  const availableReviewIds = new Set([...restored.discoveredEvidenceIds, ...restored.unlockedFactIds])
  const reviewItems: Record<string, ReviewItemProgress> = {}
  for (const claim of REVIEW_CLAIMS) {
    const rawItem = rawItems[claim.id]
    const source: Record<string, unknown> = record(rawItem) ? rawItem : {}
    const level = REVIEW_LEVELS.some((item) => item.id === source.level) ? source.level as ReviewLevel : undefined
    const recordIds = keptIds(source.recordIds, availableReviewIds)
    const candidate: ReviewItemProgress = { ...emptyReviewItem(), level, recordIds }
    const result = reviewClaim(claim, candidate, availableReviewIds)
    candidate.reviewed = source.reviewed === true && result.passed
    if (record(source.feedback) && source.feedback.kind === result.feedback.kind &&
      typeof source.feedback.text === 'string') candidate.feedback = result.feedback
    reviewItems[claim.id] = candidate
  }
  restored.finalReview = {
    open: rawReview.open === true && REVIEW_GATE_FACT_IDS.every((id) => restored.unlockedFactIds.includes(id)),
    items: reviewItems,
    complete: REVIEW_CLAIMS.every((claim) => reviewItems[claim.id].reviewed),
  }
  const rawMaterial = record(raw.materialDelivery) ? raw.materialDelivery : {}
  const sourceIds = finalReviewSourceIds(restored.finalReview)
  const rawSourceIds = keptIds(rawMaterial.sourceIds, new Set(sourceIds))
  const generated = rawMaterial.generated === true && rawMaterial.packageId === MATERIAL_PACKAGE_ID &&
    finalReviewComplete(restored.finalReview) && rawSourceIds.length === sourceIds.length &&
    sourceIds.every((id, index) => rawSourceIds[index] === id)
  const familyVerified = generated && rawMaterial.familyVerified === true &&
    channelSourcesReady('family', restored.discoveredEvidenceIds)
  const mediaVerified = generated && rawMaterial.mediaVerified === true &&
    channelSourcesReady('media', restored.discoveredEvidenceIds)
  function receipt(channel: DeliveryChannelId, verified: boolean): DeliveryReceipt | undefined {
    const data = rawMaterial[channel === 'family' ? 'familyDelivered' : 'mediaDelivered']
    const spec = DELIVERY_CHANNELS[channel]
    const verifiedSourceIds = record(data) ? data.verifiedSourceIds : undefined
    if (!verified || !record(data) || !restored.discoveredEvidenceIds.includes(spec.receiptId) ||
      data.channel !== channel || data.channelId !== spec.channelId ||
      data.channelAddress !== caseData.variables[spec.addressVariable] ||
      data.lastConfirmedAt !== caseData.variables[spec.updatedVariable] ||
      data.packageId !== MATERIAL_PACKAGE_ID || typeof data.submittedAt !== 'string' ||
      !Number.isFinite(Date.parse(data.submittedAt)) || !Array.isArray(verifiedSourceIds) ||
      !spec.requiredIds.every((id) => verifiedSourceIds.includes(id))) return undefined
    return { channel, channelId: spec.channelId, channelAddress: data.channelAddress,
      verifiedSourceIds: [...spec.requiredIds], lastConfirmedAt: data.lastConfirmedAt,
      submittedAt: data.submittedAt, packageId: MATERIAL_PACKAGE_ID }
  }
  const familyDelivered = receipt('family', familyVerified)
  const mediaDelivered = receipt('media', mediaVerified)
  const dualDeliveryComplete = Boolean(familyDelivered && mediaDelivered)
  const postDeliveryResponseUnlocked = dualDeliveryComplete && rawMaterial.postDeliveryResponseUnlocked === true &&
    restored.visitedPageIds.includes('news_review_followup')
  const familyResponseSeen = postDeliveryResponseUnlocked && rawMaterial.familyResponseSeen === true &&
    restored.discoveredEvidenceIds.includes('F96')
  const mediaResponseSeen = postDeliveryResponseUnlocked && rawMaterial.mediaResponseSeen === true &&
    restored.discoveredEvidenceIds.includes('F97')
  const wangEditorRecordUnlocked = familyResponseSeen && mediaResponseSeen &&
    rawMaterial.wangEditorRecordUnlocked === true
  const editorIdentityVerified = wangEditorRecordUnlocked &&
    restored.visitedPageIds.includes('news_wang_editor_record') && restored.discoveredEvidenceIds.includes('F98')
  const wangSafetyMessageSeen = editorIdentityVerified && rawMaterial.wangSafetyMessageSeen === true &&
    restored.visitedPageIds.includes('news_wang_safety_excerpt') && restored.discoveredEvidenceIds.includes('F89')
  restored.materialDelivery = {
    open: generated && rawMaterial.open === true, generated,
    packageId: generated ? MATERIAL_PACKAGE_ID : undefined,
    generatedAt: generated && typeof rawMaterial.generatedAt === 'string' ? rawMaterial.generatedAt : undefined,
    sourceIds: generated ? sourceIds : [],
    familyVerified,
    familyVerifiedAt: familyVerified && typeof rawMaterial.familyVerifiedAt === 'string' ? rawMaterial.familyVerifiedAt : undefined,
    mediaVerified,
    mediaVerifiedAt: mediaVerified && typeof rawMaterial.mediaVerifiedAt === 'string' ? rawMaterial.mediaVerifiedAt : undefined,
    familyDelivered, mediaDelivered,
    dualDeliveryComplete, postDeliveryResponseUnlocked,
    familyResponseSeen, mediaResponseSeen, wangEditorRecordUnlocked, wangSafetyMessageSeen,
  }
  const validReceiptIds = new Set<string>([
    ...(familyDelivered ? [DELIVERY_CHANNELS.family.receiptId] : []),
    ...(mediaDelivered ? [DELIVERY_CHANNELS.media.receiptId] : []),
  ])
  const receiptIds = new Set<string>([DELIVERY_CHANNELS.family.receiptId, DELIVERY_CHANNELS.media.receiptId])
  restored.discoveredEvidenceIds = restored.discoveredEvidenceIds.filter((id) =>
    !receiptIds.has(id) || validReceiptIds.has(id))
  restored.savedEvidenceIds = restored.savedEvidenceIds.filter((id) =>
    !receiptIds.has(id) || validReceiptIds.has(id))
  const validPostIds = new Set<string>([
    ...(familyResponseSeen ? ['F96'] : []), ...(mediaResponseSeen ? ['F97'] : []),
    ...(editorIdentityVerified ? ['F98'] : []), ...(wangSafetyMessageSeen ? ['F89'] : []),
  ])
  const postIds = new Set(['F96', 'F97', 'F98', 'F89'])
  restored.discoveredEvidenceIds = restored.discoveredEvidenceIds.filter((id) =>
    !postIds.has(id) || validPostIds.has(id))
  restored.savedEvidenceIds = restored.savedEvidenceIds.filter((id) =>
    !postIds.has(id) || validPostIds.has(id))
  if (generated) restored.finalReview.open = false
  if (restored.materialDelivery.dualDeliveryComplete) restored.unlockedFactIds = [...new Set([...restored.unlockedFactIds, 'C44'])]
  else restored.unlockedFactIds = restored.unlockedFactIds.filter((id) => id !== 'C44')
  const c42Valid = wangSafetyMessageSeen && ['F84', 'F88', 'F98', 'F89'].every((id) =>
    restored.discoveredEvidenceIds.includes(id)) && restored.establishedRelationIds.includes('R42')
  restored.establishedRelationIds = restored.establishedRelationIds.filter((id) => id !== 'R42' || c42Valid)
  restored.unlockedFactIds = restored.unlockedFactIds.filter((id) => id !== 'C42')
  if (c42Valid) restored.unlockedFactIds.push('C42')
  const c43Valid = c42Valid && ['C39', 'C41', 'C42'].every((id) => restored.unlockedFactIds.includes(id)) &&
    restored.discoveredEvidenceIds.includes('F84') && restored.establishedRelationIds.includes('R43')
  restored.establishedRelationIds = restored.establishedRelationIds.filter((id) => id !== 'R43' || c43Valid)
  restored.unlockedFactIds = restored.unlockedFactIds.filter((id) => id !== 'C43')
  if (c43Valid) restored.unlockedFactIds.push('C43')
  const postPageIds = new Set(['news_review_followup', 'news_wang_editor_record', 'news_wang_safety_excerpt'])
  restored.visitedPageIds = restored.visitedPageIds.filter((id) => {
    const page = caseData.pages.find((item) => item.id === id)
    return !postPageIds.has(id) || Boolean(page && allowedPage(page, restored, caseData))
  })
  restored.tabs = restored.tabs.map((tab) => {
    const kept = tab.history.map((entry, index) => ({ entry, index })).filter(({ entry }) => {
      const page = caseData.pages.find((item) => item.id === entry.pageId)
      return !postPageIds.has(entry.pageId) || Boolean(page && allowedPage(page, restored, caseData))
    })
    if (!kept.length) return { ...tab, title: clean.tabs[0].title,
      history: [makeEntry(caseData.pages.find((p) => p.id === caseData.startPageId)!)], historyIndex: 0 }
    const filtered = { ...tab, history: kept.map(({ entry }) => entry),
      historyIndex: Math.max(0, kept.filter(({ index }) => index <= tab.historyIndex).length - 1) }
    const current = caseData.pages.find((page) => page.id === filtered.history[filtered.historyIndex].pageId)
    return current && allowedPage(current, restored, caseData) ? { ...filtered, title: current.title } : { ...filtered, title: clean.tabs[0].title,
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
