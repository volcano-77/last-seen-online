import { useEffect, useRef, useState } from 'react'
import type { CaseMedia, CasePage, PageObject } from './case'
import './Sites.css'

interface SiteProps {
  page: CasePage
  onNavigate: (id: string) => void
  onDiscover?: (id: string, anchor?: { x: number; y: number }) => void
  discoveredEvidenceIds?: string[]
  visiblePageIds?: Set<string>
  pages?: CasePage[]
}

interface SearchProps {
  pages: CasePage[]
  query: string
  onQueryChange: (value: string) => void
  onNavigate: (id: string) => void
}

function RelatedLinks({ page, onNavigate, visiblePageIds, heading = '相关链接' }: SiteProps & { heading?: string }) {
  if (!page.links?.length) return null
  return <div className="site-links">
    <strong>{heading}</strong>
    {page.links.filter((link) => !visiblePageIds || visiblePageIds.has(link.pageId)).map((link) => <button key={link.pageId} onClick={() => onNavigate(link.pageId)}>› {link.label}</button>)}
  </div>
}

export function SearchSite({ pages, query, onQueryChange, onNavigate }: SearchProps) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const results = pages.filter((page) => page.kind !== 'search' && page.searchable !== false).filter((page) => {
    const content = [page.title, page.url, page.subtitle, page.author, ...page.body,
      ...(page.tags || []), ...(page.searchTerms || []), ...(page.objects || []).flatMap((item) => [item.title, ...(item.body || [])])].join(' ').toLowerCase()
    return terms.every((term) => content.includes(term))
  })

  return <div className="old-search">
    <div className="search-utility">网页　新闻　图片　论坛　博客 <span>简体中文 | 帮助</span></div>
    <div className="search-head">
      <div className="search-wordmark"><span>寻</span><span>迹</span><span>搜</span><small>网页存档检索</small></div>
      <form onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="archive-search">在旧网页中查找</label>
        <div className="old-search-row"><input id="archive-search" value={query} maxLength={60} onChange={(event) => onQueryChange(event.target.value)} placeholder="输入短关键词或文件名" /><button type="submit">搜 索</button></div>
        <small>仅检索当前 Case 的离线归档，不连接真实互联网。</small>
      </form>
    </div>
    <div className="search-tabs"><strong>网页</strong><span>论坛</span><span>个人空间</span><span>日志</span></div>
    {!query.trim() ? <div className="search-idle"><strong>从一个词或一个站点开始。</strong><p>输入短关键词，也可以直接打开以下归档入口。</p><div className="search-directory">{pages.filter((page) => page.kind !== 'search' && (page.directory === true || page.bookmark === true)).map((page) => <button key={page.id} onClick={() => onNavigate(page.id)}>{page.title}</button>)}</div></div>
      : <div className="old-results"><div className="result-count">找到相关网页 {results.length} 个　｜　关键词：<b>{query}</b></div>
        {results.length ? results.map((page) => <article key={page.id}>
          <button className="result-title" onClick={() => onNavigate(page.id)}>{page.title}</button>
          <p>{page.subtitle || page.body[0]}</p>
          <div className="result-foot"><span>{page.url}</span>　{page.date || '日期不详'}　<span className="cached">网页快照</span></div>
        </article>) : <div className="no-results">没有找到相关网页。可以换一个网名，或只搜索句子中的一部分。</div>}
        <div className="search-bottom">寻迹搜 · 本地网页存档</div>
      </div>}
  </div>
}

function Media({ media }: { media?: CaseMedia }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
  if (!media) return null
  const src = `${import.meta.env.BASE_URL}${media.src}`
  return <figure className="case-photo"><button className="photo-open" onClick={() => setOpen(true)} aria-label={`查看原图：${media.alt}`}><img src={src} alt={media.alt} /></button>
    <figcaption>{media.caption || media.alt}　<span>点击查看原图</span></figcaption>
    {open && <div className="photo-viewer-backdrop" onClick={() => setOpen(false)}><div className="photo-viewer" role="dialog" aria-modal="true" aria-label="原图与文件信息" onClick={(event) => event.stopPropagation()}><div className="photo-viewer-bar"><strong>{media.filename || media.alt}</strong><button onClick={() => setOpen(false)} aria-label="关闭原图">×</button></div><img src={src} alt={media.alt} /><div className="photo-details">文件：{media.filename || '未记录'}　{media.width && media.height && `尺寸：${media.width} × ${media.height}`}　{media.uploadedAt && `上传：${media.uploadedAt}`}</div></div></div>}
  </figure>
}

function Metadata({ values }: { values: Record<string, string> }) {
  return <dl className="archive-metadata">{Object.entries(values).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
}

function TimestampDisclosure({ item, label, onDiscover }: { item: PageObject; label: string; onDiscover?: SiteProps['onDiscover'] }) {
  const [open, setOpen] = useState(false)
  return <div className="timestamp-disclosure"><button className="source-time" onClick={(event) => {
    setOpen(!open)
    if (!open && item.evidenceId) { const rect = event.currentTarget.getBoundingClientRect(); onDiscover?.(item.evidenceId, { x: rect.left, y: rect.bottom + 7 }) }
  }} aria-expanded={open}>{label}</button>{open && item.metadata && <Metadata values={item.metadata} />}</div>
}

function ObjectDetail({ page, item, onDiscover, discoveredEvidenceIds = [], visiblePageIds, onNavigate }: SiteProps & { item: PageObject }) {
  const [open, setOpen] = useState(false)
  const inlineIndexMetadata = page.layout === 'index' && !item.evidenceId && item.type === 'post'
  const showDetail = Boolean(item.evidenceId || (item.metadata && !inlineIndexMetadata))
  const isLogRow = item.type === 'log-entry' || (item.type === 'reply' && item.metadata)
  if (isLogRow && item.metadata) return <section className="archive-log-entry" id={item.id}><button className="archive-log-row" aria-expanded={open} onClick={(event) => {
    setOpen(!open)
    if (!open && item.evidenceId) { const rect = event.currentTarget.getBoundingClientRect(); onDiscover?.(item.evidenceId, { x: rect.left, y: rect.bottom + 7 }) }
  }}><time>{item.timestamp}</time><strong>{item.title}</strong><span>{item.body?.[0]}</span><em>{open ? '收起' : '详情'}</em></button>{open && <Metadata values={item.metadata} />}</section>
  return <section className="archive-object" id={item.id}>
    <div className="archive-object-head"><strong>{item.title}</strong><small>{item.floor || item.type}</small></div>
    {item.author && <div className="object-author">{item.author}</div>}
    {item.timestamp && <time>{item.timestamp}</time>}
    {item.body?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    <Media media={item.media} />
    {inlineIndexMetadata && item.metadata && <div className="index-row-metadata">{Object.entries(item.metadata).map(([key, value]) => <span key={key}>{key}：{value}</span>)}</div>}
    {showDetail && <button className="archive-object-action" onClick={(event) => { setOpen(!open); if (!open && item.evidenceId) { const rect = event.currentTarget.getBoundingClientRect(); onDiscover?.(item.evidenceId, { x: rect.left, y: rect.bottom + 7 }) } }}>
      {item.detailLabel || '查看详情'}{discoveredEvidenceIds.includes(item.evidenceId || '') ? ' · 已记下' : ''}</button>}
    {open && item.metadata && <Metadata values={item.metadata} />}
    {item.links?.filter((link) => !visiblePageIds || visiblePageIds.has(link.pageId)).map((link) => <button className="archive-inline-link" key={link.pageId} onClick={() => onNavigate(link.pageId)}>› {link.label}</button>)}
  </section>
}

export function PortalSite({ page, onNavigate, visiblePageIds }: SiteProps) {
  const portalName = page.siteName || '旧站'
  return <div className="old-portal"><div className="portal-bar">{portalName}网址导航 <span>网页 · 论坛 · 新闻 · 个人空间</span></div>
    <div className="portal-title"><strong>{portalName}<span>导航</span></strong><small>旧网页入口 / 本地镜像</small></div>
    {page.links?.[0] && <div className="portal-recent"><span>▤ 最近访问</span><button onClick={() => onNavigate(page.links![0].pageId)}>{page.links[0].label}　›</button><small>保留的浏览记录</small></div>}
    <div className="portal-marquee">欢迎浏览旧站索引　·　页面链接按归档时状态保留　·　请留意网页时间</div>
    <div className="portal-columns"><section><h2>常用站点</h2>{page.links?.filter((link) => !visiblePageIds || visiblePageIds.has(link.pageId)).map((link) => <button key={link.pageId} onClick={() => onNavigate(link.pageId)}>▪ {link.label}</button>)}</section>
      <section><h2>站点公告</h2>{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section></div>
    <footer>{portalName}网址导航 · 离线镜像索引</footer></div>
}

export function ForumThreadSite(props: SiteProps) {
  const { page, onNavigate, visiblePageIds } = props
  const postTime = page.objects?.find((item) => item.type === 'timestamp')
  return <div className="old-forum">
    <div className="forum-masthead"><div><b>{page.siteName || '回声社区'}</b><span>BBS archive</span></div><small>收藏本站　|　站点帮助　|　归档模式</small></div>
    <div className="forum-nav">论坛首页　│　校园生活　│　城市闲谈　│　旧帖存档</div>
    <div className="forum-path">当前位置：论坛首页 » {page.details?.section || '城市闲谈'} » 查看帖子</div>
    <div className="thread-heading"><div><span className="thread-icon">帖</span><h2>{page.title}</h2></div><small>浏览 {page.details?.views || '—'}　|　回复 {page.details?.replies || '—'}</small></div>
    <div className="forum-post"><aside className="forum-user"><div className="forum-avatar">{page.author?.slice(0, 1) || '匿'}</div><b>{page.author || '匿名用户'}</b><span>普通会员</span><dl><dt>注册</dt><dd>{page.details?.registeredAt || '未记录'}</dd><dt>最后在线</dt><dd>{page.details?.lastOnline || '未记录'}</dd></dl></aside>
      <div className="post-main"><div className="post-meta">{postTime ? <TimestampDisclosure item={postTime} label={`发表于 ${page.date || postTime.timestamp}`} onDiscover={props.onDiscover} /> : <span>发表于 {page.date || '日期不详'}</span>}<b>1#</b></div><div className="post-body">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<Media media={page.media} />
        {page.objects?.filter((item) => item.type !== 'reply' && item.type !== 'timestamp').map((item) => <ObjectDetail key={item.id} {...props} item={item} />)}</div><div className="forum-signature">{page.details?.signature || '— 本帖来自旧网页存档 —'}</div></div></div>
    {page.objects?.filter((item) => item.type === 'reply').map((item) => <div className="forum-reply" key={item.id}><div className="reply-side"><b>{item.author || '匿名用户'}</b><small>注册会员</small></div><div className="reply-main"><div className="post-meta"><span>发表于 {item.timestamp || '日期不详'}</span><b>{item.floor || '回复'}</b></div><div className="reply-text">{item.body?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{item.links?.filter((link) => !visiblePageIds || visiblePageIds.has(link.pageId)).map((link) => <button className="archive-inline-link" key={link.pageId} onClick={() => onNavigate(link.pageId)}>› {link.label}</button>)}
      {item.evidenceId && <ObjectDetail {...props} item={item} />}</div></div>)}
    <RelatedLinks {...props} heading="站内相关帖 / 外部链接" /><div className="forum-footer">Powered by EchoBBS　页面由离线档案重建</div>
  </div>
}

export function ForumSite({ page, onNavigate }: SiteProps) {
  return <div className="old-forum">
    <div className="forum-masthead"><div><b>{page.siteName || '回声社区'}</b><span>echo bbs</span></div><small>收藏本站　|　站点帮助　|　归档模式</small></div>
    <div className="forum-nav">论坛首页　│　城市闲谈　│　寻人寻物　│　旧帖存档</div>
    <div className="forum-path">当前位置：论坛首页 » {page.details?.section || '城市闲谈'} » 查看帖子</div>
    <div className="thread-heading"><div><span className="thread-icon">帖</span><h2>{page.title}</h2></div><small>浏览 {page.details?.views || '—'}　|　回复 {page.details?.replies || '—'}</small></div>
    <div className="forum-post">
      <aside className="forum-user"><div className="forum-avatar">{page.author?.slice(0, 1) || '匿'}</div><b>{page.author || '匿名用户'}</b><span>普通会员</span><dl><dt>注册</dt><dd>{page.details?.registeredAt || '未记录'}</dd><dt>最后在线</dt><dd>{page.details?.lastOnline || '未记录'}</dd></dl></aside>
      <div className="post-main"><div className="post-meta"><span>发表于 {page.date || '日期不详'}</span><b>{page.details?.floor || '1#'}</b></div><div className="post-body">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="forum-signature">{page.details?.signature || '— 本帖来自旧网页存档 —'}</div><div className="post-tools">只读快照　·　原帖不可回复</div></div>
    </div>
    <RelatedLinks page={page} onNavigate={onNavigate} heading="站内相关帖 / 外部链接" />
    <div className="forum-footer">Powered by EchoBBS　　页面由离线档案重建</div>
  </div>
}

function BlogCalendar({ date }: { date?: string }) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '')
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2]), selected = Number(match[3])
  const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? null : index - leading + 1)
  return <><div className="blog-side-title">日历 · {year} 年 {month} 月</div><div className="blog-calendar">
    {['日', '一', '二', '三', '四', '五', '六'].map((label) => <span key={label}>{label}</span>)}
    {cells.map((day, index) => <span key={index} className={day === selected ? 'marked' : ''}>{day || ''}</span>)}
  </div></>
}

export function BlogSite(props: SiteProps) {
  const { page } = props
  const publishTime = page.objects?.find((item) => item.type === 'timestamp')
  return <div className="old-blog">
    <div className="blog-topline">个 人 日 志　　/　　存档页面 <span>首页　·　文章　·　留言</span></div>
    <header className="blog-header"><div className="blog-mark">✦</div><div><small>the personal journal of</small><h2>{page.siteName || page.author || '某人的博客'}</h2><p>{page.subtitle || '一些被时间留下的字句。'}</p></div></header>
    <div className="blog-layout"><article className="blog-entry"><div className="blog-date">{publishTime ? <TimestampDisclosure item={publishTime} label={`发表于 ${page.date || publishTime.timestamp}　/　日志归档`} onDiscover={props.onDiscover} /> : `${page.date || '日期不详'}　/　日志归档`}</div><h3>{page.title}</h3><div className="blog-rule">◆ ───────────── ◆</div><div className="blog-body">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><Media media={page.media} />{page.objects?.filter((item) => item.type !== 'reply' && item.type !== 'timestamp').map((item) => <ObjectDetail key={item.id} {...props} item={item} />)}<div className="blog-tags">分类：{page.tags?.join(' / ') || '未分类'}</div>{page.objects?.some((item) => item.type === 'reply') && <div className="blog-comments"><h4>留言 / 评论</h4>{page.objects.filter((item) => item.type === 'reply').map((item) => <div key={item.id}><b>{item.author || '访客'}</b><time>{item.timestamp}</time>{item.body?.map((line, index) => <p key={index}>{line}</p>)}</div>)}</div>}</article><aside className="blog-sidebar"><div className="blog-side-title">博主资料</div><p>昵称：{page.author || '未署名'}</p><p>最后更新：{page.details?.lastOnline || page.date || '未记录'}</p><BlogCalendar date={page.date} /><div className="blog-side-title">文章目录</div><RelatedLinks {...props} heading="链接" /><div className="blog-counter">访客计数器　{page.details?.views || '000128'}</div></aside></div>
    <div className="blog-footer">© 私人日志归档　·　此站点只供调查阅读</div>
  </div>
}

export function ProfileSite(props: SiteProps) {
  const { page } = props
  return <div className="old-profile">
    <div className="profile-topbar">✿ {page.siteName || '个人空间'} <span>首页　相册　日志　留言板</span></div>
    <div className="profile-banner"><div className="profile-stamp">＊</div><div><small>欢迎来到我的小站</small><h2>{page.title}</h2><p>{page.subtitle || '留下一点自己的痕迹。'}</p></div></div>
    <div className="profile-tabs"><b>个人档案</b><span>最新动态</span><span>好友链接</span></div>
    <div className="profile-layout"><aside className="profile-side"><div className="profile-portrait">{page.author?.slice(0, 1) || '我'}</div><strong>{page.author || '匿名用户'}</strong><div className="profile-status">○ 最后在线：{page.details?.lastOnline || '未记录'}</div><dl><dt>注册时间</dt><dd>{page.details?.registeredAt || '未记录'}</dd><dt>个人签名</dt><dd>{page.details?.signature || '暂无签名'}</dd></dl></aside><main className="profile-main"><div className="profile-section-title">▣ 最近更新 <small>{page.date || '日期不详'}</small></div><div className="profile-message">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{page.objects?.map((item) => <ObjectDetail key={item.id} {...props} item={item} />)}<div className="profile-section-title">☆ 我的链接</div><RelatedLinks {...props} heading="站点往来" /></main></div>
    <div className="profile-footer">个人空间 · 旧站快照　　请勿将归档状态等同于用户当前状态</div>
  </div>
}

export function ArchiveSite(props: SiteProps) {
  const { page, onDiscover } = props
  const [siteQuery, setSiteQuery] = useState('')
  const [siteSearched, setSiteSearched] = useState(false)
  const cacheDateRef = useRef<HTMLDivElement>(null)
  const capturedCache = useRef<string | null>(null)
  const timeObject = page.objects?.find((item) => item.type === 'timestamp')
  const cacheEntry = page.kind === 'cache' ? page.objects?.find((item) => item.type === 'cache-entry' && item.evidenceId) : undefined
  useEffect(() => {
    if (!cacheEntry?.evidenceId || capturedCache.current === page.id) return
    capturedCache.current = page.id
    const rect = cacheDateRef.current?.getBoundingClientRect()
    onDiscover?.(cacheEntry.evidenceId, rect ? { x: rect.left, y: rect.bottom + 7 } : undefined)
  }, [cacheEntry, page.id, onDiscover])
  const siteResults = (props.pages || []).filter((item) => item.id !== page.id &&
    item.url.startsWith('ncu://bbs/') && [item.title, item.author, ...item.body, ...(item.tags || [])]
      .join(' ').toLowerCase().includes(siteQuery.trim().toLowerCase()))
  const theme = ['forum-thread', 'forum-reply'].includes(page.kind) ? 'forum' :
    ['email', 'attachment'].includes(page.kind) ? 'mail' :
      ['spreadsheet', 'sd-card', 'file-metadata', 'print-log'].includes(page.kind) ? 'file' : 'web'
  return <div className={`archive-site archive-theme-${theme} archive-layout-${page.layout || 'generic'}`}>
    <div className="archive-site-top"><strong>{page.siteName || '离线网页档案'}</strong><span>{page.kind} · 只读快照</span></div>
    <div className="archive-site-path">首页 » {page.title}</div>
    <h2>{page.title}</h2>
    {page.subtitle && <p className="archive-subtitle">{page.subtitle}</p>}
    {cacheEntry ? <div className="archive-date cache-capture-date" ref={cacheDateRef}>网页快照抓取时间：<strong>{cacheEntry.timestamp || page.date}</strong>{cacheEntry.metadata && <Metadata values={cacheEntry.metadata} />}</div> :
      timeObject ? <div className="archive-date"><TimestampDisclosure item={timeObject} label={`发表于 ${page.date || timeObject.timestamp}`} onDiscover={props.onDiscover} /></div> :
      page.date && <div className="archive-date">页面日期：{page.date}</div>}
    <div className="archive-body">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    {page.id === 'bbs_index' && <form className="bbs-site-search" onSubmit={(event) => { event.preventDefault(); setSiteSearched(true) }}><label htmlFor="bbs-search">站内搜索</label><input id="bbs-search" value={siteQuery} maxLength={24} onChange={(event) => { setSiteQuery(event.target.value); setSiteSearched(false) }} placeholder="用户名或帖子标题" /><button type="submit">搜索</button>{siteSearched && <div className="bbs-site-results">{siteQuery.trim() && siteResults.length ? siteResults.map((item) => <button key={item.id} type="button" onClick={() => props.onNavigate(item.id)}>{item.title}　<small>{item.date || ''}</small></button>) : <span>没有找到匹配的公开记录。</span>}</div>}</form>}
    <Media media={page.media} />
    {page.metadata && <dl className="archive-metadata">{Object.entries(page.metadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
    {page.objects && <div className="archive-objects">{page.objects.filter((item) => item !== timeObject && item !== cacheEntry).map((item) => <ObjectDetail key={item.id} {...props} item={item} />)}</div>}
    <RelatedLinks {...props} heading="站内链接 / 相关归档" />
  </div>
}

export function SiteView(props: SiteProps) {
  const { page } = props
  switch (page.kind) {
    case 'portal': return <PortalSite {...props} />
    case 'forum': return page.layout === 'index' ? <ArchiveSite {...props} /> : <ForumSite {...props} />
    case 'forum-thread': return <ForumThreadSite {...props} />
    case 'blog': return <BlogSite {...props} />
    case 'profile': return <ProfileSite {...props} />
    case 'search': return null
    default: return <ArchiveSite {...props} />
  }
}
