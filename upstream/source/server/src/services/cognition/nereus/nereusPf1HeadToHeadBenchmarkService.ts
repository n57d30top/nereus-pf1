import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1HeadToHeadBenchmarkSchema,
  type InstitutionalNereusPf1HeadToHeadBenchmark,
  type InstitutionalNereusPf1HeadToHeadBaselineComparison,
  type NereusPf1HeadToHeadBaselineFamily,
  type NereusPf1HeadToHeadInterpretation,
} from '../../../../../shared/institutional-nereus-pf1-head-to-head-benchmark';
import type { NereusCalibrationAverageScores } from '../../../../../shared/institutional-nereus-calibration-report';
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
  kind: 'nereusPf1HeadToHeadBenchmarks',
  schemaVersion: 'institution.nereus-pf1-head-to-head-benchmark.registry.v1',
  schema: InstitutionalNereusPf1HeadToHeadBenchmarkSchema,
  getKey: (entry: InstitutionalNereusPf1HeadToHeadBenchmark) => entry.benchmarkId,
} as const;

type ScoreProfile = NereusCalibrationAverageScores;

type BaselineDescriptor = {
  baselineFamily: NereusPf1HeadToHeadBaselineFamily;
  baselineLabel: string;
  matrixTestRef: string;
  baselineScores: ScoreProfile;
  claimGate: string;
  noGoClaim: string;
};

const SCORE_WEIGHTS: Record<keyof ScoreProfile, number> = {
  captureEfficiencyScore: 0.35,
  foulingResistanceScore: 0.2,
  regenerationScore: 0.2,
  pressureDropScore: 0.15,
  manufacturabilityScore: 0.1,
};

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function round(value: number | null): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Number(value.toFixed(3));
}

function subtract(current: number | null, baseline: number | null): number | null {
  if (typeof current !== 'number' || typeof baseline !== 'number') {
    return null;
  }
  return round(current - baseline);
}

function computeWeightedDelta(deltaScores: ScoreProfile): number | null {
  const entries = Object.entries(SCORE_WEIGHTS) as Array<[keyof ScoreProfile, number]>;
  const usable = entries.filter(([key]) => typeof deltaScores[key] === 'number');
  if (usable.length === 0) {
    return null;
  }
  const totalWeight = usable.reduce((sum, [, weight]) => sum + weight, 0);
  const weighted = usable.reduce((sum, [key, weight]) => sum + ((deltaScores[key] as number) * weight), 0);
  return round(weighted / totalWeight);
}

function deriveInterpretation(deltaScores: ScoreProfile): NereusPf1HeadToHeadInterpretation {
  const values = [
    deltaScores.captureEfficiencyScore,
    deltaScores.foulingResistanceScore,
    deltaScores.regenerationScore,
    deltaScores.pressureDropScore,
  ].filter((value): value is number => typeof value === 'number');
  const positiveCount = values.filter((value) => value >= 0).length;
  const strongNegativeCount = values.filter((value) => value <= -0.05).length;
  if (positiveCount >= 3 && strongNegativeCount === 0) {
    return 'bounded_advantage';
  }
  if (positiveCount >= 2 && strongNegativeCount <= 1) {
    return 'bounded_tradeoff';
  }
  if (positiveCount >= 1 && strongNegativeCount === 0) {
    return 'bounded_parity';
  }
  return 'not_cleared';
}

function buildBaselineDescriptors(): BaselineDescriptor[] {
  return [
    {
      baselineFamily: 'gac_reference_bed',
      baselineLabel: 'Granular activated carbon reference bed',
      matrixTestRef: 'pf1-h2h-gac-synthetic',
      baselineScores: {
        captureEfficiencyScore: 0.69,
        foulingResistanceScore: 0.66,
        regenerationScore: 0.55,
        pressureDropScore: 0.64,
        manufacturabilityScore: 0.72,
      },
      claimGate: 'Only internal “PF-1 looks stronger than a GAC surrogate inside one bounded matrix” language is unlocked here.',
      noGoClaim: 'Do not translate this into a released “better than GAC” claim without direct audited head-to-head evidence.',
    },
    {
      baselineFamily: 'ion_exchange_resin_cartridge',
      baselineLabel: 'PFAS-focused ion exchange resin cartridge',
      matrixTestRef: 'pf1-h2h-ion-exchange-synthetic',
      baselineScores: {
        captureEfficiencyScore: 0.76,
        foulingResistanceScore: 0.67,
        regenerationScore: 0.51,
        pressureDropScore: 0.7,
        manufacturabilityScore: 0.68,
      },
      claimGate: 'Only internal “PF-1 may carry a service-cycle tradeoff posture versus resin in one bounded matrix” language is unlocked here.',
      noGoClaim: 'Do not claim PF-1 beats ion exchange generally or economically from this surrogate comparison alone.',
    },
    {
      baselineFamily: 'reverse_osmosis_polishing_stage',
      baselineLabel: 'Reverse osmosis polishing stage',
      matrixTestRef: 'pf1-h2h-ro-synthetic',
      baselineScores: {
        captureEfficiencyScore: 0.82,
        foulingResistanceScore: 0.58,
        regenerationScore: 0.42,
        pressureDropScore: 0.55,
        manufacturabilityScore: 0.61,
      },
      claimGate: 'Only internal “PF-1 may offer an alternative polishing tradeoff to RO inside one bounded use case” language is unlocked here.',
      noGoClaim: 'Do not treat this as proof PF-1 outperforms RO on removal, compliance, or field lifecycle.',
    },
    {
      baselineFamily: 'certified_reference_unit',
      baselineLabel: 'Certified or certified-equivalent PFAS reference unit',
      matrixTestRef: 'pf1-certified-reference-unit',
      baselineScores: {
        captureEfficiencyScore: 0.78,
        foulingResistanceScore: 0.69,
        regenerationScore: 0.52,
        pressureDropScore: 0.68,
        manufacturabilityScore: 0.66,
      },
      claimGate: 'This only proves PF-1 can be framed against a certification-relevant surrogate, not that certification-grade parity is achieved.',
      noGoClaim: 'Do not imply NSF, EPA, or certification-oriented equivalence from this surrogate benchmark.',
    },
  ];
}

function buildComparison(
  benchmarkId: string,
  pf1Scores: ScoreProfile,
  baseline: BaselineDescriptor,
): InstitutionalNereusPf1HeadToHeadBaselineComparison {
  const deltaScores: ScoreProfile = {
    captureEfficiencyScore: subtract(pf1Scores.captureEfficiencyScore, baseline.baselineScores.captureEfficiencyScore),
    foulingResistanceScore: subtract(pf1Scores.foulingResistanceScore, baseline.baselineScores.foulingResistanceScore),
    regenerationScore: subtract(pf1Scores.regenerationScore, baseline.baselineScores.regenerationScore),
    pressureDropScore: subtract(pf1Scores.pressureDropScore, baseline.baselineScores.pressureDropScore),
    manufacturabilityScore: subtract(pf1Scores.manufacturabilityScore, baseline.baselineScores.manufacturabilityScore),
  };
  const interpretation = deriveInterpretation(deltaScores);
  const weightedDelta = computeWeightedDelta(deltaScores);
  const summaryByInterpretation: Record<NereusPf1HeadToHeadInterpretation, string> = {
    bounded_advantage: 'PF-1 holds a better combined bounded balance on the surrogate scorecard, but only inside this internal comparison frame.',
    bounded_tradeoff: 'PF-1 improves some bounded service dimensions while giving up at least one meaningful baseline dimension.',
    bounded_parity: 'PF-1 lands near parity on the surrogate scorecard without earning a stronger advantage claim.',
    not_cleared: 'PF-1 does not carry a defendable bounded comparison story against this surrogate baseline yet.',
  };
  return {
    comparisonId: `${benchmarkId}:${baseline.baselineFamily}`,
    baselineFamily: baseline.baselineFamily,
    baselineLabel: baseline.baselineLabel,
    baselineSourceMode: 'market_analog_surrogate',
    matrixTestRef: baseline.matrixTestRef,
    interpretation,
    pf1Scores,
    baselineScores: baseline.baselineScores,
    deltaScores,
    weightedDelta,
    headline: `PF-1 versus ${baseline.baselineLabel} remains a ${interpretation.replaceAll('_', ' ')} call in bounded internal benchmarking.`,
    summary: summaryByInterpretation[interpretation],
    claimGate: baseline.claimGate,
    noGoClaim: baseline.noGoClaim,
  };
}

function renderMarkdown(benchmark: InstitutionalNereusPf1HeadToHeadBenchmark): string {
  return [
    '# Nereus PF-1 Head-to-Head Baseline Benchmark',
    '',
    `Generated at: \`${benchmark.generatedAt}\``,
    '',
    `- benchmarkId: \`${benchmark.benchmarkId}\``,
    `- productName: ${benchmark.productName}`,
    `- status: \`${benchmark.status}\``,
    `- claimReadiness: \`${benchmark.claimReadiness}\``,
    `- benchmarkMode: \`${benchmark.benchmarkMode}\``,
    '',
    '## Headline',
    '',
    benchmark.headline,
    '',
    '## Summary',
    '',
    benchmark.summary,
    '',
    '## Benchmark Window',
    '',
    benchmark.benchmarkWindow,
    '',
    '## Baseline Comparisons',
    '',
    ...benchmark.baselineComparisons.flatMap((comparison) => [
      `### ${comparison.baselineLabel}`,
      '',
      `- interpretation: \`${comparison.interpretation}\``,
      `- matrixTestRef: \`${comparison.matrixTestRef}\``,
      `- weightedDelta: ${comparison.weightedDelta ?? 'n/a'}`,
      `- PF-1 capture/fouling/regeneration/pressure/manufacturability: ${comparison.pf1Scores.captureEfficiencyScore ?? 'n/a'} / ${comparison.pf1Scores.foulingResistanceScore ?? 'n/a'} / ${comparison.pf1Scores.regenerationScore ?? 'n/a'} / ${comparison.pf1Scores.pressureDropScore ?? 'n/a'} / ${comparison.pf1Scores.manufacturabilityScore ?? 'n/a'}`,
      `- baseline capture/fouling/regeneration/pressure/manufacturability: ${comparison.baselineScores.captureEfficiencyScore ?? 'n/a'} / ${comparison.baselineScores.foulingResistanceScore ?? 'n/a'} / ${comparison.baselineScores.regenerationScore ?? 'n/a'} / ${comparison.baselineScores.pressureDropScore ?? 'n/a'} / ${comparison.baselineScores.manufacturabilityScore ?? 'n/a'}`,
      `- delta capture/fouling/regeneration/pressure/manufacturability: ${comparison.deltaScores.captureEfficiencyScore ?? 'n/a'} / ${comparison.deltaScores.foulingResistanceScore ?? 'n/a'} / ${comparison.deltaScores.regenerationScore ?? 'n/a'} / ${comparison.deltaScores.pressureDropScore ?? 'n/a'} / ${comparison.deltaScores.manufacturabilityScore ?? 'n/a'}`,
      `- headline: ${comparison.headline}`,
      `- summary: ${comparison.summary}`,
      `- claimGate: ${comparison.claimGate}`,
      `- noGoClaim: ${comparison.noGoClaim}`,
      '',
    ]),
    '## Findings',
    '',
    ...benchmark.findings.map((entry) => `- ${entry}`),
    '',
    '## Decision',
    '',
    ...benchmark.decision.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...benchmark.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...benchmark.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeBenchmark(benchmark: InstitutionalNereusPf1HeadToHeadBenchmark): InstitutionalNereusPf1HeadToHeadBenchmark {
  const parsed = InstitutionalNereusPf1HeadToHeadBenchmarkSchema.parse(benchmark);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-head-to-head-benchmarks', `${parsed.benchmarkId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.benchmarkId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_head_to_head_benchmark_service',
    routeId: 'services:cognition.nereus.nereusPf1HeadToHeadBenchmarkService.build',
    summary: stored.summary,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_head_to_head_benchmark_recorded',
  });
  return stored;
}

export function resetNereusPf1HeadToHeadBenchmarkService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1HeadToHeadBenchmarks(): InstitutionalNereusPf1HeadToHeadBenchmark[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1HeadToHeadBenchmark(benchmarkId: string): InstitutionalNereusPf1HeadToHeadBenchmark | null {
  return getDurableRegistryEntry(registryOptions, benchmarkId);
}

export async function buildNereusPf1HeadToHeadBenchmark(input?: {
  matrixId?: string;
  secondConfirmationReplayId?: string;
  launchReviewId?: string;
  commercializationPrepId?: string;
}): Promise<InstitutionalNereusPf1HeadToHeadBenchmark> {
  const launchReview = input?.launchReviewId
    ? getNereusPf1LaunchReview(input.launchReviewId)
    : listNereusPf1LaunchReviews()[0] || null;
  const resolvedLaunchReview = launchReview || await buildNereusPf1LaunchReview();
  const prep = input?.commercializationPrepId
    ? getNereusPf1CommercializationPrep(input.commercializationPrepId)
    : getNereusPf1CommercializationPrep(resolvedLaunchReview.commercializationPrepRef) || listNereusPf1CommercializationPreps()[0] || null;
  const resolvedPrep = prep || await buildNereusPf1CommercializationPrep({
    decisionId: undefined,
  });
  const matrix = input?.matrixId
    ? getNereusPf1MarketComparisonMatrix(input.matrixId)
    : listNereusPf1MarketComparisonMatrices().find((entry) => entry.launchReviewRef === resolvedLaunchReview.reviewId) || listNereusPf1MarketComparisonMatrices()[0] || null;
  const resolvedMatrix = matrix || await buildNereusPf1MarketComparisonMatrix({
    launchReviewId: resolvedLaunchReview.reviewId,
    commercializationPrepId: resolvedPrep.prepId,
  });
  const secondConfirmationReplay = input?.secondConfirmationReplayId
    ? getNereusPf1SecondConfirmationReplayReport(input.secondConfirmationReplayId)
    : listNereusPf1SecondConfirmationReplayReports()[0] || null;
  const resolvedSecondConfirmationReplay = secondConfirmationReplay || await buildNereusPf1SecondConfirmationReplay();

  const aligned = resolvedLaunchReview.status === 'bounded_internal_launch_ready'
    && resolvedPrep.status === 'internal_preparation_ready'
    && resolvedMatrix.claimReadiness === 'head_to_head_plan_ready'
    && resolvedSecondConfirmationReplay.proofStatus === 'closed';
  const pf1Scores = resolvedSecondConfirmationReplay.combinedAverageScores;
  const generatedAt = new Date().toISOString();
  const benchmarkId = `nereus-pf1-head-to-head-benchmark:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-head-to-head-benchmarks', `${benchmarkId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const baselineComparisons = buildBaselineDescriptors().map((baseline) => buildComparison(benchmarkId, pf1Scores, baseline));
  const interpretationCounts = baselineComparisons.reduce<Record<NereusPf1HeadToHeadInterpretation, number>>((acc, entry) => {
    acc[entry.interpretation] += 1;
    return acc;
  }, {
    bounded_advantage: 0,
    bounded_tradeoff: 0,
    bounded_parity: 0,
    not_cleared: 0,
  });

  const benchmark: InstitutionalNereusPf1HeadToHeadBenchmark = {
    schemaVersion: 'institution.nereus-pf1-head-to-head-benchmark.v1',
    benchmarkId,
    generatedAt,
    status: aligned ? 'baseline_benchmark_ready' : 'needs_more_alignment',
    claimReadiness: aligned ? 'internal_head_to_head_only' : 'not_ready_for_comparison_language',
    benchmarkMode: 'bounded_internal_head_to_head_surrogate',
    productName: 'Nereus PF-1',
    launchReviewRef: resolvedLaunchReview.reviewId,
    commercializationPrepRef: resolvedPrep.prepId,
    marketComparisonMatrixRef: resolvedMatrix.matrixId,
    secondConfirmationReplayRef: resolvedSecondConfirmationReplay.reportId,
    benchmarkWindow: 'One bounded closed-loop PFAS polishing window against four market-analog surrogate baselines: GAC, ion exchange, RO, and one certified-reference surrogate.',
    headline: aligned
      ? 'PF-1 now has four bounded internal baseline comparisons anchored to its closed proof set, but still does not have a market-superiority claim.'
      : 'PF-1 still lacks the closed internal chain needed for a canonical head-to-head benchmark readout.',
    summary: aligned
      ? 'This benchmark materializes the first four baseline comparisons from the PF-1 market-comparison matrix using the confirmed PF-1 score profile as the anchor. It is useful for internal product framing, not for public or quantified superiority claims.'
      : 'The PF-1 launch, prep, matrix, or replay chain is still incomplete, so any head-to-head comparison output should remain preparatory only.',
    baselineComparisons,
    findings: aligned
      ? [
          `PF-1 baseline readout produced ${interpretationCounts.bounded_advantage} bounded-advantage, ${interpretationCounts.bounded_tradeoff} bounded-tradeoff, ${interpretationCounts.bounded_parity} bounded-parity, and ${interpretationCounts.not_cleared} not-cleared surrogate comparisons.`,
          `The strongest weighted delta currently sits at ${baselineComparisons.reduce((best, entry) => {
            if (typeof entry.weightedDelta !== 'number') {
              return best;
            }
            if (!best || (best.weightedDelta ?? -Infinity) < entry.weightedDelta) {
              return entry;
            }
            return best;
          }, null as InstitutionalNereusPf1HeadToHeadBaselineComparison | null)?.baselineLabel || 'n/a'}.`,
          'All four comparisons stay explicitly tied to market-analog surrogate baselines rather than direct certified product tests.',
          'This artifact closes the internal benchmark scaffold, not the external marketing or certification claim gate.',
        ]
      : [
          'The PF-1 head-to-head benchmark chain is not fully aligned, so the resulting artifact must remain preparatory only.',
          'Do not use this artifact to support any market or certification-adjacent comparison language.',
        ],
    decision: aligned
      ? [
          'Use this benchmark as the internal comparison layer behind PF-1 product review and launch review follow-up.',
          'Keep all language bounded to tradeoffs, parity, or relative posture inside one closed-loop PFAS polishing frame.',
          'Do not translate surrogate score deltas into released “better than market” percentages.',
        ]
      : [
          'Refresh the launch/prep/matrix/replay chain before treating this benchmark as canonical.',
          'Keep all comparison language internal and provisional.',
        ],
    nextSteps: aligned
      ? [
          'Use the GAC, ion-exchange, RO, and certified-reference surrogate comparisons to sharpen the bounded PF-1 product story.',
          'Keep all future market-comparison language tied to one named baseline and one bounded operating envelope.',
          'Only a later direct audited head-to-head program may unlock quantified superiority language.',
        ]
      : [
          'Close the internal launch and replay chain before promoting this benchmark artifact.',
          'Do not advance PF-1 comparison language beyond preparatory internal review.',
        ],
    blockerCodes: aligned ? [] : ['nereus_pf1_head_to_head_alignment_missing'],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedLaunchReview.reviewId,
      resolvedPrep.prepId,
      resolvedMatrix.matrixId,
      resolvedSecondConfirmationReplay.reportId,
      resolvedMatrix.launchReviewRef,
      resolvedMatrix.commercializationPrepRef,
      resolvedSecondConfirmationReplay.candidateRef,
      resolvedSecondConfirmationReplay.confirmationReportRef,
      resolvedSecondConfirmationReplay.productReviewRef,
      ...resolvedLaunchReview.evidenceRefs,
      ...resolvedPrep.evidenceRefs,
      ...resolvedMatrix.evidenceRefs,
      ...resolvedSecondConfirmationReplay.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'The PF-1 head-to-head benchmark is a bounded internal surrogate comparison artifact only.',
      'It does not authorize public-water, field, certification, or quantified market-superiority claims.',
      'PF-1 remains advisory-only, closed-loop only, and not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  benchmark.markdown = renderMarkdown(benchmark);
  return storeBenchmark(benchmark);
}
