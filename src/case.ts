export type PageKind = 'search' | 'forum' | 'profile' | 'blog'

export interface CaseLink {
  label: string
  pageId: string
}

export interface PageDetails {
  section?: string
  floor?: string
  registeredAt?: string
  lastOnline?: string
  signature?: string
  views?: string
  replies?: string
}

export interface CasePage {
  id: string
  kind: PageKind
  title: string
  url: string
  body: string[]
  author?: string
  date?: string
  subtitle?: string
  siteName?: string
  tags?: string[]
  links?: CaseLink[]
  details?: PageDetails
}

export interface GameCase {
  id: string
  title: string
  subtitle: string
  briefing: string
  objective: string
  startPageId: string
  status: 'placeholder' | 'ready'
  pages: CasePage[]
}

const pageKinds = new Set<PageKind>(['search', 'forum', 'profile', 'blog'])
const detailFields: (keyof PageDetails)[] = [
  'section', 'floor', 'registeredAt', 'lastOnline', 'signature', 'views', 'replies',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseCase(value: unknown): GameCase {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.title) ||
    !nonEmpty(value.subtitle) || !nonEmpty(value.briefing) || !nonEmpty(value.objective) ||
    !nonEmpty(value.startPageId) || !Array.isArray(value.pages) ||
    (value.status !== undefined && value.status !== 'placeholder' && value.status !== 'ready')) {
    throw new Error('Case 文件缺少必要字段。请参考 cases/template/case.json。')
  }

  const pages: CasePage[] = value.pages.map((item: unknown, index: number) => {
    if (!isRecord(item) || !nonEmpty(item.id) || !nonEmpty(item.title) || !nonEmpty(item.url) ||
      !pageKinds.has(item.kind as PageKind) || !Array.isArray(item.body) ||
      !item.body.every(nonEmpty)) {
      throw new Error(`第 ${index + 1} 个页面格式无效。`)
    }
    for (const field of ['author', 'date', 'subtitle', 'siteName']) {
      if (item[field] !== undefined && !nonEmpty(item[field])) {
        throw new Error(`页面 ${item.id} 的 ${field} 格式无效。`)
      }
    }
    if (item.tags !== undefined && (!Array.isArray(item.tags) || !item.tags.every(nonEmpty))) {
      throw new Error(`页面 ${item.id} 的标签格式无效。`)
    }
    if (item.links !== undefined && (!Array.isArray(item.links) ||
      !item.links.every((link: unknown) => isRecord(link) && nonEmpty(link.label) && nonEmpty(link.pageId)))) {
      throw new Error(`页面 ${item.id} 的链接格式无效。`)
    }
    if (item.details !== undefined) {
      if (!isRecord(item.details)) {
        throw new Error(`页面 ${item.id} 的站点信息格式无效。`)
      }
      const details = item.details
      if (detailFields.some((field) => details[field] !== undefined && !nonEmpty(details[field]))) {
        throw new Error(`页面 ${item.id} 的站点信息格式无效。`)
      }
    }
    return item as unknown as CasePage
  })

  const ids = new Set(pages.map((page) => page.id))
  if (ids.size !== pages.length || !ids.has(value.startPageId)) {
    throw new Error('页面 ID 不能重复，起始页面必须存在。')
  }
  if (!pages.some((page) => page.kind === 'search')) {
    throw new Error('Case 至少需要一个搜索页面。')
  }
  for (const page of pages) {
    if (page.links?.some((link) => !ids.has(link.pageId))) {
      throw new Error(`页面 ${page.id} 引用了不存在的页面。`)
    }
  }

  const legacyDemo = value.id === 'demo-001'
  return {
    id: value.id,
    title: legacyDemo ? '旧演示案件（待替换）' : value.title,
    subtitle: legacyDemo ? '仅供页面和交互验证' : value.subtitle,
    briefing: legacyDemo ? '这是 v0.1 的旧演示内容，案件文本将在下一阶段单独重写。' : value.briefing,
    objective: legacyDemo ? '自由浏览、搜索、摘录并写下推测；当前旧案例不提供正式结论。' : value.objective,
    startPageId: value.startPageId,
    status: value.status === 'placeholder' || value.id === 'demo-001' ? 'placeholder' : 'ready',
    pages,
  }
}

export async function loadDemoCase(): Promise<GameCase> {
  const response = await fetch(`${import.meta.env.BASE_URL}cases/demo/case.json`)
  if (!response.ok) throw new Error(`Demo Case 加载失败：${response.status}`)
  return parseCase(await response.json())
}
