import { useMemo, useState } from 'react'
import type { GameCase } from './case'
import type { SaveData } from './storage'
import { emptyReviewItem, REVIEW_CLAIMS, REVIEW_LEVELS, reviewClaim } from './finalReview'
import type { FinalReviewProgress, ReviewItemProgress, ReviewLevel } from './finalReview'
import './ReviewBoard.css'

interface Props {
  caseData: GameCase
  save: SaveData
  onProgress: (progress: FinalReviewProgress) => void
  onClose: () => void
}
interface AvailableRecord { id: string; title: string; summary: string; source: string; text: string }

export default function FinalReview({ caseData, save, onProgress, onClose }: Props) {
  const [activeId, setActiveId] = useState('E01')
  const [query, setQuery] = useState('')
  const [person, setPerson] = useState('全部人物')
  const [source, setSource] = useState('全部来源')
  const claim = REVIEW_CLAIMS.find((item) => item.id === activeId) || REVIEW_CLAIMS[0]
  const progress = save.finalReview.items[claim.id] || emptyReviewItem()
  const section = claim.id.startsWith('E') ? 'E' : 'X'
  const availableIds = useMemo(() => new Set([...save.discoveredEvidenceIds, ...save.unlockedFactIds]),
    [save.discoveredEvidenceIds, save.unlockedFactIds])
  const records = useMemo<AvailableRecord[]>(() => [
    ...caseData.evidence.filter((item) => save.discoveredEvidenceIds.includes(item.id)).map((item) => {
      const sourcePage = caseData.pages.find((page) => page.id === item.sourcePageId)
      const pageSource = sourcePage?.siteName || sourcePage?.title || '旧网页记录'
      return { id: item.id, title: item.title, summary: item.summary, source: pageSource,
        text: `${item.id} ${item.title} ${item.summary} ${pageSource}`.toLowerCase() }
    }),
    ...caseData.facts.filter((item) => save.unlockedFactIds.includes(item.id)).map((item) => ({
      id: item.id, title: item.title, summary: item.summary, source: '阶段结论',
      text: `${item.id} ${item.title} ${item.summary} 阶段结论`.toLowerCase(),
    })),
  ], [caseData, save.discoveredEvidenceIds, save.unlockedFactIds])
  const recordById = new Map(records.map((item) => [item.id, item]))
  const sources = [...new Set(records.map((item) => item.source))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const hasFilter = Boolean(query.trim()) || person !== '全部人物' || source !== '全部来源'
  const matches = hasFilter ? records.filter((item) =>
    (!query.trim() || item.text.includes(query.trim().toLowerCase())) &&
    (person === '全部人物' || item.text.includes(person.toLowerCase())) &&
    (source === '全部来源' || item.source === source)).slice(0, 31) : []
  const selected = progress.recordIds.map((id) => recordById.get(id)).filter((item): item is AvailableRecord => Boolean(item))

  function updateItem(patch: Partial<ReviewItemProgress>) {
    const updated: ReviewItemProgress = { ...progress, ...patch, reviewed: false, feedback: undefined }
    onProgress({ ...save.finalReview, complete: false,
      items: { ...save.finalReview.items, [claim.id]: updated } })
  }
  function chooseLevel(level: ReviewLevel) { updateItem({ level }) }
  function toggleRecord(id: string) {
    if (!availableIds.has(id)) return
    updateItem({ recordIds: progress.recordIds.includes(id) ? progress.recordIds.filter((item) => item !== id) :
      [...progress.recordIds, id] })
  }
  function reviewSection() {
    const items = { ...save.finalReview.items }
    for (const item of REVIEW_CLAIMS.filter((entry) => entry.id.startsWith(section))) {
      const current = items[item.id] || emptyReviewItem()
      const result = reviewClaim(item, current, availableIds)
      items[item.id] = { ...current, reviewed: result.passed, feedback: result.feedback }
    }
    onProgress({ ...save.finalReview, items, complete: REVIEW_CLAIMS.every((item) => items[item.id]?.reviewed) })
  }
  function showClaim(id: string) { setActiveId(id); setQuery(''); setPerson('全部人物'); setSource('全部来源') }

  return <section className="final-review-sheet" aria-label="案件复核材料整理页">
    <div className="final-review-paper">
      <header className="review-heading">
        <div><small>调查资料 / 结论整理</small><h1>案件复核</h1><p>按已有记录给陈述分级，并注明依据。选择不会立即判定；完成一组后统一复核。</p></div>
        <button type="button" onClick={onClose}>返回网页</button>
      </header>
      {save.finalReview.complete && <p className="review-complete" role="status"><strong>复核完成。</strong>现有结论已整理。可以开始制作案件复核材料。</p>}
      <div className="review-sections" role="group" aria-label="陈述分组">
        <button type="button" aria-pressed={section === 'E'} onClick={() => showClaim('E01')}>核心陈述</button>
        <button type="button" aria-pressed={section === 'X'} onClick={() => showClaim('X01')}>需要核对的说法</button>
      </div>
      <div className="review-layout">
        <nav className="review-index" aria-label="待复核陈述">
          <h2>待复核陈述</h2>
          {REVIEW_CLAIMS.filter((item) => item.id.startsWith(section)).map((item) =>
            <button type="button" key={item.id} aria-current={item.id === claim.id ? 'true' : undefined}
              onClick={() => showClaim(item.id)}><span>{item.id}</span><span>{item.statement}</span>
              {save.finalReview.items[item.id]?.reviewed && <small>已复核</small>}</button>)}
        </nav>
        <div className="review-detail">
          <div className="review-statement"><small>{claim.id} / 待复核陈述</small><h2>{claim.statement}</h2></div>
          <fieldset className="review-levels"><legend>判断栏</legend>
            {REVIEW_LEVELS.map((item) => <label key={item.id}><input type="radio" name={`${claim.id}-level`}
              checked={progress.level === item.id} onChange={() => chooseLevel(item.id)} />{item.label}</label>)}
          </fieldset>
          <div className="review-evidence">
            <h3>引用已有记录</h3>
            <p className="review-hint">可引用已取得的事实 F 与阶段结论 C。按人物、来源或关键词查找；这里不会补入未取得的材料。</p>
            <div className="review-filters">
              <label>人物<select value={person} onChange={(event) => setPerson(event.target.value)}>
                {['全部人物', '陈雨', '许宁', '王曼', '梁志诚', '周启明'].map((item) => <option key={item}>{item}</option>)}
              </select></label>
              <label>来源<select value={source} onChange={(event) => setSource(event.target.value)}>
                <option>全部来源</option>{sources.map((item) => <option key={item}>{item}</option>)}
              </select></label>
              <label>关键词<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="编号或内容" /></label>
            </div>
            <div className="review-record-results" aria-label="可引用记录">
              {!hasFilter && <p>选择筛选条件或输入关键词后显示已有记录。</p>}
              {hasFilter && matches.length === 0 && <p>当前存档中没有匹配记录。</p>}
              {matches.slice(0, 30).map((item) => <button type="button" data-testid={`review-record-${item.id}`} key={item.id}
                aria-pressed={progress.recordIds.includes(item.id)} onClick={() => toggleRecord(item.id)}>
                <b>{item.id}</b><span>{item.title}</span><small>{item.source}</small></button>)}
              {matches.length > 30 && <p>匹配记录较多，请继续缩小范围。</p>}
            </div>
            <h3>已引用</h3>
            <div className="review-selected">{selected.length ? selected.map((item) => <div key={item.id}>
              <span><b>{item.id}</b>　{item.title}</span><button type="button" aria-label={`移除 ${item.id}`} onClick={() => toggleRecord(item.id)}>移除</button>
            </div>) : <p>尚未引用记录。</p>}</div>
          </div>
          {progress.feedback && <p className="review-feedback" role="status"><strong>【{progress.feedback.kind}】</strong>{progress.feedback.text}</p>}
          <div className="review-actions"><button type="button" onClick={reviewSection}>复核这一组</button>
            <p>复核只检查已选的判断与已取得的材料，不会自动补齐证据。</p></div>
        </div>
      </div>
    </div>
  </section>
}
