import { expect, test } from '@playwright/test'
import { Case01Driver, savedProgress } from './helpers/case01'

test('从空存档经完整主线 UI 到 caseCompleted', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC41()
  const beforeReview = await savedProgress(page)
  expect(beforeReview.unlockedFactIds).toContain('C41')
  expect(beforeReview.discoveredEvidenceIds).not.toContain('F89')

  await player.completeFinalReview()
  const material = await savedProgress(page)
  expect(material.finalReview.complete).toBe(true)
  expect(material.materialDelivery.generated).toBe(true)

  await player.completeDualDelivery()
  const delivered = await savedProgress(page)
  expect(delivered.materialDelivery.dualDeliveryComplete).toBe(true)
  expect(delivered.unlockedFactIds).toContain('C44')
  expect(delivered.discoveredEvidenceIds).not.toContain('F89')

  await player.completeAfterword()
  const finished = await savedProgress(page)
  expect(finished.discoveredEvidenceIds).toContain('F89')
  expect(finished.unlockedFactIds).toEqual(expect.arrayContaining(['C42', 'C43', 'C44', 'C45']))
  expect(finished.caseCompleted).toBe(true)
})
