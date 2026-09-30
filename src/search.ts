import type { CasePage } from './case'

export interface SearchHit {
  id: string; pageId: string; anchorId?: string; title: string; snippet: string
  match: '标题' | '正文' | '回复' | '用户名' | '属性 / 索引'
  author?: string; timestamp?: string; floor?: number
  indexStatus?: 'current' | 'orphan' | 'legacy'
}
const contains = (text: string | undefined, term: string) => Boolean(text?.toLowerCase().includes(term))
function excerpt(text: string, term: string) {
  const index = text.toLowerCase().indexOf(term), start = Math.max(0, index - 38)
  return `${start ? '…' : ''}${text.slice(start, start + 150)}${text.length > start + 150 ? '…' : ''}`
}
export function searchPages(pages: CasePage[], query: string, scope: 'site' | 'global', siteId?: string): SearchHit[] {
  const term = query.trim().toLowerCase()
  if (!term) return []
  return pages.filter((page) => page.searchable !== false && !page.directory && !page.offlinePageId &&
    page.kind !== 'search' && page.kind !== 'portal' && !page.snapshot && page.kind !== 'cache' &&
    (scope === 'global' || page.siteId === siteId && (page.kind === 'forum-thread' || page.kind === 'website')))
    .flatMap((page) => {
      const hits: SearchHit[] = []
      const base = { pageId: page.id, title: page.title, author: page.author, timestamp: page.date, indexStatus: page.searchIndex?.status }
      const body = page.body.find((line) => contains(line, term))
      if (contains(page.title, term)) hits.push({ ...base, id: `${page.id}/title`, anchorId: page.kind === 'forum-thread' ? 'thread-main' : undefined,
        snippet: page.title, match: '标题', floor: page.kind === 'forum-thread' ? 1 : undefined })
      else if (body) hits.push({ ...base, id: `${page.id}/body`, anchorId: page.kind === 'forum-thread' ? 'thread-main' : undefined,
        snippet: excerpt(body, term), match: '正文', floor: page.kind === 'forum-thread' ? 1 : undefined })
      else if (contains(page.author, term)) hits.push({ ...base, id: `${page.id}/author`, snippet: page.author!, match: '用户名' })
      let replyIndex = 0
      for (const item of page.objects || []) {
        if (item.type === 'reply') replyIndex++
        const line = item.body?.find((line) => contains(line, term))
        const matchedAuthor = contains(item.author, term)
        const metadata = Object.entries(item.metadata || {}).map(([key, value]) => `${key}：${value}`).find((text) => contains(text, term))
        if (!line && !matchedAuthor && !contains(item.title, term) && !metadata) continue
        hits.push({ ...base, id: `${page.id}/${item.id}`, anchorId: item.id,
          match: matchedAuthor && !line ? '用户名' : item.type === 'reply' ? '回复' : metadata ? '属性 / 索引' : '正文',
          snippet: excerpt(line || metadata || (matchedAuthor ? item.author! : item.title), term),
          author: item.author || item.metadata?.['操作者'] || item.metadata?.['账号'] || page.author,
          timestamp: item.timestamp || page.date,
          floor: item.type === 'reply' && page.kind === 'forum-thread' ? replyIndex + 1 : undefined,
        })
      }
      if (!hits.length && scope === 'global') {
        const text = [page.url, ...Object.values(page.metadata || {}), ...(page.searchTerms || []), ...(page.searchIndex?.aliases || [])]
          .find((text) => contains(text, term))
        if (text) hits.push({ ...base, id: `${page.id}/index`, snippet: excerpt(text, term), match: '属性 / 索引' })
      }
      return hits
    })
}
