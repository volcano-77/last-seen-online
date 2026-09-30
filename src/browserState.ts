import type { CasePage } from './case'

export interface PageState {
  searchInput?: string
  searchQuery?: string
  searchSubmitted?: boolean
  channel?: string
  openObjectIds?: string[]
}
export interface HistoryEntry {
  id: string
  pageId: string
  url: string
  scrollY: number
  state: PageState
  anchorId?: string
}
export interface BrowserTab {
  id: string
  title: string
  history: HistoryEntry[]
  historyIndex: number
  lastUsed: number
  openerTabId?: string
}
export interface BrowserSession { tabs: BrowserTab[]; activeTabId: string }
export interface NavigateOptions { newTab?: boolean; anchorId?: string; state?: PageState }

export function makeEntry(page: CasePage, options: NavigateOptions = {}): HistoryEntry {
  return { id: crypto.randomUUID(), pageId: page.id, url: page.url, scrollY: 0,
    state: options.state || {}, anchorId: options.anchorId }
}
export function makeTab(page: CasePage, options: NavigateOptions = {}): BrowserTab {
  return { id: crypto.randomUUID(), title: page.title, history: [makeEntry(page, options)], historyIndex: 0, lastUsed: Date.now() }
}
export function activeTab(session: BrowserSession) {
  return session.tabs.find((tab) => tab.id === session.activeTabId) || session.tabs[0]
}
export function currentEntry(session: BrowserSession) {
  const tab = activeTab(session)
  return tab.history[tab.historyIndex]
}
const nextUse = (session: BrowserSession) => Math.max(Date.now(), ...session.tabs.map((tab) => tab.lastUsed + 1))
export function updateEntry<T extends BrowserSession>(session: T, patch: Partial<HistoryEntry>): T {
  return { ...session, tabs: session.tabs.map((tab) => tab.id !== session.activeTabId ? tab :
    { ...tab, history: tab.history.map((entry, index) => index === tab.historyIndex ? { ...entry, ...patch } : entry) }) }
}
export function focusTab<T extends BrowserSession>(session: T, id: string): T {
  if (!session.tabs.some((tab) => tab.id === id)) return session
  return { ...session, activeTabId: id, tabs: session.tabs.map((tab) => tab.id === id ? { ...tab, lastUsed: nextUse(session) } : tab) }
}
export function closeTab<T extends BrowserSession>(session: T, id: string): T {
  if (session.tabs.length === 1) return session
  const tabs = session.tabs.filter((tab) => tab.id !== id).map((tab) => tab.openerTabId === id ? { ...tab, openerTabId: undefined } : tab)
  const activeTabId = session.activeTabId === id ? [...tabs].sort((a, b) => b.lastUsed - a.lastUsed)[0].id : session.activeTabId
  return focusTab({ ...session, tabs, activeTabId }, activeTabId)
}
export function openPage<T extends BrowserSession>(session: T, target: CasePage, newTab: boolean, options: NavigateOptions = {}): T {
  if (newTab) {
    const existing = session.tabs.find((tab) => tab.history[tab.historyIndex].pageId === target.id &&
      (!options.state || JSON.stringify(tab.history[tab.historyIndex].state) === JSON.stringify(options.state)))
    if (existing) {
      const focused = focusTab(session, existing.id)
      return options.anchorId ? updateEntry(focused, { id: crypto.randomUUID(), anchorId: options.anchorId, scrollY: 0 }) : focused
    }
    const tab = { ...makeTab(target, options), openerTabId: session.activeTabId, lastUsed: nextUse(session) }
    return { ...session, tabs: [...session.tabs, tab], activeTabId: tab.id }
  }
  const current = currentEntry(session)
  if (current.pageId === target.id && !options.anchorId && !options.state) return session
  return { ...session, tabs: session.tabs.map((tab) => tab.id !== session.activeTabId ? tab : {
    ...tab, title: target.title, history: [...tab.history.slice(0, tab.historyIndex + 1), makeEntry(target, options)],
    historyIndex: tab.historyIndex + 1, lastUsed: nextUse(session),
  }) }
}
export function travelTab<T extends BrowserSession>(session: T, direction: number, pages: CasePage[]): T {
  const tab = activeTab(session), index = tab.historyIndex + direction
  if (index < 0 && direction < 0 && tab.openerTabId) return focusTab(session, tab.openerTabId)
  if (index < 0 || index >= tab.history.length) return session
  return { ...session, tabs: session.tabs.map((item) => item.id === tab.id ? { ...item, historyIndex: index,
    title: pages.find((page) => page.id === item.history[index].pageId)?.title || item.title } : item) }
}
export function siteKey(page: CasePage) { return page.siteId || page.url.split('://')[0] }
