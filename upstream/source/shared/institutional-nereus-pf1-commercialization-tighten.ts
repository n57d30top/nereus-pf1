import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

export const NereusPf1CommercializationTightenStatusSchema = z.enum([
  'bounded_internal_productization_ready',
  'needs_more_replay',
]);

export const InstitutionalNereusPf1CommercializationTightenSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-commercialization-tighten.v1').default('institution.nereus-pf1-commercialization-tighten.v1'),
  tightenId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1CommercializationTightenStatusSchema,
  productName: z.literal('Nereus PF-1').default('Nereus PF-1'),
  reviewRefreshRef: z.string().min(1),
  secondConfirmationReplayRef: z.string().min(1),
  productReviewRef: z.string().min(1),
  candidateRef: z.string().min(1),
  targetCustomerProfile: z.string().min(1),
  firstCommercialShape: z.string().min(1),
  placementEnvelope: z.string().min(1),
  serviceCycleEnvelope: z.string().min(1),
  pricingEnvelope: z.string().min(1),
  commercializationNarrative: z.string().min(1),
  requiredCommercialProof: z.array(z.string().min(1)).min(1),
  noGoClaims: z.array(z.string().min(1)).min(1),
  operatorChecklist: z.array(z.string().min(1)).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  blockerCodes: z.array(z.string().min(1)).default([]),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type NereusPf1CommercializationTightenStatus = z.infer<typeof NereusPf1CommercializationTightenStatusSchema>;
export type InstitutionalNereusPf1CommercializationTighten = z.infer<typeof InstitutionalNereusPf1CommercializationTightenSchema>;
