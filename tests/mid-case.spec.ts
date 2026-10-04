import { test } from '@playwright/test'
import { Case01Driver } from './helpers/case01'

test('陈雨资料、威胁信封、商业楼事故、037 与时间线', async ({ page }) => {
  const player = new Case01Driver(page)
  await player.reachC20()
  for (const id of ['C06', 'C07', 'C08', 'C10', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17', 'C20'])
    await player.expectRecord(id)
})
