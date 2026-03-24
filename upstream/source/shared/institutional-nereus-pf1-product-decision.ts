import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

export const NereusPf1ProductDecisionActionSchema = z.enum([
  'advance_pf1_primary_internal_candidate',
]);

export const NereusPf1ProductDecisionStatusSchema = z.enum([
  'applied',
]);

export const NereusPf1ProductDecisionOutcomeSchema = z.enum([
  'pf1_primary_internal_candidate_active',
]);

export const InstitutionalNereusPf1ProductDecisionSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-product-decision.v1').default('institution.nereus-pf1-product-decision.v1'),
  decisionId: z.string().min(1),
  generatedAt: DateTimeSchema,
  commercializationTightenRef: z.string().min(1),
  reviewRefreshRef: z.string().min(1),
  secondConfirmationReplayRef: z.string().min(1),
  productReviewRef: z.string().min(1),
  candidateRef: z.string().min(1),
  productName: z.literal('Nereus PF-1'),
  action: NereusPf1ProductDecisionActionSchema,
  status: NereusPf1ProductDecisionStatusSchema,
  outcome: NereusPf1ProductDecisionOutcomeSchema,
  rationale: z.string().min(1),
  commercializationPosture: z.enum(['bounded_internal_productization']),
  nextOwner: z.enum(['nereus_operator', 'internal_strategy']),
  blockerCodes: z.array(z.string().min(1)).default([]),
  nextSteps: z.array(z.string().min(1)).min(1),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type InstitutionalNereusPf1ProductDecision = z.infer<typeof InstitutionalNereusPf1ProductDecisionSchema>;
