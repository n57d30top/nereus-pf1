import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1ProductReviewRefreshSchema,
  type InstitutionalNereusPf1ProductReviewRefresh,
} from '../../../../../shared/institutional-nereus-pf1-product-review-refresh';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import {
  buildNereusPf1SecondConfirmationReplay,
  getNereusPf1SecondConfirmationReplayReport,
  listNereusPf1SecondConfirmationReplayReports,
} from './nereusPf1SecondConfirmationReplayService';
import {
  buildNereusPfasProductReview,
  getNereusPfasProductReview,
  listNereusPfasProductReviews,
} from './nereusPfasProductReviewService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1ProductReviewRefreshes',
  schemaVersion: 'institution.nereus-pf1-product-review-refresh.registry.v1',
  schema: InstitutionalNereusPf1ProductReviewRefreshSchema,
  getKey: (entry: InstitutionalNereusPf1ProductReviewRefresh) => entry.refreshId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function renderMarkdown(refresh: InstitutionalNereusPf1ProductReviewRefresh): string {
  return [
    '# Nereus PF-1 Product Review Refresh',
    '',
    `Generated at: \`${refresh.generatedAt}\``,
    '',
    `- refreshId: \`${refresh.refreshId}\``,
    `- productName: ${refresh.productName}`,
    `- status: \`${refresh.status}\``,
    `- proofStatus: \`${refresh.proofStatus}\``,
    `- tighteningStatus: \`${refresh.tighteningStatus}\``,
    `- nextAction: \`${refresh.nextAction}\``,
    '',
    '## Headline',
    '',
    refresh.headline,
    '',
    '## Summary',
    '',
    refresh.summary,
    '',
    '## Tightened Product Review Frame',
    '',
    `- tightenedPlacementSummary: ${refresh.tightenedPlacementSummary}`,
    `- tightenedRegenerationWindow: ${refresh.tightenedRegenerationWindow}`,
    `- tightenedServiceModelSummary: ${refresh.tightenedServiceModelSummary}`,
    `- tightenedBuyerStory: ${refresh.tightenedBuyerStory}`,
    `- tightenedCommercialPromise: ${refresh.tightenedCommercialPromise}`,
    `- tightenedWhyNow: ${refresh.tightenedWhyNow}`,
    '',
    '## Findings',
    '',
    ...refresh.findings.map((entry) => `- ${entry}`),
    '',
    '## Decisions',
    '',
    ...refresh.decisions.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...refresh.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...refresh.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeRefresh(refresh: InstitutionalNereusPf1ProductReviewRefresh): InstitutionalNereusPf1ProductReviewRefresh {
  const parsed = InstitutionalNereusPf1ProductReviewRefreshSchema.parse(refresh);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-product-review-refreshes', `${parsed.refreshId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.refreshId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_product_review_refresh_service',
    routeId: 'services:cognition.nereus.nereusPf1ProductReviewRefreshService.build',
    summary: stored.headline,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_product_review_refresh_recorded',
  });
  return stored;
}

export function resetNereusPf1ProductReviewRefreshService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1ProductReviewRefreshes(): InstitutionalNereusPf1ProductReviewRefresh[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1ProductReviewRefresh(refreshId: string): InstitutionalNereusPf1ProductReviewRefresh | null {
  return getDurableRegistryEntry(registryOptions, refreshId);
}

export async function buildNereusPf1ProductReviewRefresh(input?: {
  secondConfirmationReplayId?: string;
  productReviewId?: string;
  candidateId?: string;
}): Promise<InstitutionalNereusPf1ProductReviewRefresh> {
  const review = input?.productReviewId
    ? getNereusPfasProductReview(input.productReviewId)
    : listNereusPfasProductReviews()[0] || null;
  const replay = input?.secondConfirmationReplayId
    ? getNereusPf1SecondConfirmationReplayReport(input.secondConfirmationReplayId)
    : listNereusPf1SecondConfirmationReplayReports()[0] || null;
  const resolvedReview = review || await buildNereusPfasProductReview({
    candidateId: input?.candidateId || replay?.candidateRef,
    confirmationReportId: replay?.confirmationReportRef,
  });
  const resolvedReplay = replay || await buildNereusPf1SecondConfirmationReplay({
    candidateId: input?.candidateId || resolvedReview.candidateRef,
    confirmationReportId: resolvedReview.confirmationReportRef,
    productReviewId: resolvedReview.reviewId,
  });
  const isTightened = resolvedReplay.status === 'confirmed_packet_ready'
    && resolvedReplay.proofStatus === 'closed'
    && resolvedReplay.repeatClosureStatus === 'multi_repeat';
  const generatedAt = new Date().toISOString();
  const refreshId = `nereus-pf1-product-review-refresh:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-product-review-refreshes', `${refreshId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const refresh: InstitutionalNereusPf1ProductReviewRefresh = {
    schemaVersion: 'institution.nereus-pf1-product-review-refresh.v1',
    refreshId,
    generatedAt,
    status: isTightened ? 'tightened_bounded_internal_review' : resolvedReplay.status === 'watch' ? 'watch' : 'hold',
    proofStatus: resolvedReplay.proofStatus,
    tighteningStatus: isTightened ? 'tightened' : resolvedReplay.status === 'watch' ? 'watch' : 'not_tightened',
    nextAction: isTightened ? 'tighten_pf1_commercialization' : resolvedReplay.status === 'watch' ? 'keep_pf1_on_watch' : 'hold_pf1_story',
    productName: 'Nereus PF-1',
    secondConfirmationReplayRef: resolvedReplay.reportId,
    productReviewRef: resolvedReview.reviewId,
    candidateRef: resolvedReview.candidateRef,
    confirmationReportRef: resolvedReview.confirmationReportRef,
    conceptRef: resolvedReview.conceptRef,
    platformBlueprintRef: resolvedReview.platformBlueprintRef,
    hm1ProfileRecheckRef: resolvedReview.hm1ProfileRecheckRef,
    leadCampaignRef: resolvedReview.leadCampaignRef,
    leadPacketRef: resolvedReview.leadPacketRef,
    leadBriefRef: resolvedReview.leadBriefRef,
    leadPartnerPacketRef: resolvedReview.leadPartnerPacketRef,
    replayCampaignRef: resolvedReplay.replayCampaignRef,
    replayPacketRef: resolvedReplay.replayPacketRef,
    replayBriefRef: resolvedReplay.replayBriefRef,
    recommendedForm: resolvedReview.recommendedForm,
    tightenedPlacementSummary: 'Place PF-1 as a bounded PFAS polishing module behind existing pre-treatment and before final guard stages, and lock the story to one closed-loop wastewater insertion point instead of a generic treatment train.',
    tightenedRegenerationWindow: 'Treat regeneration as a bounded service-cycle window anchored to the repeat-confirmed PFAS profile, with swap cadence stated conservatively and without claiming field-proven economics.',
    tightenedServiceModelSummary: 'Narrow PF-1 to a skid-plus-media-service offer with bounded operator review, rather than a broad Nereus platform release or open-ended treatment-services narrative.',
    tightenedBuyerStory: 'Aim PF-1 at industrial process-water and remediation operators that need a conservative PFAS polishing stage inside controlled wastewater loops with explicit guardrails.',
    tightenedCommercialPromise: 'PF-1 is the first repeated PFAS-first Nereus module story that is strong enough for bounded internal productization, while HM-1 stays held and microplastic remains validation-only.',
    tightenedWhyNow: 'The second PF-1 confirmation replay closed proof with multi-repeat packet-ready evidence, improved fouling, regeneration, and pressure versus the first cohort averages, and therefore justifies a tighter bounded product-review frame.',
    headline: isTightened
      ? 'Nereus PF-1 now has enough repeated PFAS-first proof to tighten the bounded internal product-review story.'
      : 'Nereus PF-1 still needs more repeatable PFAS-first proof before the bounded product-review story tightens further.',
    summary: isTightened
      ? 'PF-1 moved from general bounded review into a tighter internal product-review frame because repeated PFAS-first packet-ready evidence is now closed and multi-repeat.'
      : 'PF-1 remains visible, but the replay line still needs more proof before the internal product-review frame can be tightened.',
    findings: [
      `PF-1 refresh is anchored to replay ${resolvedReplay.reportId} and review ${resolvedReview.reviewId}.`,
      `Replay closure is ${resolvedReplay.repeatClosureStatus} with proof ${resolvedReplay.proofStatus}.`,
      `Replay vs initial score deltas were fouling=${resolvedReplay.replayVsInitialAverageDeltas.foulingResistanceScore}, regeneration=${resolvedReplay.replayVsInitialAverageDeltas.regenerationScore}, pressure=${resolvedReplay.replayVsInitialAverageDeltas.pressureDropScore}.`,
    ],
    decisions: isTightened
      ? [
          'Treat PF-1 as the primary bounded internal Nereus product-review story.',
          'Freeze HM-1 on hold and keep microplastic outside the launch wedge.',
          'Translate the repeated PFAS proof into a tighter placement, regeneration, and buyer frame before touching broader commercialization language.',
        ]
      : [
          'Keep PF-1 on bounded watch instead of tightening the product-review story.',
          'Do not widen PF-1 productization language while repeat proof remains open.',
        ],
    nextSteps: isTightened
      ? [
          'Build the PF-1 commercialization tighten artifact so placement, service cycle, and pricing posture match the new proof state.',
          'Keep PF-1 advisory-only, closed-loop only, and bounded to internal productization.',
          'Do not reopen HM-1 or widen microplastic into the active PF-1 story.',
        ]
      : [
          'Keep PF-1 on watch and run another PFAS-first replay before further tightening.',
          'Do not widen commercialization or external story language.',
        ],
    blockerCodes: isTightened ? [] : ['nereus_pf1_product_review_refresh_proof_open'],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedReplay.reportId,
      resolvedReview.reviewId,
      resolvedReview.candidateRef,
      resolvedReview.confirmationReportRef,
      resolvedReview.conceptRef,
      resolvedReview.platformBlueprintRef,
      resolvedReview.hm1ProfileRecheckRef,
      resolvedReview.leadCampaignRef,
      resolvedReview.leadPacketRef,
      resolvedReview.leadBriefRef,
      resolvedReview.leadPartnerPacketRef,
      resolvedReplay.replayCampaignRef,
      resolvedReplay.replayPacketRef,
      resolvedReplay.replayBriefRef,
      ...resolvedReplay.evidenceRefs,
      ...resolvedReview.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'PF-1 review refresh remains advisory-only and closed-loop only.',
      'This refresh does not authorize pilot deployment, field deployment, wet-lab validation, or public-water claims.',
      'PF-1 remains an internal product candidate, not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  refresh.markdown = renderMarkdown(refresh);
  return storeRefresh(refresh);
}
