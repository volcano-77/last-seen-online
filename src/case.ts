export type PageKind = 'search' | 'forum' | 'forum-thread' | 'forum-reply' | 'website' |
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
export interface PageObject {
  id: string; type: ObjectKind; title: string; body?: string[]; timestamp?: string
  metadata?: Record<string, string>; evidenceId?: string; links?: CaseLink[]
}
export interface CasePage {
  id: string; kind: PageKind; title: string; url: string; body: string[]
  author?: string; date?: string; subtitle?: string; siteName?: string
  tags?: string[]; links?: CaseLink[]; details?: PageDetails
  objects?: PageObject[]; metadata?: Record<string, string>
  unlockConditions?: UnlockConditions
}
export interface EvidenceDefinition {
  id: string; type: EvidenceType; sourcePageId: string; sourceObjectId?: string
  title: string; summary: string; timestamp?: string; metadata?: Record<string, string>
  relatedEvidenceIds?: string[]; unlockConditions?: UnlockConditions
}
export interface RelationDefinition {
  id: string; evidenceIds: string[]; title: string; summary: string; unlocks?: Unlocks
}
export interface FactDefinition { id: string; title: string; summary: string }
export interface PuzzleDefinition {
  id: string; type: 'timeline' | 'short-input'; title: string; evidenceIds: string[]
  expectedOrder?: string[]; answer?: string; prompt?: string; unlocks?: Unlocks
}
export interface GameCase {
  schemaVersion: 2; id: string; title: string; subtitle: string; briefing: string
  objective: string; startPageId: string
  status: 'placeholder' | 'ready' | 'developer-mock'
  pages: CasePage[]; evidence: EvidenceDefinition[]; relations: RelationDefinition[]
  facts: FactDefinition[]; puzzles: PuzzleDefinition[]
}

const pageKinds = new Set<PageKind>(['search', 'forum', 'forum-thread', 'forum-reply',
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

export function parseCase(value: unknown): GameCase {
  if (!record(value) || !nonEmpty(value.id) || !nonEmpty(value.title) ||
    !nonEmpty(value.subtitle) || !nonEmpty(value.briefing) || !nonEmpty(value.objective) ||
    !nonEmpty(value.startPageId) || !Array.isArray(value.pages) ||
    (value.schemaVersion !== undefined && value.schemaVersion !== 2) ||
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
      (raw.unlockConditions !== undefined && !gate(raw.unlockConditions)) ||
      (raw.details !== undefined && (!record(raw.details) ||
        Object.values(raw.details).some((item) => !nonEmpty(item))))) {
      throw new Error(`第 ${index + 1} 个页面格式无效。`)
    }
    if (raw.objects !== undefined && (!Array.isArray(raw.objects) || !raw.objects.every((item) =>
      record(item) && nonEmpty(item.id) && nonEmpty(item.title) && objectKinds.has(item.type as ObjectKind) &&
      (item.body === undefined || strings(item.body)) &&
      (item.timestamp === undefined || nonEmpty(item.timestamp)) &&
      (item.evidenceId === undefined || nonEmpty(item.evidenceId)) &&
      (item.metadata === undefined || metadata(item.metadata)) &&
      (item.links === undefined || links(item.links))))) {
      throw new Error(`页面 ${raw.id} 的内容对象格式无效。`)
    }
    if (raw.objects && !unique((raw.objects as PageObject[]).map((item) => item.id))) {
      throw new Error(`页面 ${raw.id} 的内容对象 ID 重复。`)
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
    (item.unlockConditions === undefined || gate(item.unlockConditions)))) throw new Error('证据格式无效。')
  if (!relations.every((item) => record(item) && nonEmpty(item.id) && strings(item.evidenceIds) &&
    item.evidenceIds.length >= 2 && unique(item.evidenceIds) &&
    nonEmpty(item.title) && nonEmpty(item.summary) &&
    (item.unlocks === undefined || unlocks(item.unlocks)))) throw new Error('证据关联格式无效。')
  if (!facts.every((item) => record(item) && nonEmpty(item.id) &&
    nonEmpty(item.title) && nonEmpty(item.summary))) throw new Error('事实格式无效。')
  if (!puzzles.every((item) => record(item) && nonEmpty(item.id) && nonEmpty(item.title) &&
    (item.type === 'timeline' || item.type === 'short-input') && strings(item.evidenceIds) &&
    (item.type !== 'timeline' || (strings(item.expectedOrder) && item.expectedOrder.length === item.evidenceIds.length)) &&
    (item.type !== 'short-input' || (nonEmpty(item.answer) && item.answer.length <= 32)) &&
    (item.prompt === undefined || nonEmpty(item.prompt)) &&
    (item.unlocks === undefined || unlocks(item.unlocks)))) throw new Error('谜题格式无效。')

  const pageIds = new Set(pages.map((item) => item.id))
  const evidenceIds = new Set((evidence as EvidenceDefinition[]).map((item) => item.id))
  const relationIds = new Set((relations as RelationDefinition[]).map((item) => item.id))
  const factIds = new Set((facts as FactDefinition[]).map((item) => item.id))
  const puzzleIds = new Set((puzzles as PuzzleDefinition[]).map((item) => item.id))
  if (!unique(pages.map((item) => item.id)) || !unique(evidence.map((item) => item.id)) ||
    !unique(relations.map((item) => item.id)) || !unique(facts.map((item) => item.id)) ||
    !unique(puzzles.map((item) => item.id)) || !pageIds.has(value.startPageId) ||
    !pages.some((item) => item.kind === 'search')) throw new Error('Case ID 重复或缺少搜索起始页。')
  const validGate = (item?: UnlockConditions) => !item ||
    subset(item.evidenceIds, evidenceIds) && subset(item.relationIds, relationIds) &&
    subset(item.factIds, factIds) && subset(item.puzzleIds, puzzleIds)
  const validUnlocks = (item?: Unlocks) => !item ||
    subset(item.evidenceIds, evidenceIds) && subset(item.pageIds, pageIds) &&
    subset(item.factIds, factIds)
  for (const page of pages) {
    if (!subset(page.links?.map((item) => item.pageId), pageIds) || !validGate(page.unlockConditions) ||
      page.objects?.some((item) => (item.evidenceId && !evidenceIds.has(item.evidenceId)) ||
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
    if (!subset(item.evidenceIds, evidenceIds) || !validUnlocks(item.unlocks)) throw new Error(`关联 ${item.id} 的引用无效。`)
  }
  for (const item of puzzles as PuzzleDefinition[]) {
    if (!subset(item.evidenceIds, evidenceIds) || !subset(item.expectedOrder, evidenceIds) ||
      (item.expectedOrder && (!unique(item.expectedOrder) ||
        !item.expectedOrder.every((id) => item.evidenceIds.includes(id)))) || !validUnlocks(item.unlocks)) {
      throw new Error(`谜题 ${item.id} 的引用无效。`)
    }
  }
  return {
    schemaVersion: 2, id: value.id,
    title: value.id === 'demo-001' ? '旧演示案件（待替换）' : value.title,
    subtitle: value.id === 'demo-001' ? '仅供旧页面验证' : value.subtitle,
    briefing: value.id === 'demo-001' ? 'v0.1 旧演示内容，不能作为《寻人启事》剧情。' : value.briefing,
    objective: value.id === 'demo-001' ? '旧 Demo 不提供正式调查目标。' : value.objective,
    startPageId: value.startPageId,
    status: value.id === 'demo-001' ? 'placeholder' : value.status === 'developer-mock' ? 'developer-mock' :
      value.status === 'placeholder' ? 'placeholder' : 'ready',
    pages, evidence: evidence as EvidenceDefinition[], relations: relations as RelationDefinition[],
    facts: facts as FactDefinition[], puzzles: puzzles as PuzzleDefinition[],
  }
}

async function fetchCase(path: string): Promise<GameCase> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`Case 加载失败：${response.status}`)
  return parseCase(await response.json())
}
export function loadDefaultCase(): Promise<GameCase> { return fetchCase('cases/developer/mock-case.json') }
export function loadDemoCase(): Promise<GameCase> { return fetchCase('cases/demo/case.json') }
