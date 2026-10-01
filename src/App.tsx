import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import type { CaseMedia, GameCase, UnlockConditions } from './case'
import { SearchSite, SiteView } from './Sites'
import type { SaveData } from './storage'
import { loadCurrentSession, resetCaseSave, writeSave } from './storage'
import { activeTab, closeTab, currentEntry, focusTab, makeTab, openPage, siteKey, travelTab, updateEntry } from './browserState'
import type { NavigateOptions, PageState } from './browserState'
import { canVisitPage } from './siteData'
import { relationChoices } from './recordRelations'
import './App.css'

const add = (old: string[], next: string[] = []) => [...new Set([...old, ...next])]
const normalize = (value: string) => value.replace(/[\s，。？！、：；,.?!:;“”‘’（）()]/g, '').toLowerCase()
type Point = { x: number; y: number }
function meets(gate: UnlockConditions | undefined, save: SaveData) {
  return !gate || (gate.evidenceIds || []).every((id) => save.discoveredEvidenceIds.includes(id)) &&
    (gate.relationIds || []).every((id) => save.establishedRelationIds.includes(id)) &&
    (gate.factIds || []).every((id) => save.unlockedFactIds.includes(id)) &&
    (gate.puzzleIds || []).every((id) => save.completedPuzzleIds.includes(id))
}

export default function App() {
  const [caseData, setCaseData] = useState<GameCase | null>(null)
  const [save, setSave] = useState<SaveData | null>(null)
  const [error, setError] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resetError, setResetError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [relationMessage, setRelationMessage] = useState('')
  const [reload, setReload] = useState(0)
  const [tip, setTip] = useState<(Point & { text: string; evidenceId?: string }) | null>(null)
  const [feedback, setFeedback] = useState<(Point & { text: string }) | null>(null)
  const [storageFailed, setStorageFailed] = useState(false)
  const content = useRef<HTMLDivElement>(null)
  const saveRef = useRef<SaveData | null>(null)
  const restoreScroll = useRef<(() => void) | null>(null)
  const pendingRestore = useRef(false)
  const scrollFrame = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    loadCurrentSession().then((session) => { setCaseData(session.caseData); setSave(session.save) })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '网页读取失败'))
  }, [])
  useEffect(() => {
    if (!save) return
    const failed = !writeSave(save)
    // Publish the external storage result after this render has finished.
    queueMicrotask(() => setStorageFailed(failed))
  }, [save])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const tab = save ? activeTab(save) : null
  const entry = save ? currentEntry(save) : null
  const page = caseData?.pages.find((item) => item.id === entry?.pageId)
  const viewKey = `${tab?.id}/${entry?.id}/${reload}`
  useLayoutEffect(() => { saveRef.current = save }, [save])
  useLayoutEffect(() => {
    const scroller = content.current
    if (!scroller || !entry) return
    pendingRestore.current = true
    const restore = () => {
      if (!pendingRestore.current) return
      const anchor = entry.anchorId ? document.getElementById(entry.anchorId) : null
      const desired = anchor ? anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12 : entry.scrollY
      scroller.scrollTop = Math.max(0, desired)
      const imagesReady = [...scroller.querySelectorAll('img')].every((img) => img.complete)
      if (imagesReady && (anchor || scroller.scrollHeight - scroller.clientHeight >= desired)) {
        pendingRestore.current = false
        setSave((old) => old && currentEntry(old).id === entry.id ? updateEntry(old, { scrollY: scroller.scrollTop, anchorId: undefined }) : old)
      }
    }
    restoreScroll.current = restore
    restore()
    const observer = new ResizeObserver(restore)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)
    return () => { observer.disconnect(); restoreScroll.current = null; if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current) }
    // A history entry is restored once on mount, not on every progress or search-input update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey])
  useEffect(() => {
    const persist = () => { if (saveRef.current) writeSave(updateEntry(saveRef.current, { scrollY: content.current?.scrollTop || 0, anchorId: undefined })) }
    window.addEventListener('pagehide', persist); window.addEventListener('beforeunload', persist)
    return () => { window.removeEventListener('pagehide', persist); window.removeEventListener('beforeunload', persist) }
  }, [])
  function capture(old: SaveData) { return updateEntry(old, { scrollY: content.current?.scrollTop || 0, anchorId: undefined }) }
  function captureScroll() {
    if (pendingRestore.current || !entry) return
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current)
    const scrollY = content.current?.scrollTop || 0, id = entry.id
    scrollFrame.current = requestAnimationFrame(() => {
      setSave((old) => old && currentEntry(old).id === id ? updateEntry(old, { scrollY, anchorId: undefined }) : old)
      scrollFrame.current = null
    })
  }
  function pageState(patch: Partial<PageState>) {
    setSave((old) => old ? updateEntry(old, { state: { ...currentEntry(old).state, ...patch } }) : old)
  }
  function resetChrome() { setAddress(null); setHistoryOpen(false); setSettingsOpen(false); setTip(null); setFeedback(null) }
  function restartCase() {
    if (!caseData) return
    const fresh = resetCaseSave(caseData)
    if (!fresh) { setResetError('无法保存重置结果，当前进度仍保留。请检查浏览器的本地存储权限后重试。'); return }
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = null
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    pendingRestore.current = false
    restoreScroll.current = null
    saveRef.current = fresh
    setSave(fresh)
    resetChrome(); setRecordsOpen(false); setSelected([]); setRelationMessage(''); setResetError(''); setStorageFailed(false)
    window.getSelection()?.removeAllRanges()
    resetDialog.current?.close()
  }
  function switchTab(id: string) { setSave((old) => old ? focusTab(capture(old), id) : old); resetChrome() }
  function dismissTab(id: string) {
    if (!caseData) return
    setSave((old) => {
      if (!old) return old
      if (old.tabs.length === 1) {
        const replacement = makeTab(caseData.pages.find((p) => p.id === (caseData.homePageId || caseData.startPageId))!)
        return { ...capture(old), tabs: [replacement], activeTabId: replacement.id }
      }
      return closeTab(capture(old), id)
    }); resetChrome()
  }
  const mediaCatalog = caseData?.pages.flatMap((item) => [item.media, ...(item.objects || []).map((object) => object.media)])
    .filter((item): item is CaseMedia => Boolean(item?.id && save?.viewedMediaIds.includes(item.id))) || []
  function showFeedback(text: string, anchor: Point = { x: 20, y: 110 }) {
    setFeedback({ text, x: Math.max(8, Math.min(anchor.x, window.innerWidth - 400)),
      y: Math.max(8, Math.min(anchor.y, window.innerHeight - 70)) })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFeedback(null), 1800)
  }
  function navigate(id: string, options: NavigateOptions = {}) {
    const target = caseData?.pages.find((item) => item.id === id)
    if (!target || !save || !meets(target.unlockConditions, save) || !canVisitPage(target, save, page?.id)) return
    const newTab = options.newTab ?? (page?.kind === 'search' || Boolean(page && siteKey(page) !== siteKey(target)))
    setSave((old) => old ? { ...openPage(capture(old), target, newTab, options),
      visitedPageIds: add(old.visitedPageIds, [id]), learnedTools: add(old.learnedTools, target.learnsTool ? [target.learnsTool] : []) } : old)
    resetChrome()
  }
  function travel(direction: number) {
    if (!save) return
    if (!caseData) return
    const next = travelTab(capture(save), direction, caseData.pages)
    const target = caseData.pages.find((item) => item.id === currentEntry(next).pageId)
    if (!target || !meets(target.unlockConditions, next) || !canVisitPage(target, next)) return
    setSave({ ...next, visitedPageIds: add(next.visitedPageIds, [target.id]), learnedTools: add(next.learnedTools, target.learnsTool ? [target.learnsTool] : []) })
    resetChrome()
  }
  function submitAddress(event: FormEvent) {
    event.preventDefault()
    const entered = (address ?? page?.url ?? '').trim().slice(0, 100)
    const target = caseData?.pages.find((item) => item.url.toLowerCase() === entered.toLowerCase())
    if (target) navigate(target.id, { newTab: false })
    else { const search = caseData?.pages.find((item) => item.kind === 'search'); if (search) navigate(search.id,
      { newTab: false, state: { searchInput: entered.slice(0, 32), searchQuery: entered.slice(0, 32), searchSubmitted: true } }) }
  }
  function discover(id: string, anchor?: Point) {
    const evidence = caseData?.evidence.find((item) => item.id === id)
    if (!save || !page || !evidence || evidence.sourcePageId !== page.id || !meets(evidence.unlockConditions, save) ||
      (page.accessPuzzleId && !save.completedPuzzleIds.includes(page.accessPuzzleId)) || save.discoveredEvidenceIds.includes(id)) return
    setSave((old) => old ? { ...old, discoveredEvidenceIds: add(old.discoveredEvidenceIds, [id]), savedEvidenceIds: add(old.savedEvidenceIds, [id]) } : old)
    showFeedback(`✓ 已记下：${evidence.title}`, anchor || (tip ? { x: tip.x, y: tip.y + 42 } : undefined))
  }
  function inspectSelection(event: MouseEvent) {
    if (!page || !caseData || !save || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
    const selection = window.getSelection(), range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (!selection || !range || selection.isCollapsed || !content.current?.contains(range.commonAncestorContainer)) { setTip(null); return }
    const text = selection.toString().trim(), chosen = normalize(text)
    if (text.length < 6 || text.length > 180) { setTip(null); return }
    const evidence = caseData.evidence.find((item) => item.sourcePageId === page.id && item.discovery === 'selection' &&
      item.selectionTexts?.some((phrase) => chosen.includes(normalize(phrase))))
    const rect = range.getBoundingClientRect()
    setTip({ text, evidenceId: evidence?.id, x: Math.max(8, Math.min(rect.left, window.innerWidth - 140)), y: Math.max(8, rect.top - 40) })
  }
  function recordSelection() {
    if (!tip || !save || !page) return
    if (tip.evidenceId) discover(tip.evidenceId)
    else {
      setSave((old) => old ? { ...old, clippings: [...old.clippings.filter((item) => !(item.pageId === page.id && item.text === tip.text)),
        { id: `${Date.now()}`, pageId: page.id, text: tip.text }].slice(-30) } : old)
      showFeedback('✓ 已保留摘句', { x: tip.x, y: tip.y + 42 })
    }
    setTip(null); window.getSelection()?.removeAllRanges()
  }
  function solve(id: string, answer: string): boolean {
    const puzzle = caseData?.puzzles.find((item) => item.id === id)
    if (!puzzle || !save || puzzle.type !== 'short-input' || (puzzle.sourcePageId && puzzle.sourcePageId !== page?.id) ||
      normalize(answer) !== normalize(puzzle.answer || '')) return false
    setSave((old) => old ? { ...old, completedPuzzleIds: add(old.completedPuzzleIds, [id]),
      unlockedFactIds: add(old.unlockedFactIds, puzzle.unlocks?.factIds),
      discoveredEvidenceIds: add(old.discoveredEvidenceIds, puzzle.unlocks?.evidenceIds) } : old)
    return true
  }
  function compareImage(media: CaseMedia, referenceId: string, anchor: Point): boolean {
    if (!caseData || !save || !page) return false
    const reference = mediaCatalog.find((item) => item.id === referenceId)
    const puzzle = caseData.puzzles.find((item) => item.type === 'image-match' && item.sourcePageId === page.id &&
      page.objects?.some((object) => object.id === item.sourceObjectId && object.media?.id === media.id) && item.referenceMediaId === referenceId)
    if (!reference || !media.identityId || media.identityId !== reference.identityId) return false
    if (puzzle) {
      setSave((old) => old ? { ...old, completedPuzzleIds: add(old.completedPuzzleIds, [puzzle.id]) } : old)
      for (const id of puzzle.unlocks?.evidenceIds || []) discover(id, anchor)
    }
    return true
  }
  function confirmRelation() {
    if (!caseData || !save || selected.length < 2) return
    const relation = relationChoices(caseData.relations, save.establishedRelationIds,
      [...save.discoveredEvidenceIds, ...save.unlockedFactIds], selected).complete
    if (!relation) return
    setSave({ ...save, establishedRelationIds: add(save.establishedRelationIds, [relation.id]),
      unlockedFactIds: add(save.unlockedFactIds, relation.unlocks?.factIds),
      checkpointIds: add(save.checkpointIds, relation.checkpointId ? [relation.checkpointId] : []) })
    setRelationMessage('已保留这组对照。'); setSelected([])
  }

  function returnVisit(tabId: string, entryId: string) {
    if (!caseData) return
    setSave((old) => {
      if (!old) return old
      const target = old.tabs.find((item) => item.id === tabId)
      const index = target?.history.findIndex((item) => item.id === entryId) ?? -1
      return target && index >= 0 ? travelTab(focusTab(capture(old), tabId), index - target.historyIndex, caseData.pages) : old
    })
    resetChrome()
  }

  if (!caseData || !save || !page || !tab || !entry) return <main className="loading">{error || '正在读取网页…'}</main>
  const evidence = caseData.evidence.filter((item) => save.discoveredEvidenceIds.includes(item.id))
  const facts = caseData.facts.filter((item) => save.unlockedFactIds.includes(item.id))
  const choices = relationChoices(caseData.relations, save.establishedRelationIds, [...evidence.map((item) => item.id), ...facts.map((item) => item.id)], selected)
  const toggle = (id: string) => { setSelected((old) => old.includes(id) ? old.filter((item) => item !== id) : choices.compatibleIds.includes(id) ? [...old, id] : old); setRelationMessage('') }
  const accessiblePages = caseData.pages.filter((item) => meets(item.unlockConditions, save) && canVisitPage(item, save, page.id))
  const sitePages = accessiblePages.filter((item) => item.normalNavigation !== false || item.siteId === page.siteId ||
    (page.skin === 'archive' && item.snapshot) || save.visitedPageIds.includes(item.id))
  const searchPages = accessiblePages.filter((item) =>
    (!item.accessPuzzleId || save.completedPuzzleIds.includes(item.accessPuzzleId)))
  const recentVisits = [...save.tabs].sort((a, b) => b.lastUsed - a.lastUsed)
    .flatMap((item) => item.history.slice(0, item.historyIndex + 1).reverse().map((visit) => ({ pageId: visit.pageId, tabId: item.id, entryId: visit.id })))
    .filter((item, index, all) => all.findIndex((other) => other.pageId === item.pageId) === index &&
      !['portal', 'search'].includes(caseData.pages.find((target) => target.id === item.pageId)?.kind || '')).slice(0, 6)
  return <main className="browser-window" aria-label="虚拟浏览器">
    <div className="browser-title">▣ {page.title} <small>— Last Seen Online</small></div>
    <div className="browser-tabs" role="tablist" aria-label="网页标签">{save.tabs.map((item) => <div className={`browser-tab${item.id === save.activeTabId ? ' active' : ''}`} key={item.id}>
      <button role="tab" aria-selected={item.id === save.activeTabId} onClick={() => switchTab(item.id)}>{item.title}</button><button className="tab-close" aria-label={`关闭标签：${item.title}`} onClick={() => dismissTab(item.id)}>×</button></div>)}</div>
    <nav className="browser-toolbar" aria-label="浏览器导航">
      <button aria-label="后退" disabled={tab.historyIndex === 0 && !tab.openerTabId} onClick={() => travel(-1)}>←</button>
      <button aria-label="前进" disabled={tab.historyIndex >= tab.history.length - 1} onClick={() => travel(1)}>→</button>
      <button aria-label="刷新" onClick={() => { setSave(capture(save)); setReload((old) => old + 1); setTip(null) }}>↻</button>
      <button aria-label="主页" onClick={() => navigate(caseData.homePageId || caseData.startPageId, { newTab: false })}>⌂</button>
      <button aria-label="历史记录" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>历史</button>
      <form onSubmit={submitAddress}><label htmlFor="browser-address">地址</label><input id="browser-address" maxLength={100} value={address ?? page.url} onChange={(event) => setAddress(event.target.value)} /><button>转到</button></form>
      <button aria-label="记录夹" aria-expanded={recordsOpen} aria-controls="records" onClick={() => setRecordsOpen(!recordsOpen)}>记录 · {evidence.length + save.clippings.length}</button>
      {save.learnedTools.includes('archive') && caseData.archivePageId && <button onClick={() => navigate(caseData.archivePageId!)}>存档</button>}
      <div className="browser-settings" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSettingsOpen(false) }} onKeyDown={(event) => { if (event.key === 'Escape') setSettingsOpen(false) }}>
        <button aria-label="设置" title="设置" aria-expanded={settingsOpen} aria-controls="browser-settings-menu" onClick={() => setSettingsOpen(!settingsOpen)}>⋯</button>
        {settingsOpen && <div className="settings-menu" id="browser-settings-menu"><button onClick={() => { setSettingsOpen(false); setResetError(''); resetDialog.current?.showModal() }}>重新开始本案</button></div>}
      </div>
    </nav>
    <dialog className="reset-dialog" ref={resetDialog} aria-labelledby="reset-title" aria-describedby="reset-description">
      <h2 id="reset-title">重新开始本案</h2><p id="reset-description">这会清除当前案件的浏览历史、标签页、记录、已确认结论、解锁状态和谜题进度，并从案件开头重新开始。是否继续？</p>
      {resetError && <p role="alert" className="reset-error">{resetError}</p>}
      <div className="reset-actions"><button autoFocus onClick={() => resetDialog.current?.close()}>取消</button><button onClick={restartCase}>确认重新开始</button></div>
    </dialog>
    {historyOpen && <div className="history-strip"><b>本标签访问记录</b>{tab.history.slice(0, tab.historyIndex + 1).map((item, index) => { const visited = caseData.pages.find((p) => p.id === item.pageId); return <button key={item.id} onClick={() => travel(index - tab.historyIndex)}>{visited?.title}{visited?.snapshot ? '（副本）' : ''}</button> })}</div>}
    <div className={`browser-workspace${recordsOpen ? ' with-records' : ''}`}>
      <div className="browser-page" ref={content} onMouseUp={inspectSelection} key={viewKey} onScroll={captureScroll}
        onWheel={() => { pendingRestore.current = false }} onPointerDown={() => { pendingRestore.current = false }} onKeyDown={() => { pendingRestore.current = false }} onLoadCapture={() => restoreScroll.current?.()}>
        {page.kind === 'search' ? <SearchSite page={page} pages={searchPages} pageState={entry.state} onStateChange={pageState} onNavigate={navigate} visitedPageIds={save.visitedPageIds} /> :
          <SiteView page={page} pages={sitePages} userProfiles={caseData.userProfiles} visitedPageIds={save.visitedPageIds} onNavigate={navigate} onDiscover={discover}
            recentVisits={recentVisits} onReturnVisit={returnVisit}
            pageState={entry.state} onStateChange={pageState}
            completedPuzzleIds={save.completedPuzzleIds} puzzles={caseData.puzzles} onSolve={solve} mediaCatalog={mediaCatalog}
            onViewMedia={(id) => setSave((old) => old ? { ...old, viewedMediaIds: add(old.viewedMediaIds, [id]) } : old)} onCompareImage={compareImage} />}
      </div>
      {recordsOpen && <aside className="record-pocket" id="records" aria-label="记录夹"><header><b>记录夹</b><button aria-label="收起记录夹" onClick={() => setRecordsOpen(false)}>×</button></header>
        <div className="pocket-paper"><h2>记录</h2>
          {!evidence.length && !save.clippings.length && <p className="muted">暂无记录。</p>}
          {evidence.map((item) => <div className="record-entry" key={item.id}><button className="record-title" aria-pressed={selected.includes(item.id)} disabled={!selected.includes(item.id) && !choices.compatibleIds.includes(item.id)} onClick={() => toggle(item.id)}>{item.title}{selected.includes(item.id) && <small> · 待对照</small>}</button><button className="text-link" onClick={() => navigate(item.sourcePageId)}>回到原页</button></div>)}
          {save.clippings.map((item) => <div className="record-entry excerpt" key={item.id}><p>“{item.text}”</p><button className="text-link" onClick={() => navigate(item.pageId)}>原页</button><button className="text-link" onClick={() => setSave({ ...save, clippings: save.clippings.filter((entry) => entry.id !== item.id) })}>移除</button></div>)}
          <h2>已确认</h2>{!facts.length && <p className="muted">暂无已确认关联。</p>}{facts.map((item) => <div className="record-entry" key={item.id}><button className="record-title" aria-pressed={selected.includes(item.id)} disabled={!selected.includes(item.id) && !choices.compatibleIds.includes(item.id)} onClick={() => toggle(item.id)}>{item.title}{selected.includes(item.id) && <small> · 待对照</small>}</button></div>)}
          {(selected.length > 0 || relationMessage) && <div className="relation-controls">{choices.complete && selected.length >= 2 && <button onClick={confirmRelation}>对照这些记录</button>}{selected.length > 0 && <button onClick={() => { setSelected([]); setRelationMessage('') }}>取消对照</button>}<p role="status">{relationMessage}</p></div>}
        </div></aside>}
    </div>
    {tip && <button className="selection-tip" style={{ left: tip.x, top: tip.y }} onMouseDown={(event) => event.preventDefault()} onClick={recordSelection}>☆ 记下这段</button>}
    {feedback && <div className="record-feedback" role="status" style={{ left: feedback.x, top: feedback.y }}>{feedback.text}</div>}
    {storageFailed && <div className="storage-warning" role="status">浏览器无法保存记录，当前进度仅在本次窗口中保留。</div>}
  </main>
}
