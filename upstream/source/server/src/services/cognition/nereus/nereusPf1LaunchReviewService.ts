import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1LaunchReviewSchema,
  type InstitutionalNereusPf1LaunchReview,
} from '../../../../../shared/institutional-nereus-pf1-launch-review';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import {
  buildNereusPf1InternalProductPacket,
  getNereusPf1InternalProductPacket,
  listNereusPf1InternalProductPackets,
} from './nereusPf1InternalProductPacketService';
import { getNereusPf1CommercializationPrep } from './nereusPf1CommercializationPrepService';
import { getNereusPf1ProductDecision } from './nereusPf1ProductDecisionService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1LaunchReviews',
  schemaVersion: 'institution.nereus-pf1-launch-review.registry.v1',
  schema: InstitutionalNereusPf1LaunchReviewSchema,
  getKey: (entry: InstitutionalNereusPf1LaunchReview) => entry.reviewId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function renderMarkdown(review: InstitutionalNereusPf1LaunchReview): string {
  return [
    '# Nereus PF-1 Launch Review',
    '',
    `Generated at: \`${review.generatedAt}\``,
    '',
    `- reviewId: \`${review.reviewId}\``,
    `- productName: ${review.productName}`,
    `- status: \`${review.status}\``,
    `- launchDisposition: \`${review.launchDisposition}\``,
    '',
    '## Headline',
    '',
    review.reviewHeadline,
    '',
    '## Summary',
    '',
    review.reviewSummary,
    '',
    '## Launch Frame',
    '',
    `- posture: ${review.launchPosture}`,
    `- scope: ${review.launchScope}`,
    `- buyerProfile: ${review.buyerProfile}`,
    `- insertionPoint: ${review.insertionPoint}`,
    `- serviceModel: ${review.serviceModel}`,
    '',
    '## Review Checklist',
    '',
    ...review.reviewChecklist.map((entry) => `- ${entry}`),
    '',
    '## No-Go Claims',
    '',
    ...review.noGoClaims.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...review.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...review.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeReview(review: InstitutionalNereusPf1LaunchReview): InstitutionalNereusPf1LaunchReview {
  const parsed = InstitutionalNereusPf1LaunchReviewSchema.parse(review);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-launch-reviews', `${parsed.reviewId.replace(/[:]/g, '_')}.json`),
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
    source: 'nereus_pf1_launch_review_service',
    routeId: 'services:cognition.nereus.nereusPf1LaunchReviewService.build',
    summary: stored.reviewSummary,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_launch_review_recorded',
  });
  return stored;
}

export function resetNereusPf1LaunchReviewService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1LaunchReviews(): InstitutionalNereusPf1LaunchReview[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1LaunchReview(reviewId: string): InstitutionalNereusPf1LaunchReview | null {
  return getDurableRegistryEntry(registryOptions, reviewId);
}

export async function buildNereusPf1LaunchReview(input?: {
  packetId?: string;
}): Promise<InstitutionalNereusPf1LaunchReview> {
  const packet = input?.packetId
    ? getNereusPf1InternalProductPacket(input.packetId)
    : listNereusPf1InternalProductPackets()[0] || null;
  const resolvedPacket = packet || await buildNereusPf1InternalProductPacket();
  const decision = getNereusPf1ProductDecision(resolvedPacket.productDecisionRef);
  const prep = getNereusPf1CommercializationPrep(resolvedPacket.commercializationPrepRef);
  if (!decision || !prep) {
    throw new Error('nereus_pf1_launch_review_lineage_missing');
  }

  const ready = resolvedPacket.status === 'internal_product_packet_ready'
    && decision.outcome === 'pf1_primary_internal_candidate_active'
    && prep.status === 'internal_preparation_ready';
  const generatedAt = new Date().toISOString();
  const reviewId = `nereus-pf1-launch-review:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-launch-reviews', `${reviewId.replace(/[:]/g, '_')}.md`),
    [],
  );

  const review: InstitutionalNereusPf1LaunchReview = {
    schemaVersion: 'institution.nereus-pf1-launch-review.v1',
    reviewId,
    generatedAt,
    status: ready ? 'bounded_internal_launch_ready' : 'needs_more_review',
    productName: 'Nereus PF-1',
    internalProductPacketRef: resolvedPacket.packetId,
    productDecisionRef: decision.decisionId,
    commercializationPrepRef: prep.prepId,
    launchDisposition: ready ? 'internal_launch_candidate_ready' : 'hold_for_more_review',
    reviewHeadline: ready
      ? 'PF-1 is ready for bounded internal launch review as the primary Nereus PFAS candidate.'
      : 'PF-1 still needs more internal review before it can carry the bounded launch story.',
    reviewSummary: ready
      ? 'PF-1 now has a closed internal packet, a clear buyer and insertion-point story, and a bounded commercialization frame suitable for internal launch review.'
      : 'PF-1 does not yet have a strong enough packet and commercialization frame to carry the bounded launch review.',
    launchPosture: 'Bounded internal launch only, closed-loop only, advisory-only.',
    launchScope: 'One PFAS polishing module, one industrial buyer profile, one insertion-point story, no platform-wide launch claims.',
    buyerProfile: prep.targetCustomerProfile,
    insertionPoint: prep.placementEnvelope,
    serviceModel: prep.serviceCycleEnvelope,
    noGoClaims: [
      'No field deployment claims.',
      'No public-water claims.',
      'No wet-lab or pilot validation claims.',
      'No universal Nereus family launch claim across PFAS, HM-1, and microplastic.',
    ],
    reviewChecklist: [
      'Keep PF-1 positioned as one bounded PFAS polishing wedge.',
      'Keep the launch language tied to one conservative industrial buyer profile.',
      'Keep service-cycle and regeneration language inside internal preparation, not field proof.',
    ],
    nextSteps: ready
      ? [
          'Use this launch review as the canonical PF-1 internal launch frame.',
          'Keep HM-1 retired/on hold while PF-1 carries the active product story.',
          'Only open new PF-1 follow-up loops when fresh evidence or internal review feedback requires it.',
        ]
      : [
          'Refresh the PF-1 internal packet before promoting it as the canonical launch frame.',
          'Do not widen PF-1 beyond bounded internal review.',
        ],
    blockerCodes: ready ? [] : ['nereus_pf1_launch_review_not_ready'],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedPacket.packetId,
      decision.decisionId,
      prep.prepId,
      prep.commercializationTightenRef,
      prep.reviewRefreshRef,
      prep.secondConfirmationReplayRef,
      prep.productReviewRef,
      prep.candidateRef,
      ...resolvedPacket.evidenceRefs,
      ...prep.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'Launch review remains bounded to internal productization only.',
      'No pilot deployment, field deployment, wet-lab validation, or public-water claims are authorized.',
      'PF-1 remains advisory-only and closed-loop only.',
    ],
    updatedAt: generatedAt,
  };
  review.markdown = renderMarkdown(review);
  return storeReview(review);
}
