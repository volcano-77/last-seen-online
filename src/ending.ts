import { finalReviewComplete } from './materialDelivery'
import type { FinalReviewProgress } from './finalReview'
import type { MaterialDeliveryProgress } from './materialDelivery'

export const ENDING_SECTION_IDS = ['ending-delivery', 'ending-investigation', 'ending-echo', 'ending-people', 'ending-last'] as const
export const ENDING_EVIDENCE_IDS = ['F99', 'F100', 'F101', 'F102', 'F103', 'F104'] as const
export const ENDING_PAGE_IDS = [
  'news_family_review_request', 'news_independent_investigation', 'news_official_reinvestigation',
  'echo_closure_notice', 'news_case_outcomes', 'news_case_afterword',
] as const

export function endingPrerequisites(progress: {
  finalReview: FinalReviewProgress
  materialDelivery: MaterialDeliveryProgress
  unlockedFactIds: string[]
}): boolean {
  return finalReviewComplete(progress.finalReview) && progress.materialDelivery.generated &&
    progress.materialDelivery.dualDeliveryComplete &&
    ['C44', 'C42', 'C43'].every((id) => progress.unlockedFactIds.includes(id))
}
