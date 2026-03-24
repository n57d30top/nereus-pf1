import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1BaselineBenchmarkExecutionSchema,
  type InstitutionalNereusPf1BaselineBenchmarkExecution,
  type NereusPf1BaselineBenchmarkExecutionDisposition,
  type InstitutionalNereusPf1BaselineBenchmarkExecutionResult,
} from '../../../../../shared/institutional-nereus-pf1-baseline-benchmark-execution';
import type { NereusCalibrationAverageScores } from '../../../../../shared/institutional-nereus-calibration-report';
import type { InstitutionalNereusPf1HeadToHeadBaselineComparison } from '../../../../../shared/institutional-nereus-pf1-head-to-head-benchmark';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import {
  buildNereusPf1CommercializationPrep,
  getNereusPf1CommercializationPrep,
  listNereusPf1CommercializationPreps,
} from './nereusPf1CommercializationPrepService';
import {
  buildNereusPf1HeadToHeadBenchmark,
  getNereusPf1HeadToHeadBenchmark,
  listNereusPf1HeadToHeadBenchmarks,
} from './nereusPf1HeadToHeadBenchmarkService';
import {
  buildNereusPf1LaunchReview,
  getNereusPf1LaunchReview,
  listNereusPf1LaunchReviews,
} from './nereusPf1LaunchReviewService';
import {
  buildNereusPf1MarketComparisonMatrix,
  getNereusPf1MarketComparisonMatrix,
  listNereusPf1MarketComparisonMatrices,
} from './nereusPf1MarketComparisonMatrixService';
import {
  buildNereusPf1SecondConfirmationReplay,
  getNereusPf1SecondConfirmationReplayReport,
  listNereusPf1SecondConfirmationReplayReports,
} from './nereusPf1SecondConfirmationReplayService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1BaselineBenchmarkExecutions',
  schemaVersion: 'institution.nereus-pf1-baseline-benchmark-execution.registry.v1',
  schema: InstitutionalNereusPf1BaselineBenchmarkExecutionSchema,
  getKey: (entry: InstitutionalNereusPf1BaselineBenchmarkExecution) => entry.executionId,
} as const;

type ScoreProfile = NereusCalibrationAverageScores;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function mapDisposition(
  interpretation: InstitutionalNereusPf1HeadToHeadBaselineComparison['interpretation'],
): NereusPf1BaselineBenchmarkExecutionDisposition {
  switch (interpretation) {
    case 'bounded_advantage':
      return 'bounded_advantage_observed';
    case 'bounded_tradeoff':
      return 'bounded_tradeoff_observed';
    case 'bounded_parity':
      return 'bounded_parity_observed';
    default:
      return 'not_cleared';
  }
}

function formatProfile(profile: ScoreProfile): string {
  return [
    profile.captureEfficiencyScore ?? 'n/a',
    profile.foulingResistanceScore ?? 'n/a',
    profile.regenerationScore ?? 'n/a',
    profile.pressureDropScore ?? 'n/a',
    profile.manufacturabilityScore ?? 'n/a',
  ].join(' / ');
}

function buildExecutionResult(
  executionId: string,
  comparison: InstitutionalNereusPf1HeadToHeadBaselineComparison,
): InstitutionalNereusPf1BaselineBenchmarkExecutionResult {
  const executionDisposition = mapDisposition(comparison.interpretation);
  const summaryByDisposition: Record<NereusPf1BaselineBenchmarkExecutionDisposition, string> = {
    bounded_advantage_observed: 'PF-1 holds the stronger bounded internal balance in this surrogate comparison, but only inside one internal benchmark envelope.',
    bounded_tradeoff_observed: 'PF-1 clears a bounded tradeoff story here: some service dimensions improve, while at least one remains meaningfully weaker.',
    bounded_parity_observed: 'PF-1 lands near bounded parity in this surrogate comparison without unlocking a stronger advantage story.',
    not_cleared: 'PF-1 does not yet carry a defendable bounded internal execution story against this baseline.',
  };
  return {
    resultId: `${executionId}:${comparison.baselineFamily}`,
    baselineFamily: comparison.baselineFamily,
    baselineLabel: comparison.baselineLabel,
    matrixTestRef: comparison.matrixTestRef,
    interpretation: comparison.interpretation,
    executionDisposition,
    pf1Scores: comparison.pf1Scores,
    baselineScores: comparison.baselineScores,
    deltaScores: comparison.deltaScores,
    weightedDelta: comparison.weightedDelta,
    executionHeadline: `PF-1 ${executionDisposition.replaceAll('_', ' ')} versus ${comparison.baselineLabel} in bounded internal execution.`,
    executionSummary: summaryByDisposition[executionDisposition],
    claimGate: comparison.claimGate,
    noGoClaim: comparison.noGoClaim,
  };
}

function renderMarkdown(execution: InstitutionalNereusPf1BaselineBenchmarkExecution): string {
  return [
    '# Nereus PF-1 Baseline Benchmark Execution',
    '',
    `Generated at: \`${execution.generatedAt}\``,
    '',
    `- executionId: \`${execution.executionId}\``,
    `- productName: ${execution.productName}`,
    `- status: \`${execution.status}\``,
    `- claimReadiness: \`${execution.claimReadiness}\``,
    `- executionMode: \`${execution.executionMode}\``,
    '',
    '## Headline',
    '',
    execution.headline,
    '',
    '## Summary',
    '',
    execution.summary,
    '',
    '## Execution Window',
    '',
    execution.executionWindow,
    '',
    '## Executed Comparisons',
    '',
    ...execution.executedComparisons.flatMap((result) => [
      `### ${result.baselineLabel}`,
      '',
      `- executionDisposition: \`${result.executionDisposition}\``,
      `- interpretation: \`${result.interpretation}\``,
      `- matrixTestRef: \`${result.matrixTestRef}\``,
      `- weightedDelta: ${result.weightedDelta ?? 'n/a'}`,
      `- PF-1 capture/fouling/regeneration/pressure/manufacturability: ${formatProfile(result.pf1Scores)}`,
      `- baseline capture/fouling/regeneration/pressure/manufacturability: ${formatProfile(result.baselineScores)}`,
      `- delta capture/fouling/regeneration/pressure/manufacturability: ${formatProfile(result.deltaScores)}`,
      `- executionHeadline: ${result.executionHeadline}`,
      `- executionSummary: ${result.executionSummary}`,
      `- claimGate: ${result.claimGate}`,
      `- noGoClaim: ${result.noGoClaim}`,
      '',
    ]),
    '## Findings',
    '',
    ...execution.findings.map((entry) => `- ${entry}`),
    '',
    '## Decision',
    '',
    ...execution.decision.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...execution.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...execution.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeExecution(
  execution: InstitutionalNereusPf1BaselineBenchmarkExecution,
): InstitutionalNereusPf1BaselineBenchmarkExecution {
  const parsed = InstitutionalNereusPf1BaselineBenchmarkExecutionSchema.parse(execution);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-baseline-benchmark-executions', `${parsed.executionId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.executionId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_baseline_benchmark_execution_service',
    routeId: 'services:cognition.nereus.nereusPf1BaselineBenchmarkExecutionService.build',
    summary: stored.summary,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_baseline_benchmark_execution_recorded',
  });
  return stored;
}

export function resetNereusPf1BaselineBenchmarkExecutionService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1BaselineBenchmarkExecutions(): InstitutionalNereusPf1BaselineBenchmarkExecution[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1BaselineBenchmarkExecution(
  executionId: string,
): InstitutionalNereusPf1BaselineBenchmarkExecution | null {
  return getDurableRegistryEntry(registryOptions, executionId);
}

export async function buildNereusPf1BaselineBenchmarkExecution(input?: {
  benchmarkId?: string;
  matrixId?: string;
  secondConfirmationReplayId?: string;
  launchReviewId?: string;
  commercializationPrepId?: string;
}): Promise<InstitutionalNereusPf1BaselineBenchmarkExecution> {
  const benchmark = input?.benchmarkId
    ? getNereusPf1HeadToHeadBenchmark(input.benchmarkId)
    : listNereusPf1HeadToHeadBenchmarks()[0] || null;
  const resolvedBenchmark = benchmark || await buildNereusPf1HeadToHeadBenchmark({
    matrixId: input?.matrixId,
    secondConfirmationReplayId: input?.secondConfirmationReplayId,
    launchReviewId: input?.launchReviewId,
    commercializationPrepId: input?.commercializationPrepId,
  });
  const launchReview = input?.launchReviewId
    ? getNereusPf1LaunchReview(input.launchReviewId)
    : getNereusPf1LaunchReview(resolvedBenchmark.launchReviewRef) || listNereusPf1LaunchReviews()[0] || null;
  const resolvedLaunchReview = launchReview || await buildNereusPf1LaunchReview();
  const prep = input?.commercializationPrepId
    ? getNereusPf1CommercializationPrep(input.commercializationPrepId)
    : getNereusPf1CommercializationPrep(resolvedBenchmark.commercializationPrepRef)
      || listNereusPf1CommercializationPreps()[0]
      || null;
  const resolvedPrep = prep || await buildNereusPf1CommercializationPrep();
  const matrix = input?.matrixId
    ? getNereusPf1MarketComparisonMatrix(input.matrixId)
    : getNereusPf1MarketComparisonMatrix(resolvedBenchmark.marketComparisonMatrixRef)
      || listNereusPf1MarketComparisonMatrices()[0]
      || null;
  const resolvedMatrix = matrix || await buildNereusPf1MarketComparisonMatrix({
    launchReviewId: resolvedLaunchReview.reviewId,
    commercializationPrepId: resolvedPrep.prepId,
  });
  const replay = input?.secondConfirmationReplayId
    ? getNereusPf1SecondConfirmationReplayReport(input.secondConfirmationReplayId)
    : getNereusPf1SecondConfirmationReplayReport(resolvedBenchmark.secondConfirmationReplayRef)
      || listNereusPf1SecondConfirmationReplayReports()[0]
      || null;
  const resolvedReplay = replay || await buildNereusPf1SecondConfirmationReplay();

  const aligned = resolvedBenchmark.status === 'baseline_benchmark_ready'
    && resolvedLaunchReview.status === 'bounded_internal_launch_ready'
    && resolvedPrep.status === 'internal_preparation_ready'
    && resolvedMatrix.claimReadiness === 'head_to_head_plan_ready'
    && resolvedReplay.proofStatus === 'closed';
  const generatedAt = new Date().toISOString();
  const executionId = `nereus-pf1-baseline-benchmark-execution:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-baseline-benchmark-executions', `${executionId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const executedComparisons = resolvedBenchmark.baselineComparisons.map((comparison) => buildExecutionResult(executionId, comparison));
  const counts = executedComparisons.reduce<Record<NereusPf1BaselineBenchmarkExecutionDisposition, number>>((acc, entry) => {
    acc[entry.executionDisposition] += 1;
    return acc;
  }, {
    bounded_advantage_observed: 0,
    bounded_tradeoff_observed: 0,
    bounded_parity_observed: 0,
    not_cleared: 0,
  });
  const strongestResult = executedComparisons.reduce<InstitutionalNereusPf1BaselineBenchmarkExecutionResult | null>((best, entry) => {
    if (typeof entry.weightedDelta !== 'number') {
      return best;
    }
    if (!best || (best.weightedDelta ?? -Infinity) < entry.weightedDelta) {
      return entry;
    }
    return best;
  }, null);

  const execution: InstitutionalNereusPf1BaselineBenchmarkExecution = {
    schemaVersion: 'institution.nereus-pf1-baseline-benchmark-execution.v1',
    executionId,
    generatedAt,
    status: aligned ? 'baseline_execution_complete' : 'needs_more_alignment',
    claimReadiness: aligned ? 'bounded_internal_execution_only' : 'not_ready_for_comparison_language',
    executionMode: 'bounded_internal_surrogate_benchmark_execution',
    productName: 'Nereus PF-1',
    benchmarkRef: resolvedBenchmark.benchmarkId,
    launchReviewRef: resolvedLaunchReview.reviewId,
    commercializationPrepRef: resolvedPrep.prepId,
    marketComparisonMatrixRef: resolvedMatrix.matrixId,
    secondConfirmationReplayRef: resolvedReplay.reportId,
    executionWindow: 'Four bounded internal surrogate baseline executions anchored to the closed PF-1 proof set: GAC, ion exchange, RO, and a certified-reference surrogate.',
    headline: aligned
      ? `PF-1 has now executed four bounded internal baseline comparisons, with ${counts.bounded_advantage_observed} bounded-advantage reads, ${counts.bounded_tradeoff_observed} bounded-tradeoff reads, ${counts.bounded_parity_observed} bounded-parity reads, and ${counts.not_cleared} not-cleared reads.`
      : 'PF-1 does not yet have the aligned internal chain required for a canonical baseline benchmark execution readout.',
    summary: aligned
      ? 'This artifact converts the PF-1 head-to-head benchmark into an executed internal baseline readout. It is usable for bounded internal product framing, but still does not unlock any public or quantified market-superiority language.'
      : 'The PF-1 benchmark chain remains incomplete, so the execution artifact must stay preparatory and cannot support comparison language.',
    executedComparisons,
    findings: aligned
      ? [
          `PF-1 baseline execution produced ${counts.bounded_advantage_observed} bounded-advantage, ${counts.bounded_tradeoff_observed} bounded-tradeoff, ${counts.bounded_parity_observed} bounded-parity, and ${counts.not_cleared} not-cleared internal readouts.`,
          `The strongest bounded execution posture currently sits versus ${strongestResult?.baselineLabel || 'n/a'}.`,
          'The certified-reference comparison still remains surrogate-only and does not imply certification-grade parity.',
          'This artifact closes the internal execution layer, not the external market-claim gate.',
        ]
      : [
          'The PF-1 baseline benchmark execution chain is incomplete, so this artifact must remain internal and preparatory only.',
          'Do not use this artifact to support public or quantified comparison language.',
        ],
    decision: aligned
      ? [
          'Use this execution artifact as the internal comparison layer behind PF-1 launch follow-up and commercialization framing.',
          'Keep all wording anchored to one named baseline and one bounded closed-loop PFAS polishing envelope.',
          'Do not translate surrogate execution deltas into released market percentages.',
        ]
      : [
          'Refresh the PF-1 benchmark chain before treating this execution artifact as canonical.',
          'Keep all comparison language internal and provisional.',
        ],
    nextSteps: aligned
      ? [
          'Use the four executed baseline comparisons to sharpen PF-1 internal launch-review and buyer-fit language.',
          'Treat the next evidence step as audited direct baseline evidence design rather than more internal score reshaping.',
          'Keep PF-1 comparison claims bounded to tradeoffs, parity, and one closed-loop industrial PFAS polishing frame.',
        ]
      : [
          'Close the launch, prep, benchmark, and replay chain before promoting this execution artifact.',
          'Do not advance PF-1 comparison language beyond preparatory internal review.',
        ],
    blockerCodes: aligned ? [] : ['nereus_pf1_baseline_execution_alignment_missing'],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedBenchmark.benchmarkId,
      resolvedLaunchReview.reviewId,
      resolvedPrep.prepId,
      resolvedMatrix.matrixId,
      resolvedReplay.reportId,
      resolvedBenchmark.launchReviewRef,
      resolvedBenchmark.commercializationPrepRef,
      resolvedBenchmark.marketComparisonMatrixRef,
      resolvedBenchmark.secondConfirmationReplayRef,
      ...resolvedBenchmark.evidenceRefs,
      ...resolvedLaunchReview.evidenceRefs,
      ...resolvedPrep.evidenceRefs,
      ...resolvedMatrix.evidenceRefs,
      ...resolvedReplay.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'The PF-1 baseline benchmark execution is a bounded internal surrogate execution artifact only.',
      'It does not authorize public-water, field, certification, or quantified market-superiority claims.',
      'PF-1 remains advisory-only, closed-loop only, and not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  execution.markdown = renderMarkdown(execution);
  return storeExecution(execution);
}
