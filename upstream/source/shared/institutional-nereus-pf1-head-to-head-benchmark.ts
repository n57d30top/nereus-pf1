import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

const NereusPf1ScorecardSchema = z.object({
  captureEfficiencyScore: z.number().min(0).max(1).nullable(),
  foulingResistanceScore: z.number().min(0).max(1).nullable(),
  regenerationScore: z.number().min(0).max(1).nullable(),
  pressureDropScore: z.number().min(0).max(1).nullable(),
  manufacturabilityScore: z.number().min(0).max(1).nullable(),
}).strict();

export const NereusPf1HeadToHeadBenchmarkStatusSchema = z.enum([
  'baseline_benchmark_ready',
  'needs_more_alignment',
]);

export const NereusPf1HeadToHeadClaimReadinessSchema = z.enum([
  'internal_head_to_head_only',
  'not_ready_for_comparison_language',
]);

export const NereusPf1HeadToHeadInterpretationSchema = z.enum([
  'bounded_advantage',
  'bounded_tradeoff',
  'bounded_parity',
  'not_cleared',
]);

export const NereusPf1HeadToHeadBaselineFamilySchema = z.enum([
  'gac_reference_bed',
  'ion_exchange_resin_cartridge',
  'reverse_osmosis_polishing_stage',
  'certified_reference_unit',
]);

export const InstitutionalNereusPf1HeadToHeadBaselineComparisonSchema = z.object({
  comparisonId: z.string().min(1),
  baselineFamily: NereusPf1HeadToHeadBaselineFamilySchema,
  baselineLabel: z.string().min(1),
  baselineSourceMode: z.literal('market_analog_surrogate'),
  matrixTestRef: z.string().min(1),
  interpretation: NereusPf1HeadToHeadInterpretationSchema,
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
  headline: z.string().min(1),
  summary: z.string().min(1),
  claimGate: z.string().min(1),
  noGoClaim: z.string().min(1),
}).strict();

export const InstitutionalNereusPf1HeadToHeadBenchmarkSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-head-to-head-benchmark.v1').default('institution.nereus-pf1-head-to-head-benchmark.v1'),
  benchmarkId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1HeadToHeadBenchmarkStatusSchema,
  claimReadiness: NereusPf1HeadToHeadClaimReadinessSchema,
  benchmarkMode: z.literal('bounded_internal_head_to_head_surrogate'),
  productName: z.literal('Nereus PF-1'),
  launchReviewRef: z.string().min(1),
  commercializationPrepRef: z.string().min(1),
  marketComparisonMatrixRef: z.string().min(1),
  secondConfirmationReplayRef: z.string().min(1),
  benchmarkWindow: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().min(1),
  baselineComparisons: z.array(InstitutionalNereusPf1HeadToHeadBaselineComparisonSchema).length(4),
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

export type NereusPf1HeadToHeadBenchmarkStatus = z.infer<typeof NereusPf1HeadToHeadBenchmarkStatusSchema>;
export type NereusPf1HeadToHeadClaimReadiness = z.infer<typeof NereusPf1HeadToHeadClaimReadinessSchema>;
export type NereusPf1HeadToHeadInterpretation = z.infer<typeof NereusPf1HeadToHeadInterpretationSchema>;
export type NereusPf1HeadToHeadBaselineFamily = z.infer<typeof NereusPf1HeadToHeadBaselineFamilySchema>;
export type InstitutionalNereusPf1HeadToHeadBaselineComparison = z.infer<typeof InstitutionalNereusPf1HeadToHeadBaselineComparisonSchema>;
export type InstitutionalNereusPf1HeadToHeadBenchmark = z.infer<typeof InstitutionalNereusPf1HeadToHeadBenchmarkSchema>;
