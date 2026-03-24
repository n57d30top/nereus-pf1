import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPfasProductReviewSchema,
  type InstitutionalNereusPfasProductReview,
} from '../../../../../shared/institutional-nereus-pfas-product-review';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import { buildNereusPfasConfirmationCohort, getNereusPfasConfirmationCohort, listNereusPfasConfirmationCohorts } from './nereusPfasConfirmationCohortService';
import { buildNereusPfasProductCandidate, getNereusPfasProductCandidate, listNereusPfasProductCandidates } from './nereusPfasProductCandidateService';
import { buildNereusProductConcept, getNereusProductConcept } from './nereusProductConceptService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPfasProductReviews',
  schemaVersion: 'institution.nereus-pfas-product-review.registry.v1',
  schema: InstitutionalNereusPfasProductReviewSchema,
  getKey: (entry: InstitutionalNereusPfasProductReview) => entry.reviewId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function renderMarkdown(review: InstitutionalNereusPfasProductReview): string {
  return [
    '# Nereus PF-1 Product Review',
    '',
    `Generated at: \`${review.generatedAt}\``,
    '',
    `- reviewId: \`${review.reviewId}\``,
    `- productName: ${review.productName}`,
    `- readiness: \`${review.readiness}\``,
    '',
    '## Productization Frame',
    '',
    `- placementSummary: ${review.placementSummary}`,
    `- regenerationHypothesis: ${review.regenerationHypothesis}`,
    `- serviceModelSummary: ${review.serviceModelSummary}`,
    `- buyerStory: ${review.buyerStory}`,
    `- conservativeOutcome: ${review.conservativeOutcome}`,
    '',
    '## Decisions',
    '',
    `- launchDecision: ${review.launchDecision}`,
    `- reserveDecision: ${review.reserveDecision}`,
    `- validationDecision: ${review.validationDecision}`,
    '',
    '## Strengths',
    '',
    ...review.strengths.map((entry) => `- ${entry}`),
    '',
    '## Key Risks',
    '',
    ...review.keyRisks.map((entry) => `- ${entry}`),
    '',
    '## Required Proof',
    '',
    ...review.requiredProof.map((entry) => `- ${entry}`),
    '',
    '## Next Productization Steps',
    '',
    ...review.nextProductizationSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...review.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeReview(review: InstitutionalNereusPfasProductReview): InstitutionalNereusPfasProductReview {
  const parsed = InstitutionalNereusPfasProductReviewSchema.parse(review);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pfas-product-reviews', `${parsed.reviewId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.reviewId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pfas_product_review_service',
    routeId: 'services:cognition.nereus.nereusPfasProductReviewService.build',
    summary: stored.launchDecision,
    status: stored.readiness,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pfas_product_review_recorded',
  });
  return stored;
}

export function resetNereusPfasProductReviewService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPfasProductReviews(): InstitutionalNereusPfasProductReview[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPfasProductReview(reviewId: string): InstitutionalNereusPfasProductReview | null {
  return getDurableRegistryEntry(registryOptions, reviewId);
}

export async function buildNereusPfasProductReview(input?: {
  candidateId?: string;
  confirmationReportId?: string;
  conceptId?: string;
}): Promise<InstitutionalNereusPfasProductReview> {
  const candidate = input?.candidateId
    ? getNereusPfasProductCandidate(input.candidateId)
    : listNereusPfasProductCandidates()[0] || buildNereusPfasProductCandidate();
  if (!candidate) {
    throw new Error('nereus_pfas_product_review_candidate_missing');
  }
  const confirmation = input?.confirmationReportId
    ? getNereusPfasConfirmationCohort(input.confirmationReportId)
    : listNereusPfasConfirmationCohorts()[0] || null;
  const confirmationReport = confirmation && confirmation.candidateRef === candidate.candidateId
    ? confirmation
    : await buildNereusPfasConfirmationCohort({ candidateId: candidate.candidateId });
  const concept = input?.conceptId
    ? getNereusProductConcept(input.conceptId)
    : null;
  const resolvedConcept = concept || buildNereusProductConcept({
    leadCampaignId: candidate.leadCampaignRef,
    contrastCampaignId: candidate.contrastCampaignRef,
  });
  const readiness = confirmationReport.status === 'confirmed_packet_ready'
    ? 'bounded_internal_review'
    : 'needs_more_replay';
  const generatedAt = new Date().toISOString();
  const reviewId = `nereus-pfas-product-review:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(path.join('pfas-product-reviews', `${reviewId.replace(/[:]/g, '_')}.md`), []);
  const review: InstitutionalNereusPfasProductReview = {
    schemaVersion: 'institution.nereus-pfas-product-review.v1',
    reviewId,
    generatedAt,
    status: 'internal_product_review',
    readiness,
    productName: 'Nereus PF-1',
    candidateRef: candidate.candidateId,
    confirmationReportRef: confirmationReport.reportId,
    conceptRef: resolvedConcept.conceptId,
    platformBlueprintRef: candidate.platformBlueprintRef,
    hm1ProfileRecheckRef: candidate.hm1ProfileRecheckRef,
    leadCampaignRef: candidate.leadCampaignRef,
    leadPacketRef: candidate.leadPacketRef,
    leadBriefRef: candidate.leadBriefRef,
    leadPartnerPacketRef: candidate.leadPartnerPacketRef,
    recommendedForm: candidate.recommendedForm,
    placementSummary: 'Position PF-1 as a closed-loop PFAS polishing skid behind existing pre-treatment and ahead of final discharge guards or recirculation return points.',
    regenerationHypothesis: 'Assume PF-1 media regeneration only inside bounded loading windows and keep swap economics conservative until another PFAS replay confirms the service cycle.',
    serviceModelSummary: 'Frame PF-1 as module sale plus bounded media service and optimization reviews, not as a universal water-treatment platform promise.',
    buyerStory: 'Target industrial process-water and remediation operators that need a conservative PFAS polishing stage inside controlled treatment loops.',
    conservativeOutcome: readiness === 'bounded_internal_review'
      ? 'PF-1 is ready for bounded internal product review as the first PFAS-first Nereus module story.'
      : 'PF-1 is visible as the PFAS-first module story, but it still needs another replay before the review posture fully hardens.',
    launchDecision: 'Treat PF-1 as the current Nereus launch wedge and keep HM-1 on hold while PFAS carries the active bounded product story.',
    reserveDecision: 'Keep heavy-metal capture as a reserve recovery line instead of letting HM-1 retake the narrative prematurely.',
    validationDecision: 'Keep microplastic explicitly in validation and outside the PF-1 launch story.',
    strengths: [
      'PF-1 now has a bounded candidate spine with packet, brief, and partner-packet lineage.',
      'The PFAS-first wedge is easier to explain commercially than a generic three-track cleanup platform.',
      'HM-1 can stay frozen on hold without collapsing the broader Nereus platform story.',
    ],
    keyRisks: [
      'PF-1 still depends on replay-backed confirmation for regeneration and service-cycle confidence.',
      'Public-water and field-deployment language remain out of bounds.',
      'Microplastic remains under-validated and should not be mixed into the launch narrative.',
    ],
    requiredProof: [
      'A PF-1 confirmation cohort that repeats packet-ready posture.',
      'A tighter bounded view of PFAS media swap/regeneration cadence.',
      'A conservative insertion-point story tied to one closed-loop buyer profile.',
    ],
    nextProductizationSteps: readiness === 'bounded_internal_review'
      ? [
          'Treat PF-1 as the bounded primary review candidate for the next internal Nereus product meeting.',
          'Refine PF-1 placement, buyer, and service language around one closed-loop PFAS polishing scenario.',
          'Keep PF-1 advisory-only and closed-loop only.',
        ]
      : [
          'Run another PFAS replay before widening the PF-1 review story.',
          'Keep PF-1 on watch and avoid stronger productization language until the confirmation line repeats.',
        ],
    blockerCodes: readiness === 'needs_more_replay' ? ['pf1_product_review_needs_more_replay'] : [],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      candidate.candidateId,
      confirmationReport.reportId,
      resolvedConcept.conceptId,
      candidate.platformBlueprintRef,
      candidate.hm1ProfileRecheckRef,
      candidate.leadCampaignRef,
      candidate.leadPacketRef,
      candidate.leadBriefRef,
      candidate.leadPartnerPacketRef,
      candidate.contrastCampaignRef,
      ...confirmationReport.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'PF-1 product review remains advisory-only and closed-loop only.',
      'This review does not authorize pilot deployment, field deployment, wet-lab validation, or public-water claims.',
      'PF-1 remains an internal product candidate, not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  review.markdown = renderMarkdown(review);
  return storeReview(review);
}
