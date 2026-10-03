export type ReviewLevel = 'confirmed' | 'supported' | 'unproven'
export type ReviewFeedbackKind = '证据不足' | '表述过度' | '缺少来源互证' | '材料可以支持'
export interface ReviewFeedback { kind: ReviewFeedbackKind; text: string }
export interface ReviewItemProgress {
  level?: ReviewLevel
  recordIds: string[]
  reviewed: boolean
  feedback?: ReviewFeedback
}
export interface FinalReviewProgress {
  open: boolean
  complete: boolean
  items: Record<string, ReviewItemProgress>
}
interface ReviewSourceGroup { label: string; ids: string[]; missing?: string }
export interface ReviewClaim {
  id: string
  statement: string
  expected: ReviewLevel
  groups: ReviewSourceGroup[]
  relatedIds?: string[]
  boundary: string
  overreach?: string
  underreach?: string
}

export const REVIEW_GATE_FACT_IDS = ['C15', 'C17', 'C20', 'C28', 'C31', 'C34', 'C38', 'C41']
export const REVIEW_LEVELS: { id: ReviewLevel; label: string }[] = [
  { id: 'confirmed', label: '可确认' },
  { id: 'supported', label: '有较强支持，但不能完全确认' },
  { id: 'unproven', label: '无法证明 / 与现有证据冲突' },
]

// Each source group accepts a prior-stage conclusion or the underlying records that cover it.
// Several groups must be represented, while no single exact click combination is required.
export const REVIEW_CLAIMS: ReviewClaim[] = [
  {
    id: 'E01', statement: '梁志诚至少经营过一项向客户收费的“特殊寻访”服务，并有重复运营迹象。', expected: 'confirmed',
    groups: [
      { label: '客户委托与接单', ids: ['C25', 'C28', 'F58-M', 'F60'] },
      { label: '付款关系', ids: ['C25', 'C28', 'F61', 'F62'], missing: '还缺少能够确认付款关系的材料。' },
      { label: '跨任务运行', ids: ['C31', 'F67', 'F70'] },
    ], relatedIds: ['C24', 'C27', 'F58', 'F59', 'F65', 'F66', 'F71'],
    boundary: '只确认收费样本及重复运营结构；不能推断所有S编号都收费。',
  },
  {
    id: 'E02', statement: '特殊寻访会利用公开寻人信息和普通网友目击缩小目标活动范围。', expected: 'confirmed',
    groups: [
      { label: '公开寻人和网友目击', ids: ['C26', 'F57-P', 'F63'] },
      { label: '内部确认或交付中的采用', ids: ['C26', 'C28', 'F64', 'F65'] },
    ], relatedIds: ['C24', 'C25', 'F57'],
    boundary: '只说明这种信息被利用；不证明所有目击真实或每个目标都被精确定位。',
  },
  {
    id: 'E03', statement: '许宁曾是私下寻访的目标，后来在梁的控制下成为有限执行者。', expected: 'confirmed',
    groups: [
      { label: '先前为寻访目标', ids: ['C21', 'F51', 'F52'] },
      { label: '后来受控', ids: ['C22', 'F53'] },
      { label: '有限任务执行', ids: ['C22', 'C23', 'F54', 'F55', 'F56'] },
    ], relatedIds: ['C07', 'F13', 'F14', 'F16', 'F17'],
    boundary: '她的受控经历和实际参与并存；不能称她为业务主谋，也不能免去她参与行为的评价。',
  },
  {
    id: 'E04', statement: '梁通过许宁旧邮箱的控制／转发渠道提前获得陈雨调查信息。', expected: 'confirmed',
    groups: [
      { label: '陈雨发送调查邮件', ids: ['C32', 'F72'] },
      { label: '旧邮箱安全设置变化', ids: ['C33', 'F73'] },
      { label: '变更未经许宁授权', ids: ['C33', 'F76'] },
      { label: '自动转发规则仍有效', ids: ['C33', 'F74'] },
      { label: '目的地址是梁已核工作邮箱', ids: ['C33', 'F75'] },
      { label: '发件、转发与威胁材料的先后', ids: ['C34', 'F77'] },
      { label: '威胁材料出现调查附件内容', ids: ['C08', 'F20'] },
    ], relatedIds: ['F59-A', 'F59-B', 'F60'],
    boundary: '可确认调查材料经该渠道暴露给梁，且后续威胁材料显示内容已被获得；不能证明梁亲手设置转发、具体何时或用何设备查看邮件、谁制作了C08威胁包，或梁独自完成全部后续威胁行为。',
    underreach: '“较强支持”低估了这条陈述的证据等级：现有材料已形成跨来源闭环，能确认调查材料通过旧邮箱转发渠道暴露给梁；谨慎边界针对具体邮箱操作和后续威胁行为。请核对并引用完整来源链。',
  },
  {
    id: 'E05', statement: '陈雨重伤现场出现了与梁志诚高度一致的男子，并在处理她的手机或物品。', expected: 'confirmed',
    groups: [
      { label: '人物身份比对', ids: ['C14', 'F38', 'F40'] },
      { label: '现场行为', ids: ['C15', 'F37'] },
    ], relatedIds: ['C13', 'F36', 'F39', 'C19'],
    boundary: '确认范围是图像中的高度一致和可见行为；不能升级为100%身份鉴定或跌落动作录像。',
  },
  {
    id: 'E06', statement: '现有公开记录中，首次可确认的急救呼叫来自后来发现陈雨的工作人员。', expected: 'confirmed',
    groups: [
      { label: '事故外围时间', ids: ['C17', 'F41', 'F42', 'F43'] },
      { label: '可确认呼叫记录', ids: ['C17', 'F44'] },
    ], relatedIds: ['F26', 'F27', 'C19'],
    boundary: '只限定现有公开记录的首次明确呼叫；不排除未被这些材料覆盖的其他求助尝试。',
  },
  {
    id: 'E07', statement: '现有证据强烈支持：梁知道陈雨仍有生命迹象，却优先处理调查资料并阻止当时立即求助。', expected: 'supported',
    groups: [
      { label: '许宁亲历证言', ids: ['C20', 'F48', 'F49', 'F50'] },
      { label: '037现场行为', ids: ['C15', 'F37'], missing: '目前只有证言还不够；需要037显示的现场行为互证。' },
      { label: '公开急救时间线', ids: ['C17', 'F41', 'F42', 'F43', 'F44'], missing: '还缺公开事故与急救时间记录的互证。' },
    ], relatedIds: ['C19', 'C18', 'F47'],
    boundary: '证言、037和公开时序相互支持，但不能还原每个细节，也不能推出早救必活或预谋杀人。',
    overreach: '这些材料强烈支持知情与阻止当时求助，不能证明延迟必然造成死亡或梁预谋杀人。',
  },
  {
    id: 'E08', statement: '陈雨事故后，王曼因为接收调查材料而成为梁内部R类风险对象；她不是S类付费寻访目标。', expected: 'confirmed',
    groups: [
      { label: '事故后发现材料外传', ids: ['C35', 'F78', 'F80'] },
      { label: 'R任务指向王曼', ids: ['C36', 'F79'] },
      { label: '六图与R来源对应', ids: ['C38', 'C37', 'F81', 'F82', 'F83'] },
    ], relatedIds: ['C11', 'C12', 'C16', 'F30', 'F31', 'F32'],
    boundary: '只认定王曼这项事故后R风险对象及六图威慑用途；不推R任务总量或客户收费。',
  },
  {
    id: 'E09', statement: '037属于陈雨事故现场；038～043属于之后针对王曼的风险威慑材料，“第七张”连接两个事件。', expected: 'confirmed',
    groups: [
      { label: '七扫六印与打印集合', ids: ['C12', 'F34', 'F35'] },
      { label: '037事故身份与时点', ids: ['C16', 'C13', 'C14', 'C18', 'F36', 'F37', 'F47'] },
      { label: '038～043风险来源', ids: ['C16', 'C37', 'C38', 'F81', 'F83'] },
    ], relatedIds: ['F31', 'F33', 'F38', 'F39', 'F40', 'C15'],
    boundary: '连续编号不表示同一组照片；037未被打印，不存在照相馆拒印恐怖照片的证据。',
  },
  {
    id: 'X01', statement: '梁志诚故意把陈雨推下楼梯。', expected: 'unproven',
    groups: [
      { label: '跌落瞬间监控盲区', ids: ['F41', 'C17'] },
      { label: '现场证言和行为边界', ids: ['C19', 'C20', 'F47', 'F48', 'F49', 'F50'] },
    ], relatedIds: ['C15', 'F37', 'F42'],
    boundary: '争执或拉扯与故意推落是不同命题；没有无遮挡的跌落瞬间记录。',
    overreach: 'C20支持梁知情且阻止当时求助，不能把它当成故意推落的直接证明。',
  },
  {
    id: 'X02', statement: '如果当时立即叫救护车，陈雨一定不会死亡。', expected: 'unproven',
    groups: [
      { label: '严重伤情与死亡记录', ids: ['F26', 'F27', 'F28', 'F29'] },
      { label: '已知急救时间边界', ids: ['C17', 'F44', 'C20'] },
    ], relatedIds: ['C19', 'F41', 'F42', 'F43'],
    boundary: '现有材料没有确定的医学反事实结论；延迟求助不能直接推出早救必活。',
  },
  {
    id: 'X03', statement: '刘佳、赵妍以及所有异常寻人案例，都是梁的收费特殊寻访订单。', expected: 'unproven',
    groups: [
      { label: '早期异常模式', ids: ['C03', 'C04', 'F01', 'F02', 'F05', 'F06'] },
      { label: '已核收费样本', ids: ['C25', 'C28', 'F61', 'F62'] },
      { label: '跨任务材料的边界', ids: ['C31', 'F67', 'F71'] },
    ], relatedIds: ['C01', 'C02', 'F03', 'F07', 'F08'],
    boundary: 'S-034有付款闭环；异常模式和跨任务样本不能自动证明每一条寻人帖都收费。',
  },
  {
    id: 'X04', statement: '许宁事先参与策划了陈雨的死亡。', expected: 'unproven',
    groups: [
      { label: '在场与实际参与', ids: ['C18', 'C19', 'F47', 'F48'] },
      { label: '长期受控关系', ids: ['C21', 'C22', 'F53'] },
      { label: '证言可证范围', ids: ['C20', 'F49', 'F50'] },
    ], relatedIds: ['C15', 'F37', 'F42'],
    boundary: '参与见面、在场和后续作证不能证明事先策划死亡；受控经历也不抹去其实际参与。',
  },
  {
    id: 'X05', statement: '王曼因为被梁绑架或杀害，所以后来从公开网络消失。', expected: 'unproven',
    groups: [
      { label: '离开前明确告知', ids: ['F84'] },
      { label: '主动撤离结论', ids: ['C39'] },
      { label: '后续定位未确认', ids: ['C41'] },
    ], relatedIds: ['F85', 'F86', 'F87', 'C40', 'F88'],
    boundary: '现有主动离开材料与绑架／杀害作为公开消失原因相冲突；不能推断她之后一直活着。',
  },
  {
    id: 'X06', statement: 'S-041说明梁至少做过41笔特殊寻访。', expected: 'unproven',
    groups: [
      { label: '局部且非连续的S行', ids: ['F67', 'F69', 'F70', 'C30'] },
      { label: '编号规则与规模边界', ids: ['F71', 'C31'] },
    ], relatedIds: ['C29', 'F68', 'C23'],
    boundary: '编号存在缺口且生成规则未知；局部附件不是全量任务库，最大编号不等于任务总数。',
  },
]

export const REVIEW_CLAIM_IDS = REVIEW_CLAIMS.map((claim) => claim.id)
export const emptyReviewItem = (): ReviewItemProgress => ({ recordIds: [], reviewed: false })
export const emptyFinalReview = (): FinalReviewProgress => ({ open: false, complete: false, items: {} })

export function reviewClaim(claim: ReviewClaim, progress: ReviewItemProgress, availableIds: Set<string>): { passed: boolean; feedback: ReviewFeedback } {
  const selected = progress.recordIds.filter((id) => availableIds.has(id))
  if (!progress.level) return { passed: false, feedback: { kind: '证据不足', text: '请先选择判断类型，再引用已有记录。' } }
  if (progress.level !== claim.expected) {
    if (claim.expected === 'unproven' || (claim.expected === 'supported' && progress.level === 'confirmed'))
      return { passed: false, feedback: { kind: '表述过度', text: claim.overreach || claim.boundary } }
    return { passed: false, feedback: { kind: '材料可以支持', text: claim.underreach || '这条陈述限定了证明范围；请按所引材料的证据等级重新选择判断。' } }
  }
  if (!selected.length) return { passed: false, feedback: { kind: '证据不足', text: '现有记录中还缺少支撑这一判断的材料；请选择已经取得的事实或阶段结论。' } }
  const related = new Set([...claim.groups.flatMap((group) => group.ids), ...(claim.relatedIds || [])])
  if (selected.some((id) => !related.has(id))) return { passed: false, feedback: { kind: '证据不足', text: '所引记录中有与这条陈述无直接关系的材料，请检查来源和证明范围。' } }
  const missing = claim.groups.find((group) => !group.ids.some((id) => selected.includes(id)))
  if (missing) {
    const available = missing.ids.some((id) => availableIds.has(id))
    return { passed: false, feedback: { kind: available ? '缺少来源互证' : '证据不足',
      text: available ? (missing.missing || `还缺少“${missing.label}”类材料的引用。`) : `现有记录中还缺少“${missing.label}”类材料，不能自动补入未取得的事实。` } }
  }
  return { passed: true, feedback: { kind: '材料可以支持', text: `现有不同来源材料能够共同支持这一判断。${claim.boundary}` } }
}
