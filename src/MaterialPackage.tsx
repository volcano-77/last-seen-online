import type { GameCase } from './case'
import type { SaveData } from './storage'
import { REVIEW_CLAIMS, REVIEW_LEVELS } from './finalReview'
import { DELIVERY_CHANNELS, MATERIAL_PACKAGE_ID } from './materialDelivery'
import type { DeliveryChannelId } from './materialDelivery'
import './MaterialPackage.css'

interface Props {
  caseData: GameCase
  save: SaveData
  onClose: () => void
  onNavigate: (id: string) => void
  onVerify: (channel: DeliveryChannelId) => void
  onDeliver: (channel: DeliveryChannelId) => void
}
interface SourceRecord {
  id: string; title: string; summary: string; type: string; pageTitle: string
  pageId?: string; date?: string; pageDate?: string; capturedAt?: string; origin: string
}

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  page: '公开网页／页面记录', post: '公开帖子', reply: '公开回复', timestamp: '时间记录',
  email: '当事人邮件副本', attachment: '附件副本', 'table-row': '表格条目', photo: '图像记录',
  'file-property': '文件属性', cache: '缓存副本', log: '记录节录', other: '核查记录',
}
const UNRESOLVED = [
  '陈雨跌落瞬间的具体致跌动作，现有材料无法确认。',
  '延迟求助对死亡结果的医学因果，现有材料无法确认。',
  '特殊寻访的完整客户、任务规模及刘佳、赵妍各自是否属于收费订单，现有材料无法确认。',
  '王曼离开后的具体位置及后续持续安全状态，现有材料无法确认。',
]

export default function MaterialPackage({ caseData, save, onClose, onNavigate, onVerify, onDeliver }: Props) {
  const progress = save.materialDelivery
  const sourceRecords = progress.sourceIds.flatMap<SourceRecord>((id) => {
    const evidence = caseData.evidence.find((item) => item.id === id)
    if (evidence) {
      const page = caseData.pages.find((item) => item.id === evidence.sourcePageId)
      return [{ id, title: evidence.title, summary: evidence.summary,
        type: EVIDENCE_TYPE_LABELS[evidence.type] || evidence.type,
        pageTitle: page?.title || '来源页', pageId: evidence.sourcePageId,
        date: evidence.timestamp, pageDate: page?.date, capturedAt: page?.snapshot?.capturedAt,
        origin: page?.author || page?.siteName || '原始保管线索见来源页' }]
    }
    const fact = caseData.facts.find((item) => item.id === id)
    return fact ? [{ id, title: fact.title, summary: fact.summary, type: '阶段结论',
      pageTitle: '由已取得记录交叉建立', pageId: undefined, date: undefined,
      pageDate: undefined, capturedAt: undefined, origin: '原始来源见对应F记录' }] : []
  })

  function channelRow(channel: DeliveryChannelId) {
    const spec = DELIVERY_CHANNELS[channel]
    const found = spec.requiredIds.every((id) => save.discoveredEvidenceIds.includes(id)) &&
      save.visitedPageIds.includes(spec.pageId)
    const verified = channel === 'family' ? progress.familyVerified : progress.mediaVerified
    const receipt = channel === 'family' ? progress.familyDelivered : progress.mediaDelivered
    const address = caseData.variables[spec.addressVariable]
    const updatedAt = caseData.variables[spec.updatedVariable]
    return <section className="material-channel" key={channel} aria-label={spec.name}>
      <h3>{spec.name}</h3>
      <table><tbody>
        <tr><th>渠道</th><td>{found ? address : '尚未从当前公开页面核验'}</td></tr>
        <tr><th>核验来源</th><td>{found ? `${spec.pageId === 'news_tips_current' ? '资讯网当前栏目' : '家属后续公开说明'} · ${spec.requiredIds.join('、')}` : '请先沿已有页面找到现行说明，并展开两项记录。'}</td></tr>
        <tr><th>最后确认日期</th><td>{found ? updatedAt : '未核验'}</td></tr>
        <tr><th>材料类型</th><td>含结论、证明边界与来源索引的案件复核材料包</td></tr>
        <tr><th>材料包编号</th><td>{MATERIAL_PACKAGE_ID}</td></tr>
      </tbody></table>
      {!found && <button type="button" onClick={() => onNavigate(spec.startPageId)}>
        {channel === 'family' ? '从家属维权报道查找' : '从资讯网首页查找'}</button>}
      {found && !verified && <button type="button" onClick={() => onVerify(channel)}>核验该渠道仍有效</button>}
      {found && verified && !receipt && <button type="button" onClick={() => onDeliver(channel)}>向此渠道提交复核材料</button>}
      {receipt && <p className="material-receipt" role="status">提交记录已保存。{receipt.channelId} · {receipt.packageId} · {new Date(receipt.submittedAt).toLocaleString('zh-CN')}</p>}
    </section>
  }

  return <section className="material-sheet" aria-label="案件复核材料包">
    <div className="material-paper">
      <header><div><small>调查资料 / 复核材料</small><h1>案件复核材料包</h1>
        <p>编号 {MATERIAL_PACKAGE_ID}　·　复核材料预览</p></div><button type="button" onClick={onClose}>返回网页</button></header>
      <div className="material-body">
        <p className="material-note">本材料由公开网页、历史存档、当事人授权副本及记者核查记录整理。部分陈述只能达到较强支持，不是司法认定；整理者未接触警方非公开卷宗。</p>
        <details open><summary>一、结论摘要</summary>
          <h2>现有材料能够确认</h2>
          <ol>{REVIEW_CLAIMS.filter((claim) => claim.expected === 'confirmed').map((claim) =>
            <li key={claim.id}><b>{claim.statement}</b><small>复核等级：{REVIEW_LEVELS.find((level) => level.id === save.finalReview.items[claim.id]?.level)?.label}</small></li>)}</ol>
          <h2>需要保留谨慎措辞</h2>
          <ol>{REVIEW_CLAIMS.filter((claim) => claim.expected === 'supported').map((claim) =>
            <li key={claim.id}><b>{claim.statement}</b><small>{claim.boundary}</small></li>)}</ol>
          <h2>不能由现有材料推出</h2>
          <ol>{REVIEW_CLAIMS.filter((claim) => claim.expected === 'unproven').map((claim) =>
            <li key={claim.id}><b>{claim.statement}</b><small>{claim.boundary}</small></li>)}</ol>
        </details>
        <details><summary>二、证明边界</summary><ul>
          {REVIEW_CLAIMS.filter((claim) => claim.expected !== 'unproven').map((claim) =>
            <li key={claim.id}><b>{claim.statement}</b><br />{claim.boundary}</li>)}
        </ul></details>
        <details><summary>三、来源索引</summary>
          <p>只列最终复核板实际引用的F记录与C结论。日期分别标注记录时间、页面发布时间与存档抓取时间；原件保管和许可细节应回来源页核验。</p>
          <table className="material-sources"><thead><tr><th>编号与摘要</th><th>来源类型／位置</th><th>时间与保管线索</th></tr></thead><tbody>
            {sourceRecords.map((item) => <tr key={item.id}><td><b>{item.id}</b> {item.title}<small>{item.summary}</small></td>
              <td>{item.type}<br />{item.pageId ? <button type="button" onClick={() => onNavigate(item.pageId!)}>{item.pageTitle}</button> : item.pageTitle}</td>
              <td>{item.date && <>记录时间：{item.date}<br /></>}{item.pageDate && <>页面日期：{item.pageDate}<br /></>}
                {item.capturedAt && <>快照抓取：{item.capturedAt}<br /></>}{item.origin}</td></tr>)}
          </tbody></table>
        </details>
        <details><summary>四、未解决问题</summary><ul>{UNRESOLVED.map((item) => <li key={item}>{item}</li>)}</ul></details>
        <div className="material-delivery">
          <h2>递交复核材料</h2>
          <p>先从公开页面核验两条仍有效的接收渠道。提交仅在游戏内保存记录，不连接现实邮箱。</p>
          {channelRow('family')}{channelRow('media')}
          {progress.dualDeliveryComplete ? <p className="material-complete" role="status"><b>双路递交完成。</b>材料已经送出。后续回应尚未出现。</p> :
            (progress.familyDelivered || progress.mediaDelivered) && <p className="material-pending" role="status">仍有一条独立递交渠道尚未完成。</p>}
        </div>
      </div>
    </div>
  </section>
}
