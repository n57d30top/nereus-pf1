import { z } from 'zod';

import { NereusPlatformTrackSignalStatusSchema } from './institutional-nereus-platform-blueprint';
import { NereusProductFormSchema } from './institutional-nereus-product-concept';

const DateTimeSchema = z.string().datetime();

export const NereusPfasProductCandidateStatusSchema = z.enum([
  'bounded_internal_candidate',
  'watch_candidate',
  'blocked',
]);

export const NereusPfasRoleTransitionSchema = z.enum([
  'reserve_to_primary',
  'reserve_hold',
  'stay_reserved',
]);

export const InstitutionalNereusPfasProductCandidateSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pfas-product-candidate.v1').default('institution.nereus-pfas-product-candidate.v1'),
  candidateId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPfasProductCandidateStatusSchema,
  productName: z.literal('Nereus PF-1').default('Nereus PF-1'),
  primaryContaminantFocus: z.literal('pfas_capture').default('pfas_capture'),
  recommendedForm: NereusProductFormSchema.default('modular_polishing_skid'),
  roleTransition: NereusPfasRoleTransitionSchema,
  readinessSignal: NereusPlatformTrackSignalStatusSchema,
  platformBlueprintRef: z.string().min(1),
  hm1ProfileRecheckRef: z.string().min(1),
  priorPrimaryConceptRef: z.string().min(1).optional(),
  leadCampaignRef: z.string().min(1),
  leadPacketRef: z.string().min(1),
  leadBriefRef: z.string().min(1),
  leadPartnerPacketRef: z.string().min(1).optional(),
  contrastCampaignRef: z.string().min(1).optional(),
  sourceWaterMatrix: z.string().min(1),
  sourceMaterialClass: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().min(1),
  promotionRationale: z.string().min(1),
  customerProblem: z.string().min(1),
  proposedBuyer: z.string().min(1),
  deploymentShape: z.string().min(1),
  commercialModel: z.string().min(1),
  productPromise: z.string().min(1),
  whyNow: z.string().min(1),
  operatorChecklist: z.array(z.string().min(1)).default([]),
  nextSteps: z.array(z.string().min(1)).default([]),
  blockerCodes: z.array(z.string().min(1)).default([]),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).default([]),
  updatedAt: DateTimeSchema,
}).strict();

export type NereusPfasProductCandidateStatus = z.infer<typeof NereusPfasProductCandidateStatusSchema>;
export type NereusPfasRoleTransition = z.infer<typeof NereusPfasRoleTransitionSchema>;
export type InstitutionalNereusPfasProductCandidate = z.infer<typeof InstitutionalNereusPfasProductCandidateSchema>;
