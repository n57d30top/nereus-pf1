import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1SecondConfirmationReplaySchema,
  type InstitutionalNereusPf1SecondConfirmationReplay,
} from '../../../../../shared/institutional-nereus-pf1-second-confirmation-replay';
import type {
  NereusCalibrationActionCounts,
  NereusCalibrationAverageScores,
} from '../../../../../shared/institutional-nereus-calibration-report';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import { getNereusCampaign, getNereusReadinessReview, runNereusCampaign } from './nereusCampaignService';
import {
  buildNereusPfasConfirmationCohort,
  getNereusPfasConfirmationCohort,
  listNereusPfasConfirmationCohorts,
} from './nereusPfasConfirmationCohortService';
import {
  getNereusPfasProductCandidate,
  listNereusPfasProductCandidates,
} from './nereusPfasProductCandidateService';
import {
  buildNereusPfasProductReview,
  getNereusPfasProductReview,
  listNereusPfasProductReviews,
} from './nereusPfasProductReviewService';
import { buildNereusResearchBrief } from './nereusResearchBriefService';
import { buildNereusResearchPacket } from './nereusResearchPacketService';
import { getNereusTargetDossier } from './nereusTargetDossierService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1SecondConfirmationReplayReports',
  schemaVersion: 'institution.nereus-pf1-second-confirmation-replay.registry.v1',
  schema: InstitutionalNereusPf1SecondConfirmationReplaySchema,
  getKey: (entry: InstitutionalNereusPf1SecondConfirmationReplay) => entry.reportId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function round(value: number | null): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Number(value.toFixed(3));
}

function normalizeScores(candidate?: {
  captureEfficiencyScore?: number;
  foulingResistanceScore?: number;
  regenerationScore?: number;
  pressureDropScore?: number;
  manufacturabilityScore?: number;
} | null): NereusCalibrationAverageScores {
  return {
    captureEfficiencyScore: round(candidate?.captureEfficiencyScore ?? null),
    foulingResistanceScore: round(candidate?.foulingResistanceScore ?? null),
    regenerationScore: round(candidate?.regenerationScore ?? null),
    pressureDropScore: round(candidate?.pressureDropScore ?? null),
    manufacturabilityScore: round(candidate?.manufacturabilityScore ?? null),
  };
}

function weightedAverage(initialValue: number | null, initialCount: number, replayValue: number | null): number | null {
  const values = [];
  if (typeof initialValue === 'number' && initialCount > 0) {
    values.push({ value: initialValue, weight: initialCount });
  }
  if (typeof replayValue === 'number') {
    values.push({ value: replayValue, weight: 1 });
  }
  if (values.length === 0) {
    return null;
  }
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedSum = values.reduce((sum, entry) => sum + (entry.value * entry.weight), 0);
  return round(weightedSum / totalWeight);
}

function combineAverageScores(
  initialScores: NereusCalibrationAverageScores,
  initialCount: number,
  replayScores: NereusCalibrationAverageScores,
): NereusCalibrationAverageScores {
  return {
    captureEfficiencyScore: weightedAverage(initialScores.captureEfficiencyScore, initialCount, replayScores.captureEfficiencyScore),
    foulingResistanceScore: weightedAverage(initialScores.foulingResistanceScore, initialCount, replayScores.foulingResistanceScore),
    regenerationScore: weightedAverage(initialScores.regenerationScore, initialCount, replayScores.regenerationScore),
    pressureDropScore: weightedAverage(initialScores.pressureDropScore, initialCount, replayScores.pressureDropScore),
    manufacturabilityScore: weightedAverage(initialScores.manufacturabilityScore, initialCount, replayScores.manufacturabilityScore),
  };
}

function delta(current: number | null, previous: number | null): number | null {
  if (typeof current !== 'number' || typeof previous !== 'number') {
    return null;
  }
  return round(current - previous);
}

function resolveCandidate(candidateId?: string) {
  if (candidateId) {
    return getNereusPfasProductCandidate(candidateId);
  }
  return listNereusPfasProductCandidates()[0] || null;
}

function resolveConfirmationReport(candidateId: string, reportId?: string) {
  if (reportId) {
    return getNereusPfasConfirmationCohort(reportId);
  }
  return listNereusPfasConfirmationCohorts().find((entry) => entry.candidateRef === candidateId) || null;
}

function resolveProductReview(candidateId: string, reviewId?: string) {
  if (reviewId) {
    return getNereusPfasProductReview(reviewId);
  }
  return listNereusPfasProductReviews().find((entry) => entry.candidateRef === candidateId) || null;
}

function renderMarkdown(report: InstitutionalNereusPf1SecondConfirmationReplay): string {
  return [
    '# Nereus PF-1 Second Confirmation Replay',
    '',
    `Generated at: \`${report.generatedAt}\``,
    '',
    `- reportId: \`${report.reportId}\``,
    `- productName: ${report.productName}`,
    `- status: \`${report.status}\``,
    `- proofStatus: \`${report.proofStatus}\``,
    `- repeatClosureStatus: \`${report.repeatClosureStatus}\``,
    `- nextAction: \`${report.nextAction}\``,
    `- replayRecommendedNextAction: \`${report.replayRecommendedNextAction}\``,
    '',
    '## Headline',
    '',
    report.headline,
    '',
    '## Summary',
    '',
    report.summary,
    '',
    '## Replay Profile',
    '',
    `- replayProfileId: ${report.replayProfileId}`,
    `- materialClass: ${report.replayTargetProfile.materialClass}`,
    `- waterMatrix: ${report.replayTargetProfile.waterMatrix}`,
    `- targetRemovalEfficiency: ${report.replayTargetProfile.targetRemovalEfficiency.toFixed(3)}`,
    `- targetFluxLmh: ${report.replayTargetProfile.targetFluxLmh.toFixed(1)}`,
    `- maxRegenerationPenalty: ${report.replayTargetProfile.maxRegenerationPenalty.toFixed(3)}`,
    `- maxPressureDropBar: ${report.replayTargetProfile.maxPressureDropBar.toFixed(3)}`,
    '',
    ...report.replayAdjustments.map((entry) => `- ${entry}`),
    '',
    '## Counts',
    '',
    `- initial prepare/continue/hold: ${report.initialActionCounts.prepare_research_packet}/${report.initialActionCounts.continue_screening}/${report.initialActionCounts.hold}`,
    `- combined prepare/continue/hold: ${report.combinedActionCounts.prepare_research_packet}/${report.combinedActionCounts.continue_screening}/${report.combinedActionCounts.hold}`,
    '',
    '## Score Readout',
    '',
    `- initial average capture/fouling/regeneration/pressure/manufacturability: ${report.initialAverageScores.captureEfficiencyScore ?? 'n/a'} / ${report.initialAverageScores.foulingResistanceScore ?? 'n/a'} / ${report.initialAverageScores.regenerationScore ?? 'n/a'} / ${report.initialAverageScores.pressureDropScore ?? 'n/a'} / ${report.initialAverageScores.manufacturabilityScore ?? 'n/a'}`,
    `- replay capture/fouling/regeneration/pressure/manufacturability: ${report.replayScores.captureEfficiencyScore ?? 'n/a'} / ${report.replayScores.foulingResistanceScore ?? 'n/a'} / ${report.replayScores.regenerationScore ?? 'n/a'} / ${report.replayScores.pressureDropScore ?? 'n/a'} / ${report.replayScores.manufacturabilityScore ?? 'n/a'}`,
    `- combined average capture/fouling/regeneration/pressure/manufacturability: ${report.combinedAverageScores.captureEfficiencyScore ?? 'n/a'} / ${report.combinedAverageScores.foulingResistanceScore ?? 'n/a'} / ${report.combinedAverageScores.regenerationScore ?? 'n/a'} / ${report.combinedAverageScores.pressureDropScore ?? 'n/a'} / ${report.combinedAverageScores.manufacturabilityScore ?? 'n/a'}`,
    `- replay vs initial average deltas: ${report.replayVsInitialAverageDeltas.captureEfficiencyScore ?? 'n/a'} / ${report.replayVsInitialAverageDeltas.foulingResistanceScore ?? 'n/a'} / ${report.replayVsInitialAverageDeltas.regenerationScore ?? 'n/a'} / ${report.replayVsInitialAverageDeltas.pressureDropScore ?? 'n/a'} / ${report.replayVsInitialAverageDeltas.manufacturabilityScore ?? 'n/a'}`,
    '',
    '## Findings',
    '',
    ...report.findings.map((entry) => `- ${entry}`),
    '',
    '## Decision',
    '',
    ...report.decision.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...report.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...report.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeReport(report: InstitutionalNereusPf1SecondConfirmationReplay): InstitutionalNereusPf1SecondConfirmationReplay {
  const parsed = InstitutionalNereusPf1SecondConfirmationReplaySchema.parse(report);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-second-confirmation-replays', `${parsed.reportId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.reportId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_second_confirmation_replay_service',
    routeId: 'services:cognition.nereus.nereusPf1SecondConfirmationReplayService.build',
    summary: stored.headline,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_second_confirmation_replay_recorded',
  });
  return stored;
}

export function resetNereusPf1SecondConfirmationReplayService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1SecondConfirmationReplayReports(): InstitutionalNereusPf1SecondConfirmationReplay[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1SecondConfirmationReplayReport(reportId: string): InstitutionalNereusPf1SecondConfirmationReplay | null {
  return getDurableRegistryEntry(registryOptions, reportId);
}

export async function buildNereusPf1SecondConfirmationReplay(input?: {
  candidateId?: string;
  confirmationReportId?: string;
  productReviewId?: string;
  replayCampaignId?: string;
}): Promise<InstitutionalNereusPf1SecondConfirmationReplay> {
  const candidate = resolveCandidate(input?.candidateId);
  if (!candidate) {
    throw new Error('nereus_pf1_second_confirmation_candidate_missing');
  }
  const initialConfirmation = resolveConfirmationReport(candidate.candidateId, input?.confirmationReportId)
    || await buildNereusPfasConfirmationCohort({ candidateId: candidate.candidateId });
  const productReview = resolveProductReview(candidate.candidateId, input?.productReviewId)
    || await buildNereusPfasProductReview({
      candidateId: candidate.candidateId,
      confirmationReportId: initialConfirmation.reportId,
    });
  const leadCampaign = getNereusCampaign(candidate.leadCampaignRef);
  if (!leadCampaign) {
    throw new Error(`nereus_pf1_second_confirmation_lead_campaign_missing:${candidate.leadCampaignRef}`);
  }
  const leadTarget = getNereusTargetDossier(leadCampaign.targetDossierRef);
  if (!leadTarget) {
    throw new Error(`nereus_pf1_second_confirmation_target_missing:${leadCampaign.targetDossierRef}`);
  }

  const replayCampaign = input?.replayCampaignId
    ? getNereusCampaign(input.replayCampaignId)
    : await runNereusCampaign({
        targetLabel: 'Nereus PF-1 second confirmation replay',
        materialClass: leadTarget.materialClass,
        contaminantFocus: 'pfas_capture',
        waterMatrix: leadTarget.waterMatrix,
        missionObjective: 'Run one additional PFAS-first replay on the PF-1 bounded profile to determine whether the current watch posture can close into multi-repeat product evidence.',
        targetRemovalEfficiency: leadTarget.targetRemovalEfficiency,
        targetFluxLmh: leadTarget.targetFluxLmh,
        maxRegenerationPenalty: leadTarget.maxRegenerationPenalty,
        maxPressureDropBar: leadTarget.maxPressureDropBar,
        requestedVariantCount: leadCampaign.requestedVariantCount,
        generationMode: 'current_process',
        executionMode: 'fixture_stub',
      });
  if (!replayCampaign) {
    throw new Error('nereus_pf1_second_confirmation_replay_campaign_missing');
  }

  const replayPacket = buildNereusResearchPacket({ campaignId: replayCampaign.campaignId });
  const replayBrief = buildNereusResearchBrief({ packetId: replayPacket.packetId });
  const replayReview = getNereusReadinessReview(replayPacket.readinessReviewRef);
  if (!replayReview) {
    throw new Error(`nereus_pf1_second_confirmation_replay_review_missing:${replayPacket.readinessReviewRef}`);
  }

  const replayScores = normalizeScores(
    replayPacket.candidates[0]
    || replayCampaign.candidates[0]
    || replayReview.decisionBasis.topCandidateScores
    || null,
  );
  const combinedActionCounts: NereusCalibrationActionCounts = {
    hold: initialConfirmation.actionCounts.hold + (replayReview.recommendedNextAction === 'hold' ? 1 : 0),
    continue_screening: initialConfirmation.actionCounts.continue_screening + (replayReview.recommendedNextAction === 'continue_screening' ? 1 : 0),
    prepare_research_packet: initialConfirmation.actionCounts.prepare_research_packet + (replayReview.recommendedNextAction === 'prepare_research_packet' ? 1 : 0),
  };
  const combinedAverageScores = combineAverageScores(
    initialConfirmation.averageScores,
    initialConfirmation.cohortCount,
    replayScores,
  );
  const replayVsInitialAverageDeltas = {
    captureEfficiencyScore: delta(replayScores.captureEfficiencyScore, initialConfirmation.averageScores.captureEfficiencyScore),
    foulingResistanceScore: delta(replayScores.foulingResistanceScore, initialConfirmation.averageScores.foulingResistanceScore),
    regenerationScore: delta(replayScores.regenerationScore, initialConfirmation.averageScores.regenerationScore),
    pressureDropScore: delta(replayScores.pressureDropScore, initialConfirmation.averageScores.pressureDropScore),
    manufacturabilityScore: delta(replayScores.manufacturabilityScore, initialConfirmation.averageScores.manufacturabilityScore),
  };

  const repeatClosureStatus = combinedActionCounts.prepare_research_packet >= 2 && replayReview.recommendedNextAction === 'prepare_research_packet'
    ? 'multi_repeat'
    : combinedActionCounts.prepare_research_packet >= 1
      ? 'single_repeat'
      : 'not_confirmed';
  const status = repeatClosureStatus === 'multi_repeat'
    ? 'confirmed_packet_ready'
    : replayReview.recommendedNextAction === 'hold' && combinedActionCounts.prepare_research_packet === 0
      ? 'degraded'
      : 'watch';
  const proofStatus = status === 'confirmed_packet_ready' ? 'closed' : 'still_open';
  const nextAction = status === 'confirmed_packet_ready'
    ? 'tighten_pf1_product_review'
    : status === 'watch'
      ? 'keep_pf1_on_watch'
      : 'hold_pf1_story';

  const headline = status === 'confirmed_packet_ready'
    ? 'Nereus PF-1 repeated packet-ready PFAS evidence strongly enough to tighten the bounded product-review story.'
    : status === 'watch'
      ? 'Nereus PF-1 kept bounded PFAS signal on the second confirmation replay, but the proof is still not closed.'
      : 'Nereus PF-1 failed to improve on watch strongly enough in the second confirmation replay and should remain held back.';
  const summary = status === 'confirmed_packet_ready'
    ? 'PF-1 now has enough repeated PFAS-first packet-ready evidence to support a tighter bounded internal product-review frame.'
    : status === 'watch'
      ? 'PF-1 remains the active bounded PFAS candidate, but the second confirmation replay still leaves the proof open.'
      : 'PF-1 did not repeat cleanly enough in the second confirmation replay to justify a stronger product-review posture.';
  const findings = [
    `PF-1 second confirmation replay used candidate ${candidate.candidateId} and prior confirmation ${initialConfirmation.reportId} as its evidence anchor.`,
    `Replay campaign ${replayCampaign.campaignId} resolved to ${replayReview.recommendedNextAction}.`,
    `Combined prepare/continue/hold counts are now ${combinedActionCounts.prepare_research_packet}/${combinedActionCounts.continue_screening}/${combinedActionCounts.hold}.`,
    `Replay vs initial average deltas: fouling=${replayVsInitialAverageDeltas.foulingResistanceScore ?? 'n/a'}, regeneration=${replayVsInitialAverageDeltas.regenerationScore ?? 'n/a'}, pressure=${replayVsInitialAverageDeltas.pressureDropScore ?? 'n/a'}.`,
  ];
  const decision = status === 'confirmed_packet_ready'
    ? [
        'Treat PF-1 as a repeated PFAS-first bounded candidate with enough replay proof to tighten the internal product-review story.',
        'Keep HM-1 on hold and microplastic in validation while PF-1 carries the primary bounded narrative.',
      ]
    : status === 'watch'
      ? [
          'Keep PF-1 on bounded watch.',
          'Do not widen PF-1 product language beyond internal review until the PFAS replay line closes more cleanly.',
        ]
      : [
          'Hold PF-1 story tightening for now.',
          'Do not escalate commercialization language while the PFAS replay line remains open.',
        ];
  const nextSteps = status === 'confirmed_packet_ready'
    ? [
        'Refresh the PF-1 product review so placement, buyer story, and regeneration language reflect repeated replay proof.',
        'Keep PF-1 advisory-only and closed-loop only.',
        'Do not widen to pilot, field, wet-lab, or public-water claims.',
      ]
    : status === 'watch'
      ? [
          'Keep PF-1 on watch and only widen product language after another clearly supporting PFAS replay or a tighter service-cycle proof.',
          'Preserve PF-1 as the active bounded candidate while HM-1 remains on hold.',
        ]
      : [
          'Pause PF-1 story tightening and reassess the PFAS replay profile before another run.',
          'Avoid stronger commercialization framing until PF-1 repeats more cleanly.',
        ];
  const blockerCodes = status === 'confirmed_packet_ready' ? [] : ['pf1_second_confirmation_proof_open'];
  const generatedAt = new Date().toISOString();
  const reportId = `nereus-pf1-second-confirmation-replay:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(path.join('pf1-second-confirmation-replays', `${reportId.replace(/[:]/g, '_')}.md`), []);
  const report: InstitutionalNereusPf1SecondConfirmationReplay = {
    schemaVersion: 'institution.nereus-pf1-second-confirmation-replay.v1',
    reportId,
    generatedAt,
    status,
    proofStatus,
    repeatClosureStatus,
    nextAction,
    productName: 'Nereus PF-1',
    candidateRef: candidate.candidateId,
    confirmationReportRef: initialConfirmation.reportId,
    productReviewRef: productReview.reviewId,
    platformBlueprintRef: candidate.platformBlueprintRef,
    hm1ProfileRecheckRef: candidate.hm1ProfileRecheckRef,
    leadCampaignRef: candidate.leadCampaignRef,
    leadPacketRef: candidate.leadPacketRef,
    leadBriefRef: candidate.leadBriefRef,
    leadPartnerPacketRef: candidate.leadPartnerPacketRef,
    replayCampaignRef: replayCampaign.campaignId,
    replayPacketRef: replayPacket.packetId,
    replayBriefRef: replayBrief.briefId,
    replayRecommendedNextAction: replayReview.recommendedNextAction,
    replayProfileId: 'pf1_second_confirmation_replay_v1',
    replayTargetProfile: {
      materialClass: leadTarget.materialClass,
      waterMatrix: leadTarget.waterMatrix,
      targetRemovalEfficiency: leadTarget.targetRemovalEfficiency,
      targetFluxLmh: leadTarget.targetFluxLmh,
      maxRegenerationPenalty: leadTarget.maxRegenerationPenalty,
      maxPressureDropBar: leadTarget.maxPressureDropBar,
    },
    replayAdjustments: [
      `Repeat the PF-1 replay on the same ${leadTarget.materialClass}/${leadTarget.waterMatrix} bounded PFAS profile so this pass tests replay closure instead of a new wedge.`,
      `Keep target flux at ${leadTarget.targetFluxLmh.toFixed(1)} LMH and pressure/drop limits at ${leadTarget.maxPressureDropBar.toFixed(3)} bar so the second confirmation stays directly comparable to the first cohort.`,
      'Do not widen to pilot, field, wet-lab, or public-water positioning while PF-1 proof remains bounded.',
    ],
    initialActionCounts: initialConfirmation.actionCounts,
    combinedActionCounts,
    initialAverageScores: initialConfirmation.averageScores,
    replayScores,
    combinedAverageScores,
    replayVsInitialAverageDeltas,
    headline,
    summary,
    findings,
    decision,
    nextSteps,
    blockerCodes,
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      candidate.candidateId,
      initialConfirmation.reportId,
      productReview.reviewId,
      candidate.platformBlueprintRef,
      candidate.hm1ProfileRecheckRef,
      candidate.leadCampaignRef,
      candidate.leadPacketRef,
      candidate.leadBriefRef,
      candidate.leadPartnerPacketRef,
      replayCampaign.campaignId,
      replayPacket.packetId,
      replayBrief.briefId,
    ]),
    artifactRefs: [],
    safety: [
      'PF-1 second confirmation replay remains advisory-only and closed-loop only.',
      'This report does not authorize pilot deployment, field deployment, wet-lab validation, or public-water claims.',
      'PF-1 remains an internal product candidate, not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  report.markdown = renderMarkdown(report);
  return storeReport(report);
}
