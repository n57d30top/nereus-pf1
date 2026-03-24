import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

export const NereusPf1LaunchReviewStatusSchema = z.enum([
  'bounded_internal_launch_ready',
  'needs_more_review',
]);

export const InstitutionalNereusPf1LaunchReviewSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-launch-review.v1').default('institution.nereus-pf1-launch-review.v1'),
  reviewId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1LaunchReviewStatusSchema,
  productName: z.literal('Nereus PF-1'),
  internalProductPacketRef: z.string().min(1),
  productDecisionRef: z.string().min(1),
  commercializationPrepRef: z.string().min(1),
  launchDisposition: z.enum(['internal_launch_candidate_ready', 'hold_for_more_review']),
  reviewHeadline: z.string().min(1),
  reviewSummary: z.string().min(1),
  launchPosture: z.string().min(1),
  launchScope: z.string().min(1),
  buyerProfile: z.string().min(1),
  insertionPoint: z.string().min(1),
  serviceModel: z.string().min(1),
  noGoClaims: z.array(z.string().min(1)).min(1),
  reviewChecklist: z.array(z.string().min(1)).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  blockerCodes: z.array(z.string().min(1)).default([]),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type InstitutionalNereusPf1LaunchReview = z.infer<typeof InstitutionalNereusPf1LaunchReviewSchema>;
