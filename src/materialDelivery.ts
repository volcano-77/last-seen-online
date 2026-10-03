import { REVIEW_CLAIMS } from './finalReview'
import type { FinalReviewProgress } from './finalReview'

export const MATERIAL_PACKAGE_ID = 'CY-REVIEW-01'
export type DeliveryChannelId = 'family' | 'media'
export interface DeliveryReceipt {
  channel: DeliveryChannelId
  channelId: string
  channelAddress: string
  verifiedSourceIds: string[]
  lastConfirmedAt: string
  submittedAt: string
  packageId: string
}
export interface MaterialDeliveryProgress {
  open: boolean
  generated: boolean
  packageId?: string
  generatedAt?: string
  sourceIds: string[]
  familyVerified: boolean
  familyVerifiedAt?: string
  mediaVerified: boolean
  mediaVerifiedAt?: string
  familyDelivered?: DeliveryReceipt
  mediaDelivered?: DeliveryReceipt
  dualDeliveryComplete: boolean
  postDeliveryResponseUnlocked: boolean
  familyResponseSeen: boolean
  mediaResponseSeen: boolean
  wangEditorRecordUnlocked: boolean
  wangSafetyMessageSeen: boolean
}

export const DELIVERY_CHANNELS = {
  family: {
    name: '陈雨家属法律代理材料联系',
    channelId: 'chenyu-family-representative',
    pageId: 'news_chenyu_family_current',
    startPageId: 'news_chenyu_family_claim',
    requiredIds: ['F90', 'F91'],
    receiptId: 'F94',
    addressVariable: 'familyMaterialMailbox',
    updatedVariable: 'familyCurrentNoticeDate',
  },
  media: {
    name: '南城资讯网调查线索栏目',
    channelId: 'ncitynews-investigation-tips',
    pageId: 'news_tips_current',
    startPageId: 'news_index',
    requiredIds: ['F92', 'F93'],
    receiptId: 'F95',
    addressVariable: 'mediaTipsMailbox',
    updatedVariable: 'mediaCurrentContactDate',
  },
} as const

export const emptyMaterialDelivery = (): MaterialDeliveryProgress => ({
  open: false, generated: false, sourceIds: [], familyVerified: false,
  mediaVerified: false, dualDeliveryComplete: false,
  postDeliveryResponseUnlocked: false, familyResponseSeen: false,
  mediaResponseSeen: false, wangEditorRecordUnlocked: false,
  wangSafetyMessageSeen: false,
})

export function finalReviewComplete(review: FinalReviewProgress): boolean {
  return review.complete && REVIEW_CLAIMS.every((claim) => review.items[claim.id]?.reviewed === true)
}

export function finalReviewSourceIds(review: FinalReviewProgress): string[] {
  return [...new Set(REVIEW_CLAIMS.flatMap((claim) => review.items[claim.id]?.recordIds || []))]
}

export function channelSourcesReady(channel: DeliveryChannelId, discoveredEvidenceIds: string[]): boolean {
  return DELIVERY_CHANNELS[channel].requiredIds.every((id) => discoveredEvidenceIds.includes(id))
}
