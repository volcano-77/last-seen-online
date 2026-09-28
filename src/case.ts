export type PageKind = 'search' | 'forum' | 'profile' | 'blog'

export interface CaseLink {
  label: string
  pageId: string
}

export interface CasePage {
  id: string
  kind: PageKind
  title: string
  url: string
  author?: string
  date?: string
  subtitle?: string
  tags?: string[]
  body: string[]
  links?: CaseLink[]
  clueIds?: string[]
}

export interface CaseClue {
  id: string
  title: string
  description: string
  sourcePageId: string
  category: 'identity' | 'timeline' | 'location' | 'connection'
}

export interface GameCase {
  id: string
  title: string
  subtitle: string
  briefing: string
  objective: string
  startPageId: string
  pages: CasePage[]
  clues: CaseClue[]
}

const pageKinds = new Set<PageKind>(['search', 'forum', 'profile', 'blog'])
const clueCategories = new Set<CaseClue['category']>(['identity', 'timeline', 'location', 'connection'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseCase(value: unknown): GameCase {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.title) ||
    !nonEmpty(value.subtitle) || !nonEmpty(value.briefing) || !nonEmpty(value.objective) ||
    !nonEmpty(value.startPageId) || !Array.isArray(value.pages) || !Array.isArray(value.clues)) {
    throw new Error('Case 文件缺少必要字段。请参考 cases/template/case.json。')
  }

  const pages: CasePage[] = value.pages.map((item, index) => {
    if (!isRecord(item) || !nonEmpty(item.id) || !nonEmpty(item.title) || !nonEmpty(item.url) ||
      !pageKinds.has(item.kind as PageKind) || !Array.isArray(item.body) ||
      !item.body.every(nonEmpty)) {
      throw new Error(`第 ${index + 1} 个页面格式无效。`)
    }
    if (item.links !== undefined && (!Array.isArray(item.links) ||
      !item.links.every((link: unknown) => isRecord(link) && nonEmpty(link.label) && nonEmpty(link.pageId)))) {
      throw new Error(`页面 ${item.id} 的链接格式无效。`)
    }
    if (item.clueIds !== undefined && (!Array.isArray(item.clueIds) || !item.clueIds.every(nonEmpty))) {
      throw new Error(`页面 ${item.id} 的线索引用格式无效。`)
    }
    return item as unknown as CasePage
  })

  const clues: CaseClue[] = value.clues.map((item, index) => {
    if (!isRecord(item) || !nonEmpty(item.id) || !nonEmpty(item.title) ||
      !nonEmpty(item.description) || !nonEmpty(item.sourcePageId) ||
      !clueCategories.has(item.category as CaseClue['category'])) {
      throw new Error(`第 ${index + 1} 条线索格式无效。`)
    }
    return item as unknown as CaseClue
  })

  const pageIds = new Set(pages.map((page) => page.id))
  const clueIds = new Set(clues.map((clue) => clue.id))
  if (pageIds.size !== pages.length || clueIds.size !== clues.length) {
    throw new Error('页面或线索 ID 不能重复。')
  }
  if (!pageIds.has(value.startPageId)) {
    throw new Error('起始页面不存在。')
  }
  for (const page of pages) {
    if (page.links?.some((link) => !pageIds.has(link.pageId)) ||
      page.clueIds?.some((id) => !clueIds.has(id))) {
      throw new Error(`页面 ${page.id} 引用了不存在的页面或线索。`)
    }
  }
  for (const clue of clues) {
    if (!pageIds.has(clue.sourcePageId) ||
      !pages.find((page) => page.id === clue.sourcePageId)?.clueIds?.includes(clue.id)) {
      throw new Error(`线索 ${clue.id} 没有关联到来源页面。`)
    }
  }
  return value as unknown as GameCase
}

export async function loadDemoCase(): Promise<GameCase> {
  const response = await fetch(`${import.meta.env.BASE_URL}cases/demo/case.json`)
  if (!response.ok) throw new Error(`Demo Case 加载失败：${response.status}`)
  return parseCase(await response.json())
}
