import type { CasePage } from './case'
import type { SaveData } from './storage'
import { ENDING_SECTION_IDS } from './ending'
import './EndingView.css'

interface Props {
  page: CasePage
  save: SaveData
  onAdvance: (id: string) => void
  onNavigate: (id: string) => void
  onOpenRecords: () => void
}

export default function EndingView({ page, save, onAdvance, onNavigate, onOpenRecords }: Props) {
  const current = save.endingSectionsSeen.length
  return <article className="ending-sheet" aria-label="案件后记">
    <header><small>南城资讯网 / 案件后记</small><h1>{page.title}</h1><p>{page.body[0]}</p></header>
    <div className="ending-body">
      {page.objects?.slice(0, current + 1).map((item, index) => <section key={item.id} id={item.id}>
        <small>{String(index + 1).padStart(2, '0')} / {String(ENDING_SECTION_IDS.length).padStart(2, '0')}</small>
        <h2>{item.title}</h2>{item.body?.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
      </section>)}
      {!save.caseCompleted && current < ENDING_SECTION_IDS.length && <button type="button" onClick={() => onAdvance(ENDING_SECTION_IDS[current])}>
        {current === ENDING_SECTION_IDS.length - 1 ? '读完案件后记' : '继续阅读'}
      </button>}
      {save.caseCompleted && <div className="ending-complete" role="status"><p>案件已结束。已有记录仍可自由回看。</p>
        <button type="button" onClick={onOpenRecords}>返回记录</button>
        <button type="button" onClick={() => onNavigate('news_case_outcomes')}>回看案件后续</button>
        <button type="button" onClick={() => onNavigate('portal_home')}>回到浏览器首页</button>
      </div>}
    </div>
  </article>
}
