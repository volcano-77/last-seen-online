import { expect, test } from '@playwright/test'
import { Case01Driver, savedProgress } from './helpers/case01'

test('案件复核、材料包、双路递交与结局', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC41()
  await player.completeFinalReview()
  await player.completeDualDelivery()
  expect((await savedProgress(page)).materialDelivery.dualDeliveryComplete).toBe(true)
  await expect(page.getByText('我安全。不要找我。')).toHaveCount(0)
  await player.completeAfterword()
  expect((await savedProgress(page)).caseCompleted).toBe(true)
})
