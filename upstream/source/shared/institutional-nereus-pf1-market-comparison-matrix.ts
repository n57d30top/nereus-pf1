import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

export const NereusPf1MarketComparisonMatrixStatusSchema = z.enum([
  'benchmark_plan_ready',
  'needs_more_internal_alignment',
]);

export const NereusPf1MarketClaimReadinessSchema = z.enum([
  'not_ready_for_market_claims',
  'head_to_head_plan_ready',
]);

export const InstitutionalNereusPf1MarketComparisonTestSchema = z.object({
  testId: z.string().min(1),
  title: z.string().min(1),
  category: z.enum([
    'head_to_head_baseline',
    'matrix_robustness',
    'service_cycle',
    'economic_guardrail',
    'claim_gate',
  ]),
  objective: z.string().min(1),
  baseline: z.string().min(1),
  passSignal: z.string().min(1),
  claimUnlocked: z.string().min(1),
}).strict();

export const InstitutionalNereusPf1MarketComparisonMatrixSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-market-comparison-matrix.v1').default('institution.nereus-pf1-market-comparison-matrix.v1'),
  matrixId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1MarketComparisonMatrixStatusSchema,
  productName: z.literal('Nereus PF-1'),
  launchReviewRef: z.string().min(1),
  commercializationPrepRef: z.string().min(1),
  claimReadiness: NereusPf1MarketClaimReadinessSchema,
  headline: z.string().min(1),
  summary: z.string().min(1),
  baselineTechnologies: z.array(z.string().min(1)).min(1),
  comparisonPrinciples: z.array(z.string().min(1)).min(1),
  testMatrix: z.array(InstitutionalNereusPf1MarketComparisonTestSchema).length(10),
  claimGate: z.array(z.string().min(1)).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  blockerCodes: z.array(z.string().min(1)).default([]),
  noGoClaims: z.array(z.string().min(1)).min(1),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type InstitutionalNereusPf1MarketComparisonTest = z.infer<typeof InstitutionalNereusPf1MarketComparisonTestSchema>;
export type InstitutionalNereusPf1MarketComparisonMatrix = z.infer<typeof InstitutionalNereusPf1MarketComparisonMatrixSchema>;
