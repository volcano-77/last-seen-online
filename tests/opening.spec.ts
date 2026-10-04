import { expect, test } from '@playwright/test'
import { Case01Driver, savedProgress } from './helpers/case01'

test('全新存档从刘佳首帖通过 UI 建立 C01', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC01()
  await expect(page.getByTestId('record-item-C01')).toBeVisible()
  expect((await savedProgress(page)).unlockedFactIds).toContain('C01')
})
