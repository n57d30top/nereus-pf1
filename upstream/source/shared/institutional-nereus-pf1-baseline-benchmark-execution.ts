import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

const NereusPf1ScorecardSchema = z.object({
  captureEfficiencyScore: z.number().min(0).max(1).nullable(),
  foulingResistanceScore: z.number().min(0).max(1).nullable(),
  regenerationScore: z.number().min(0).max(1).nullable(),
  pressureDropScore: z.number().min(0).max(1).nullable(),
  manufacturabilityScore: z.number().min(0).max(1).nullable(),
}).strict();

export const NereusPf1BaselineBenchmarkExecutionStatusSchema = z.enum([
  'baseline_execution_complete',
  'needs_more_alignment',
]);

export const NereusPf1BaselineBenchmarkExecutionClaimReadinessSchema = z.enum([
  'bounded_internal_execution_only',
  'not_ready_for_comparison_language',
]);

export const NereusPf1BaselineBenchmarkExecutionDispositionSchema = z.enum([
  'bounded_advantage_observed',
  'bounded_tradeoff_observed',
  'bounded_parity_observed',
  'not_cleared',
]);

export const NereusPf1BaselineBenchmarkExecutionBaselineFamilySchema = z.enum([
  'gac_reference_bed',
  'ion_exchange_resin_cartridge',
  'reverse_osmosis_polishing_stage',
  'certified_reference_unit',
]);

export const InstitutionalNereusPf1BaselineBenchmarkExecutionResultSchema = z.object({
  resultId: z.string().min(1),
  baselineFamily: NereusPf1BaselineBenchmarkExecutionBaselineFamilySchema,
  baselineLabel: z.string().min(1),
  matrixTestRef: z.string().min(1),
  interpretation: z.enum([
    'bounded_advantage',
    'bounded_tradeoff',
    'bounded_parity',
    'not_cleared',
  ]),
  executionDisposition: NereusPf1BaselineBenchmarkExecutionDispositionSchema,
  pf1Scores: NereusPf1ScorecardSchema,
  baselineScores: NereusPf1ScorecardSchema,
  deltaScores: z.object({
    captureEfficiencyScore: z.number().nullable(),
    foulingResistanceScore: z.number().nullable(),
    regenerationScore: z.number().nullable(),
    pressureDropScore: z.number().nullable(),
    manufacturabilityScore: z.number().nullable(),
  }).strict(),
  weightedDelta: z.number().nullable(),
  executionHeadline: z.string().min(1),
  executionSummary: z.string().min(1),
  claimGate: z.string().min(1),
  noGoClaim: z.string().min(1),
}).strict();

export const InstitutionalNereusPf1BaselineBenchmarkExecutionSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-baseline-benchmark-execution.v1').default('institution.nereus-pf1-baseline-benchmark-execution.v1'),
  executionId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1BaselineBenchmarkExecutionStatusSchema,
  claimReadiness: NereusPf1BaselineBenchmarkExecutionClaimReadinessSchema,
  executionMode: z.literal('bounded_internal_surrogate_benchmark_execution'),
  productName: z.literal('Nereus PF-1'),
  benchmarkRef: z.string().min(1),
  launchReviewRef: z.string().min(1),
  commercializationPrepRef: z.string().min(1),
  marketComparisonMatrixRef: z.string().min(1),
  secondConfirmationReplayRef: z.string().min(1),
  executionWindow: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().min(1),
  executedComparisons: z.array(InstitutionalNereusPf1BaselineBenchmarkExecutionResultSchema).length(4),
  findings: z.array(z.string().min(1)).min(1),
  decision: z.array(z.string().min(1)).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  blockerCodes: z.array(z.string().min(1)).default([]),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type NereusPf1BaselineBenchmarkExecutionStatus = z.infer<typeof NereusPf1BaselineBenchmarkExecutionStatusSchema>;
export type NereusPf1BaselineBenchmarkExecutionClaimReadiness = z.infer<typeof NereusPf1BaselineBenchmarkExecutionClaimReadinessSchema>;
export type NereusPf1BaselineBenchmarkExecutionDisposition = z.infer<typeof NereusPf1BaselineBenchmarkExecutionDispositionSchema>;
export type NereusPf1BaselineBenchmarkExecutionBaselineFamily = z.infer<typeof NereusPf1BaselineBenchmarkExecutionBaselineFamilySchema>;
export type InstitutionalNereusPf1BaselineBenchmarkExecutionResult = z.infer<typeof InstitutionalNereusPf1BaselineBenchmarkExecutionResultSchema>;
export type InstitutionalNereusPf1BaselineBenchmarkExecution = z.infer<typeof InstitutionalNereusPf1BaselineBenchmarkExecutionSchema>;
