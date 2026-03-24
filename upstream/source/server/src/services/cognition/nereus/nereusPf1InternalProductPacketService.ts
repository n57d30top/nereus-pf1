import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1InternalProductPacketSchema,
  type InstitutionalNereusPf1InternalProductPacket,
} from '../../../../../shared/institutional-nereus-pf1-internal-product-packet';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import {
  applyNereusPf1ProductDecision,
  getNereusPf1ProductDecision,
  listNereusPf1ProductDecisions,
} from './nereusPf1ProductDecisionService';
import {
  buildNereusPf1CommercializationPrep,
  getNereusPf1CommercializationPrep,
} from './nereusPf1CommercializationPrepService';
import { getNereusPf1CommercializationTighten } from './nereusPf1CommercializationTightenService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1InternalProductPackets',
  schemaVersion: 'institution.nereus-pf1-internal-product-packet.registry.v1',
  schema: InstitutionalNereusPf1InternalProductPacketSchema,
  getKey: (entry: InstitutionalNereusPf1InternalProductPacket) => entry.packetId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function renderMarkdown(packet: InstitutionalNereusPf1InternalProductPacket): string {
  return [
    '# Nereus PF-1 Internal Product Packet',
    '',
    `Generated at: \`${packet.generatedAt}\``,
    '',
    `- packetId: \`${packet.packetId}\``,
    `- productName: ${packet.productName}`,
    `- status: \`${packet.status}\``,
    '',
    '## Headline',
    '',
    packet.packetHeadline,
    '',
    '## Summary',
    '',
    packet.packetSummary,
    '',
    '## Product Frame',
    '',
    `- frame: ${packet.productFrame}`,
    `- launchNarrative: ${packet.launchNarrative}`,
    `- targetCustomerProfile: ${packet.targetCustomerProfile}`,
    `- firstCommercialShape: ${packet.firstCommercialShape}`,
    `- placementEnvelope: ${packet.placementEnvelope}`,
    `- serviceCycleEnvelope: ${packet.serviceCycleEnvelope}`,
    `- pricingEnvelope: ${packet.pricingEnvelope}`,
    '',
    '## Review Questions',
    '',
    ...packet.reviewQuestions.map((entry) => `- ${entry}`),
    '',
    '## Launch Readiness Signals',
    '',
    ...packet.launchReadinessSignals.map((entry) => `- ${entry}`),
    '',
    '## Operator Checklist',
    '',
    ...packet.operatorChecklist.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...(packet.blockerCodes.length > 0 ? packet.blockerCodes.map((entry) => `- blocker: ${entry}`) : ['- blocker: none']),
    '',
    '## Safety',
    '',
    ...packet.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storePacket(packet: InstitutionalNereusPf1InternalProductPacket): InstitutionalNereusPf1InternalProductPacket {
  const parsed = InstitutionalNereusPf1InternalProductPacketSchema.parse(packet);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-internal-product-packets', `${parsed.packetId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.packetId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_internal_product_packet_service',
    routeId: 'services:cognition.nereus.nereusPf1InternalProductPacketService.build',
    summary: stored.packetSummary,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_internal_product_packet_recorded',
  });
  return stored;
}

export function resetNereusPf1InternalProductPacketService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1InternalProductPackets(): InstitutionalNereusPf1InternalProductPacket[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1InternalProductPacket(packetId: string): InstitutionalNereusPf1InternalProductPacket | null {
  return getDurableRegistryEntry(registryOptions, packetId);
}

export async function buildNereusPf1InternalProductPacket(input?: {
  decisionId?: string;
  prepId?: string;
}): Promise<InstitutionalNereusPf1InternalProductPacket> {
  const decision = input?.decisionId
    ? getNereusPf1ProductDecision(input.decisionId)
    : listNereusPf1ProductDecisions()[0] || null;
  const resolvedDecision = decision || await applyNereusPf1ProductDecision();
  const prep = input?.prepId
    ? getNereusPf1CommercializationPrep(input.prepId)
    : null;
  const resolvedPrep = prep || await buildNereusPf1CommercializationPrep({
    decisionId: resolvedDecision.decisionId,
  });
  const tighten = getNereusPf1CommercializationTighten(resolvedPrep.commercializationTightenRef);
  if (!tighten) {
    throw new Error('nereus_pf1_internal_product_packet_tighten_missing');
  }

  const isReady = resolvedDecision.outcome === 'pf1_primary_internal_candidate_active'
    && resolvedPrep.status === 'internal_preparation_ready'
    && tighten.status === 'bounded_internal_productization_ready';
  const generatedAt = new Date().toISOString();
  const packetId = `nereus-pf1-internal-product-packet:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-internal-product-packets', `${packetId.replace(/[:]/g, '_')}.md`),
    [],
  );

  const packet: InstitutionalNereusPf1InternalProductPacket = {
    schemaVersion: 'institution.nereus-pf1-internal-product-packet.v1',
    packetId,
    generatedAt,
    status: isReady ? 'internal_product_packet_ready' : 'needs_more_review',
    productName: 'Nereus PF-1',
    productDecisionRef: resolvedDecision.decisionId,
    commercializationPrepRef: resolvedPrep.prepId,
    commercializationTightenRef: resolvedPrep.commercializationTightenRef,
    reviewRefreshRef: resolvedPrep.reviewRefreshRef,
    secondConfirmationReplayRef: resolvedPrep.secondConfirmationReplayRef,
    productReviewRef: resolvedPrep.productReviewRef,
    candidateRef: resolvedPrep.candidateRef,
    packetHeadline: isReady
      ? 'Nereus PF-1 is now packaged as one bounded internal PFAS product program.'
      : 'Nereus PF-1 still needs more internal review before the packet can become canonical.',
    packetSummary: isReady
      ? 'This packet closes the internal PF-1 product spine into one buyer profile, one insertion-point story, one bounded service-cycle model, and one no-go-claim envelope.'
      : 'This packet collects the current PF-1 materials, but they are not yet strong enough to become the canonical internal product pack.',
    productFrame: 'Bounded closed-loop PFAS polishing module for controlled industrial wastewater loops.',
    launchNarrative: 'Sell PF-1 internally as one conservative polishing-stage wedge, not as a universal Nereus family launch.',
    targetCustomerProfile: resolvedPrep.targetCustomerProfile,
    firstCommercialShape: resolvedPrep.firstCommercialShape,
    placementEnvelope: resolvedPrep.placementEnvelope,
    serviceCycleEnvelope: resolvedPrep.serviceCycleEnvelope,
    pricingEnvelope: resolvedPrep.pricingEnvelope,
    reviewQuestions: [
      'Does PF-1 stay tied to one closed-loop PFAS polishing story instead of widening back to the full Nereus family?',
      'Does the buyer and insertion-point story remain conservative enough for bounded internal launch review?',
      'Are the service-cycle and regeneration assumptions still framed as internal planning inputs rather than field-proof claims?',
    ],
    operatorChecklist: [
      'Use PF-1 as the primary bounded Nereus product candidate in internal materials.',
      'Keep HM-1 on retirement/hold and microplastic in validation while PF-1 is primary.',
      'Keep all PF-1 launch language closed-loop only, advisory-only, and internal-only.',
    ],
    launchReadinessSignals: [
      `Decision outcome: ${resolvedDecision.outcome}`,
      `Commercialization prep: ${resolvedPrep.status}`,
      `Commercialization tighten: ${tighten.status}`,
      'PF-1 proof remains anchored to multi-repeat PFAS-first evidence.',
    ],
    blockerCodes: isReady ? [] : ['nereus_pf1_internal_product_packet_not_ready'],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedDecision.decisionId,
      resolvedPrep.prepId,
      resolvedPrep.commercializationTightenRef,
      resolvedPrep.reviewRefreshRef,
      resolvedPrep.secondConfirmationReplayRef,
      resolvedPrep.productReviewRef,
      resolvedPrep.candidateRef,
      ...resolvedDecision.evidenceRefs,
      ...resolvedPrep.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'PF-1 internal packet remains bounded to internal productization only.',
      'No pilot deployment, field deployment, wet-lab validation, or public-water claims are authorized.',
      'PF-1 remains advisory-only and closed-loop only.',
    ],
    updatedAt: generatedAt,
  };
  packet.markdown = renderMarkdown(packet);
  return storePacket(packet);
}
