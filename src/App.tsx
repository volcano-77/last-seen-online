import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { CaseClue, CasePage, GameCase } from './case'
import { loadDemoCase, parseCase } from './case'
import type { SaveData } from './storage'
import { clearSave, readSave, writeSave } from './storage'
import './App.css'

type Panel = 'browser' | 'clues' | 'case'
const categoryLabels: Record<CaseClue['category'], string> = { identity: '身份', timeline: '时间线', location: '地点', connection: '关联' }
const kindLabels: Record<CasePage['kind'], string> = { search: '搜索', forum: '论坛', profile: '个人主页', blog: '博客' }
const makeSave = (caseData: GameCase): SaveData => ({
  caseData, currentPageId: caseData.startPageId, history: [caseData.startPageId],
  historyIndex: 0, collectedClueIds: [], note: '',
})

function App() {
  const [initialSave] = useState(readSave)
  const [save, setSave] = useState<SaveData | null>(initialSave)
  const [panel, setPanel] = useState<Panel>('browser')
  const [query, setQuery] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(Boolean(initialSave))
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialSave) return
    loadDemoCase().then((data) => setSave(makeSave(data)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Case 加载失败。'))
      .finally(() => setReady(true))
  }, [initialSave])
  useEffect(() => {
    if (save && ready) writeSave(save)
  }, [save, ready])

  const data = save?.caseData
  const page = data?.pages.find((item) => item.id === save?.currentPageId)
  const searchPage = data?.pages.find((item) => item.kind === 'search')
  function navigate(id: string) {
    if (!data?.pages.some((item) => item.id === id)) return
    setSave((old) => old ? {
      ...old, currentPageId: id, history: [...old.history.slice(0, old.historyIndex + 1), id],
      historyIndex: old.historyIndex + 1,
    } : old)
    setAddress(null)
    setPanel('browser')
    setNotice('')
  }
  function goHistory(direction: -1 | 1) {
    setSave((old) => {
      if (!old) return old
      const index = old.historyIndex + direction
      return index < 0 || index >= old.history.length ? old
        : { ...old, historyIndex: index, currentPageId: old.history[index] }
    })
    setAddress(null)
  }
  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data) return
    const entered = (address ?? page?.url ?? '').trim()
    const target = data.pages.find((item) => item.url.toLowerCase() === entered.toLowerCase())
    if (target) return navigate(target.id)
    setQuery(entered)
    if (searchPage) navigate(searchPage.id)
  }
  function collectClue(id: string) {
    setSave((old) => old && !old.collectedClueIds.includes(id)
      ? { ...old, collectedClueIds: [...old.collectedClueIds, id] } : old)
    setNotice('线索已加入线索板。')
  }
  async function importCase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = parseCase(JSON.parse(await file.text()) as unknown)
      setSave(makeSave(imported)); setQuery(''); setAddress(null); setPanel('browser'); setNotice(`已载入 ${imported.title}。`)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '无法读取 Case 文件。')
    }
    event.target.value = ''
  }
  async function resetToDemo() {
    if (!window.confirm('这会清除当前 Case 的线索和笔记，重新开始 Demo。继续吗？')) return
    try {
      const demo = await loadDemoCase()
      clearSave(); setSave(makeSave(demo)); setQuery(''); setAddress(null); setPanel('browser'); setNotice('Demo Case 已重新开始。')
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Demo Case 加载失败。')
    }
  }
  if (!ready) return <div className="loading-screen">正在连接离线档案…</div>
  if (!save || !data || !page) return <main className="loading-screen"><p>{error || 'Case 加载失败。'}</p><button onClick={() => window.location.reload()}>重试</button></main>

  const collected = data.clues.filter((clue) => save.collectedClueIds.includes(clue.id))
  const pageClues = data.clues.filter((clue) => page.clueIds?.includes(clue.id))
  const progress = data.clues.length ? Math.round(collected.length / data.clues.length * 100) : 100
  const results = data.pages.filter((item) => item.kind !== 'search').filter((item) => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const content = [item.title, item.url, item.subtitle, item.author, ...item.body, ...(item.tags || [])].join(' ').toLowerCase()
    return terms.every((term) => content.includes(term))
  })

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">L<span>.</span></div><div><strong>LAST SEEN</strong><small>ONLINE / v0.1</small></div></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="工作区导航">
        <button className={panel === 'browser' ? 'active' : ''} onClick={() => setPanel('browser')}><span>▧</span> 虚拟浏览器</button>
        <button className={panel === 'clues' ? 'active' : ''} onClick={() => setPanel('clues')}><span>◈</span> 线索板 <em>{collected.length}</em></button>
        <button className={panel === 'case' ? 'active' : ''} onClick={() => setPanel('case')}><span>▤</span> 案件档案</button>
      </nav>
      <div className="sidebar-section-label recent-label">QUICK ACCESS</div>
      <nav className="quick-nav" aria-label="快速访问">
        {searchPage && <button onClick={() => navigate(searchPage.id)}><span>⌕</span> 搜索引擎</button>}
        {(['forum', 'profile', 'blog'] as const).map((kind) => data.pages.filter((item) => item.kind === kind).slice(0, 1).map((item) =>
          <button key={item.id} onClick={() => navigate(item.id)}><span>{kind === 'forum' ? '▦' : kind === 'profile' ? '◉' : '▤'}</span> {kindLabels[kind]}</button>))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-progress"><div><span>调查进度</span><strong>{progress}%</strong></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><small>{collected.length} / {data.clues.length} 条线索</small></div>
        <button className="reset-button" onClick={resetToDemo}>↺　重置为 Demo Case</button>
      </div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="breadcrumb">CASE FILE <span>/</span> {data.id.toUpperCase()}</div><div className="topbar-status"><span className="status-dot" /> 本地存档 <span className="topbar-divider" /> PROTOTYPE 0.1</div></header>
      <div className="workspace">
        <div className="workspace-heading"><div><div className="eyebrow">{panel === 'browser' ? 'DIGITAL INVESTIGATION' : panel === 'clues' ? 'EVIDENCE LOG' : 'CASE DOSSIER'}</div><h1>{panel === 'browser' ? '网络痕迹' : panel === 'clues' ? '线索板' : '案件档案'}</h1><p>{panel === 'browser' ? '沿着她留下的数字足迹，找到最后的答案。' : panel === 'clues' ? '收集证据，拼合事件发生的顺序。' : '阅读任务简报，管理当前调查。'}</p></div><div className="case-pill"><span className="status-dot" /> {data.title}</div></div>
        {panel === 'browser' && <section className="browser-window" aria-label="虚拟浏览器">
          <div className="browser-top"><div className="window-dots"><i /><i /><i /></div><span>TRACE BROWSER</span><span className="browser-secure">● SECURE LOCAL SESSION</span></div>
          <div className="browser-toolbar"><button aria-label="后退" disabled={save.historyIndex === 0} onClick={() => goHistory(-1)}>←</button><button aria-label="前进" disabled={save.historyIndex >= save.history.length - 1} onClick={() => goHistory(1)}>→</button><button aria-label="刷新页面" onClick={() => setNotice('页面已刷新。')}>↻</button><form onSubmit={submitAddress}><span>⌕</span><input aria-label="地址或搜索词" value={address ?? page.url} onChange={(event) => setAddress(event.target.value)} /><kbd>ENTER</kbd></form><button aria-label="返回搜索首页" onClick={() => searchPage && navigate(searchPage.id)}>⌂</button></div>
          <div className="browser-content">
            {page.kind === 'search' ? <div className="search-page"><div className="search-identity"><div className="search-logo">trace<span>.</span></div><p>在碎片之间，寻找真相。</p></div><form className="search-box" onSubmit={(event) => event.preventDefault()}><span>⌕</span><input aria-label="搜索档案" placeholder="搜索姓名、地点、关键词…" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit">搜索</button></form><div className="search-summary">{query ? `“${query}” 的搜索结果` : '所有可检索的页面'} <span>· {results.length} 条结果</span></div><div className="results-list">{results.length ? results.map((item) => <article className="search-result" key={item.id}><div className="result-domain">{item.url} <span>{kindLabels[item.kind]}</span></div><button onClick={() => navigate(item.id)}>{item.title} <span>↗</span></button><p>{item.subtitle || item.body[0]}</p><div className="result-tags">{item.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div></article>) : <div className="empty-result">没有找到匹配页面。试试更短的关键词。</div>}</div></div>
              : <div className={`site-page site-${page.kind}`}><div className="site-meta"><span>{kindLabels[page.kind]}</span><span>{page.date || '已归档页面'}</span></div>{page.kind === 'forum' && <div className="forum-banner"><span>▦</span><div><strong>回声社区</strong><small>城市生活 · 匿名讨论 · 本地记忆</small></div></div>}{page.kind === 'profile' && <div className="profile-cover"><div className="profile-avatar">{page.author?.charAt(0) || '?'}</div></div>}{page.kind === 'blog' && <div className="blog-overline">PERSONAL JOURNAL / ARCHIVE</div>}<div className="site-article"><div className="site-kicker">{page.tags?.join('　/　')}</div><h2>{page.title}</h2>{page.subtitle && <p className="site-subtitle">{page.subtitle}</p>}<div className="article-byline"><span className="mini-avatar">{page.author?.charAt(0) || '·'}</span><span>{page.author || '匿名用户'}</span><span>·</span><span>{page.date || '日期不详'}</span></div><div className="article-body">{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{page.links && page.links.length > 0 && <div className="related-links"><strong>关联页面</strong>{page.links.map((link) => <button key={link.pageId} onClick={() => navigate(link.pageId)}>{link.label} <span>↗</span></button>)}</div>}</div></div>}
          </div><div className="browser-footer"><span>ARCHIVED NETWORK · 所有内容均为虚构</span><span>{page.url}</span></div>
        </section>}
        {panel === 'clues' && <section className="board"><div className="board-intro"><span className="board-icon">◈</span><div><strong>{collected.length} 条已收集线索</strong><p>浏览页面后点击“收集线索”，证据会保存在这里。</p></div></div><div className="clue-grid">{collected.length ? collected.map((clue) => <article className="clue-card" key={clue.id}><div className="clue-card-top"><span>{categoryLabels[clue.category]}</span><small>#{clue.id}</small></div><h3>{clue.title}</h3><p>{clue.description}</p><button onClick={() => navigate(clue.sourcePageId)}>查看来源 ↗</button></article>) : <div className="empty-board">线索板还是空的。先打开搜索引擎，探索归档页面。</div>}</div><div className="notes"><label htmlFor="investigation-note">调查笔记</label><p>写下你的推测，内容会自动保存在本机浏览器。</p><textarea id="investigation-note" value={save.note} onChange={(event) => setSave((old) => old ? { ...old, note: event.target.value } : old)} placeholder="例如：她最后一次出现的时间是……" /></div>{progress === 100 && <div className="completion">所有线索已收集。现在可以根据笔记重建她最后的行动轨迹。</div>}</section>}
        {panel === 'case' && <section className="case-file"><div className="file-header"><span>CASE / {data.id.toUpperCase()}</span><span>● ACTIVE INVESTIGATION</span></div><h2>{data.title}</h2><p className="file-subtitle">{data.subtitle}</p><div className="file-divider" /><div className="file-section"><small>01 / 案件简报</small><p>{data.briefing}</p></div><div className="file-section"><small>02 / 调查目标</small><p>{data.objective}</p></div><div className="file-section"><small>03 / Case Loader</small><p>载入符合模板格式的 JSON 文件，切换到你自己的案件。切换案件会替换当前本地存档。</p><div className="file-actions"><button className="primary-button" onClick={() => fileInput.current?.click()}>导入 Case JSON ↗</button><button className="secondary-button" onClick={resetToDemo}>重玩 Demo</button><input ref={fileInput} type="file" accept=".json,application/json" onChange={importCase} hidden /></div></div><div className="file-footnote">此原型完全在浏览器本地运行。导入文件和调查笔记不会上传到服务器。</div></section>}
      </div>
    </div>
    {panel === 'browser' && <aside className="evidence-rail"><div className="rail-heading"><span>◈</span><div><strong>现场线索</strong><small>PAGE EVIDENCE</small></div></div><p className="rail-intro">查看当前页面中值得保留的细节。</p>{pageClues.length ? pageClues.map((clue) => <article className="rail-clue" key={clue.id}><span>{categoryLabels[clue.category]}</span><h3>{clue.title}</h3><p>{clue.description}</p><button disabled={save.collectedClueIds.includes(clue.id)} onClick={() => collectClue(clue.id)}>{save.collectedClueIds.includes(clue.id) ? '✓ 已收集' : '+ 收集线索'}</button></article>) : <div className="rail-empty">当前页面没有可收集的线索。沿着链接继续探索。</div>}<div className="rail-tip"><strong>调查提示</strong><p>搜索不同关键词，打开页面中的关联链接，留意时间和地点。</p></div></aside>}
    {notice && <div className="toast" role="status"><span>{notice}</span><button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
  </div>
}

export default App
