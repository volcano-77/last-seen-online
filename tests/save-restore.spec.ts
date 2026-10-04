import { expect, test } from '@playwright/test'
import { Case01Driver, savedProgress } from './helpers/case01'

test('C01、C12、C31、复核中途、递交后及 Ending 中途可刷新恢复', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC01()
  await page.reload()
  await player.expectRecord('C01')

  await player.reachC12()
  await page.reload()
  await player.expectRecord('C12')

  await player.reachC31()
  await page.reload()
  await player.expectRecord('C31')

  await player.reachC41()
  await player.openRecords()
  await page.getByRole('button', { name: '案件复核', exact: true }).click()
  const board = page.getByRole('region', { name: '案件复核材料整理页' })
  await board.getByRole('radio', { name: '可确认' }).check()
  await page.reload()
  await expect(board.getByRole('radio', { name: '可确认' })).toBeChecked()
  await board.getByRole('button', { name: '返回网页' }).click()

  await player.completeFinalReview()
  await player.completeDualDelivery()
  await page.reload()
  expect((await savedProgress(page)).materialDelivery.dualDeliveryComplete).toBe(true)

  await player.completeAfterword(true)
  expect((await savedProgress(page)).endingSectionsSeen).toHaveLength(2)
  await page.reload()
  const afterword = page.getByRole('article', { name: '案件后记' })
  await expect(afterword).toBeVisible()
  expect((await savedProgress(page)).endingSectionsSeen).toHaveLength(2)
  for (let index = 0; index < 2; index++) await afterword.getByRole('button', { name: '继续阅读' }).click()
  await afterword.getByRole('button', { name: '读完案件后记' }).click()
  expect((await savedProgress(page)).caseCompleted).toBe(true)
})

test('旧 v6 存档缺少引导字段仍可恢复', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC01()
  // Only this isolated compatibility test edits storage: remove a later optional field from a UI-created v6 save.
  await page.evaluate(() => {
    const key = 'last-seen-online:v0.5:case:case-01-missing-person'
    const oldSave = JSON.parse(localStorage.getItem(key)!)
    delete oldSave.guidance
    localStorage.setItem(key, JSON.stringify(oldSave))
  })
  await page.reload()
  await player.expectRecord('C01')
  expect((await savedProgress(page)).guidance.firstFactTipSeen).toBe(true)
})
