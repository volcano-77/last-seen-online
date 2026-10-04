import { expect, test } from '@playwright/test'
import { REVIEW_CLAIMS } from '../src/finalReview'
import { Case01Driver, case01, savedProgress } from './helpers/case01'

test('业务链由 C20 推进至王曼主动离开的 C41', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC41()
  for (const id of ['C20', 'C23', 'C28', 'C31', 'C34', 'C38', 'C41'])
    await player.expectRecord(id)
  await expect(page.getByTestId('record-item-C31')).toContainText('重复编号')
  expect(case01.facts.find((item) => item.id === 'C31')?.summary).toContain('不能推出每个S收费、持续收费全账或任务规模')
  expect(REVIEW_CLAIMS.find((item) => item.id === 'X06')?.expected).toBe('unproven')
  const progress = await savedProgress(page)
  expect(progress.unlockedFactIds).not.toContain('C42')
  expect(progress.discoveredEvidenceIds).not.toContain('F89')
  expect(progress.endingUnlocked).toBe(false)
  await expect(page.getByText('我安全。不要找我。')).toHaveCount(0)
})
