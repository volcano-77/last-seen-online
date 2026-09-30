import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CaseMedia, CasePage, PageObject, PuzzleDefinition } from './case'
import { getBlogEntries, getPageLinks, getProfileActivity, getSiteHome, getSiteNavigation, getThreadStats } from './siteData'
import type { NavigateOptions, PageState } from './browserState'
import { searchPages } from './search'
import type { SearchHit } from './search'
import './Sites.css'

type Point = { x: number; y: number }
export interface SiteProps {
  page: CasePage; pages: CasePage[]; userProfiles: Record<string, string>; visitedPageIds: string[]
  onNavigate: (id: string, options?: NavigateOptions) => void; onDiscover: (id: string, point?: Point) => void
  pageState: PageState; onStateChange: (patch: Partial<PageState>) => void
  completedPuzzleIds: string[]; puzzles: PuzzleDefinition[]
  onSolve: (id: string, answer: string) => boolean
  mediaCatalog: CaseMedia[]; onViewMedia: (id: string) => void
  onCompareImage: (media: CaseMedia, referenceId: string, point: Point) => boolean
}
const pointAt = (element: HTMLElement) => { const rect = element.getBoundingClientRect(); return { x: rect.left, y: rect.bottom + 6 } }
const src = (media: CaseMedia) => `${import.meta.env.BASE_URL}${media.src}`

const Navigation = createContext<Pick<SiteProps, 'visitedPageIds' | 'onNavigate'>>({ visitedPageIds: [], onNavigate: () => {} })
const Disclosures = createContext<Pick<SiteProps, 'pageState' | 'onStateChange'>>({ pageState: {}, onStateChange: () => {} })
function useObjectDisclosure(id: string) {
  const context = useContext(Disclosures), ids = context.pageState.openObjectIds || []
  return [ids.includes(id), (open: boolean) => context.onStateChange({ openObjectIds: open ? [...new Set([...ids, id])] : ids.filter((item) => item !== id) })] as const
}
function PageLink({ pageId, children, className = 'text-link', options }: { pageId: string; children: ReactNode; className?: string; options?: NavigateOptions }) {
  const navigation = useContext(Navigation)
  return <a href={`#${encodeURIComponent(pageId)}`} className={`${className}${navigation.visitedPageIds.includes(pageId) ? ' is-visited' : ''}`}
    onClick={(event) => { event.preventDefault(); navigation.onNavigate(pageId, options) }}>{children}</a>
}
function Links({ page, pages }: Pick<SiteProps, 'page' | 'pages'>) {
  const links = getPageLinks(page, pages)
  return links.length ? <div className="site-links">{links.map((link) => <PageLink key={link.pageId} pageId={link.pageId}>{link.label}</PageLink>)}</div> : null
}
function SiteName(props: SiteProps) {
  const home = getSiteHome(props.page, props.pages)
  const name = home?.siteName || props.page.siteName || home?.title || props.page.title
  return <h1>{home ? <PageLink className="site-name" pageId={home.id} options={{ newTab: false, state: {} }}>{name}</PageLink> : name}</h1>
}
function Breadcrumb(props: SiteProps & { section?: string }) {
  const home = getSiteHome(props.page, props.pages)
  const name = home?.siteName || props.page.siteName || home?.title || props.page.title
  const section = props.section || props.page.details?.section || (props.page.kind === 'profile' ? '会员资料' : undefined)
  return <div className="site-breadcrumb" aria-label="当前位置">{name}{section && <> &gt; {section}</>}{props.page.id !== home?.id && props.page.title !== name && <> &gt; <span aria-current="page">{props.page.title}</span></>}</div>
}
function User({ name, ...props }: SiteProps & { name: string }) {
  const profile = props.userProfiles[name]
  return profile ? <PageLink className="username" pageId={profile}>{name}</PageLink> : <span className="username">{name}</span>
}
function Metadata({ values }: { values?: Record<string, string> }) {
  return values ? <dl className="metadata">{Object.entries(values).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : null
}
function Time({ item, label, onDiscover }: { item: PageObject; label?: string; onDiscover: SiteProps['onDiscover'] }) {
  const [open, setOpen] = useObjectDisclosure(item.id)
  return <div className="time-detail"><button className="timestamp" aria-expanded={open} onClick={(event) => {
    setOpen(!open)
    if (!open && item.evidenceId) onDiscover(item.evidenceId, pointAt(event.currentTarget))
  }}>{label || item.timestamp}</button>{open && <Metadata values={item.metadata || { '时间': item.timestamp || '未记录' }} />}</div>
}
function Media({ media, ...props }: SiteProps & { media?: CaseMedia }) {
  const [open, setOpen] = useState(false), [zoom, setZoom] = useState(false)
  const [referenceId, setReferenceId] = useState(''), [compare, setCompare] = useState(false), [message, setMessage] = useState('')
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
  if (!media) return null
  const references = props.mediaCatalog.filter((item) => item.id !== media.id)
  return <figure className="site-photo">
    <button className="photo-open" aria-label={`查看原图：${media.alt}`} onClick={() => {
      setOpen(true); setZoom(false); setMessage(''); if (media.id) props.onViewMedia(media.id)
    }}><img src={src(media)} alt={media.alt} loading="lazy" /></button><figcaption>{media.caption || media.alt}</figcaption>
    {open && <div className="image-backdrop" onClick={() => setOpen(false)}><section className="image-viewer" role="dialog" aria-modal="true" aria-label="图片查看器" onClick={(event) => event.stopPropagation()}>
      <header><b>{media.filename || media.alt}</b><button aria-label="关闭图片" onClick={() => setOpen(false)}>×</button></header>
      <div className={`image-comparison${compare ? ' comparing' : ''}`}><div className={`image-stage${zoom ? ' zoomed' : ''}`}><button aria-label="放大或缩小图片" onClick={() => setZoom(!zoom)}><img src={src(media)} alt={media.alt} /></button></div>
        {compare && referenceId && <div className="reference-image"><img src={src(references.find((item) => item.id === referenceId)!)} alt={references.find((item) => item.id === referenceId)!.alt} /><small>{references.find((item) => item.id === referenceId)?.filename}</small></div>}
      </div>
      <div className="image-properties"><span>文件：{media.filename || '未记录'}</span><span>尺寸：{media.width || '—'} × {media.height || '—'}</span>{media.takenAt && <span>拍摄时间：{media.takenAt}</span>}{media.uploadedAt && <span>上传时间：{media.uploadedAt}</span>}</div>
      <footer><button onClick={() => setZoom(!zoom)}>{zoom ? '适合窗口' : '原尺寸'}</button><button aria-expanded={compare} onClick={() => setCompare(!compare)}>对照浏览过的图片</button>
        {compare && <div className="image-match"><label>对照图片 <select aria-label="对照图片" value={referenceId} onChange={(event) => { setReferenceId(event.target.value); setMessage('') }}><option value="">选择已浏览的图片</option>{references.map((item) => <option key={item.id} value={item.id}>{item.filename || item.alt}</option>)}</select></label><button disabled={!referenceId} onClick={(event) => {
          const correct = props.onCompareImage(media, referenceId, pointAt(event.currentTarget)); setMessage(correct ? '对照已保留。' : '尚不能确认照片中是同一人物。')
        }}>确认同一人物</button><span role="status">{message}</span></div>}
      </footer>
    </section></div>}
  </figure>
}
function Access({ children, ...props }: SiteProps & { children: ReactNode }) {
  const [answer, setAnswer] = useState(''), [wrong, setWrong] = useState(false)
  const puzzle = props.puzzles.find((item) => item.id === props.page.accessPuzzleId)
  if (!puzzle || props.completedPuzzleIds.includes(puzzle.id)) return children
  return <section className="private-access"><div className="private-icon">▧</div><h3>{props.page.kind === 'blog' ? '这篇日志仅好友可见' : '主人设置了访问问题'}</h3><p>{puzzle.prompt}</p><form onSubmit={(event) => { event.preventDefault(); setWrong(!props.onSolve(puzzle.id, answer)) }}>
    <label>回答 <input aria-label={puzzle.prompt} autoComplete="off" maxLength={24} value={answer} onChange={(event) => setAnswer(event.target.value)} /></label><button>提交</button></form>{wrong && <p role="status" className="access-error">回答不正确。</p>}<small>通过验证后可浏览本页。返回其他网页不会锁定访问次数。</small></section>
}
function ObjectRow({ item, ...props }: SiteProps & { item: PageObject }) {
  const [open, setOpen] = useObjectDisclosure(item.id)
  if (item.type === 'log-entry' || (item.type === 'reply' && item.metadata)) return <div className="log-entry" id={item.id}>
    <button className="log-row" aria-expanded={open} onClick={(event) => {
      setOpen(!open); if (!open && item.evidenceId) props.onDiscover(item.evidenceId, pointAt(event.currentTarget))
    }}><time>{item.timestamp}</time><span>{item.title}</span><span>{item.body?.[0]}</span></button>{open && <Metadata values={item.metadata} />}</div>
  const link = item.type === 'attachment' ? undefined : item.links?.[0]
  return <section className="content-entry" id={item.id}><h3>{link ? <PageLink pageId={link.pageId}>{props.pages.find((page) => page.id === link.pageId)?.title || item.title}</PageLink> : item.title}</h3>
    {item.timestamp && <small>{item.timestamp}</small>}{item.body?.map((line, index) => <p key={index}>{line}</p>)}
    <Media {...props} media={item.media} />
    {item.metadata && <Metadata values={item.metadata} />}
    {item.links?.slice(link ? 1 : 0).map((link) => <PageLink key={link.pageId} pageId={link.pageId}>{link.label}</PageLink>)}
  </section>
}
function SiteNav(props: SiteProps) {
  const pages = getSiteNavigation(props.page, props.pages)
  return pages.length ? <nav className="site-nav">{pages.map((item) => <PageLink key={item.id} pageId={item.id}>{item.title}</PageLink>)}</nav> : null
}
function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim()
  if (!term) return text
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) => part.toLowerCase() === term.toLowerCase() ? <mark key={index}>{part}</mark> : part)
}
function SearchResults({ hits, query, newTab }: { hits: SearchHit[]; query: string; newTab: boolean }) {
  return <div className="fulltext-results">{hits.map((hit) => <article className="fulltext-hit" key={hit.id}>
    <h3><PageLink pageId={hit.pageId} options={{ newTab, anchorId: hit.anchorId }}>{hit.title}</PageLink></h3>
    <small>命中{hit.match}{hit.floor && ` · ${hit.floor}楼`}　{hit.author || '作者未记录'}　{hit.timestamp || '时间未记录'}{hit.indexStatus === 'orphan' && '　旧索引 · 未列入网站目录'}{hit.indexStatus === 'legacy' && '　旧索引'}</small>
    <p>“<Highlight text={hit.snippet} query={query} />”</p>
  </article>)}{!hits.length && <p>没有找到匹配的公开记录。</p>}</div>
}
function ForumSearch(props: SiteProps) {
  const input = props.pageState.searchInput || ''
  return <form className="forum-search" onSubmit={(event) => { event.preventDefault(); props.onStateChange({ searchQuery: input.trim(), searchSubmitted: Boolean(input.trim()) }) }}><label>站内搜索 <input aria-label="站内搜索" maxLength={24} value={input} onChange={(event) => props.onStateChange({ searchInput: event.target.value })} /></label><button>搜索</button>
    {props.pageState.searchSubmitted && <button type="button" onClick={() => props.onStateChange({ searchInput: '', searchQuery: '', searchSubmitted: false })}>返回主题列表</button>}</form>
}
function Snapshot(props: SiteProps) {
  const entry = props.page.objects?.find((item) => item.type === 'cache-entry' && item.evidenceId)
  const captured = useRef(false), bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!entry?.evidenceId || captured.current) return
    captured.current = true
    props.onDiscover(entry.evidenceId, bar.current ? pointAt(bar.current) : undefined)
  }, [entry, props])
  if (!props.page.snapshot && props.page.kind !== 'cache') return null
  return <div className="snapshot-bar" ref={bar}>▤ 网页快照　<span>原址：{props.page.snapshot?.originalUrl || props.page.url}</span><span>抓取：{props.page.snapshot?.capturedAt || entry?.timestamp || props.page.date}</span>
    {props.page.siteId !== 'archive' && <PageLink pageId="archive_service">其他存档</PageLink>}</div>
}
export function SearchSite({ page, pages, pageState, onStateChange, onNavigate, visitedPageIds }: Pick<SiteProps, 'page' | 'pages' | 'pageState' | 'onStateChange' | 'onNavigate' | 'visitedPageIds'>) {
  const input = pageState.searchInput || '', query = pageState.searchQuery || ''
  const results = pageState.searchSubmitted ? searchPages(pages, query, 'global') : []
  return <Navigation.Provider value={{ onNavigate, visitedPageIds }}><div className="search-site"><header><h1><a className="site-name" href="#search_home" onClick={(event) => { event.preventDefault(); onStateChange({ searchInput: '', searchQuery: '', searchSubmitted: false }) }}>{page.title.replace(/搜索$/, '')}<span>搜</span></a></h1><small>网页索引保留部分旧页面与旧用户名。</small></header><div className="site-breadcrumb">{page.title}{pageState.searchSubmitted && <> &gt; 搜索结果</>}</div><form onSubmit={(event) => { event.preventDefault(); onStateChange({ searchQuery: input.trim(), searchSubmitted: Boolean(input.trim()) }) }}><input aria-label="搜索关键词" maxLength={32} value={input} onChange={(event) => onStateChange({ searchInput: event.target.value })} /><button>搜索</button></form>
    {pageState.searchSubmitted && <><div className="search-info">搜索「{query}」，找到 {results.length} 条索引记录</div><SearchResults hits={results} query={query} newTab /></>}<footer>{page.title} · 网页索引</footer></div></Navigation.Provider>
}
function Portal(props: SiteProps) {
  return <div className="navigation-home"><h1>{props.page.siteName}网址导航</h1><Breadcrumb {...props} /><p>常用站点</p><Links {...props} /><hr /><PageLink pageId="search_home">打开南城搜索</PageLink><small>网页链接按保存时的状态保留。</small></div>
}
function ForumMember(props: SiteProps & { name: string; owner?: boolean }) {
  const profile = props.pages.find((item) => item.id === props.userProfiles[props.name])
  const details = props.owner ? props.page.details || profile?.details : profile?.details
  const count = props.pages.reduce((total, page) => total + (page.author === props.name ? 1 : 0) +
    (page.objects || []).filter((item) => item.type === 'reply' && item.author === props.name).length, 0)
  const color = [...props.name].reduce((value, char) => value + char.charCodeAt(0), 0) % 4
  return <aside className="forum-member"><div className={`forum-avatar avatar-${color}`} aria-hidden="true">{props.name.slice(0, 1)}</div>
    <User {...props} name={props.name} /><span className="member-rank">{props.page.skin === 'campus' ? '校园站友' : '注册会员'}</span>
    <small>发言：{count}</small><small>注册：{details?.registeredAt || '旧站会员'}</small>{details?.lastOnline && <small>最后在线：{details.lastOnline}</small>}</aside>
}
function ThreadPosition(props: SiteProps) {
  const replies = props.page.objects?.filter((item) => item.type === 'reply') || []
  return <div className="forum-page-strip"><span>共 {replies.length + 1} 楼 · 完整归档</span><span className="page-number">1</span>
    <PageLink pageId={props.page.id} options={{ newTab: false, anchorId: 'thread-main' }}>首楼</PageLink>
    {!!replies.length && <PageLink pageId={props.page.id} options={{ newTab: false, anchorId: replies.at(-1)!.id }}>末楼</PageLink>}</div>
}
function Forum(props: SiteProps) {
  const { page } = props, campus = page.skin === 'campus'
  const timestamp = page.objects?.find((item) => item.type === 'timestamp')
  const threads = (page.objects || []).flatMap((item) => {
    const target = props.pages.find((thread) => thread.id === item.links?.[0]?.pageId)
    return target ? [target] : []
  })
  const sections = [...new Set(threads.flatMap((thread) => thread.details?.section ? [thread.details.section] : []))]
  const visibleThreads = threads.filter((thread) => !props.pageState.channel || thread.details?.section === props.pageState.channel)
    .sort((a, b) => (getThreadStats(b).lastReplyAt || b.date || '').localeCompare(getThreadStats(a).lastReplyAt || a.date || '') || a.title.localeCompare(b.title, 'zh-CN'))
  const hits = searchPages(props.pages, props.pageState.searchQuery || '', 'site', page.siteId)
  return <div className={`forum-site ${campus ? 'campus-forum' : 'life-forum'}`}>
    <header className="forum-header"><div><small className="forum-wordmark">{campus ? 'CAMPUS BBS · 校园站' : 'LIFE FORUM · 生活社区'}</small><SiteName {...props} /></div><span>{campus ? '校园交流 / BBS' : '城市闲谈 · 互助交流'}</span></header><SiteNav {...props} /><Breadcrumb {...props} />
    {page.layout !== 'index' && <h2 className="thread-title">{page.title}</h2>}
    {page.layout === 'index' ? <><p className="board-intro">{page.body.join(' ')}</p><nav className="board-sections" aria-label="论坛版块">{['', ...sections].map((section) => <button key={section} className={(props.pageState.channel || '') === section ? 'selected' : ''} onClick={() => props.onStateChange({ channel: section, searchSubmitted: false })}>{section || '全部主题'}</button>)}</nav><ForumSearch {...props} />{props.pageState.searchSubmitted ? <><p>找到 {hits.length} 条公开记录</p><SearchResults hits={hits} query={props.pageState.searchQuery || ''} newTab={false} /></> : <><div className="board-list-caption">主题列表 <small>按最后发言时间排列</small></div><table className="thread-list"><thead><tr><th>主题</th><th>回复</th><th>最后回复</th></tr></thead><tbody>{visibleThreads.map((thread) => {
      const stats = getThreadStats(thread)
      return <tr key={thread.id}><td><span className="thread-symbol" aria-hidden="true">▤</span> <PageLink pageId={thread.id}>{thread.title}</PageLink>{thread.details?.section && <p>{thread.details.section} · {thread.author}</p>}</td><td>{thread.kind === 'forum-thread' ? stats.replyCount : '—'}</td><td>{thread.kind === 'forum-thread' ? stats.lastReplyAt || '暂无回复' : '—'}</td></tr>
    })}</tbody></table><div className="forum-page-strip"><span>{visibleThreads.length} 个主题 · 完整归档</span><span className="page-number">1</span></div></>}</> :
      <><ThreadPosition {...props} /><div className="forum-floor" id="thread-main"><ForumMember {...props} name={page.author || '匿名'} owner /><article><div className="floor-meta">{timestamp ? <Time item={timestamp} label={`发表于 ${page.date}`} onDiscover={props.onDiscover} /> : <span>发表于 {page.date}</span>}<span>1#</span></div>{page.body.map((line, i) => <p key={i}>{line}</p>)}<Media {...props} media={page.media} /><div className="signature">{page.details?.signature || '这个人很懒，什么也没有留下。'}</div></article></div>
      {page.objects?.filter((item) => item.type === 'reply').map((item, index) => <div className="forum-floor reply" key={item.id} id={item.id}><ForumMember {...props} name={item.author || '匿名'} /><article><div className="floor-meta"><span>{item.timestamp}</span><span>{index + 2}#</span></div>{item.metadata?.['引用'] && <blockquote className="forum-quote"><small>引用 {item.metadata['引用作者'] || '原帖'} 的发言：</small><p>{item.metadata['引用']}</p></blockquote>}{item.body?.map((line, i) => <p key={i}>{line}</p>)}{item.links?.map((link) => <PageLink key={link.pageId} pageId={link.pageId}>{link.label}</PageLink>)}<div className="signature">{props.pages.find((p) => p.id === props.userProfiles[item.author || ''])?.details?.signature || '这个人很懒，什么也没有留下。'}</div></article></div>)}<ThreadPosition {...props} /></>}
    <Links {...props} /><footer>Powered by {campus ? 'CampusBBS' : 'LifeForum'}　|　旧帖只读</footer>
  </div>
}
function Profile(props: SiteProps) {
  const { page } = props
  const activity = getProfileActivity(props.pages.filter((item) => !item.accessPuzzleId || props.completedPuzzleIds.includes(item.accessPuzzleId)), page.author || '')
  return <div className={`forum-site ${page.skin === 'campus' ? 'campus-forum' : 'life-forum'}`}><header className="forum-header"><SiteName {...props} /><span>会员资料</span></header><SiteNav {...props} /><Breadcrumb {...props} />
    <h2>{page.author}的个人资料</h2><div className="member-sheet"><div className="forum-avatar">{page.author?.slice(0, 1)}</div><div><p>会员：{page.author}</p><p>注册：{page.details?.registeredAt || '旧站会员'}　最后在线：{page.details?.lastOnline || '未记录'}</p><p>签名：{page.details?.signature || '这个人很懒，什么也没有留下。'}</p><Links {...props} /></div></div>
    {page.body.map((line, i) => <p key={i}>{line}</p>)}<h3 className="profile-section">最近发帖 / 回复</h3>{activity.map((item) => <section className="content-entry" key={item.id}><h3><small>{item.kind}：</small><PageLink pageId={item.pageId}>{item.title}</PageLink></h3><small>{item.timestamp || '时间未记录'}</small>{item.body.slice(0, 1).map((line, index) => <p key={index}>{line}</p>)}</section>)}{!activity.length && <p>暂无可读取的公开发帖或回复。</p>}<footer>公开会员资料 · 不显示站内私信</footer></div>
}
function BlogCalendar({ entries, month }: { entries: CasePage[]; month: string }) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  const [year, number] = month.split('-').map(Number), first = new Date(Date.UTC(year, number - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate(), published = new Set(entries.filter((p) => p.date?.startsWith(month)).map((p) => Number(p.date?.slice(8, 10))))
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, index) => index - first + 1)
  return <table className="blog-calendar"><caption>{year} 年 {number} 月</caption><thead><tr>{['日', '一', '二', '三', '四', '五', '六'].map((day) => <th key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((day, column) => <td key={column} className={published.has(day) ? 'has-entry' : undefined}>{day > 0 && day <= days ? day : ''}</td>)}</tr>)}</tbody></table>
}
function Blog(props: SiteProps) {
  const { page } = props, timestamp = page.objects?.find((item) => item.type === 'timestamp')
  const entries = getBlogEntries(page, props.pages), index = entries.findIndex((item) => item.id === page.id)
  const previous = entries[index - 1], next = index >= 0 ? entries[index + 1] : undefined
  const months = [...new Set(entries.flatMap((item) => item.date ? [item.date.slice(0, 7)] : []))].sort().reverse()
  const month = props.pageState.channel || months[0] || ''
  const listed = entries.filter((item) => !props.pageState.channel || item.date?.startsWith(props.pageState.channel))
  const home = getSiteHome(page, props.pages)
  return <div className={`blog-site ${page.skin === 'zhao' ? 'zhao-blog' : 'summer-blog'}`}><header className="blog-header"><small>MY LITTLE SPACE</small><SiteName {...props} /><p>{page.subtitle || '慢慢写，慢慢过。'}</p></header><SiteNav {...props} /><Breadcrumb {...props} />
    <div className={`blog-columns${page.directory ? ' blog-home-columns' : ''}`}><article className="blog-article"><Access {...props}>
      <div className="blog-date">{timestamp ? <Time item={timestamp} label={`发表于 ${page.date}`} onDiscover={props.onDiscover} /> : page.date}</div><h2>{page.title}</h2>
      {page.body.map((line, i) => <p key={i}>{line}</p>)}<Media {...props} media={page.media} />
      {page.directory && <div className="blog-log-list"><h3 className="blog-section-title">✎ 日志{props.pageState.channel && ` / ${props.pageState.channel}`}</h3>{[...listed].reverse().map((item) => <section className="content-entry" key={item.id}><h3><PageLink pageId={item.id}>{item.title}</PageLink>{item.accessPuzzleId && !props.completedPuzzleIds.includes(item.accessPuzzleId) && <small>（好友可见）</small>}</h3><small>{item.date}</small></section>)}</div>}
      <div className={page.objects?.some((item) => item.type === 'photo') ? 'album-grid' : 'blog-entries'}>{page.objects?.filter((item) => item.type !== 'timestamp' && item.type !== 'reply').map((item) => <ObjectRow {...props} key={item.id} item={item} />)}</div>
      {page.objects?.some((item) => item.type === 'reply') && <section className="blog-comments" id="blog-guestbook"><h3>留言 ({page.objects.filter((item) => item.type === 'reply').length})</h3>{page.objects.filter((item) => item.type === 'reply').map((item) => <div key={item.id}><b>{item.author}</b> <small>{item.timestamp}</small>{item.body?.map((line, i) => <p key={i}>{line}</p>)}</div>)}</section>}
    </Access>{!page.directory && <Links {...props} />}{index >= 0 && <div className="blog-pagination">{previous && <PageLink pageId={previous.id}>上一篇：{previous.title}</PageLink>}{next && <PageLink pageId={next.id}>下一篇：{next.title}</PageLink>}</div>}</article>
    {page.directory && <aside className="blog-shelf"><section><h3>{page.skin === 'zhao' ? '♫ 小屋便签' : '✿ 本子扉页'}</h3><p>{home?.details?.signature || page.subtitle}</p><Links {...props} />{page.objects?.some((item) => item.type === 'reply') && <a className="text-link" href="#blog-guestbook" onClick={(event) => { event.preventDefault(); document.getElementById('blog-guestbook')?.scrollIntoView({ block: 'start' }) }}>看看留言</a>}</section>
      <section><h3>日历</h3><BlogCalendar entries={entries} month={month} /><small>着色日期留有日志</small></section>
      <section><h3>日志归档</h3><button className="text-link" onClick={() => props.onStateChange({ channel: '' })}>全部日志 ({entries.length})</button>{months.map((value) => <button className="text-link" key={value} onClick={() => props.onStateChange({ channel: value })}>{value} ({entries.filter((item) => item.date?.startsWith(value)).length})</button>)}</section>
    </aside>}</div><footer>个人小站　·　留言慢慢回</footer></div>
}
function NewsList({ items, title }: { items: CasePage[]; title: string }) {
  return <section className="portal-news-section"><h2>{title}</h2><ul>{items.map((item) => <li key={item.id}><span aria-hidden="true">·</span><PageLink pageId={item.id}>{item.title}</PageLink><time>{item.date?.slice(0, 10)}</time></li>)}</ul></section>
}
function News(props: SiteProps) {
  const { page } = props
  const home = getSiteHome(page, props.pages), channel = page.directory ? props.pageState.channel : page.details?.section
  const items = (home?.objects || page.objects || []).flatMap((item) => {
    const target = props.pages.find((p) => p.id === item.links?.[0]?.pageId)
    return target ? [target] : []
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const serviceIds = ['life_forum_index_ordinary_3', 'bbs_index_ordinary_1']
  return <div className={`news-site ${page.directory ? 'news-portal' : 'news-detail'}`}><div className="portal-masthead"><span>地方资讯 · 校园生活</span><time>页面日期：{(home?.date || page.date)?.slice(0, 10)}</time></div>
    <header><div className="portal-logo"><span aria-hidden="true">资讯</span><SiteName {...props} /></div><span>关注身边事<br />记录城市生活</span></header>
    <nav className="portal-channels" aria-label="资讯频道">{home && ['', '本地', '校园'].map((value) => <PageLink key={value} className={channel === value || !channel && !value ? 'selected' : ''} pageId={home.id} options={{ newTab: false, state: { channel: value } }}>{value || '首页'}</PageLink>)}<span>NEWS / 本地资讯</span></nav><Breadcrumb {...props} section={channel} />
    {page.directory ? <div className="portal-front"><div className="portal-banner"><strong>身边事 · 大家看</strong><span>本地 ｜ 校园 ｜ 生活</span><small>读新闻，聊生活</small></div><div className={`portal-news-columns${channel ? ' channel-only' : ''}`}>
      {channel ? <NewsList items={items.filter((item) => item.details?.section === channel)} title={`${channel}资讯`} /> : <>{['校园', '本地'].map((section) => <NewsList key={section} items={items.filter((item) => item.details?.section === section)} title={section === '校园' ? '校园资讯' : '本地新闻'} />)}</>}
    </div><div className="portal-services"><h3>◇ 生活服务</h3>{serviceIds.flatMap((id) => { const item = props.pages.find((p) => p.id === id); return item ? [<PageLink key={id} pageId={id}>{id.includes('life_') ? '公交出行交流' : '图书馆公告'}</PageLink>] : [] })}<span>社区信息由网友交流，请核对原帖日期。</span></div><p className="portal-intro">{page.body.join(' ')}</p></div> :
      <div className="news-columns single-column"><article><h2>{page.title}</h2><div className="news-meta">{page.date}　来源：本地资讯</div>{page.body.map((line, i) => <p key={i}>{line}</p>)}{page.objects?.map((item) => <ObjectRow {...props} key={item.id} item={item} />)}{home && <div className="news-return"><PageLink pageId={home.id} options={{ newTab: false, state: { channel } }}>返回{channel || '新闻'}频道</PageLink></div>}</article></div>}
    <footer>资讯网历史稿件　文章内容以当时报道为准</footer></div>
}
function Echo(props: SiteProps) {
  const { page } = props, timestamp = page.objects?.find((item) => item.type === 'timestamp')
  return <div className="echo-site"><header><span className="echo-logo" aria-hidden="true">回声</span><div><SiteName {...props} /><p>让消息传得更远，让家人早日团聚</p></div></header><SiteNav {...props} /><Breadcrumb {...props} />
    <div className="echo-content">{page.directory && <div className="echo-welcome"><strong>让每一条消息，多一份希望。</strong><span>公益寻人 · 公开转发 · 信息回访</span></div>}<h2>{page.title}</h2>{timestamp && <Time item={timestamp} label={`发布于 ${timestamp.timestamp}`} onDiscover={props.onDiscover} />}{page.body.map((line, i) => <p key={i}>{line}</p>)}<Media {...props} media={page.media} />
      <div className={page.directory ? 'echo-directory' : ''}>{page.objects?.filter((item) => item.type !== 'timestamp').map((item) => <ObjectRow {...props} key={item.id} item={item} />)}</div><Links {...props} /></div><footer>回声寻人网 · 公开信息转发与回访</footer></div>
}
function Archive(props: SiteProps) {
  const { page } = props, url = props.pageState.searchInput || '', searched = props.pageState.searchSubmitted
  const query = props.pageState.searchQuery || ''
  const entries = props.pages.filter((item) => item.snapshot && (item.snapshot.originalUrl.toLowerCase().includes(query.trim().toLowerCase()) || item.title.includes(query.trim())))
  return <div className="archive-tool"><header><SiteName {...props} /><p>输入旧网页地址，查看保留下来的副本。</p></header><Breadcrumb {...props} /><form onSubmit={(event) => { event.preventDefault(); props.onStateChange({ searchQuery: url.trim(), searchSubmitted: true }) }}><input aria-label="旧网页地址" maxLength={100} value={url} onChange={(event) => props.onStateChange({ searchInput: event.target.value })} /><button>查找副本</button></form>
    {searched && <div className="archive-results">{query.trim() && entries.length ? entries.map((item) => <PageLink key={item.id} pageId={item.id}>{item.title}　{item.snapshot?.capturedAt}</PageLink>) : <p>没有找到这个地址的副本。</p>}</div>}
    <p>{page.body.join(' ')}</p><Links {...props} />{!searched && <><h2>已保留的站点</h2>{props.pages.filter((item) => item.learnsTool === 'archive').map((item) => <PageLink key={item.id} pageId={item.id}>{item.snapshot?.originalUrl}</PageLink>)}</>}
  </div>
}
function Generic(props: SiteProps) {
  const time = props.page.objects?.find((item) => item.type === 'timestamp')
  return <div className={`plain-site ${props.page.skin === 'campus' ? 'campus-forum' : ''}`}><SiteName {...props} /><SiteNav {...props} /><Breadcrumb {...props} /><h2>{props.page.title}</h2>{time && <Time item={time} onDiscover={props.onDiscover} />}{props.page.body.map((line, i) => <p key={i}>{line}</p>)}{props.page.objects?.filter((item) => item.type !== 'timestamp' && item.type !== 'cache-entry').map((item) => <ObjectRow {...props} key={item.id} item={item} />)}<Links {...props} /></div>
}
export function SiteView(props: SiteProps) {
  const { page } = props
  if (page.offlinePageId) return <div className="unavailable-page"><h1>无法显示网页</h1><p>服务器没有返回可读取的页面。</p><p>{page.url}</p><button onClick={() => props.onNavigate(page.offlinePageId!)}>尝试打开离线副本</button><small>原站点不可用时，浏览器可以查找以前保存的页面。</small></div>
  let content: ReactNode
  if (page.kind === 'portal') content = <Portal {...props} />
  else if (page.kind === 'forum-thread' || page.kind === 'forum') content = <Forum {...props} />
  else if (page.kind === 'profile') content = <Profile {...props} />
  else if (page.kind === 'blog' || page.skin === 'summer' || page.skin === 'zhao') content = <Blog {...props} />
  else if (page.skin === 'news' || page.layout === 'news') content = <News {...props} />
  else if (page.skin === 'echo' || page.layout === 'echo') content = <Echo {...props} />
  else if (page.skin === 'archive') content = <Archive {...props} />
  else content = <Generic {...props} />
  return <Navigation.Provider value={{ onNavigate: props.onNavigate, visitedPageIds: props.visitedPageIds }}><Disclosures.Provider value={{ pageState: props.pageState, onStateChange: props.onStateChange }}><div className="site-wrapper"><Snapshot {...props} />{content}</div></Disclosures.Provider></Navigation.Provider>
}
