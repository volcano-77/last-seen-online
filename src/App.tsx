import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
import type { CasePage, GameCase, RelationDefinition, UnlockConditions, Unlocks } from './case'
import { loadDefaultCase, loadDemoCase, loadMockCase, parseCase } from './case'
import { SearchSite, SiteView } from './Sites'
import type { SaveData } from './storage'
import { clearCurrentSave, hasLegacySave, loadCurrentSession, makeSave, writeCustomCase, writeSave } from './storage'
import './App.css'

type Panel = 'browser' | 'records' | 'case'
type SelectionTip = { id: string; x: number; y: number }
type Feedback = { id: number; title: string; x: number; y: number }
const addIds = (old: string[], next: string[] = []) => [...new Set([...old, ...next])]
const normalize = (text: string) => text.replace(/[\s，。？！、：；,.?!:;“”‘’（）()]/g, '').toLowerCase()
const relationIds = (relation: RelationDefinition) => [...(relation.evidenceIds || []), ...(relation.factIds || [])]
function meetsGate(gate: UnlockConditions | undefined, save: SaveData): boolean {
  return !gate || (gate.evidenceIds || []).every((id) => save.discoveredEvidenceIds.includes(id)) &&
    (gate.relationIds || []).every((id) => save.establishedRelationIds.includes(id)) &&
    (gate.factIds || []).every((id) => save.unlockedFactIds.includes(id)) &&
    (gate.puzzleIds || []).every((id) => save.completedPuzzleIds.includes(id))
}
function applyUnlocks(save: SaveData, unlocks?: Unlocks): SaveData {
  return unlocks ? { ...save, unlockedFactIds: addIds(save.unlockedFactIds, unlocks.factIds) } : save
}

function App() {
  const [save, setSave] = useState<SaveData | null>(null)
  const [caseData, setCaseData] = useState<GameCase | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [panel, setPanel] = useState<Panel>('browser')
  const [query, setQuery] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionTip, setSelectionTip] = useState<SelectionTip | null>(null)
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadCurrentSession().then((session) => { setCaseData(session.caseData); setSave(session.save) })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Case 加载失败。'))
      .finally(() => setReady(true))
  }, [])
  useEffect(() => { if (save && ready) writeSave(save) }, [save, ready])
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }, [])

  const page = caseData?.pages.find((item) => item.id === save?.currentPageId)
  const searchPage = caseData?.pages.find((item) => item.kind === 'search')
  const grantedPageIds = new Set(caseData ? [
    ...caseData.relations.filter((item) => save?.establishedRelationIds.includes(item.id)).flatMap((item) => item.unlocks?.pageIds || []),
    ...caseData.puzzles.filter((item) => save?.completedPuzzleIds.includes(item.id)).flatMap((item) => item.unlocks?.pageIds || []),
  ] : [])
  const lockedPageIds = new Set(caseData ? [
    ...caseData.relations.flatMap((item) => item.unlocks?.pageIds || []),
    ...caseData.puzzles.flatMap((item) => item.unlocks?.pageIds || []),
  ] : [])
  function canVisit(target: CasePage): boolean {
    return Boolean(save && meetsGate(target.unlockConditions, save) &&
      (!lockedPageIds.has(target.id) || grantedPageIds.has(target.id)))
  }
  const visiblePages = caseData?.pages.filter(canVisit) || []
  const visiblePageIds = new Set(visiblePages.map((item) => item.id))
  const knownIds = new Set([...(save?.discoveredEvidenceIds || []), ...(save?.unlockedFactIds || [])])
  const candidates = caseData?.relations.filter((item) => !save?.establishedRelationIds.includes(item.id) &&
    selectedIds.every((id) => relationIds(item).includes(id))) || []
  const possibleIds = new Set(candidates.flatMap(relationIds).filter((id) => knownIds.has(id)))
  const exact = candidates.find((item) => relationIds(item).length === selectedIds.length &&
    relationIds(item).every((id) => selectedIds.includes(id)))

  function navigate(id: string) {
    const target = caseData?.pages.find((item) => item.id === id)
    if (!target || !canVisit(target)) return
    setSave((old) => old ? { ...old, currentPageId: id,
      history: [...old.history.slice(0, old.historyIndex + 1), id], historyIndex: old.historyIndex + 1,
      visitedPageIds: addIds(old.visitedPageIds, [id]) } : old)
    setAddress(null); setSelectionTip(null); setHistoryOpen(false); setPanel('browser')
  }
  function goHistory(direction: -1 | 1) {
    setSave((old) => { if (!old) return old; const next = old.historyIndex + direction
      return next < 0 || next >= old.history.length ? old : { ...old, historyIndex: next,
        currentPageId: old.history[next], visitedPageIds: addIds(old.visitedPageIds, [old.history[next]]) } })
    setAddress(null); setSelectionTip(null)
  }
  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entered = (address ?? page?.url ?? '').trim().slice(0, 100)
    const target = visiblePages.find((item) => item.url.toLowerCase() === entered.toLowerCase())
    if (target) navigate(target.id)
    else { setQuery(entered); if (searchPage) navigate(searchPage.id) }
  }
  function discover(id: string, anchor?: { x: number; y: number }) {
    const item = caseData?.evidence.find((entry) => entry.id === id)
    if (!save || !item || item.sourcePageId !== save.currentPageId || !meetsGate(item.unlockConditions, save)) return
    if (save.discoveredEvidenceIds.includes(id)) return
    setSave((old) => old ? { ...old, discoveredEvidenceIds: addIds(old.discoveredEvidenceIds, [id]) } : old)
    const point = anchor || (selectionTip ? { x: selectionTip.x, y: selectionTip.y + 34 } : { x: 20, y: 140 })
    setFeedback({ id: Date.now(), title: item.title, x: Math.min(Math.max(8, point.x), Math.max(8, window.innerWidth - 370)),
      y: Math.min(Math.max(8, point.y), Math.max(8, window.innerHeight - 65)) })
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1800)
    setSelectionTip(null); window.getSelection()?.removeAllRanges()
  }
  function inspectSelection(event: MouseEvent<HTMLDivElement>) {
    if (!page || !caseData || !save || !pageRef.current || event.target instanceof HTMLInputElement) return
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (!selection || !range || selection.isCollapsed || !pageRef.current.contains(range.commonAncestorContainer)) { setSelectionTip(null); return }
    const chosen = normalize(selection.toString())
    if (chosen.length < 6 || chosen.length > 90) { setSelectionTip(null); return }
    const match = caseData.evidence.find((item) => item.sourcePageId === page.id && item.discovery === 'selection' &&
      !save.discoveredEvidenceIds.includes(item.id) && meetsGate(item.unlockConditions, save) &&
      item.selectionTexts?.some((text) => { const phrase = normalize(text); return chosen.includes(phrase) ||
        (chosen.length >= 8 && phrase.includes(chosen)) }))
    if (!match) { setSelectionTip(null); return }
    const rect = range.getBoundingClientRect()
    setSelectionTip({ id: match.id, x: Math.min(window.innerWidth - 115, Math.max(8, rect.left)), y: Math.max(8, rect.top - 42) })
  }
  function confirmRelation() {
    if (!exact) return
    setSave((old) => old ? applyUnlocks({ ...old,
      establishedRelationIds: addIds(old.establishedRelationIds, [exact.id]),
      checkpointIds: exact.checkpointId ? addIds(old.checkpointIds, [exact.checkpointId]) : old.checkpointIds,
    }, exact.unlocks) : old)
    setSelectedIds([]); setNotice('已保存')
  }
  function checkPuzzle(id: string) {
    const puzzle = caseData?.puzzles.find((item) => item.id === id)
    if (!puzzle || !save) return
    const order = save.timelineOrders[id] || puzzle.evidenceIds
    const correct = puzzle.type === 'timeline' ? puzzle.expectedOrder?.every((item, index) => order[index] === item) :
      normalize(shortAnswers[id] || '') === normalize(puzzle.answer || '')
    if (!correct) { setNotice('请再核对原始日期或短答案。'); return }
    setSave((old) => old ? applyUnlocks({ ...old, completedPuzzleIds: addIds(old.completedPuzzleIds, [id]) }, puzzle.unlocks) : old)
    setNotice('已保存')
  }
  function replaceCase(data: GameCase) {
    setCaseData(data); setSave(makeSave(data)); setQuery(''); setAddress(null); setSelectedIds([]); setShortAnswers({}); setPanel('browser'); setRecordsOpen(false)
    setNotice(`已载入“${data.title}”。`)
  }
  function confirmReplace() { return !save || (!save.discoveredEvidenceIds.length && save.history.length <= 1) ||
    window.confirm('载入其他 Case 会替换当前调查状态。继续吗？') }
  async function importCase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return
    try { const data = parseCase(JSON.parse(await file.text()) as unknown); if (confirmReplace()) { clearCurrentSave(); writeCustomCase(data); replaceCase(data) } }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : '无法读取 Case 文件。') }
    finally { event.target.value = '' }
  }
  async function loadBuiltIn(which: 'formal' | 'mock' | 'legacy') {
    if (!confirmReplace()) return
    try { const data = which === 'formal' ? await loadDefaultCase() : which === 'mock' ? await loadMockCase() : await loadDemoCase()
      clearCurrentSave(); replaceCase(data) }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Case 加载失败。') }
  }

  if (!ready) return <div className="loading-screen">正在读取本地网页档案…</div>
  if (!save || !caseData || !page) return <main className="loading-screen"><p>{error || 'Case 加载失败。'}</p><button onClick={() => window.location.reload()}>重试</button></main>
  const recordTitle = (id: string) => caseData.evidence.find((item) => item.id === id)?.title ||
    caseData.facts.find((item) => item.id === id)?.title || id
  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol">▣</span><div><b>LAST SEEN ONLINE</b><small>旧网页存档浏览器</small></div></div><div className="header-right">本地存档　｜　{caseData.title}</div></header>
    <nav className="app-nav" aria-label="主导航"><button className={panel === 'browser' ? 'selected' : ''} onClick={() => setPanel('browser')}>▤ 浏览网络</button><button className={panel === 'records' ? 'selected' : ''} onClick={() => setPanel('records')}>▦ 记录</button><button className={panel === 'case' ? 'selected' : ''} onClick={() => setPanel('case')}>◫ 案件资料</button>{caseData.status !== 'ready' && <span className="placeholder-flag">{caseData.status === 'developer-mock' ? '开发者测试材料 · 非正式剧情' : '旧 Demo · 待替换'}</span>}</nav>

    {panel === 'browser' && <main className={`browser-layout${recordsOpen ? ' records-open' : ''}`}><section className="browser-window" aria-label="虚拟浏览器">
      <div className="browser-title"><span>▣</span> 档案浏览器 — {page.title}<div className="window-controls"><i>＿</i><i>□</i><i>×</i></div></div>
      <div className="browser-menu">文件(F)　编辑(E)　查看(V)　收藏(A)　工具(T)　帮助(H)</div>
      <div className="browser-toolbar"><button aria-label="后退" disabled={save.historyIndex === 0} onClick={() => goHistory(-1)}>◀ <span>后退</span></button><button aria-label="前进" disabled={save.historyIndex >= save.history.length - 1} onClick={() => goHistory(1)}>▶ <span>前进</span></button><button aria-label="刷新" onClick={() => { setReloadKey((old) => old + 1); setSelectionTip(null) }}>⟳ <span>刷新</span></button><button aria-label="主页" onClick={() => navigate(caseData.startPageId)}>⌂ <span>主页</span></button><button aria-label="历史记录" onClick={() => setHistoryOpen(!historyOpen)}>▤ <span>历史</span></button><form onSubmit={submitAddress}><label htmlFor="browser-address">地址</label><input id="browser-address" maxLength={100} value={address ?? page.url} onChange={(event) => setAddress(event.target.value)} /><button type="submit">转到 →</button></form><button className="toolbar-records" aria-controls="browser-records" aria-expanded={recordsOpen} onClick={() => setRecordsOpen(!recordsOpen)}>▦ 记录 · {save.discoveredEvidenceIds.length}{recordsOpen ? ' ×' : ''}</button></div>
      {historyOpen && <div className="history-strip"><b>最近访问</b>{[...save.visitedPageIds].reverse().slice(0, 10).map((id) => <button key={id} onClick={() => navigate(id)}>{caseData.pages.find((item) => item.id === id)?.title}</button>)}</div>}
      <div className="browser-favorites"><b>收藏夹</b>{visiblePages.filter((item) => item.bookmark).map((item) => <button key={item.id} onClick={() => navigate(item.id)}>{item.title}</button>)}<span>离线归档 · 只读</span></div>
      <div className="browser-page" ref={pageRef} onMouseUp={inspectSelection} key={`${page.id}-${reloadKey}`}>{page.kind === 'search' ? <SearchSite pages={visiblePages} query={query} onQueryChange={setQuery} onNavigate={navigate} /> : <SiteView page={page} pages={visiblePages} onNavigate={navigate} onDiscover={discover} discoveredEvidenceIds={save.discoveredEvidenceIds} visiblePageIds={visiblePageIds} />}</div>
      <div className="browser-status"><span>✓ 离线归档 · 只读</span><span>{page.url}</span></div></section>
      {recordsOpen && <aside id="browser-records" className="notebook evidence-pocket" aria-label="记录夹"><div className="notebook-title">☆ 记录夹 <button className="pocket-close" aria-label="收起记录夹" onClick={() => setRecordsOpen(false)}>×</button><small>网页摘录 · 本地保存</small></div><div className="notebook-paper"><p className="notebook-hint">这里保留已查看内容的短摘要。</p><div className="pocket-list-title">最近记下</div>{save.discoveredEvidenceIds.length ? [...save.discoveredEvidenceIds].reverse().slice(0, 5).map((id) => { const item = caseData.evidence.find((entry) => entry.id === id); return item ? <div className="pocket-record" key={id}><button onClick={() => navigate(item.sourcePageId)}>{item.title}</button><small>{item.summary}</small></div> : null }) : <p className="pocket-empty">尚无记录。可查看网页时间、详情，或选中正文片段。</p>}<div className="pocket-list-title">已确认</div>{save.unlockedFactIds.map((id) => <p className="pocket-fact" key={id}>{recordTitle(id)}</p>)}</div><button className="compare-shortcut" onClick={() => setPanel('records')}>▦ 打开完整记录 →</button></aside>}
    </main>}
    {selectionTip && panel === 'browser' && <button className="selection-tip" style={{ left: selectionTip.x, top: selectionTip.y }} onMouseDown={(event) => event.preventDefault()} onClick={() => discover(selectionTip.id)}>☆ 记下这段</button>}
    {feedback && panel === 'browser' && <div key={feedback.id} className="record-feedback" role="status" style={{ left: feedback.x, top: feedback.y }}>✓ 已记下：{feedback.title}</div>}

    {panel === 'records' && <main className="document-page compact-document"><div className="document-title"><div><small>LOCAL ARCHIVE / RECORDS</small><h1>记录</h1><p>从已见内容中核对关联；日期与文字仍可回到原网页查看。</p></div><button onClick={() => setPanel('browser')}>返回浏览器 →</button></div><div className="record-layout"><section className="record-ledger"><h2>已记下</h2>{save.discoveredEvidenceIds.length ? save.discoveredEvidenceIds.map((id) => { const item = caseData.evidence.find((entry) => entry.id === id)!; return <div className="record-line" key={id}><div><b>{item.title}</b><p>{item.summary}</p><small>{item.timestamp}</small><button onClick={() => navigate(item.sourcePageId)}>查看来源 ↗</button></div><button className="record-select" disabled={!possibleIds.has(id) && !selectedIds.includes(id)} onClick={() => setSelectedIds((old) => old.includes(id) ? old.filter((entry) => entry !== id) : [...old, id])}>{selectedIds.includes(id) ? '✓ 已选' : '选择'}</button></div> }) : <p>尚无记录。返回网页查看时间详情或选中文字。</p>}</section>
      <section className="record-ledger"><h2>已确认</h2>{save.unlockedFactIds.length ? save.unlockedFactIds.map((id) => { const fact = caseData.facts.find((entry) => entry.id === id)!; return <div className="record-line" key={id}><div><b>{fact.title}</b><p>{fact.summary}</p></div><button className="record-select" disabled={!possibleIds.has(id) && !selectedIds.includes(id)} onClick={() => setSelectedIds((old) => old.includes(id) ? old.filter((entry) => entry !== id) : [...old, id])}>{selectedIds.includes(id) ? '✓ 已选' : '选择'}</button></div> }) : <p>尚未确认关联。</p>}<div className="relation-desk"><h3>核对关联</h3><p>{selectedIds.length ? selectedIds.map(recordTitle).join(' ＋ ') : '先选择一条记录，再选择与它有关的已知记录。'}</p>{selectedIds.length > 0 && <button onClick={() => setSelectedIds([])}>清除所选</button>}<button disabled={!exact} onClick={confirmRelation}>确认关联</button></div>
        {caseData.puzzles.filter((puzzle) => puzzle.evidenceIds.every((id) => save.discoveredEvidenceIds.includes(id))).map((puzzle) => { const completed = save.completedPuzzleIds.includes(puzzle.id); const order = save.timelineOrders[puzzle.id] || puzzle.evidenceIds; return <div className="puzzle-block" key={puzzle.id}><h3>{puzzle.title}</h3>{puzzle.type === 'timeline' ? <ol className="timeline-order">{order.map((id, index) => <li key={id}><span>{recordTitle(id)}<small>{caseData.evidence.find((item) => item.id === id)?.timestamp}</small></span><button disabled={completed || index === 0} onClick={() => { const next = [...order]; [next[index], next[index - 1]] = [next[index - 1], next[index]]; setSave((old) => old ? { ...old, timelineOrders: { ...old.timelineOrders, [puzzle.id]: next } } : old) }}>↑</button><button disabled={completed || index === order.length - 1} onClick={() => { const next = [...order]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setSave((old) => old ? { ...old, timelineOrders: { ...old.timelineOrders, [puzzle.id]: next } } : old) }}>↓</button></li>)}</ol> : <input aria-label={puzzle.title} maxLength={32} value={shortAnswers[puzzle.id] || ''} disabled={completed} onChange={(event) => setShortAnswers((old) => ({ ...old, [puzzle.id]: event.target.value }))} />}<button disabled={completed} onClick={() => checkPuzzle(puzzle.id)}>{completed ? '已确认' : '核对'}</button></div> })}</section></div></main>}

    {panel === 'case' && <main className="document-page compact-document"><div className="document-title"><div><small>CASE FILE</small><h1>{caseData.title}</h1><p>{caseData.subtitle}</p></div><button onClick={() => setPanel('browser')}>返回浏览器 →</button></div><section className="collection-ledger"><p>{caseData.briefing}</p><p>{caseData.objective}</p>{hasLegacySave() && <p className="legacy-notice">检测到旧版存档。旧 Demo 与当前案件隔离；旧数据不会混入本次记录。</p>}<div className="case-actions"><button onClick={() => void loadBuiltIn('formal')}>载入《寻人启事》当前片段</button><button onClick={() => void loadBuiltIn('mock')}>载入 developer/mock</button><button onClick={() => void loadBuiltIn('legacy')}>载入旧 Demo</button><button onClick={() => fileInput.current?.click()}>导入 Case JSON</button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importCase(event)} /></div></section></main>}
    {notice && <div className="toast" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
  </div>
}
export default App
