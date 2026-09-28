import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { CasePage, GameCase } from './case'
import { loadDemoCase, parseCase } from './case'
import { SearchSite, SiteView } from './Sites'
import type { SaveData, Scrap } from './storage'
import { clearSave, readSave, writeSave } from './storage'
import './App.css'

type Panel = 'browser' | 'scraps' | 'reconstruction' | 'case'

const kindNames: Record<CasePage['kind'], string> = {
  search: '搜索', forum: '论坛', profile: '个人空间', blog: '博客',
}

function makeSave(caseData: GameCase): SaveData {
  return {
    caseData, currentPageId: caseData.startPageId, history: [caseData.startPageId],
    historyIndex: 0, scraps: [], note: '', conclusion: '',
  }
}

function App() {
  const [initialSave] = useState(readSave)
  const [save, setSave] = useState<SaveData | null>(initialSave)
  const [ready, setReady] = useState(Boolean(initialSave))
  const [error, setError] = useState('')
  const [panel, setPanel] = useState<Panel>('browser')
  const [query, setQuery] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState<string | null>(null)
  const [draftExcerpt, setDraftExcerpt] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const pageContent = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialSave) return
    loadDemoCase().then((caseData) => setSave(makeSave(caseData)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Case 加载失败。'))
      .finally(() => setReady(true))
  }, [initialSave])

  useEffect(() => {
    if (save && ready) writeSave(save)
  }, [save, ready])

  const caseData = save?.caseData
  const page = caseData?.pages.find((item) => item.id === save?.currentPageId)
  const searchPage = caseData?.pages.find((item) => item.kind === 'search')

  function resetDraft() {
    setDraftTitle(null)
    setDraftExcerpt('')
    setDraftNote('')
    setSelectedText('')
  }

  function navigate(id: string) {
    if (!caseData?.pages.some((item) => item.id === id)) return
    setSave((old) => old ? {
      ...old, currentPageId: id,
      history: [...old.history.slice(0, old.historyIndex + 1), id],
      historyIndex: old.historyIndex + 1,
    } : old)
    setAddress(null)
    resetDraft()
    setPanel('browser')
  }

  function goHistory(direction: -1 | 1) {
    setSave((old) => {
      if (!old) return old
      const next = old.historyIndex + direction
      return next < 0 || next >= old.history.length ? old
        : { ...old, historyIndex: next, currentPageId: old.history[next] }
    })
    setAddress(null)
    resetDraft()
  }

  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!caseData) return
    const entered = (address ?? page?.url ?? '').trim()
    const target = caseData.pages.find((item) => item.url.toLowerCase() === entered.toLowerCase())
    if (target) return navigate(target.id)
    setQuery(entered)
    if (searchPage) navigate(searchPage.id)
  }

  function rememberSelection() {
    const selection = window.getSelection()
    if (!selection?.anchorNode || !selection.focusNode || !pageContent.current ||
      !pageContent.current.contains(selection.anchorNode) ||
      !pageContent.current.contains(selection.focusNode)) return
    setSelectedText(selection.toString().trim().slice(0, 1200))
  }

  function captureSelection() {
    if (!selectedText) {
      setNotice('先在网页中拖选一段文字，再点击“摘录选中文字”。')
      return
    }
    setDraftExcerpt(selectedText)
    setNotice('选中文字已放入摘录框，请自行核对并保存。')
  }

  function saveScrap() {
    if (!page) return
    const title = (draftTitle ?? page.title).trim() || page.title
    const scrap: Scrap = {
      id: crypto.randomUUID(),
      pageId: page.id,
      title,
      excerpt: draftExcerpt.trim(),
      note: draftNote.trim(),
      savedAt: new Date().toISOString(),
    }
    setSave((old) => old ? { ...old, scraps: [scrap, ...old.scraps] } : old)
    resetDraft()
    setNotice('已存入摘录板。')
  }

  function removeScrap(id: string) {
    setSave((old) => old ? { ...old, scraps: old.scraps.filter((item) => item.id !== id) } : old)
  }

  async function importCase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = parseCase(JSON.parse(await file.text()) as unknown)
      if (save && (save.scraps.length || save.note || save.conclusion) &&
        !window.confirm('导入会替换当前摘录、笔记和结论。继续吗？')) return
      setSave(makeSave(imported))
      setQuery('')
      setAddress(null)
      resetDraft()
      setPanel('browser')
      setNotice(`已载入“${imported.title}”。`)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '无法读取 Case 文件。')
    } finally {
      event.target.value = ''
    }
  }

  async function resetToDemo() {
    if (!window.confirm('将清除当前摘录、笔记和结论，重新载入待替换的旧 Demo。继续吗？')) return
    try {
      const demo = await loadDemoCase()
      clearSave()
      setSave(makeSave(demo))
      setQuery('')
      setAddress(null)
      resetDraft()
      setPanel('browser')
      setNotice('旧 Demo 已重新载入。')
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Demo Case 加载失败。')
    }
  }

  if (!ready) return <div className="loading-screen">正在读取本地网页档案…</div>
  if (!save || !caseData || !page) return <main className="loading-screen"><p>{error || 'Case 加载失败。'}</p><button onClick={() => window.location.reload()}>重试</button></main>

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><span className="brand-symbol">▣</span><div><b>LAST SEEN ONLINE</b><small>网络档案浏览器 · v0.2</small></div></div>
      <div className="header-right"><span>本地存档</span><span>｜</span><span>{caseData.id}</span></div>
    </header>
    <nav className="app-nav" aria-label="主导航">
      <button className={panel === 'browser' ? 'selected' : ''} onClick={() => setPanel('browser')}>▤ 浏览网络</button>
      <button className={panel === 'scraps' ? 'selected' : ''} onClick={() => setPanel('scraps')}>✎ 摘录板</button>
      <button className={panel === 'reconstruction' ? 'selected' : ''} onClick={() => setPanel('reconstruction')}>▦ 重建事件</button>
      <button className={panel === 'case' ? 'selected' : ''} onClick={() => setPanel('case')}>◫ 案件资料</button>
      {caseData.status === 'placeholder' && <span className="placeholder-flag">内置旧 Demo · 案件待替换</span>}
    </nav>

    {panel === 'browser' && <main className="browser-layout">
      <section className="browser-window" aria-label="虚拟浏览器">
        <div className="browser-title"><span>▣</span> 档案浏览器 — {page.title}<div className="window-controls"><i>＿</i><i>□</i><i>×</i></div></div>
        <div className="browser-menu">文件(F)　编辑(E)　查看(V)　收藏(A)　工具(T)　帮助(H)</div>
        <div className="browser-toolbar">
          <button aria-label="后退" disabled={save.historyIndex === 0} onClick={() => goHistory(-1)}>◀ <span>后退</span></button>
          <button aria-label="前进" disabled={save.historyIndex >= save.history.length - 1} onClick={() => goHistory(1)}>▶ <span>前进</span></button>
          <button aria-label="回到搜索页" onClick={() => searchPage && navigate(searchPage.id)}>⌂ <span>主页</span></button>
          <form onSubmit={submitAddress}><label htmlFor="browser-address">地址</label><input id="browser-address" value={address ?? page.url} onChange={(event) => setAddress(event.target.value)} /><button type="submit">转到 →</button></form>
        </div>
        <div className="browser-favorites"><b>收藏夹</b>
          {searchPage && <button onClick={() => navigate(searchPage.id)}>搜索</button>}
          {(['forum', 'profile', 'blog'] as const).map((kind) => caseData.pages.filter((item) => item.kind === kind).slice(0, 1).map((item) =>
            <button key={item.id} onClick={() => navigate(item.id)}>{kindNames[kind]}</button>))}
          <span>这些站点仅存在于当前 Case</span>
        </div>
        <div className="browser-page" ref={pageContent} onMouseUp={rememberSelection}>
          {page.kind === 'search'
            ? <SearchSite pages={caseData.pages} query={query} onQueryChange={setQuery} onNavigate={navigate} />
            : <SiteView page={page} onNavigate={navigate} />}
        </div>
        <div className="browser-status"><span>✓ 离线归档 · 只读</span><span>{page.url}</span></div>
      </section>

      <aside className="notebook" aria-label="调查笔记与摘录">
        <div className="notebook-title">✎ 调查笔记 <small>由你决定记录什么</small></div>
        <div className="notebook-paper">
          <p className="notebook-hint">网页不会标出答案。读到值得保留的内容时，可以自己摘录。</p>
          <button className="selection-button" onClick={captureSelection}>摘录选中文字</button>
          <label htmlFor="scrap-title">页面标题</label>
          <input id="scrap-title" value={draftTitle ?? page.title} onChange={(event) => setDraftTitle(event.target.value)} />
          <label htmlFor="scrap-excerpt">文字片段 <small>可自行输入或粘贴</small></label>
          <textarea id="scrap-excerpt" value={draftExcerpt} onChange={(event) => setDraftExcerpt(event.target.value)} placeholder="这段话为什么值得记下？" rows={4} />
          <label htmlFor="scrap-note">我的备注</label>
          <textarea id="scrap-note" value={draftNote} onChange={(event) => setDraftNote(event.target.value)} placeholder="时间、矛盾、待查问题……" rows={3} />
          <button className="save-button" onClick={saveScrap}>保存到摘录板</button>
          <div className="notebook-divider" />
          <label htmlFor="quick-note">临时笔记 <small>自动保存</small></label>
          <textarea id="quick-note" className="quick-note" value={save.note} onChange={(event) => setSave((old) => old ? { ...old, note: event.target.value } : old)} placeholder="随手记下待核对的信息……" rows={6} />
          <button className="plain-link" onClick={() => setPanel('scraps')}>查看我的摘录板 →</button>
        </div>
        <button className="conclusion-shortcut" onClick={() => setPanel('reconstruction')}>▦ 写下结论 / 重建事件 →</button>
      </aside>
    </main>}

    {panel === 'scraps' && <main className="document-page">
      <div className="document-title"><div><small>PERSONAL ARCHIVE / 01</small><h1>摘录板</h1><p>这里只保存你主动选取或输入的内容，不判定哪条是线索。</p></div><button onClick={() => setPanel('browser')}>返回浏览器 →</button></div>
      <div className="document-grid"><section className="scrap-sheet">
        {save.scraps.length ? save.scraps.map((scrap) => <article className="scrap-entry" key={scrap.id}>
          <div className="scrap-entry-top"><span>{new Date(scrap.savedAt).toLocaleString('zh-CN')}</span><button onClick={() => removeScrap(scrap.id)}>移除</button></div>
          <h2>{scrap.title}</h2>
          {scrap.excerpt && <blockquote>{scrap.excerpt}</blockquote>}
          {scrap.note && <p className="scrap-remark">备注：{scrap.note}</p>}
          <button className="source-link" onClick={() => navigate(scrap.pageId)}>回到来源页面 ↗</button>
        </article>) : <div className="empty-sheet">尚无摘录。返回网页，阅读后自行保存标题、文字或备注。</div>}
      </section><aside className="scratchpad"><h2>随手记</h2><p>这份笔记始终保存在当前浏览器。</p><textarea value={save.note} onChange={(event) => setSave((old) => old ? { ...old, note: event.target.value } : old)} placeholder="写下还没有证实的想法……" /></aside></div>
    </main>}

    {panel === 'reconstruction' && <main className="document-page">
      <div className="document-title"><div><small>PERSONAL ARCHIVE / 02</small><h1>重建事件</h1><p>根据你读到的页面与自己的摘录，写下目前能够成立的解释。</p></div><button onClick={() => setPanel('scraps')}>查看摘录 →</button></div>
      <section className="reconstruction-sheet"><div className="reconstruction-note"><b>可以从这些问题开始：</b><span>先后顺序是什么？哪些记录互相矛盾？哪些说法仍无法证实？</span></div><label htmlFor="conclusion-text">我的结论 / 事件重建</label><textarea id="conclusion-text" value={save.conclusion} onChange={(event) => setSave((old) => old ? { ...old, conclusion: event.target.value } : old)} placeholder="我认为事件是这样发生的……" /><p>内容自动保存在本机。本原型不会自动评分，也不会替你揭示答案。</p></section>
    </main>}

    {panel === 'case' && <main className="document-page">
      <div className="document-title"><div><small>CASE LOADER / {caseData.id}</small><h1>案件资料</h1><p>{caseData.title} · {caseData.subtitle}</p></div><button onClick={() => setPanel('browser')}>返回浏览器 →</button></div>
      <section className="case-sheet">
        {caseData.status === 'placeholder' ? <div className="case-placeholder"><strong>旧 Demo：待替换</strong><p>现有文本仅保留作页面样式、搜索和摘录功能的占位验证。新的案件叙事尚未编写。</p></div> : <><h2>案件简报</h2><p>{caseData.briefing}</p><h2>调查目标</h2><p>{caseData.objective}</p></>}
        <div className="case-loader"><h2>载入其他 Case</h2><p>选择符合模板格式的 JSON 文件。导入内容只在本地浏览器读取；原有摘录和笔记会在确认后替换。</p><button onClick={() => fileInput.current?.click()}>选择 Case JSON…</button><input ref={fileInput} type="file" accept=".json,application/json" onChange={importCase} hidden /><small>参考仓库中的 cases/template/case.json。现有 Demo 可随时重新载入。</small></div>
        <button className="reset-demo" onClick={resetToDemo}>重新载入旧 Demo</button>
      </section>
    </main>}

    <footer className="app-footer">Last Seen Online / v0.2　·　虚构网页归档　·　资料仅保存在本机浏览器</footer>
    {notice && <div className="toast" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
  </div>
}

export default App
