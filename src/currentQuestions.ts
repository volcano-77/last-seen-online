import type { SaveData } from './storage'

export interface CurrentQuestions {
  id: string
  questions: string[]
  hint: string
}

// Questions follow confirmed progress. They do not unlock pages or change evidence.
export function currentQuestions(save: SaveData): CurrentQuestions {
  const facts = new Set(save.unlockedFactIds)
  const evidence = new Set(save.discoveredEvidenceIds)
  if (save.caseCompleted) return {
    id: 'afterword',
    questions: ['哪些判断来自当时整理的材料，哪些来自后续独立核查？'],
    hint: '回看各项判断成立的时间和材料范围。',
  }
  if (facts.has('C41')) return {
    id: 'review',
    questions: ['哪些说法能由不同来源共同确认？', '哪些说法仍超出了现有证据？'],
    hint: '把每句话的肯定程度与来源所能证明的范围放在一起看。',
  }
  if (facts.has('C38')) return {
    id: 'wang-departure',
    questions: ['王曼停止公开活动之前，留下过什么说明？', '旧公开资料还能可靠表明她在哪里吗？'],
    hint: '分开看她离开前的决定，以及别人后来能否确认她的位置。',
  }
  if (facts.has('C35')) return {
    id: 'wang',
    questions: ['陈雨事故后，调查材料为什么牵涉王曼？', '围绕她的材料与付费寻访是否属于同一类？'],
    hint: '比较不同内部记录的目标、用途和来源。',
  }
  if (facts.has('C31')) return {
    id: 'mail',
    questions: ['陈雨的调查信息可能通过什么渠道暴露？', '现有记录能确认到哪一步？'],
    hint: '留意发送、转发和后续材料之间的时间与内容对应。',
  }
  if (facts.has('C23')) return {
    id: 'special',
    questions: ['这些编号任务是否只是一次临时要求？', '哪些材料能说明委托、费用与交付的关系？'],
    hint: '单条内部记录与完整服务链能证明的范围不同。',
  }
  if (facts.has('C20')) return {
    id: 'special-start',
    questions: ['许宁与梁的联系是否只始于陈雨事件？', '公开寻人信息可能被怎样使用？'],
    hint: '留意不同时间留下的寻人信息与私下联系。',
  }
  if (facts.has('C12')) return {
    id: '037',
    questions: ['多出的那一份图像记录与哪起事件有关？', '恢复的画面能证明什么，又不能证明什么？'],
    hint: '把图像的来源、时间和画面本身分别核对。',
  }
  if (facts.has('C06')) return {
    id: 'chen-followup',
    questions: ['陈雨继续核查之后，遭遇了什么？', '她留下的调查材料是否只有她自己保管？'],
    hint: '按时间比较她的调查、收到的威胁和之后的公开记录。',
  }
  if (facts.has('C03') || evidence.has('F09') || evidence.has('F10')) return {
    id: 'chen',
    questions: ['是谁最早注意到这些寻人帖的时间异常？', '陈雨到底整理过什么？'],
    hint: '留意公开发帖时间与当事人留下的其他记录能否相互印证。',
  }
  if (evidence.has('F05') || evidence.has('F06') || evidence.has('F07') || facts.has('C02')) return {
    id: 'zhao',
    questions: ['这是不是只发生在刘佳身上？', '赵妍的寻人信息，与她当时留下的公开记录是否一致？'],
    hint: '比较另一条寻人信息的发布时间与当事人后来的公开活动。',
  }
  if (evidence.has('F02') || facts.has('C01')) return {
    id: 'liu-followup',
    questions: ['如果刘佳当时还在正常活动，为什么已经有人发布寻人启事？', '还有没有类似的情况？'],
    hint: '先确认两种记录的时间先后，再想想这种异常是否孤立。',
  }
  return {
    id: 'liu-start',
    questions: ['这条寻人启事是什么时候发布的？', '刘佳在它发布之后，还留下过活动记录吗？'],
    hint: '留意寻人帖的发布时间，以及刘佳之后留下的公开活动。',
  }
}
