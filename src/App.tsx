import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { CasePage, GameCase, PuzzleDefinition, UnlockConditions, Unlocks } from './case'
import { loadDefaultCase, loadDemoCase, parseCase } from './case'
import { SearchSite, SiteView } from './Sites'
import type { SaveData } from './storage'
import { clearCurrentSave, hasLegacySave, readSave, writeSave } from './storage'
import './App.css'

type Panel = 'browser' | 'collection' | 'compare' | 'case'
const kindNames: Partial<Record<CasePage['kind'], string>> = {
  forum: '论坛', 'forum-thread': '论坛', profile: '个人空间', blog: '博客',
  website: '旧网页', email: '邮箱', snapshot: '快照',
}

function makeSave(caseData: GameCase): SaveData {
  return {
    saveVersion: 3, caseData, currentPageId: caseData.startPageId,
    history: [caseData.startPageId], historyIndex: 0,
    visitedPageIds: [caseData.startPageId], discoveredEvidenceIds: [],
    savedEvidenceIds: [], establishedRelationIds: [], unlockedFactIds: [],
    completedPuzzleIds: [], timelineOrders: {},
  }
}
function addIds(current: string[], incoming: string[] = []): string[] {
  return [...new Set([...current, ...incoming])]
}
function meetsGate(gate: UnlockConditions | undefined, save: SaveData): boolean {
  return !gate || (
    (gate.evidenceIds || []).every((id) => save.discoveredEvidenceIds.includes(id)) &&
    (gate.relationIds || []).every((id) => save.establishedRelationIds.includes(id)) &&
    (gate.factIds || []).every((id) => save.unlockedFactIds.includes(id)) &&
    (gate.puzzleIds || []).every((id) => save.completedPuzzleIds.includes(id))
  )
}
function applyUnlocks(old: SaveData, unlocks?: Unlocks): SaveData {
  return unlocks ? { ...old, unlockedFactIds: addIds(old.unlockedFactIds, unlocks.factIds) } : old
}

function App() {
  const [initialSave] = useState(readSave)
  const [save, setSave] = useState<SaveData | null>(initialSave)
  const [ready, setReady] = useState(Boolean(initialSave))
  const [error, setError] = useState('')
  const [panel, setPanel] = useState<Panel>('browser')
  const [query, setQuery] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialSave) return
    loadDefaultCase().then((caseData) => setSave(makeSave(caseData)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Case 加载失败。'))
      .finally(() => setReady(true))
  }, [initialSave])
  useEffect(() => { if (save && ready) writeSave(save) }, [save, ready])

  const caseData = save?.caseData
  const page = caseData?.pages.find((item) => item.id === save?.currentPageId)
  const searchPage = caseData?.pages.find((item) => item.kind === 'search')
  const grantedPageIds = new Set(caseData ? [
    ...caseData.relations.filter((item) => save?.establishedRelationIds.includes(item.id))
      .flatMap((item) => item.unlocks?.pageIds || []),
    ...caseData.puzzles.filter((item) => save?.completedPuzzleIds.includes(item.id))
      .flatMap((item) => item.unlocks?.pageIds || []),
  ] : [])
  const lockedPageIds = new Set(caseData ? [
    ...caseData.relations.flatMap((item) => item.unlocks?.pageIds || []),
    ...caseData.puzzles.flatMap((item) => item.unlocks?.pageIds || []),
  ] : [])
  const grantedEvidenceIds = new Set(caseData ? [
    ...caseData.relations.filter((item) => save?.establishedRelationIds.includes(item.id))
      .flatMap((item) => item.unlocks?.evidenceIds || []),
    ...caseData.puzzles.filter((item) => save?.completedPuzzleIds.includes(item.id))
      .flatMap((item) => item.unlocks?.evidenceIds || []),
  ] : [])
  const lockedEvidenceIds = new Set(caseData ? [
    ...caseData.relations.flatMap((item) => item.unlocks?.evidenceIds || []),
    ...caseData.puzzles.flatMap((item) => item.unlocks?.evidenceIds || []),
  ] : [])
  function canVisit(target: CasePage): boolean {
    return Boolean(save && meetsGate(target.unlockConditions, save) &&
      (!lockedPageIds.has(target.id) || grantedPageIds.has(target.id)))
  }
  const visiblePages = caseData?.pages.filter(canVisit) || []
  const selectedEvidence = caseData?.evidence.find((item) => item.id === selectedEvidenceId)
  const pageEvidence = caseData?.evidence.filter((item) => item.sourcePageId === page?.id &&
    !item.sourceObjectId && save && meetsGate(item.unlockConditions, save) &&
    (!lockedEvidenceIds.has(item.id) || grantedEvidenceIds.has(item.id))) || []

  function navigate(id: string) {
    const target = caseData?.pages.find((item) => item.id === id)
    if (!target) return
    if (!canVisit(target)) { setNotice('这个页面尚未开放。继续查看已找到的材料。'); return }
    setSave((old) => old ? { ...old, currentPageId: id,
      history: [...old.history.slice(0, old.historyIndex + 1), id],
      historyIndex: old.historyIndex + 1,
      visitedPageIds: addIds(old.visitedPageIds, [id]) } : old)
    setAddress(null)
    setSelectedEvidenceId(null)
    setPanel('browser')
  }
  function goHistory(direction: -1 | 1) {
    setSave((old) => {
      if (!old) return old
      const next = old.historyIndex + direction
      return next < 0 || next >= old.history.length ? old :
        { ...old, historyIndex: next, currentPageId: old.history[next],
          visitedPageIds: addIds(old.visitedPageIds, [old.history[next]]) }
    })
    setAddress(null)
    setSelectedEvidenceId(null)
  }
  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entered = (address ?? page?.url ?? '').trim().slice(0, 100)
    const target = caseData?.pages.find((item) => item.url.toLowerCase() === entered.toLowerCase())
    if (target) { navigate(target.id); return }
    setQuery(entered)
    if (searchPage) navigate(searchPage.id)
  }
  function discoverEvidence(id: string) {
    const item = caseData?.evidence.find((entry) => entry.id === id)
    if (!item || !save || !meetsGate(item.unlockConditions, save) ||
      (lockedEvidenceIds.has(id) && !grantedEvidenceIds.has(id))) {
      setNotice('这项记录目前无法查看。'); return
    }
    setSave((old) => old ? { ...old,
      discoveredEvidenceIds: addIds(old.discoveredEvidenceIds, [id]) } : old)
    setSelectedEvidenceId(id)
    setNotice('已查看记录。可点击收藏，或继续浏览。')
  }
  function toggleSaveEvidence(id: string) {
    setSave((old) => old ? { ...old, savedEvidenceIds: old.savedEvidenceIds.includes(id) ?
      old.savedEvidenceIds.filter((item) => item !== id) : addIds(old.savedEvidenceIds, [id]) } : old)
  }
  function toggleCompare(id: string) {
    setCompareIds((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id])
  }
  function confirmRelation() {
    const match = caseData?.relations.find((item) => item.evidenceIds.length === compareIds.length &&
      item.evidenceIds.every((id) => compareIds.includes(id)))
    if (!match || !save) { setNotice('这些记录尚不能建立已定义的关联。可以换一组再试。'); return }
    setSave((old) => old ? applyUnlocks({ ...old,
      establishedRelationIds: addIds(old.establishedRelationIds, [match.id]) }, match.unlocks) : old)
    setCompareIds([])
    setNotice(`关联成立：${match.title}`)
  }
  function currentOrder(puzzle: PuzzleDefinition): string[] {
    return save?.timelineOrders[puzzle.id] || puzzle.evidenceIds
  }
  function moveTimeline(puzzle: PuzzleDefinition, index: number, direction: -1 | 1) {
    const order = [...currentOrder(puzzle)]
    const next = index + direction
    if (next < 0 || next >= order.length) return
    ;[order[index], order[next]] = [order[next], order[index]]
    setSave((old) => old ? { ...old, timelineOrders: { ...old.timelineOrders, [puzzle.id]: order } } : old)
  }
  function checkTimeline(puzzle: PuzzleDefinition) {
    if (!puzzle.expectedOrder?.every((id, index) => currentOrder(puzzle)[index] === id)) {
      setNotice('顺序还需核对。查看每项记录的日期后再试。'); return
    }
    setSave((old) => old ? applyUnlocks({ ...old,
      completedPuzzleIds: addIds(old.completedPuzzleIds, [puzzle.id]) }, puzzle.unlocks) : old)
    setNotice('日期顺序已确认。')
  }
  function checkShort(puzzle: PuzzleDefinition) {
    if (shortAnswers[puzzle.id]?.trim().toLowerCase() !== puzzle.answer?.trim().toLowerCase()) {
      setNotice('短输入不匹配。请回到来源页面核对。'); return
    }
    setSave((old) => old ? applyUnlocks({ ...old,
      completedPuzzleIds: addIds(old.completedPuzzleIds, [puzzle.id]) }, puzzle.unlocks) : old)
    setShortAnswers((old) => ({ ...old, [puzzle.id]: '' }))
    setNotice('记录已核对，相关内容现在可以访问。')
  }
  function replaceCase(imported: GameCase) {
    setSave(makeSave(imported))
    setQuery(''); setAddress(null); setSelectedEvidenceId(null); setCompareIds([])
    setShortAnswers({}); setPanel('browser')
    setNotice(`已载入“${imported.title}”。`)
  }
  function confirmReplace(): boolean {
    return !save || (!save.discoveredEvidenceIds.length && save.history.length <= 1) ||
      window.confirm('载入其他 Case 会替换当前 v0.3 调查状态。继续吗？')
  }
  async function importCase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = parseCase(JSON.parse(await file.text()) as unknown)
      if (confirmReplace()) replaceCase(imported)
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : '无法读取 Case 文件。') }
    finally { event.target.value = '' }
  }
  async function loadBuiltIn(which: 'mock' | 'legacy') {
    if (!confirmReplace()) return
    try {
      const imported = which === 'mock' ? await loadDefaultCase() : await loadDemoCase()
      clearCurrentSave()
      replaceCase(imported)
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Case 加载失败。') }
  }

  if (!ready) return <div className="loading-screen">正在读取本地网页档案…</div>
  if (!save || !caseData || !page) return <main className="loading-screen"><p>{error || 'Case 加载失败。'}</p><button onClick={() => window.location.reload()}>重试</button></main>

  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol">▣</span><div><b>LAST SEEN ONLINE</b><small>网络档案浏览器 · 调查骨架</small></div></div><div className="header-right"><span>本地存档</span><span>｜</span><span>{caseData.id}</span></div></header>
    <nav className="app-nav" aria-label="主导航">
      <button className={panel === 'browser' ? 'selected' : ''} onClick={() => setPanel('browser')}>▤ 浏览网络</button>
      <button className={panel === 'collection' ? 'selected' : ''} onClick={() => setPanel('collection')}>☆ 收藏夹</button>
      <button className={panel === 'compare' ? 'selected' : ''} onClick={() => setPanel('compare')}>▦ 记录对照</button>
      <button className={panel === 'case' ? 'selected' : ''} onClick={() => setPanel('case')}>◫ 案件资料</button>
      {caseData.status !== 'ready' && <span className="placeholder-flag">{caseData.status === 'developer-mock' ? '开发者测试材料 · 非正式剧情' : '旧 Demo · 待替换'}</span>}
    </nav>

    {panel === 'browser' && <main className="browser-layout">
      <section className="browser-window" aria-label="虚拟浏览器">
        <div className="browser-title"><span>▣</span> 档案浏览器 — {page.title}<div className="window-controls"><i>＿</i><i>□</i><i>×</i></div></div>
        <div className="browser-menu">文件(F)　编辑(E)　查看(V)　收藏(A)　工具(T)　帮助(H)</div>
        <div className="browser-toolbar">
          <button aria-label="后退" disabled={save.historyIndex === 0} onClick={() => goHistory(-1)}>◀ <span>后退</span></button>
          <button aria-label="前进" disabled={save.historyIndex >= save.history.length - 1} onClick={() => goHistory(1)}>▶ <span>前进</span></button>
          <button aria-label="回到搜索页" onClick={() => searchPage && navigate(searchPage.id)}>⌂ <span>主页</span></button>
          <form onSubmit={submitAddress}><label htmlFor="browser-address">地址</label><input id="browser-address" maxLength={100} value={address ?? page.url} onChange={(event) => setAddress(event.target.value)} /><button type="submit">转到 →</button></form>
        </div>
        <div className="browser-favorites"><b>收藏夹</b>{searchPage && <button onClick={() => navigate(searchPage.id)}>搜索</button>}
          {(['forum', 'forum-thread', 'profile', 'blog', 'website', 'email'] as const).map((kind) => visiblePages.filter((item) => item.kind === kind).slice(0, 1).map((item) =>
            <button key={item.id} onClick={() => navigate(item.id)}>{kindNames[kind]}</button>))}<span>离线归档 · 只读</span></div>
        <div className="browser-page">{page.kind === 'search' ?
          <SearchSite pages={visiblePages} query={query} onQueryChange={setQuery} onNavigate={navigate} /> :
          <SiteView page={page} onNavigate={navigate} onDiscover={discoverEvidence} discoveredEvidenceIds={save.discoveredEvidenceIds} />}</div>
        {pageEvidence.length > 0 && <div className="page-evidence">本页可查看记录：{pageEvidence.map((item) =>
          <button key={item.id} onClick={() => discoverEvidence(item.id)}>{item.title}</button>)}</div>}
        <div className="browser-status"><span>✓ 离线归档 · 只读</span><span>{page.url}</span></div>
      </section>
      <aside className="notebook evidence-pocket" aria-label="发现夹">
        <div className="notebook-title">☆ 发现夹 <small>点击网页中的记录进行查看</small></div>
        <div className="notebook-paper">
          {selectedEvidence ? <div className="inspected-evidence"><small>刚查看的记录</small><h2>{selectedEvidence.title}</h2><p>{selectedEvidence.summary}</p>{selectedEvidence.timestamp && <time>{selectedEvidence.timestamp}</time>}<button onClick={() => toggleSaveEvidence(selectedEvidence.id)}>{save.savedEvidenceIds.includes(selectedEvidence.id) ? '从收藏夹移除' : '☆ 收藏这项记录'}</button></div>
            : <p className="notebook-hint">阅读网页，点击时间戳、回复、文件属性等可查看的对象。这里不会预先标出答案。</p>}
          <div className="pocket-list-title">已收藏的来源</div>
          {save.savedEvidenceIds.length ? save.savedEvidenceIds.map((id) => {
            const item = caseData.evidence.find((entry) => entry.id === id)
            return item ? <button className="pocket-item" key={id} onClick={() => { setSelectedEvidenceId(id); navigate(item.sourcePageId); setSelectedEvidenceId(id) }}>{item.title}</button> : null
          }) : <p className="pocket-empty">尚未收藏。收藏只需点击，不必写笔记。</p>}
        </div>
        <button className="compare-shortcut" onClick={() => setPanel('compare')}>▦ 前往记录对照 →</button>
      </aside>
    </main>}

    {panel === 'collection' && <main className="document-page compact-document">
      <div className="document-title"><div><small>PERSONAL ARCHIVE / 01</small><h1>收藏夹</h1><p>摘要由档案自动生成，保留来源链接。</p></div><button onClick={() => setPanel('browser')}>返回浏览器 →</button></div>
      <section className="collection-ledger">{save.savedEvidenceIds.length ? save.savedEvidenceIds.map((id) => {
        const item = caseData.evidence.find((entry) => entry.id === id)
        return item ? <article key={id}><h2>{item.title}</h2><p>{item.summary}</p>{item.timestamp && <time>{item.timestamp}</time>}<div><button onClick={() => navigate(item.sourcePageId)}>打开来源 ↗</button><button onClick={() => toggleSaveEvidence(id)}>取消收藏</button></div></article> : null
      }) : <p>还没有收藏记录。网页中可查看的对象可以一键收藏。</p>}</section>
    </main>}

    {panel === 'compare' && <main className="document-page compact-document">
      <div className="document-title"><div><small>ARCHIVE DESK / 02</small><h1>记录对照</h1><p>选择已查看的记录，核对关联或按日期排序。</p></div><button onClick={() => setPanel('browser')}>返回浏览器 →</button></div>
      <div className="compare-layout"><section className="compare-sheet"><h2>证据配对</h2><p>选择两项或更多记录，再核对它们之间是否存在关联。</p>
        <div className="compare-options">{save.discoveredEvidenceIds.map((id) => {
          const item = caseData.evidence.find((entry) => entry.id === id)
          return item ? <label key={id}><input type="checkbox" checked={compareIds.includes(id)} onChange={() => toggleCompare(id)} /><span>{item.title}<small>{item.timestamp || item.type}</small></span></label> : null
        })}</div>
        {!save.discoveredEvidenceIds.length && <p>先从网页中查看一些记录。</p>}
        <button disabled={compareIds.length < 2} onClick={confirmRelation}>核对所选记录</button>
        {save.establishedRelationIds.map((id) => { const item = caseData.relations.find((entry) => entry.id === id); return item ? <div className="confirmed-relation" key={id}><strong>{item.title}</strong><p>{item.summary}</p></div> : null })}
      </section><section className="compare-sheet"><h2>日期与短解密</h2>
        {caseData.puzzles.map((puzzle) => {
          const available = puzzle.evidenceIds.every((id) => save.discoveredEvidenceIds.includes(id))
          const completed = save.completedPuzzleIds.includes(puzzle.id)
          return <div className="puzzle-block" key={puzzle.id}><h3>{puzzle.title}</h3>
            {!available ? <p>相关记录尚未全部查看。</p> : puzzle.type === 'timeline' ? <><p>按日期先后移动记录：</p><ol className="timeline-order">{currentOrder(puzzle).map((id, index) => {
              const item = caseData.evidence.find((entry) => entry.id === id)!
              return <li key={id}><span>{item.title}<small>{item.timestamp || '日期未记录'}</small></span><button aria-label={`上移 ${item.title}`} disabled={index === 0 || completed} onClick={() => moveTimeline(puzzle, index, -1)}>↑</button><button aria-label={`下移 ${item.title}`} disabled={index === puzzle.evidenceIds.length - 1 || completed} onClick={() => moveTimeline(puzzle, index, 1)}>↓</button></li>
            })}</ol><button disabled={completed} onClick={() => checkTimeline(puzzle)}>{completed ? '顺序已确认' : '核对顺序'}</button></> :
              <><p>{puzzle.prompt || '输入从记录中找到的简短答案。'}</p><div className="short-input"><input aria-label={puzzle.title} maxLength={32} autoComplete="off" value={shortAnswers[puzzle.id] || ''} disabled={completed} onChange={(event) => setShortAnswers((old) => ({ ...old, [puzzle.id]: event.target.value }))} /><button disabled={completed || !shortAnswers[puzzle.id]?.trim()} onClick={() => checkShort(puzzle)}>{completed ? '已解锁' : '核对'}</button></div></>}
          </div>
        })}
        {save.unlockedFactIds.length > 0 && <div className="unlocked-facts"><h3>已建立的事实</h3>{save.unlockedFactIds.map((id) => { const fact = caseData.facts.find((item) => item.id === id); return fact ? <p key={id}><strong>{fact.title}</strong> · {fact.summary}</p> : null })}</div>}
      </section></div>
    </main>}

    {panel === 'case' && <main className="document-page compact-document"><div className="document-title"><div><small>CASE LOADER / {caseData.id}</small><h1>案件资料</h1><p>{caseData.title} · {caseData.subtitle}</p></div><button onClick={() => setPanel('browser')}>返回浏览器 →</button></div>
      <section className="case-sheet">{caseData.status !== 'ready' && <div className="case-placeholder"><strong>{caseData.status === 'developer-mock' ? '开发者测试材料' : '旧 Demo：待替换'}</strong><p>{caseData.status === 'developer-mock' ? '只验证点击发现、收藏、关联、排序和短输入；不属于《寻人启事》剧情。' : '旧剧情仅作旧网页展示，不代表新案件。'}</p></div>}
        <h2>说明</h2><p>{caseData.briefing}</p><p>{caseData.objective}</p>
        {hasLegacySave() && <div className="legacy-notice">检测到 v0.1/v0.2 旧存档。它仍保留在浏览器中，但不会自动迁入 v0.3，以免旧 Demo 内容污染新调查。</div>}
        <div className="case-loader"><h2>载入 Case</h2><p>导入本地 JSON，或切换内置测试材料。切换前会确认是否替换当前调查状态。</p><button onClick={() => fileInput.current?.click()}>选择 Case JSON…</button><input ref={fileInput} type="file" accept=".json,application/json" onChange={importCase} hidden /><small>旧 Demo 独立保留；正式《寻人启事》内容尚未制作。</small></div>
        <div className="case-actions"><button onClick={() => loadBuiltIn('mock')}>载入开发者测试材料</button><button onClick={() => loadBuiltIn('legacy')}>查看旧 Demo 占位页</button></div>
      </section></main>}
    <footer className="app-footer">Last Seen Online · 数字调查骨架　·　本地存档　·　非正式案件内容</footer>
    {notice && <div className="toast" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
  </div>
}
export default App
