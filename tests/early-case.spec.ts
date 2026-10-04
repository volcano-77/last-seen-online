import { expect, test } from '@playwright/test'
import { Case01Driver } from './helpers/case01'

test('回声副本、赵妍与陈雨线经 UI 建立 C05', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC05()
  for (const id of ['F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'C02', 'C03', 'C04', 'C05'])
    await player.expectRecord(id)
  await expect(page.getByTestId('record-item-C05')).toBeVisible()
})
