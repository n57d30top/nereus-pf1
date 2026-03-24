import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

export const NereusPf1ProductReviewRefreshStatusSchema = z.enum([
  'tightened_bounded_internal_review',
  'watch',
  'hold',
]);

export const NereusPf1ProductReviewRefreshProofStatusSchema = z.enum([
  'closed',
  'still_open',
]);

export const NereusPf1ProductReviewRefreshTighteningStatusSchema = z.enum([
  'tightened',
  'watch',
  'not_tightened',
]);

export const NereusPf1ProductReviewRefreshNextActionSchema = z.enum([
  'tighten_pf1_commercialization',
  'keep_pf1_on_watch',
  'hold_pf1_story',
]);

export const InstitutionalNereusPf1ProductReviewRefreshSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-product-review-refresh.v1').default('institution.nereus-pf1-product-review-refresh.v1'),
  refreshId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1ProductReviewRefreshStatusSchema,
  proofStatus: NereusPf1ProductReviewRefreshProofStatusSchema,
  tighteningStatus: NereusPf1ProductReviewRefreshTighteningStatusSchema,
  nextAction: NereusPf1ProductReviewRefreshNextActionSchema,
  productName: z.literal('Nereus PF-1').default('Nereus PF-1'),
  secondConfirmationReplayRef: z.string().min(1),
  productReviewRef: z.string().min(1),
  candidateRef: z.string().min(1),
  confirmationReportRef: z.string().min(1),
  conceptRef: z.string().min(1),
  platformBlueprintRef: z.string().min(1),
  hm1ProfileRecheckRef: z.string().min(1),
  leadCampaignRef: z.string().min(1),
  leadPacketRef: z.string().min(1),
  leadBriefRef: z.string().min(1),
  leadPartnerPacketRef: z.string().min(1).optional(),
  replayCampaignRef: z.string().min(1),
  replayPacketRef: z.string().min(1),
  replayBriefRef: z.string().min(1),
  recommendedForm: z.enum(['regenerable_capture_cartridge', 'modular_polishing_skid', 'hybrid_guard_module']),
  tightenedPlacementSummary: z.string().min(1),
  tightenedRegenerationWindow: z.string().min(1),
  tightenedServiceModelSummary: z.string().min(1),
  tightenedBuyerStory: z.string().min(1),
  tightenedCommercialPromise: z.string().min(1),
  tightenedWhyNow: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().min(1),
  findings: z.array(z.string().min(1)).min(1),
  decisions: z.array(z.string().min(1)).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  blockerCodes: z.array(z.string().min(1)).default([]),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type NereusPf1ProductReviewRefreshStatus = z.infer<typeof NereusPf1ProductReviewRefreshStatusSchema>;
export type NereusPf1ProductReviewRefreshProofStatus = z.infer<typeof NereusPf1ProductReviewRefreshProofStatusSchema>;
export type NereusPf1ProductReviewRefreshTighteningStatus = z.infer<typeof NereusPf1ProductReviewRefreshTighteningStatusSchema>;
export type NereusPf1ProductReviewRefreshNextAction = z.infer<typeof NereusPf1ProductReviewRefreshNextActionSchema>;
export type InstitutionalNereusPf1ProductReviewRefresh = z.infer<typeof InstitutionalNereusPf1ProductReviewRefreshSchema>;
