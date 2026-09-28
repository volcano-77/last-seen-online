import type { CasePage } from './case'
import './Sites.css'

interface SiteProps {
  page: CasePage
  onNavigate: (id: string) => void
  onDiscover?: (id: string) => void
  discoveredEvidenceIds?: string[]
}

interface SearchProps {
  pages: CasePage[]
  query: string
  onQueryChange: (value: string) => void
  onNavigate: (id: string) => void
}

function RelatedLinks({ page, onNavigate, heading = '相关链接' }: SiteProps & { heading?: string }) {
  if (!page.links?.length) return null
  return <div className="site-links">
    <strong>{heading}</strong>
    {page.links.map((link) => <button key={link.pageId} onClick={() => onNavigate(link.pageId)}>› {link.label}</button>)}
  </div>
}

export function SearchSite({ pages, query, onQueryChange, onNavigate }: SearchProps) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const results = pages.filter((page) => page.kind !== 'search').filter((page) => {
    const content = [page.title, page.url, page.subtitle, page.author, ...page.body,
      ...(page.tags || []), ...(page.objects || []).flatMap((item) => [item.title, ...(item.body || [])])].join(' ').toLowerCase()
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
    {!query.trim() ? <div className="search-idle"><strong>从一个词或一个站点开始。</strong><p>输入短关键词，也可以直接打开以下归档入口。</p><div className="search-directory">{pages.filter((page) => page.kind !== 'search').map((page) => <button key={page.id} onClick={() => onNavigate(page.id)}>{page.title}</button>)}</div></div>
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

export function BlogSite({ page, onNavigate }: SiteProps) {
  return <div className="old-blog">
    <div className="blog-topline">个 人 日 志　　/　　存档页面 <span>首页　·　文章　·　留言</span></div>
    <header className="blog-header"><div className="blog-mark">✦</div><div><small>the personal journal of</small><h2>{page.siteName || page.author || '某人的博客'}</h2><p>{page.subtitle || '一些被时间留下的字句。'}</p></div></header>
    <div className="blog-layout"><article className="blog-entry"><div className="blog-date">{page.date || '日期不详'}　/　日志归档</div><h3>{page.title}</h3><div className="blog-rule">◆ ───────────── ◆</div><div className="blog-body">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="blog-tags">分类：{page.tags?.join(' / ') || '未分类'}</div><div className="blog-entry-footer">阅读旧文时，请留意发表时间与后续编辑痕迹。</div></article><aside className="blog-sidebar"><div className="blog-side-title">博主资料</div><p>昵称：{page.author || '未署名'}</p><p>最后更新：{page.details?.lastOnline || page.date || '未记录'}</p><div className="blog-side-title">文章目录</div><RelatedLinks page={page} onNavigate={onNavigate} heading="链接" /><div className="blog-counter">访客计数器　{page.details?.views || '000128'}</div></aside></div>
    <div className="blog-footer">© 私人日志归档　·　此站点只供调查阅读</div>
  </div>
}

export function ProfileSite({ page, onNavigate }: SiteProps) {
  return <div className="old-profile">
    <div className="profile-topbar">✿ {page.siteName || '个人空间'} <span>首页　相册　日志　留言板</span></div>
    <div className="profile-banner"><div className="profile-stamp">＊</div><div><small>欢迎来到我的小站</small><h2>{page.title}</h2><p>{page.subtitle || '留下一点自己的痕迹。'}</p></div></div>
    <div className="profile-tabs"><b>个人档案</b><span>最新动态</span><span>好友链接</span></div>
    <div className="profile-layout"><aside className="profile-side"><div className="profile-portrait">{page.author?.slice(0, 1) || '我'}</div><strong>{page.author || '匿名用户'}</strong><div className="profile-status">○ 最后在线：{page.details?.lastOnline || '未记录'}</div><dl><dt>注册时间</dt><dd>{page.details?.registeredAt || '未记录'}</dd><dt>个人签名</dt><dd>{page.details?.signature || '暂无签名'}</dd></dl></aside><main className="profile-main"><div className="profile-section-title">▣ 最近更新 <small>{page.date || '日期不详'}</small></div><div className="profile-message">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="profile-section-title">☆ 我的链接</div><RelatedLinks page={page} onNavigate={onNavigate} heading="站点往来" /></main></div>
    <div className="profile-footer">个人空间 · 旧站快照　　请勿将归档状态等同于用户当前状态</div>
  </div>
}

export function ArchiveSite({ page, onNavigate, onDiscover, discoveredEvidenceIds = [] }: SiteProps) {
  const theme = ['forum-thread', 'forum-reply'].includes(page.kind) ? 'forum' :
    ['email', 'attachment'].includes(page.kind) ? 'mail' :
      ['spreadsheet', 'sd-card', 'file-metadata', 'print-log'].includes(page.kind) ? 'file' : 'web'
  return <div className={`archive-site archive-theme-${theme}`}>
    <div className="archive-site-top"><strong>{page.siteName || '离线网页档案'}</strong><span>{page.kind} · 只读快照</span></div>
    <div className="archive-site-path">首页 » {page.title}</div>
    <h2>{page.title}</h2>
    {page.subtitle && <p className="archive-subtitle">{page.subtitle}</p>}
    {page.date && <div className="archive-date">页面日期：{page.date}</div>}
    <div className="archive-body">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    {page.metadata && <dl className="archive-metadata">{Object.entries(page.metadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
    {page.objects?.map((item) => <section className="archive-object" key={item.id}>
      <div className="archive-object-head"><strong>{item.title}</strong><small>{item.type}</small></div>
      {item.timestamp && <time>{item.timestamp}</time>}
      {item.body?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {item.metadata && <dl className="archive-metadata">{Object.entries(item.metadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
      {item.evidenceId && <button className="archive-object-action" onClick={() => onDiscover?.(item.evidenceId!)}>
        {discoveredEvidenceIds.includes(item.evidenceId) ? '已查看 · 在发现夹中' : '查看这项记录'}
      </button>}
      {item.links?.map((link) => <button className="archive-inline-link" key={link.pageId} onClick={() => onNavigate(link.pageId)}>› {link.label}</button>)}
    </section>)}
    <RelatedLinks page={page} onNavigate={onNavigate} heading="站内链接 / 相关归档" />
  </div>
}

export function SiteView(props: SiteProps) {
  const { page, onNavigate } = props
  switch (page.kind) {
    case 'forum': return <ForumSite page={page} onNavigate={onNavigate} />
    case 'blog': return <BlogSite page={page} onNavigate={onNavigate} />
    case 'profile': return <ProfileSite page={page} onNavigate={onNavigate} />
    case 'search': return null
    default: return <ArchiveSite {...props} />
  }
}
