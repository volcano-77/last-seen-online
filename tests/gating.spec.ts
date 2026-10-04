import { expect, test } from '@playwright/test'
import { Case01Driver, case01, savedProgress } from './helpers/case01'

test('新存档的地址栏不能越过 037、王曼短讯和 Ending 门槛', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.startFreshCase()
  await expect(page.getByRole('button', { name: '案件复核', exact: true })).toHaveCount(0)
  for (const id of ['snapshot_wang_preview_cache', 'news_wang_safety_excerpt', 'news_case_afterword']) {
    const target = case01.pages.find((item) => item.id === id)!
    await page.getByRole('textbox', { name: '地址' }).fill(target.url)
    await page.getByRole('button', { name: '转到' }).click()
    await expect(page.locator('.browser-title')).not.toContainText(target.title)
  }
  expect((await savedProgress(page)).discoveredEvidenceIds).not.toContain('F89')
  await expect(page.getByText('我安全。不要找我。')).toHaveCount(0)
})

test('单路递交时 F89 和 Ending 仍不可达', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC41()
  await player.completeFinalReview()
  await player.completeDualDelivery(true)
  const progress = await savedProgress(page)
  expect(progress.materialDelivery.familyDelivered).toBeTruthy()
  expect(progress.materialDelivery.dualDeliveryComplete).toBe(false)
  expect(progress.unlockedFactIds).not.toContain('C44')
  expect(progress.unlockedFactIds).not.toContain('C42')
  expect(progress.unlockedFactIds).not.toContain('C43')
  expect(progress.discoveredEvidenceIds).not.toContain('F89')
  expect(progress.endingUnlocked).toBe(false)
  await page.getByRole('button', { name: '返回网页' }).click()
  const target = case01.pages.find((item) => item.id === 'news_wang_safety_excerpt')!
  await page.getByRole('textbox', { name: '地址' }).fill(target.url)
  await page.getByRole('button', { name: '转到' }).click()
  await expect(page.locator('.browser-title')).not.toContainText(target.title)
})
