import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { parseCase } from '../../src/case'
import type { CasePage, EvidenceDefinition, RelationDefinition } from '../../src/case'
import { REVIEW_CLAIMS, REVIEW_LEVELS } from '../../src/finalReview'

export const case01 = parseCase(JSON.parse(readFileSync(join(process.cwd(), 'public/cases/missing-person/phase-01.json'), 'utf8')))
const byPage = new Map(case01.pages.map((item) => [item.id, item]))
const byEvidence = new Map(case01.evidence.map((item) => [item.id, item]))
const byFact = new Map(case01.facts.map((item) => [item.id, item]))
const relationFor = new Map(case01.relations.flatMap((item) => (item.unlocks?.factIds || []).map((id) => [id, item] as const)))

export function savedProgress(page: Page) {
  // Assertions may inspect saved progress. All progress is created through the visible UI.
  return page.evaluate(() => JSON.parse(localStorage.getItem('last-seen-online:v0.5:case:case-01-missing-person') || 'null'))
}

export class Case01Driver {
  private inProgress = new Set<string>()
  constructor(readonly page: Page) {}

  async startFreshCase() {
    await test.step('全新正式存档：刘佳首帖', async () => {
      await this.page.goto('/last-seen-online/')
      await expect(this.page.locator('.browser-title')).toContainText('寻找刘佳')
      await expect(this.page.getByTestId('record-panel')).toBeVisible()
      await expect(this.page.getByTestId('current-question')).toContainText('这条寻人启事是什么时候发布的？')
      await expect(this.page.getByTestId('current-question')).toContainText('刘佳在它发布之后，还留下过活动记录吗？')
      await expect(this.page.getByRole('button', { name: '记录夹', exact: true })).toContainText('记录 · 0')
    })
  }

  async openRecords() {
    const toggle = this.page.getByRole('button', { name: '记录夹', exact: true })
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
    await expect(this.page.getByTestId('record-panel')).toBeVisible()
  }

  async expectRecord(id: string) {
    await this.openRecords()
    await expect(this.page.getByTestId(`record-item-${id}`), `${id} 未进入记录夹`).toBeVisible()
  }

  async hasRecord(id: string) {
    if (this.page.url() === 'about:blank') await this.page.goto('/last-seen-online/')
    await this.openRecords()
    return await this.page.getByTestId(`record-item-${id}`).count() > 0
  }

  async enterAddress(id: string) {
    const target = byPage.get(id)
    if (!target) throw new Error(`未知页面 ${id}`)
    await this.page.getByRole('textbox', { name: '地址' }).fill(target.url)
    await this.page.getByRole('button', { name: '转到' }).click()
    await expect(this.page.locator('.browser-title'), `地址栏未能打开 ${id}`).toContainText(target.title)
  }

  async useSearch(query: string, targetId?: string) {
    await this.page.getByRole('button', { name: '主页', exact: true }).click()
    await this.page.getByRole('textbox', { name: '南城搜索' }).fill(query)
    await this.page.getByRole('button', { name: '搜索' }).click()
    await expect(this.page.locator('.browser-title')).toContainText('南城搜索')
    if (targetId) {
      await this.page.locator(`.fulltext-results a[href="#${targetId}"]`).first().click()
      await expect(this.page.locator('.browser-title')).toContainText(byPage.get(targetId)!.title)
    }
  }

  async goToPage(id: string) {
    const target = byPage.get(id)
    if (!target) throw new Error(`未知页面 ${id}`)
    await this.ensureGate(target)
    if (target.snapshot && id !== 'echo_home') {
      await this.enterAddress('archive_service')
      await this.page.getByRole('textbox', { name: '旧网页地址' }).fill(target.snapshot.originalUrl)
      await this.page.getByRole('button', { name: '查找副本' }).click()
      await this.page.locator(`.archive-results a[href="#${id}"]`).first().click()
      await expect(this.page.locator('.browser-title'), `存档没有打开 ${id}`).toContainText(target.title)
    } else {
      await this.enterAddress(id)
    }
  }

  private async ensureGate(target: CasePage) {
    for (const id of target.unlockConditions?.evidenceIds || []) await this.ensure(id)
    for (const id of target.unlockConditions?.factIds || []) await this.ensure(id)
    for (const id of target.unlockConditions?.puzzleIds || []) await this.solvePuzzle(id)
  }

  private async solvePuzzle(id: string) {
    const puzzle = case01.puzzles.find((item) => item.id === id)
    if (!puzzle || !puzzle.sourcePageId) throw new Error(`谜题 ${id} 没有可操作来源页`)
    if (puzzle.type === 'cache-preview') {
      await this.goToPage(puzzle.sourcePageId)
      const item = byPage.get(puzzle.sourcePageId)!.objects!.find((entry) => entry.recoveryPuzzleId === id)!
      const file = this.page.locator(`[id="${item.id}"]`)
      await file.getByRole('button', { name: new RegExp(item.title.replaceAll('.', '\\.')) }).click()
      if (await file.getByRole('button', { name: '尝试恢复预览' }).count())
        await file.getByRole('button', { name: '尝试恢复预览' }).click()
      if (await this.page.getByRole('button', { name: '关闭图片' }).count())
        await this.page.getByRole('button', { name: '关闭图片' }).click()
    }
  }

  async ensure(id: string): Promise<void> {
    if (await this.hasRecord(id)) return
    if (this.inProgress.has(id)) throw new Error(`依赖循环：${id}`)
    this.inProgress.add(id)
    try {
      if (byEvidence.has(id)) await this.collectEvidence(byEvidence.get(id)!)
      else if (byFact.has(id)) {
        const relation = relationFor.get(id)
        if (!relation) throw new Error(`${id} 没有可通过记录对照建立的关联`)
        for (const input of [...(relation.evidenceIds || []), ...(relation.factIds || [])]) await this.ensure(input)
        await this.compare(relation)
      } else throw new Error(`未知事实或结论：${id}`)
      await this.expectRecord(id)
    } finally {
      this.inProgress.delete(id)
    }
  }

  async compare(relation: RelationDefinition) {
    await test.step(`对照 ${relation.id} → ${(relation.unlocks?.factIds || []).join('、')}`, async () => {
      await this.openRecords()
      for (const id of [...(relation.evidenceIds || []), ...(relation.factIds || [])]) {
        const record = this.page.getByTestId(`record-item-${id}`)
        await expect(record, `${relation.id} 缺少 ${id}`).toBeEnabled()
        await record.click()
      }
      await this.page.getByTestId('compare-records').click()
      for (const id of relation.unlocks?.factIds || []) await this.expectRecord(id)
    })
  }

  private async collectEvidence(evidence: EvidenceDefinition) {
    await test.step(`取得 ${evidence.id}：${evidence.title}`, async () => {
      const source = byPage.get(evidence.sourcePageId)!
      await this.ensureGate(source)
      for (const id of evidence.unlockConditions?.evidenceIds || []) await this.ensure(id)
      for (const id of evidence.unlockConditions?.factIds || []) await this.ensure(id)
      for (const id of evidence.unlockConditions?.puzzleIds || []) await this.solvePuzzle(id)
      await this.goToPage(source.id)
      if (source.accessPuzzleId) {
        const puzzle = case01.puzzles.find((item) => item.id === source.accessPuzzleId)!
        const input = this.page.getByRole('textbox', { name: puzzle.prompt })
        if (await input.count()) {
          await input.fill(puzzle.answer!)
          await this.page.getByRole('button', { name: '提交' }).click()
        }
      }
      if (await this.hasRecord(evidence.id)) return
      if (evidence.discovery === 'selection') await this.selectAndSave(evidence)
      else await this.openDetail(evidence, source)
      await this.expectRecord(evidence.id)
    })
  }

  private async openDetail(evidence: EvidenceDefinition, source: CasePage) {
    const item = source.objects?.find((entry) => entry.id === evidence.sourceObjectId)
    if (item?.type === 'timestamp') {
      await this.page.locator('.browser-page button.timestamp').first().click()
    } else if (item?.type === 'row') {
      await this.page.locator(`[id="${item.id}"] button.sheet-row-label`).click()
    } else if (item?.type === 'photo' || source.media?.evidenceIds?.includes(evidence.id)) {
      const scope = item ? this.page.locator(`[id="${item.id}"]`) : this.page.locator('.browser-page')
      await scope.locator('button.photo-open').first().click()
      await this.expectRecord(evidence.id)
      await this.page.getByRole('button', { name: '关闭图片' }).click()
    } else if (item) {
      await this.page.locator(`[id="${item.id}"] button.log-row`).click()
    } else if (source.id === 'snapshot_wang_preview_cache') {
      await this.solvePuzzle('P_cache_0004')
    } else if (source.snapshot && source.objects?.some((entry) => entry.evidenceId === evidence.id)) {
      // The snapshot bar records its own capture fact when the page opens.
      await this.expectRecord(evidence.id)
    } else throw new Error(`没有为 ${evidence.id} 找到可点击的页面交互`)
  }

  private async selectAndSave(evidence: EvidenceDefinition) {
    const phrase = evidence.selectionTexts![0]
    const paragraph = this.page.locator('.browser-page p').filter({ hasText: phrase }).first()
    await expect(paragraph, `${evidence.id} 的文字未显示：${phrase}`).toBeVisible()
    await paragraph.scrollIntoViewIfNeeded()
    const points = await paragraph.evaluate((element, target) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      while (walker.nextNode()) nodes.push(walker.currentNode as Text)
      const joined = nodes.map((node) => node.textContent || '').join('')
      const start = joined.indexOf(target)
      if (start < 0) return null
      const offset = (position: number) => {
        let remaining = position
        for (const node of nodes) {
          if (remaining <= (node.textContent || '').length) return { node, offset: remaining }
          remaining -= (node.textContent || '').length
        }
        return { node: nodes.at(-1)!, offset: (nodes.at(-1)!.textContent || '').length }
      }
      const first = offset(start), last = offset(start + target.length)
      const range = document.createRange()
      range.setStart(first.node, first.offset)
      range.setEnd(last.node, last.offset)
      const boxes = [...range.getClientRects()]
      if (!boxes.length) return null
      return { start: { x: boxes[0].left + 2, y: boxes[0].top + boxes[0].height / 2 },
        end: { x: boxes.at(-1)!.right - 2, y: boxes.at(-1)!.top + boxes.at(-1)!.height / 2 } }
    }, phrase)
    if (!points) throw new Error(`${evidence.id} 无法用鼠标选择文字：${phrase}`)
    await this.page.mouse.move(points.start.x, points.start.y)
    await this.page.mouse.down()
    await this.page.mouse.move(points.end.x, points.end.y, { steps: 12 })
    await this.page.mouse.up()
    await this.page.getByRole('button', { name: '☆ 记下这段' }).click()
  }

  async reachC01() {
    await this.startFreshCase()
    await test.step('刘佳：发帖、相册、真正失联与对照', async () => {
      await this.page.getByRole('button', { name: /发表于.*09:12/ }).click()
      await this.expectRecord('F01')
      await this.page.getByRole('link', { name: '夏天不喝冰' }).click()
      await this.page.getByRole('link', { name: '个人网站：夏天的小本子' }).click()
      await this.page.getByRole('link', { name: '四月随手拍' }).click()
      await this.page.getByRole('textbox', { name: '我们第一次一起吃饭的地方？' }).fill('二食堂')
      await this.page.getByRole('button', { name: '提交' }).click()
      await this.page.getByRole('button', { name: '查看原图：回教学楼的路上' }).click()
      await this.expectRecord('F02')
      await expect(this.page.getByTestId('current-question')).toContainText('为什么已经有人发布寻人启事？')
      await this.page.getByRole('button', { name: '关闭图片' }).click()
      await this.page.getByRole('button', { name: '主页', exact: true }).click()
      await this.page.getByRole('link', { name: '南城资讯网' }).click()
      await this.page.locator('a[href="#news_liujia_missing"]').first().click()
      await this.selectAndSave(byEvidence.get('F03')!)
      await this.expectRecord('F03')
      await this.compare(relationFor.get('C01')!)
    })
  }

  async reachC05() {
    if (!await this.hasRecord('C01')) await this.reachC01()
    await test.step('早期主线：回声旧站、赵妍与陈雨', async () => {
      await this.enterAddress('forum_liujia_missing')
      await this.page.getByRole('link', { name: '来源：回声寻人网' }).click()
      await expect(this.page.getByRole('heading', { name: '无法显示网页' })).toBeVisible()
      await this.page.getByRole('button', { name: '尝试打开离线副本' }).click()
      await expect(this.page.locator('.browser-title')).toContainText('回声寻人网')
      await this.ensure('F04')
      await this.ensure('F05')
      await this.useSearch(case01.variables.zhaoOldMailbox)
      await expect(this.page.locator('.fulltext-results')).toContainText(case01.variables.zhaoOldMailbox)
      for (const id of ['C02', 'C03', 'C04', 'C05']) await this.ensure(id)
    })
  }

  async reachC12() { if (!await this.hasRecord('C05')) await this.reachC05(); for (const id of ['C06', 'C07', 'C08', 'C10', 'C11', 'C12']) await this.ensure(id) }
  async reachC20() { if (!await this.hasRecord('C12')) await this.reachC12(); for (const id of ['C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C19', 'C20']) await this.ensure(id) }
  async reachC31() { if (!await this.hasRecord('C20')) await this.reachC20(); for (const id of ['C21', 'C22', 'C23', 'C28', 'C29', 'C30', 'C31']) await this.ensure(id) }
  async reachC41() { if (!await this.hasRecord('C31')) await this.reachC31(); for (const id of ['C32', 'C33', 'C34', 'C35', 'C36', 'C37', 'C38', 'C39', 'C40', 'C41']) await this.ensure(id) }

  async completeFinalReview() {
    await test.step('最终案件复核：E01～E09 与 X01～X06', async () => {
      for (const claim of REVIEW_CLAIMS) {
        for (const group of claim.groups) {
          let found = false
          for (const id of group.ids) {
            if (await this.hasRecord(id)) { found = true; break }
          }
          if (!found) {
            const candidate = group.ids.find((id) => byEvidence.has(id) || byFact.has(id))
            if (!candidate) throw new Error(`${claim.id} 的 ${group.label} 缺少可取得的来源`)
            await this.ensure(candidate)
          }
        }
      }
      await this.openRecords()
      await this.page.getByRole('button', { name: '案件复核', exact: true }).click()
      const board = this.page.getByRole('region', { name: '案件复核材料整理页' })
      await expect(board).toBeVisible()
      for (const claim of REVIEW_CLAIMS) {
        if (claim.id === 'X01') await board.getByRole('button', { name: '需要核对的说法' }).click()
        await board.locator('.review-index button').filter({ hasText: claim.id }).first().click()
        const label = REVIEW_LEVELS.find((level) => level.id === claim.expected)!.label
        await board.getByRole('radio', { name: label }).check()
        const ids = new Set<string>()
        for (const group of claim.groups) {
          const id = (await savedProgress(this.page)).discoveredEvidenceIds.concat((await savedProgress(this.page)).unlockedFactIds)
            .find((recordId: string) => group.ids.includes(recordId))
          if (!id) throw new Error(`${claim.id} 的 ${group.label} 尚未进入记录夹`)
          ids.add(id)
        }
        for (const id of ids) {
          await board.getByRole('searchbox', { name: '关键词' }).fill(id)
          await board.getByTestId(`review-record-${id}`).click()
        }
      }
      await board.getByRole('button', { name: '复核这一组' }).click()
      await board.getByRole('button', { name: '核心陈述' }).click()
      await board.getByRole('button', { name: '复核这一组' }).click()
      await expect(board.getByText('复核完成。')).toBeVisible()
      await board.getByRole('button', { name: '制作案件复核材料' }).click()
      await expect(this.page.getByRole('region', { name: '案件复核材料包' })).toBeVisible()
    })
  }

  async completeDualDelivery(stopAfterFamily = false) {
    await test.step('核验两条渠道并递交材料包', async () => {
      const packageView = this.page.getByRole('region', { name: '案件复核材料包' })
      const family = packageView.getByRole('region', { name: '陈雨家属法律代理材料联系' })
      const media = packageView.getByRole('region', { name: '南城资讯网调查线索栏目' })
      await family.getByRole('button', { name: '从家属维权报道查找' }).click()
      await this.page.locator('a[href="#news_chenyu_family_current"]').click()
      await this.ensure('F90')
      await this.ensure('F91')
      await this.openRecords()
      await this.page.getByRole('button', { name: '案件复核材料包', exact: true }).click()
      await family.getByRole('button', { name: '核验该渠道仍有效' }).click()
      await family.getByRole('button', { name: '向此渠道提交复核材料' }).click()
      await expect(packageView).toContainText('仍有一条独立递交渠道尚未完成。')
      expect((await savedProgress(this.page)).discoveredEvidenceIds).not.toContain('F89')
      if (stopAfterFamily) return
      await media.getByRole('button', { name: '从资讯网首页查找' }).click()
      await this.page.locator('a[href="#news_tips_current"]').click()
      await this.ensure('F92')
      await this.ensure('F93')
      await this.openRecords()
      await this.page.getByRole('button', { name: '案件复核材料包', exact: true }).click()
      await media.getByRole('button', { name: '核验该渠道仍有效' }).click()
      await media.getByRole('button', { name: '向此渠道提交复核材料' }).click()
      await expect(packageView).toContainText('双路递交完成。')
      expect((await savedProgress(this.page)).unlockedFactIds).toContain('C44')
    })
  }

  async completeAfterword(pauseAfterTwoSections = false) {
    await test.step('后续回应、王曼身份核验、安全短讯', async () => {
      const packageView = this.page.getByRole('region', { name: '案件复核材料包' })
      await packageView.getByRole('button', { name: '稍后检查回应' }).click()
      await this.ensure('F96')
      await this.ensure('F97')
      await this.page.locator('a[href="#news_wang_editor_record"]').click()
      await this.ensure('F98')
      await this.page.locator('a[href="#news_wang_safety_excerpt"]').click()
      await this.ensure('F89')
      await expect(this.page.getByText('我安全。不要找我。', { exact: true })).toBeVisible()
      await this.ensure('C42')
      await this.ensure('C43')
    })
    await test.step('逐页阅读案件后续和 Ending', async () => {
      await this.openRecords()
      await this.page.getByRole('button', { name: '案件复核材料包', exact: true }).click()
      await this.page.getByRole('button', { name: '稍后查看案件进展' }).click()
      for (const [id, next] of [
        ['F99', 'news_independent_investigation'],
        ['F100', 'news_official_reinvestigation'],
        ['F101', 'echo_closure_notice'],
        ['F102', 'news_case_outcomes'],
      ]) {
        await this.ensure(id)
        await this.page.locator(`a[href="#${next}"]`).click()
      }
      await this.ensure('F103')
      await this.ensure('F104')
      await this.page.locator('a[href="#news_case_afterword"]').click()
      const afterword = this.page.getByRole('article', { name: '案件后记' })
      if (pauseAfterTwoSections) {
        for (let index = 0; index < 2; index++) await afterword.getByRole('button', { name: '继续阅读' }).click()
        return
      }
      for (let index = 0; index < 4; index++) await afterword.getByRole('button', { name: '继续阅读' }).click()
      await afterword.getByRole('button', { name: '读完案件后记' }).click()
      await expect(afterword).toContainText('案件已结束。')
      expect((await savedProgress(this.page)).caseCompleted).toBe(true)
    })
  }
}
