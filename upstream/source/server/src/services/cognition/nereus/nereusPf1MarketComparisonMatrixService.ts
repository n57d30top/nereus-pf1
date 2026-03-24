import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1MarketComparisonMatrixSchema,
  type InstitutionalNereusPf1MarketComparisonMatrix,
  type InstitutionalNereusPf1MarketComparisonTest,
} from '../../../../../shared/institutional-nereus-pf1-market-comparison-matrix';
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
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1MarketComparisonMatrices',
  schemaVersion: 'institution.nereus-pf1-market-comparison-matrix.registry.v1',
  schema: InstitutionalNereusPf1MarketComparisonMatrixSchema,
  getKey: (entry: InstitutionalNereusPf1MarketComparisonMatrix) => entry.matrixId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function buildTestMatrix(): InstitutionalNereusPf1MarketComparisonTest[] {
  return [
    {
      testId: 'pf1-h2h-gac-synthetic',
      title: 'Head-to-head versus granular activated carbon in a matched synthetic PFAS matrix',
      category: 'head_to_head_baseline',
      objective: 'Measure PF-1 removal, fouling, and pressure against a conventional GAC baseline under the same inlet load.',
      baseline: 'Granular activated carbon reference bed with matched residence time.',
      passSignal: 'PF-1 matches or exceeds PFAS removal while preserving a defendable fouling/pressure profile over the same run window.',
      claimUnlocked: 'Only allows internal “competitive with GAC under one bounded matrix” language.',
    },
    {
      testId: 'pf1-h2h-ion-exchange-synthetic',
      title: 'Head-to-head versus ion exchange resin in a matched synthetic PFAS matrix',
      category: 'head_to_head_baseline',
      objective: 'Compare PF-1 against a resin baseline for removal efficiency, pressure behavior, and service-cycle burden.',
      baseline: 'PFAS-focused ion exchange resin cartridge at comparable flux.',
      passSignal: 'PF-1 maintains removal within the same band without a worse service-cycle penalty.',
      claimUnlocked: 'Internal “competitive with ion exchange in one bounded profile” language only.',
    },
    {
      testId: 'pf1-h2h-ro-synthetic',
      title: 'Head-to-head versus reverse osmosis polishing in a matched synthetic PFAS matrix',
      category: 'head_to_head_baseline',
      objective: 'Benchmark PF-1 against RO on removal, pressure, and waste-stream implications for the same bounded use case.',
      baseline: 'Reverse osmosis polishing stage configured for the same target water envelope.',
      passSignal: 'PF-1 demonstrates a defendable closed-loop polishing tradeoff without worse bounded pressure and service assumptions.',
      claimUnlocked: 'Internal “alternative polishing posture” language only, not a market superiority claim.',
    },
    {
      testId: 'pf1-certified-reference-unit',
      title: 'Reference run against one certified market unit or documented certified-equivalent setup',
      category: 'head_to_head_baseline',
      objective: 'Anchor PF-1 against a market-relevant benchmark that maps more directly to certifiable claims.',
      baseline: 'One NSF-certified or documented certified-equivalent PFAS reduction reference unit.',
      passSignal: 'PF-1 performs credibly enough to justify further certification-oriented comparison work.',
      claimUnlocked: 'No external claim yet; only unlocks “head-to-head benchmark program exists.”',
    },
    {
      testId: 'pf1-matrix-competing-ions',
      title: 'Competing-ion robustness matrix',
      category: 'matrix_robustness',
      objective: 'Verify PF-1 stability when the PFAS profile is stressed by salts and competing ions inside bounded wastewater conditions.',
      baseline: 'Repeat the same baseline technologies under the same stressed matrix.',
      passSignal: 'PF-1 keeps removal and bounded pressure/fouling behavior inside the internal guardrail band.',
      claimUnlocked: 'Internal robustness wording for one stressed industrial matrix.',
    },
    {
      testId: 'pf1-matrix-organic-load',
      title: 'Organic-load and surfactant robustness matrix',
      category: 'matrix_robustness',
      objective: 'Test whether PF-1 degrades sharply when organic load or surfactant burden increases.',
      baseline: 'GAC and resin comparison runs under the same foulant load.',
      passSignal: 'PF-1 retains a defendable capture/fouling balance relative to the bounded baseline window.',
      claimUnlocked: 'Internal “robust across two bounded wastewater matrices” wording only.',
    },
    {
      testId: 'pf1-breakthrough-service-window',
      title: 'Breakthrough and service-window mapping',
      category: 'service_cycle',
      objective: 'Map when PF-1 meaningfully degrades so swap and regeneration assumptions are not hand-wavy.',
      baseline: 'Breakthrough curves for the matched baseline media at the same flux band.',
      passSignal: 'PF-1 shows a repeatable bounded service window suitable for operator-reviewed swap planning.',
      claimUnlocked: 'Internal service-window claims, still no market superiority percentage.',
    },
    {
      testId: 'pf1-regeneration-recovery-loop',
      title: 'Offline regeneration recovery loop',
      category: 'service_cycle',
      objective: 'Measure PF-1 post-regeneration recovery versus fresh-media performance across repeated loops.',
      baseline: 'Baseline media replacement or regeneration economics under the same bounded assumptions.',
      passSignal: 'PF-1 regeneration stays within the bounded penalty window already used internally.',
      claimUnlocked: 'Internal regeneration discipline claim only.',
    },
    {
      testId: 'pf1-cost-per-treated-volume',
      title: 'Cost per treated-volume guardrail model',
      category: 'economic_guardrail',
      objective: 'Estimate whether PF-1 could plausibly compete economically once swap/regeneration and throughput are included.',
      baseline: 'Reference cost model for GAC, resin, and RO in the same bounded use case.',
      passSignal: 'PF-1 stays within a plausible premium or parity envelope instead of requiring unrealistic service assumptions.',
      claimUnlocked: 'Internal commercialization readiness only.',
    },
    {
      testId: 'pf1-claim-closeout-gate',
      title: 'Claim closeout gate',
      category: 'claim_gate',
      objective: 'Require all prior test families to be complete before any percentage-better language is entertained.',
      baseline: 'Full completed benchmark matrix with auditable source artifacts.',
      passSignal: 'All head-to-head, robustness, service, and economic tests are complete and consistent.',
      claimUnlocked: 'Only then may PF-1 enter a quantified “x% better under y bounded conditions” discussion.',
    },
  ];
}

function renderMarkdown(matrix: InstitutionalNereusPf1MarketComparisonMatrix): string {
  return [
    '# Nereus PF-1 Market Comparison Matrix',
    '',
    `Generated at: \`${matrix.generatedAt}\``,
    '',
    `- matrixId: \`${matrix.matrixId}\``,
    `- productName: ${matrix.productName}`,
    `- status: \`${matrix.status}\``,
    `- claimReadiness: \`${matrix.claimReadiness}\``,
    '',
    '## Headline',
    '',
    matrix.headline,
    '',
    '## Summary',
    '',
    matrix.summary,
    '',
    '## Baseline Technologies',
    '',
    ...matrix.baselineTechnologies.map((entry) => `- ${entry}`),
    '',
    '## Comparison Principles',
    '',
    ...matrix.comparisonPrinciples.map((entry) => `- ${entry}`),
    '',
    '## Test Matrix',
    '',
    ...matrix.testMatrix.flatMap((test) => [
      `### ${test.title}`,
      '',
      `- testId: \`${test.testId}\``,
      `- category: \`${test.category}\``,
      `- objective: ${test.objective}`,
      `- baseline: ${test.baseline}`,
      `- passSignal: ${test.passSignal}`,
      `- claimUnlocked: ${test.claimUnlocked}`,
      '',
    ]),
    '## Claim Gate',
    '',
    ...matrix.claimGate.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...matrix.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## No-Go Claims',
    '',
    ...matrix.noGoClaims.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...matrix.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeMatrix(matrix: InstitutionalNereusPf1MarketComparisonMatrix): InstitutionalNereusPf1MarketComparisonMatrix {
  const parsed = InstitutionalNereusPf1MarketComparisonMatrixSchema.parse(matrix);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-market-comparison-matrices', `${parsed.matrixId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.matrixId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_market_comparison_matrix_service',
    routeId: 'services:cognition.nereus.nereusPf1MarketComparisonMatrixService.build',
    summary: stored.summary,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_market_comparison_matrix_recorded',
  });
  return stored;
}

export function resetNereusPf1MarketComparisonMatrixService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1MarketComparisonMatrices(): InstitutionalNereusPf1MarketComparisonMatrix[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1MarketComparisonMatrix(matrixId: string): InstitutionalNereusPf1MarketComparisonMatrix | null {
  return getDurableRegistryEntry(registryOptions, matrixId);
}

export async function buildNereusPf1MarketComparisonMatrix(input?: {
  launchReviewId?: string;
  commercializationPrepId?: string;
}): Promise<InstitutionalNereusPf1MarketComparisonMatrix> {
  const launchReview = input?.launchReviewId
    ? getNereusPf1LaunchReview(input.launchReviewId)
    : listNereusPf1LaunchReviews()[0] || null;
  const resolvedLaunchReview = launchReview || await buildNereusPf1LaunchReview();
  const prep = input?.commercializationPrepId
    ? getNereusPf1CommercializationPrep(input.commercializationPrepId)
    : getNereusPf1CommercializationPrep(resolvedLaunchReview.commercializationPrepRef) || listNereusPf1CommercializationPreps()[0] || null;
  const resolvedPrep = prep || await buildNereusPf1CommercializationPrep();

  const aligned = resolvedLaunchReview.status === 'bounded_internal_launch_ready'
    && resolvedPrep.status === 'internal_preparation_ready';
  const generatedAt = new Date().toISOString();
  const matrixId = `nereus-pf1-market-comparison-matrix:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-market-comparison-matrices', `${matrixId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const testMatrix = buildTestMatrix();

  const matrix: InstitutionalNereusPf1MarketComparisonMatrix = {
    schemaVersion: 'institution.nereus-pf1-market-comparison-matrix.v1',
    matrixId,
    generatedAt,
    status: aligned ? 'benchmark_plan_ready' : 'needs_more_internal_alignment',
    productName: 'Nereus PF-1',
    launchReviewRef: resolvedLaunchReview.reviewId,
    commercializationPrepRef: resolvedPrep.prepId,
    claimReadiness: aligned ? 'head_to_head_plan_ready' : 'not_ready_for_market_claims',
    headline: aligned
      ? 'PF-1 now has a concrete 10-test head-to-head benchmark matrix, but still does not have a defensible market superiority claim.'
      : 'PF-1 still needs stronger internal alignment before even the benchmark matrix can be treated as the canonical market-comparison plan.',
    summary: aligned
      ? 'This matrix defines the exact head-to-head tests PF-1 must pass before anyone can honestly say how much better it is than market filters. Until these runs exist, percentage-better language stays out.'
      : 'PF-1 lacks the internal launch/prep alignment needed for a canonical benchmark plan, so market-comparison work should stay preparatory only.',
    baselineTechnologies: [
      'Granular activated carbon reference bed',
      'PFAS-focused ion exchange resin cartridge',
      'Reverse osmosis polishing stage',
      'One certified or certified-equivalent PFAS reduction reference unit',
    ],
    comparisonPrinciples: [
      'Use the same inlet burden, flux band, and bounded wastewater matrix for PF-1 and each baseline.',
      'Score capture, fouling, regeneration, pressure, and service burden together rather than treating removal alone as a win.',
      'No percentage-better language is allowed until the full matrix closes with auditable artifacts.',
      'Closed-loop industrial wastewater positioning remains the only allowed comparison frame.',
    ],
    testMatrix,
    claimGate: [
      'No quantified superiority claim before all 10 tests are completed and archived.',
      'No “better than market” language from internal scores alone.',
      'No public-water, field, or certification-adjacent claims from this matrix by itself.',
      'Any future percent claim must name the exact baseline, matrix, and operating envelope.',
    ],
    nextSteps: aligned
      ? [
          'Run the four baseline head-to-head tests first so PF-1 has real market anchors instead of only internal scores.',
          'Use the robustness and service-cycle tests to decide whether PF-1 can carry a credible cost-per-volume story.',
          'Only after the full matrix closes should PF-1 be considered for quantified market-comparison language.',
        ]
      : [
          'Refresh the PF-1 launch and commercialization chain before treating this matrix as canonical.',
          'Keep all PF-1 market-comparison language internal and preparatory only.',
        ],
    blockerCodes: aligned ? [] : ['nereus_pf1_market_comparison_alignment_missing'],
    noGoClaims: [
      'No “PF-1 is x% better than market filters” claim yet.',
      'No implication that EPA or NSF certification has been achieved or replicated.',
      'No public-water, household, pilot, field, or release language from this matrix alone.',
      'No bundled claim that PF-1 beats GAC, resin, and RO simultaneously before direct runs exist.',
    ],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedLaunchReview.reviewId,
      resolvedPrep.prepId,
      resolvedLaunchReview.internalProductPacketRef,
      resolvedLaunchReview.productDecisionRef,
      resolvedPrep.commercializationTightenRef,
      resolvedPrep.reviewRefreshRef,
      resolvedPrep.secondConfirmationReplayRef,
      resolvedPrep.productReviewRef,
      resolvedPrep.candidateRef,
      ...resolvedLaunchReview.evidenceRefs,
      ...resolvedPrep.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'The market comparison matrix is an internal planning artifact, not a released benchmark report.',
      'It defines what PF-1 must prove before quantified market claims are allowed.',
      'PF-1 remains advisory-only, closed-loop only, and not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  matrix.markdown = renderMarkdown(matrix);
  return storeMatrix(matrix);
}
