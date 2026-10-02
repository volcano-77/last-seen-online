export type PageKind = 'portal' | 'search' | 'forum' | 'forum-thread' | 'forum-reply' | 'website' |
  'blog' | 'profile' | 'email' | 'attachment' | 'spreadsheet' | 'image' |
  'file-metadata' | 'cache' | 'sd-card' | 'print-log' | 'snapshot'
export type ObjectKind = 'post' | 'reply' | 'timestamp' | 'message' | 'attachment' |
  'row' | 'photo' | 'file' | 'property' | 'cache-entry' | 'log-entry' | 'text'
export type EvidenceType = 'page' | 'post' | 'reply' | 'timestamp' | 'email' |
  'attachment' | 'table-row' | 'photo' | 'file-property' | 'cache' | 'log' | 'other'

export interface CaseLink { label: string; pageId: string }
export interface UnlockConditions {
  evidenceIds?: string[]; relationIds?: string[]; factIds?: string[]; puzzleIds?: string[]
}
export interface Unlocks { evidenceIds?: string[]; pageIds?: string[]; factIds?: string[] }
export interface PageDetails {
  section?: string; floor?: string; registeredAt?: string; lastOnline?: string
  signature?: string; views?: string; replies?: string
}
export interface CaseMedia {
  src: string; alt: string; caption?: string; filename?: string
  width?: string; height?: string; uploadedAt?: string
  id?: string; identityId?: string; takenAt?: string
  evidenceIds?: string[]
  printOrder?: { id: string; printedAt: string }
  previewOnly?: boolean
}
export interface PageObject {
  id: string; type: ObjectKind; title: string; body?: string[]; timestamp?: string
  metadata?: Record<string, string>; evidenceId?: string; links?: CaseLink[]
  author?: string; floor?: string; media?: CaseMedia; detailLabel?: string
  recoveryPuzzleId?: string
}
export interface CasePage {
  id: string; kind: PageKind; title: string; url: string; body: string[]
  author?: string; date?: string; subtitle?: string; siteName?: string
  tags?: string[]; links?: CaseLink[]; details?: PageDetails
  objects?: PageObject[]; metadata?: Record<string, string>
  unlockConditions?: UnlockConditions
  layout?: 'portal' | 'forum' | 'news' | 'blog' | 'profile' | 'echo' | 'index' | 'generic'
  media?: CaseMedia; searchable?: boolean; searchTerms?: string[]
  directory?: boolean; bookmark?: boolean
  siteId?: string; skin?: 'life' | 'campus' | 'summer' | 'zhao' | 'echo' | 'news' | 'archive'
  accessPuzzleId?: string; learnsTool?: 'archive'; offlinePageId?: string
  snapshot?: { originalUrl: string; capturedAt: string }
  searchIndex?: { status: 'current' | 'orphan' | 'legacy'; aliases?: string[] }
  normalNavigation?: boolean; searchIndexed?: boolean
  requiresTool?: 'archive'; firstVisitFromPageId?: string
  tableColumns?: string[]
  deleted?: { by: 'author'; at: string }
}
export interface EvidenceDefinition {
  id: string; type: EvidenceType; sourcePageId: string; sourceObjectId?: string
  title: string; summary: string; timestamp?: string; metadata?: Record<string, string>
  relatedEvidenceIds?: string[]; unlockConditions?: UnlockConditions
  discovery?: 'detail' | 'selection'; selectionTexts?: string[]
}
export interface RelationDefinition {
  id: string; evidenceIds?: string[]; factIds?: string[]
  title: string; summary: string; unlocks?: Unlocks; checkpointId?: string
}
export interface FactDefinition { id: string; title: string; summary: string }
export interface PuzzleDefinition {
  id: string; type: 'timeline' | 'short-input' | 'image-match' | 'cache-preview'; title: string; evidenceIds: string[]
  expectedOrder?: string[]; answer?: string; prompt?: string; unlocks?: Unlocks
  sourcePageId?: string; sourceObjectId?: string; referenceMediaId?: string; answerSourcePageIds?: string[]
}
export interface GameCase {
  schemaVersion: 2 | 3; id: string; title: string; subtitle: string; briefing: string
  objective: string; startPageId: string
  status: 'placeholder' | 'ready' | 'developer-mock'
  pages: CasePage[]; evidence: EvidenceDefinition[]; relations: RelationDefinition[]
  facts: FactDefinition[]; puzzles: PuzzleDefinition[]
  phaseId?: string; checkpoints: string[]; variables: Record<string, string>
  provisional?: { status: 'development-only'; scope: string[] }
  homePageId?: string; archivePageId?: string; userProfiles: Record<string, string>
}

const pageKinds = new Set<PageKind>(['portal', 'search', 'forum', 'forum-thread', 'forum-reply',
  'website', 'blog', 'profile', 'email', 'attachment', 'spreadsheet', 'image',
  'file-metadata', 'cache', 'sd-card', 'print-log', 'snapshot'])
const objectKinds = new Set<ObjectKind>(['post', 'reply', 'timestamp', 'message',
  'attachment', 'row', 'photo', 'file', 'property', 'cache-entry', 'log-entry', 'text'])
const evidenceTypes = new Set<EvidenceType>(['page', 'post', 'reply', 'timestamp',
  'email', 'attachment', 'table-row', 'photo', 'file-property', 'cache', 'log', 'other'])

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmpty)
}
function metadata(value: unknown): value is Record<string, string> {
  return record(value) && Object.values(value).every((item) => typeof item === 'string')
}
function unique(values: string[]): boolean { return new Set(values).size === values.length }
function subset(values: string[] | undefined, allowed: Set<string>): boolean {
  return !values || values.every((value) => allowed.has(value))
}
function links(value: unknown): value is CaseLink[] {
  return Array.isArray(value) && value.every((item) => record(item) &&
    nonEmpty(item.label) && nonEmpty(item.pageId))
}
function gate(value: unknown): value is UnlockConditions {
  return record(value) && ['evidenceIds', 'relationIds', 'factIds', 'puzzleIds']
    .every((key) => value[key] === undefined || strings(value[key]))
}
function unlocks(value: unknown): value is Unlocks {
  return record(value) && ['evidenceIds', 'pageIds', 'factIds']
    .every((key) => value[key] === undefined || strings(value[key]))
}
function media(value: unknown): value is CaseMedia {
  return record(value) && nonEmpty(value.src) && nonEmpty(value.alt) &&
    ['caption', 'filename', 'width', 'height', 'uploadedAt', 'id', 'identityId', 'takenAt']
      .every((key) => value[key] === undefined || nonEmpty(value[key])) &&
    (value.evidenceIds === undefined || (strings(value.evidenceIds) && unique(value.evidenceIds))) &&
    (value.printOrder === undefined || (record(value.printOrder) && nonEmpty(value.printOrder.id) && nonEmpty(value.printOrder.printedAt))) &&
    (value.previewOnly === undefined || typeof value.previewOnly === 'boolean')
}
function formatVariable(value: string, format?: string): string {
  if (!format) return value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Case 日期变量 ${value} 不能使用 ${format} 格式。`)
  const [, year, month, day] = match
  switch (format) {
    case 'short': return `${Number(month)}/${Number(day)}`
    case 'zh': return `${Number(month)}月${Number(day)}日`
    case 'zhSpaced': return `${Number(month)} 月 ${Number(day)} 日`
    case 'compact': return `${year}${month}${day}`
    case 'path': return `${year}/${month}/${day}`
    case 'yearMonth': return `${year}-${month}`
    default: throw new Error(`Case 日期格式 ${format} 不受支持。`)
  }
}
function expandVariables(input: unknown, variables: Record<string, string>): unknown {
  if (typeof input === 'string') return input.replace(/\{\{([a-zA-Z0-9_]+)(?:\|([a-zA-Z]+))?\}\}/g, (_, key: string, format?: string) => {
    if (!(key in variables)) throw new Error(`Case 变量 ${key} 未定义。`)
    return formatVariable(variables[key], format)
  })
  if (Array.isArray(input)) return input.map((item) => expandVariables(item, variables))
  if (record(input)) return Object.fromEntries(Object.entries(input)
    .map(([key, item]) => [key, expandVariables(item, variables)]))
  return input
}

export function parseCase(input: unknown): GameCase {
  if (!record(input) || (input.variables !== undefined && !metadata(input.variables))) {
    throw new Error('Case 变量格式无效。')
  }
  const variables = (input.variables || {}) as Record<string, string>
  const value = expandVariables(input, variables) as Record<string, unknown>
  if (!record(value) || !nonEmpty(value.id) || !nonEmpty(value.title) ||
    !nonEmpty(value.subtitle) || !nonEmpty(value.briefing) || !nonEmpty(value.objective) ||
    !nonEmpty(value.startPageId) || !Array.isArray(value.pages) ||
    (value.schemaVersion !== undefined && value.schemaVersion !== 2 && value.schemaVersion !== 3) ||
    (value.phaseId !== undefined && !nonEmpty(value.phaseId)) ||
    (value.checkpoints !== undefined && !strings(value.checkpoints)) ||
    (value.provisional !== undefined && (!record(value.provisional) ||
      value.provisional.status !== 'development-only' || !strings(value.provisional.scope))) ||
    (value.status !== undefined && !['placeholder', 'ready', 'developer-mock'].includes(String(value.status)))) {
    throw new Error('Case 文件缺少必要字段或版本不受支持。')
  }
  const pages: CasePage[] = value.pages.map((raw, index) => {
    if (!record(raw) || !nonEmpty(raw.id) || !nonEmpty(raw.title) || !nonEmpty(raw.url) ||
      !pageKinds.has(raw.kind as PageKind) || !Array.isArray(raw.body) || !raw.body.every(nonEmpty) ||
      ['author', 'date', 'subtitle', 'siteName'].some((key) => raw[key] !== undefined && !nonEmpty(raw[key])) ||
      (raw.tags !== undefined && !strings(raw.tags)) ||
      (raw.links !== undefined && !links(raw.links)) ||
      (raw.metadata !== undefined && !metadata(raw.metadata)) ||
      (raw.tableColumns !== undefined && (!strings(raw.tableColumns) || !raw.tableColumns.length || !unique(raw.tableColumns))) ||
      (raw.deleted !== undefined && (!record(raw.deleted) || raw.deleted.by !== 'author' || !nonEmpty(raw.deleted.at))) ||
      (raw.layout !== undefined && !['portal','forum','news','blog','profile','echo','index','generic'].includes(String(raw.layout))) ||
      (raw.media !== undefined && !media(raw.media)) ||
      (raw.searchable !== undefined && typeof raw.searchable !== 'boolean') ||
      ['normalNavigation', 'searchIndexed'].some((key) => raw[key] !== undefined && typeof raw[key] !== 'boolean') ||
      (raw.requiresTool !== undefined && raw.requiresTool !== 'archive') ||
      (raw.firstVisitFromPageId !== undefined && !nonEmpty(raw.firstVisitFromPageId)) ||
      (raw.searchIndex !== undefined && (!record(raw.searchIndex) || !['current','orphan','legacy'].includes(String(raw.searchIndex.status)) ||
        (raw.searchIndex.aliases !== undefined && !strings(raw.searchIndex.aliases)))) ||
      (raw.directory !== undefined && typeof raw.directory !== 'boolean') ||
      (raw.bookmark !== undefined && typeof raw.bookmark !== 'boolean') ||
      (raw.searchTerms !== undefined && !strings(raw.searchTerms)) ||
      (raw.unlockConditions !== undefined && !gate(raw.unlockConditions)) ||
      ['siteId', 'accessPuzzleId', 'offlinePageId'].some((key) => raw[key] !== undefined && !nonEmpty(raw[key])) ||
      (raw.skin !== undefined && !['life','campus','summer','zhao','echo','news','archive'].includes(String(raw.skin))) ||
      (raw.learnsTool !== undefined && raw.learnsTool !== 'archive') ||
      (raw.snapshot !== undefined && (!record(raw.snapshot) || !nonEmpty(raw.snapshot.originalUrl) || !nonEmpty(raw.snapshot.capturedAt))) ||
      (raw.details !== undefined && (!record(raw.details) ||
        Object.values(raw.details).some((item) => !nonEmpty(item))))) {
      throw new Error(`第 ${index + 1} 个页面格式无效。`)
    }
    if (raw.objects !== undefined && (!Array.isArray(raw.objects) || !raw.objects.every((item) =>
      record(item) && nonEmpty(item.id) && nonEmpty(item.title) && objectKinds.has(item.type as ObjectKind) &&
      (item.body === undefined || strings(item.body)) &&
      (item.timestamp === undefined || nonEmpty(item.timestamp)) &&
      (item.evidenceId === undefined || nonEmpty(item.evidenceId)) &&
      (item.author === undefined || nonEmpty(item.author)) &&
      (item.floor === undefined || nonEmpty(item.floor)) &&
      (item.detailLabel === undefined || nonEmpty(item.detailLabel)) &&
      (item.recoveryPuzzleId === undefined || nonEmpty(item.recoveryPuzzleId)) &&
      (item.media === undefined || media(item.media)) &&
      (item.metadata === undefined || metadata(item.metadata)) &&
      (item.links === undefined || links(item.links))))) {
      throw new Error(`页面 ${raw.id} 的内容对象格式无效。`)
    }
    if (raw.objects && !unique((raw.objects as PageObject[]).map((item) => item.id))) {
      throw new Error(`页面 ${raw.id} 的内容对象 ID 重复。`)
    }
    if (raw.tableColumns && (raw.objects as PageObject[] | undefined)?.some((item) => item.type === 'row' &&
      !(raw.tableColumns as string[]).every((column) => nonEmpty(item.metadata?.[column])))) {
      throw new Error(`页面 ${raw.id} 的表格行缺少列内容。`)
    }
    return raw as unknown as CasePage
  })
  const evidence = value.evidence ?? []
  const relations = value.relations ?? []
  const facts = value.facts ?? []
  const puzzles = value.puzzles ?? []
  if (!Array.isArray(evidence) || !Array.isArray(relations) || !Array.isArray(facts) || !Array.isArray(puzzles)) {
    throw new Error('证据、关联、事实与谜题必须是数组。')
  }
  if (!evidence.every((item) => record(item) && nonEmpty(item.id) &&
    evidenceTypes.has(item.type as EvidenceType) && nonEmpty(item.sourcePageId) &&
    nonEmpty(item.title) && nonEmpty(item.summary) && item.summary.length <= 240 &&
    (item.sourceObjectId === undefined || nonEmpty(item.sourceObjectId)) &&
    (item.timestamp === undefined || nonEmpty(item.timestamp)) &&
    (item.metadata === undefined || metadata(item.metadata)) &&
    (item.relatedEvidenceIds === undefined || strings(item.relatedEvidenceIds)) &&
    (item.discovery === undefined || item.discovery === 'detail' || item.discovery === 'selection') &&
    (item.selectionTexts === undefined || strings(item.selectionTexts)) &&
    (item.discovery !== 'selection' || strings(item.selectionTexts)) &&
    (item.unlockConditions === undefined || gate(item.unlockConditions)))) throw new Error('证据格式无效。')
  if (!relations.every((item) => record(item) && nonEmpty(item.id) &&
    (item.evidenceIds === undefined || strings(item.evidenceIds)) &&
    (item.factIds === undefined || strings(item.factIds)) &&
    (item.evidenceIds || []).length + (item.factIds || []).length >= 2 &&
    unique(item.evidenceIds || []) && unique(item.factIds || []) &&
    nonEmpty(item.title) && nonEmpty(item.summary) &&
    (item.checkpointId === undefined || nonEmpty(item.checkpointId)) &&
    (item.unlocks === undefined || unlocks(item.unlocks)))) throw new Error('证据关联格式无效。')
  if (!facts.every((item) => record(item) && nonEmpty(item.id) &&
    nonEmpty(item.title) && nonEmpty(item.summary))) throw new Error('事实格式无效。')
  if (!puzzles.every((item) => record(item) && nonEmpty(item.id) && nonEmpty(item.title) &&
    (item.type === 'timeline' || item.type === 'short-input' || item.type === 'image-match' || item.type === 'cache-preview') && strings(item.evidenceIds) &&
    (item.type !== 'timeline' || (strings(item.expectedOrder) && item.expectedOrder.length === item.evidenceIds.length)) &&
    (item.type !== 'short-input' || (nonEmpty(item.answer) && item.answer.length <= 32)) &&
    (item.prompt === undefined || nonEmpty(item.prompt)) &&
    ['sourcePageId', 'sourceObjectId', 'referenceMediaId'].every((key) => item[key] === undefined || nonEmpty(item[key])) &&
    (item.answerSourcePageIds === undefined || strings(item.answerSourcePageIds)) &&
    (item.type !== 'image-match' || (nonEmpty(item.sourcePageId) && nonEmpty(item.sourceObjectId) && nonEmpty(item.referenceMediaId))) &&
    (item.type !== 'cache-preview' || (nonEmpty(item.sourcePageId) && nonEmpty(item.sourceObjectId) && nonEmpty(item.answer) && item.answer.length <= 32)) &&
    (item.unlocks === undefined || unlocks(item.unlocks)))) throw new Error('谜题格式无效。')

  const pageIds = new Set(pages.map((item) => item.id))
  const evidenceIds = new Set((evidence as EvidenceDefinition[]).map((item) => item.id))
  const relationIds = new Set((relations as RelationDefinition[]).map((item) => item.id))
  const factIds = new Set((facts as FactDefinition[]).map((item) => item.id))
  const puzzleIds = new Set((puzzles as PuzzleDefinition[]).map((item) => item.id))
  const checkpoints = (value.checkpoints || []) as string[]
  const userProfiles = value.userProfiles || {}
  const allMedia = pages.flatMap((page) => [page.media, ...(page.objects || []).map((item) => item.media)]).filter((item): item is CaseMedia => Boolean(item))
  const mediaIds = allMedia.flatMap((item) => item.id ? [item.id] : [])
  if (!unique(mediaIds) || !metadata(userProfiles) || !Object.values(userProfiles).every((id) => pageIds.has(id)) ||
    ['homePageId', 'archivePageId'].some((key) => value[key] !== undefined && (!nonEmpty(value[key]) || !pageIds.has(value[key])))) throw new Error('站点导航或图片引用无效。')
  if (!unique(pages.map((item) => item.id)) || !unique(evidence.map((item) => item.id)) ||
    !unique(relations.map((item) => item.id)) || !unique(facts.map((item) => item.id)) ||
    !unique(puzzles.map((item) => item.id)) || !unique(checkpoints) || !pageIds.has(value.startPageId) ||
    !pages.some((item) => item.kind === 'search')) throw new Error('Case ID 重复或缺少搜索起始页。')
  const validGate = (item?: UnlockConditions) => !item ||
    subset(item.evidenceIds, evidenceIds) && subset(item.relationIds, relationIds) &&
    subset(item.factIds, factIds) && subset(item.puzzleIds, puzzleIds)
  const validUnlocks = (item?: Unlocks) => !item ||
    subset(item.evidenceIds, evidenceIds) && subset(item.pageIds, pageIds) &&
    subset(item.factIds, factIds)
  for (const page of pages) {
    const images = [page.media, ...(page.objects || []).map((item) => item.media)].filter((item): item is CaseMedia => Boolean(item))
    if (images.some((image) => image.evidenceIds?.some((id) => !(evidence as EvidenceDefinition[]).some((item) => item.id === id && item.sourcePageId === page.id && item.discovery === 'detail')))) {
      throw new Error(`页面 ${page.id} 的图片记录来源无效。`)
    }
    if ((page.offlinePageId && !pageIds.has(page.offlinePageId)) ||
      (page.firstVisitFromPageId && !pageIds.has(page.firstVisitFromPageId)) ||
      (page.accessPuzzleId && !puzzleIds.has(page.accessPuzzleId)) ||
      !subset(page.links?.map((item) => item.pageId), pageIds) || !validGate(page.unlockConditions) ||
      page.objects?.some((item) => (item.evidenceId && !evidenceIds.has(item.evidenceId)) ||
        (item.recoveryPuzzleId && !puzzleIds.has(item.recoveryPuzzleId)) ||
        !subset(item.links?.map((link) => link.pageId), pageIds))) throw new Error(`页面 ${page.id} 的引用无效。`)
  }
  for (const item of evidence as EvidenceDefinition[]) {
    const source = pages.find((page) => page.id === item.sourcePageId)
    if (!source || (item.sourceObjectId && !source.objects?.some((object) =>
      object.id === item.sourceObjectId && object.evidenceId === item.id)) ||
      !subset(item.relatedEvidenceIds, evidenceIds) || !validGate(item.unlockConditions)) {
      throw new Error(`证据 ${item.id} 的来源或引用无效。`)
    }
  }
  for (const item of relations as RelationDefinition[]) {
    if (!subset(item.evidenceIds, evidenceIds) || !subset(item.factIds, factIds) ||
      (item.checkpointId && !checkpoints.includes(item.checkpointId)) ||
      !validUnlocks(item.unlocks)) throw new Error(`关联 ${item.id} 的引用无效。`)
  }
  for (const item of puzzles as PuzzleDefinition[]) {
    if (item.type === 'cache-preview' && !pages.find((page) => page.id === item.sourcePageId)?.objects?.some((object) =>
      object.id === item.sourceObjectId && object.type === 'cache-entry' && object.recoveryPuzzleId === item.id && object.title === item.answer && object.media)) {
      throw new Error(`缓存恢复 ${item.id} 的文件映射无效。`)
    }
    if ((item.sourcePageId && !pageIds.has(item.sourcePageId)) ||
      (item.sourceObjectId && !pages.find((page) => page.id === item.sourcePageId)?.objects?.some((object) => object.id === item.sourceObjectId)) ||
      (item.referenceMediaId && !mediaIds.includes(item.referenceMediaId)) ||
      !subset(item.answerSourcePageIds, pageIds) ||
      !subset(item.evidenceIds, evidenceIds) || !subset(item.expectedOrder, evidenceIds) ||
      (item.expectedOrder && (!unique(item.expectedOrder) ||
        !item.expectedOrder.every((id) => item.evidenceIds.includes(id)))) || !validUnlocks(item.unlocks)) {
      throw new Error(`谜题 ${item.id} 的引用无效。`)
    }
  }
  return {
    schemaVersion: value.schemaVersion === 3 ? 3 : 2, id: value.id,
    title: value.id === 'demo-001' ? '旧演示案件（待替换）' : value.title,
    subtitle: value.id === 'demo-001' ? '仅供旧页面验证' : value.subtitle,
    briefing: value.id === 'demo-001' ? 'v0.1 旧演示内容，不能作为《寻人启事》剧情。' : value.briefing,
    objective: value.id === 'demo-001' ? '旧 Demo 不提供正式调查目标。' : value.objective,
    startPageId: value.startPageId,
    status: value.id === 'demo-001' ? 'placeholder' : value.status === 'developer-mock' ? 'developer-mock' :
      value.status === 'placeholder' ? 'placeholder' : 'ready',
    pages, evidence: evidence as EvidenceDefinition[], relations: relations as RelationDefinition[],
    facts: facts as FactDefinition[], puzzles: puzzles as PuzzleDefinition[],
    phaseId: value.phaseId as string | undefined, checkpoints, variables,
    provisional: value.provisional as GameCase['provisional'],
    homePageId: value.homePageId as string | undefined, archivePageId: value.archivePageId as string | undefined,
    userProfiles: userProfiles as Record<string, string>,
  }
}

async function fetchCase(path: string): Promise<GameCase> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`Case 加载失败：${response.status}`)
  return parseCase(await response.json())
}
export function loadDefaultCase(): Promise<GameCase> { return fetchCase('cases/missing-person/phase-01.json') }
export function loadMockCase(): Promise<GameCase> { return fetchCase('cases/developer/mock-case.json') }
export function loadDemoCase(): Promise<GameCase> { return fetchCase('cases/demo/case.json') }
