import type { CasePage } from './case'

export function getThreadStats(thread: CasePage) {
  const replies = thread.objects?.filter((item) => item.type === 'reply') || []
  return {
    replyCount: replies.length,
    lastReplyAt: replies.flatMap((item) => item.timestamp ? [item.timestamp] : []).sort().at(-1),
  }
}

export function getProfileActivity(pages: CasePage[], name: string) {
  const activity = pages.flatMap((page) => {
    const posts = (page.kind === 'forum-thread' || (page.layout === 'echo' && !page.directory)) && page.author === name ?
      [{ id: page.id, pageId: page.id, title: page.title, timestamp: page.date, body: page.body, kind: '发帖' }] : []
    const replies = (page.objects || []).filter((item) => item.type === 'reply' && item.author === name)
      .map((item) => ({ id: `${page.id}/${item.id}`, pageId: page.id, title: page.title,
        timestamp: item.timestamp, body: item.body || [], kind: '回复' }))
    return [...posts, ...replies]
  })
  return [...new Set(activity.map((item) => item.pageId))].map((pageId) => {
    const entries = activity.filter((item) => item.pageId === pageId)
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    return { ...entries[0], kind: [...new Set(entries.map((item) => item.kind))].join(' / '),
      body: entries[0].body }
  }).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
}

export function getSiteHome(page: CasePage, pages: CasePage[]) {
  return page.siteId ? pages.find((item) => item.siteId === page.siteId && item.directory) : undefined
}

export function getObjectTargets(page: CasePage) {
  return (page.objects || []).flatMap((item) => item.links?.map((link) => link.pageId) || [])
}

export function getSiteNavigation(page: CasePage, pages: CasePage[]) {
  const home = getSiteHome(page, pages)
  const primary = new Set([...getObjectTargets(page), ...(page.links || []).map((link) => link.pageId)])
  return page.siteId ? pages.filter((item) => item.siteId === page.siteId && item.directory &&
    item.id !== page.id && item.id !== home?.id && !primary.has(item.id)) : []
}

export function getPageLinks(page: CasePage, pages: CasePage[]) {
  const excluded = new Set([page.id, getSiteHome(page, pages)?.id, ...getObjectTargets(page),
    ...getSiteNavigation(page, pages).map((item) => item.id)])
  if (page.kind === 'profile') getProfileActivity(pages, page.author || '').forEach((item) => excluded.add(item.pageId))
  return (page.links || []).filter((link) => {
    if (excluded.has(link.pageId)) return false
    excluded.add(link.pageId)
    return true
  })
}

export function getBlogEntries(page: CasePage, pages: CasePage[]) {
  return pages.filter((item) => item.siteId === page.siteId && item.kind === 'blog' && !item.directory &&
    item.searchIndex?.status !== 'legacy').sort((a, b) => (a.date || '').localeCompare(b.date || ''))
}
