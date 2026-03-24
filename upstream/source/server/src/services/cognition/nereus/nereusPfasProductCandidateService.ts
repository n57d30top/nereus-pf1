import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPfasProductCandidateSchema,
  type InstitutionalNereusPfasProductCandidate,
} from '../../../../../shared/institutional-nereus-pfas-product-candidate';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import { getNereusCampaign, listNereusCampaigns } from './nereusCampaignService';
import { getNereusHm1ProfileRecheckReport, listNereusHm1ProfileRecheckReports } from './nereusHm1ProfileRecheckService';
import { listNereusPartnerPackets } from './nereusPartnerPacketService';
import { getNereusPlatformBlueprint, listNereusPlatformBlueprints } from './nereusPlatformBlueprintService';
import { listNereusProductConcepts } from './nereusProductConceptService';
import { buildNereusResearchBrief, listNereusResearchBriefs } from './nereusResearchBriefService';
import { buildNereusResearchPacket, listNereusResearchPackets } from './nereusResearchPacketService';
import { getNereusTargetDossier } from './nereusTargetDossierService';
import {
  resolveNereusPrimaryArtifactRef,
  writeNereusJsonArtifact,
  writeNereusTextArtifact,
} from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPfasProductCandidates',
  schemaVersion: 'institution.nereus-pfas-product-candidate.registry.v1',
  schema: InstitutionalNereusPfasProductCandidateSchema,
  getKey: (entry: InstitutionalNereusPfasProductCandidate) => entry.candidateId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function latestBlueprint(blueprintId?: string) {
  if (blueprintId) {
    return getNereusPlatformBlueprint(blueprintId);
  }
  return listNereusPlatformBlueprints()[0] || null;
}

function latestHm1ProfileRecheck(reportId?: string) {
  if (reportId) {
    return getNereusHm1ProfileRecheckReport(reportId);
  }
  return listNereusHm1ProfileRecheckReports()[0] || null;
}

function latestPacketForCampaign(campaignId: string) {
  return listNereusResearchPackets()
    .filter((entry) => entry.campaignRef === campaignId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
}

function latestBriefForCampaign(campaignId: string) {
  return listNereusResearchBriefs()
    .filter((entry) => entry.campaignRef === campaignId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
}

function latestPartnerPacketForCampaign(campaignId: string) {
  return [...listNereusPartnerPackets()]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .find((entry) => entry.leadCase.campaignRef === campaignId || entry.contrastCase?.campaignRef === campaignId) || null;
}

function latestExistingCampaignForFocus(focus: 'pfas_capture') {
  return listNereusCampaigns()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .find((entry) => getNereusTargetDossier(entry.targetDossierRef)?.contaminantFocus === focus) || null;
}

function renderMarkdown(candidate: InstitutionalNereusPfasProductCandidate): string {
  return [
    '# Nereus PF-1 Product Candidate',
    '',
    `Generated at: \`${candidate.generatedAt}\``,
    '',
    `- candidateId: \`${candidate.candidateId}\``,
    `- productName: ${candidate.productName}`,
    `- status: \`${candidate.status}\``,
    `- roleTransition: \`${candidate.roleTransition}\``,
    `- readinessSignal: \`${candidate.readinessSignal}\``,
    `- recommendedForm: \`${candidate.recommendedForm}\``,
    '',
    '## Headline',
    '',
    candidate.headline,
    '',
    '## Summary',
    '',
    candidate.summary,
    '',
    '## Promotion Rationale',
    '',
    candidate.promotionRationale,
    '',
    '## Product Shape',
    '',
    `- customerProblem: ${candidate.customerProblem}`,
    `- proposedBuyer: ${candidate.proposedBuyer}`,
    `- deploymentShape: ${candidate.deploymentShape}`,
    `- commercialModel: ${candidate.commercialModel}`,
    `- productPromise: ${candidate.productPromise}`,
    `- whyNow: ${candidate.whyNow}`,
    '',
    '## Evidence Lineage',
    '',
    `- platformBlueprintRef: ${candidate.platformBlueprintRef}`,
    `- hm1ProfileRecheckRef: ${candidate.hm1ProfileRecheckRef}`,
    `- priorPrimaryConceptRef: ${candidate.priorPrimaryConceptRef || 'none'}`,
    `- leadCampaignRef: ${candidate.leadCampaignRef}`,
    `- leadPacketRef: ${candidate.leadPacketRef}`,
    `- leadBriefRef: ${candidate.leadBriefRef}`,
    `- leadPartnerPacketRef: ${candidate.leadPartnerPacketRef || 'none'}`,
    `- contrastCampaignRef: ${candidate.contrastCampaignRef || 'none'}`,
    `- sourceMaterialClass: ${candidate.sourceMaterialClass}`,
    `- sourceWaterMatrix: ${candidate.sourceWaterMatrix}`,
    '',
    '## Operator Checklist',
    '',
    ...candidate.operatorChecklist.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...candidate.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Blockers',
    '',
    ...(candidate.blockerCodes.length > 0 ? candidate.blockerCodes.map((entry) => `- ${entry}`) : ['- none']),
    '',
    '## Safety',
    '',
    ...candidate.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeCandidate(candidate: InstitutionalNereusPfasProductCandidate): InstitutionalNereusPfasProductCandidate {
  const parsed = InstitutionalNereusPfasProductCandidateSchema.parse(candidate);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pfas-product-candidates', `${parsed.candidateId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.candidateId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pfas_product_candidate_service',
    routeId: 'services:cognition.nereus.nereusPfasProductCandidateService.build',
    summary: stored.headline,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pfas_product_candidate_recorded',
  });
  return stored;
}

export function resetNereusPfasProductCandidateService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPfasProductCandidates(): InstitutionalNereusPfasProductCandidate[] {
  return listDurableRegistryEntries(registryOptions)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPfasProductCandidate(candidateId: string): InstitutionalNereusPfasProductCandidate | null {
  return getDurableRegistryEntry(registryOptions, candidateId);
}

export function buildNereusPfasProductCandidate(input?: {
  platformBlueprintId?: string;
  hm1ProfileRecheckId?: string;
  leadCampaignId?: string;
}): InstitutionalNereusPfasProductCandidate {
  const blueprint = latestBlueprint(input?.platformBlueprintId);
  if (!blueprint) {
    throw new Error('nereus_pfas_product_candidate_blueprint_missing');
  }
  const hm1ProfileRecheck = latestHm1ProfileRecheck(input?.hm1ProfileRecheckId);
  if (!hm1ProfileRecheck) {
    throw new Error('nereus_pfas_product_candidate_hm1_profile_recheck_missing');
  }

  const pfasTrack = blueprint.trackProfiles.find((entry) => entry.contaminantFocus === 'pfas_capture');
  if (!pfasTrack?.latestCampaignRef && !input?.leadCampaignId) {
    throw new Error('nereus_pfas_product_candidate_pfas_track_missing');
  }

  const leadCampaignRef = input?.leadCampaignId || pfasTrack?.latestCampaignRef;
  if (!leadCampaignRef) {
    throw new Error('nereus_pfas_product_candidate_lead_missing');
  }
  const leadCampaign = getNereusCampaign(leadCampaignRef)
    || (!input?.leadCampaignId ? latestExistingCampaignForFocus('pfas_capture') : null);
  if (!leadCampaign) {
    throw new Error(`nereus_pfas_product_candidate_campaign_missing:${leadCampaignRef}`);
  }
  const leadTarget = getNereusTargetDossier(leadCampaign.targetDossierRef);
  if (!leadTarget) {
    throw new Error(`nereus_pfas_product_candidate_target_missing:${leadCampaign.targetDossierRef}`);
  }

  const leadPacket = latestPacketForCampaign(leadCampaign.campaignId) || buildNereusResearchPacket({ campaignId: leadCampaign.campaignId });
  const leadBrief = latestBriefForCampaign(leadCampaign.campaignId) || buildNereusResearchBrief({ packetId: leadPacket.packetId });
  const leadPartnerPacket = latestPartnerPacketForCampaign(leadCampaign.campaignId);
  const priorPrimaryConcept = listNereusProductConcepts()
    .find((entry) => entry.primaryContaminantFocus === 'heavy_metal_capture') || null;

  const roleTransition = hm1ProfileRecheck.nextAction === 'hold_hm1_story'
    ? 'reserve_to_primary'
    : hm1ProfileRecheck.nextAction === 'keep_hm1_on_watch'
      ? 'reserve_hold'
      : 'stay_reserved';
  const readinessSignal = pfasTrack?.signalStatus || 'not_started';
  const hasInternalPacketSpine = Boolean(leadPacket.packetId && leadBrief.briefId);
  const status = (
    roleTransition === 'reserve_to_primary'
    && (
      readinessSignal === 'packet_ready'
      || readinessSignal === 'repeated_packet_ready'
      || hasInternalPacketSpine
    )
  )
    ? 'bounded_internal_candidate'
    : (readinessSignal === 'screening_signal' || hasInternalPacketSpine || roleTransition === 'reserve_hold')
      ? 'watch_candidate'
      : 'blocked';

  const headline = status === 'bounded_internal_candidate'
    ? 'Nereus PF-1 is now the bounded PFAS-first internal product candidate while HM-1 remains on hold.'
    : status === 'watch_candidate'
      ? 'Nereus PF-1 is the next PFAS candidate on watch, but the reserve-to-primary move is not fully earned yet.'
      : 'Nereus PF-1 remains blocked until PFAS evidence strengthens or HM-1 no longer dominates the internal product queue.';
  const summary = status === 'bounded_internal_candidate'
    ? 'PFAS is promoted from reserve to the current bounded internal product candidate because HM-1 failed its final recheck while PFAS still holds packet-ready platform evidence.'
    : status === 'watch_candidate'
      ? 'PFAS is the strongest fallback candidate, but it should stay on watch until another replay tightens the PFAS evidence line.'
      : 'PFAS remains visible in Nereus, but it is not ready to take the primary internal product slot yet.';

  const promotionRationale = hm1ProfileRecheck.nextAction === 'hold_hm1_story'
    ? 'HM-1 is explicitly on hold after the final profile recheck, so PFAS becomes the cleanest bounded successor path inside the existing Nereus platform.'
    : 'HM-1 is not fully closed, so PFAS can only be treated as a bounded reserve candidate until the platform decides the primary slot explicitly.';

  const customerProblem = 'Industrial operators need a closed-loop PFAS polishing stage that can stay bounded, regenerable, and commercially plausible without drifting into public-water or field-deployment claims.';
  const proposedBuyer = 'Industrial remediation and process-water teams that need a conservative PFAS polishing module inside controlled treatment loops.';
  const deploymentShape = 'A modular PFAS polishing skid or drop-in polishing stage that sits behind existing pre-treatment inside a closed-loop treatment train.';
  const commercialModel = 'Module sale plus bounded media service, swap logistics, and conservative optimization reviews.';
  const productPromise = 'Turn the current PFAS reserve track into one explicit closed-loop PFAS product candidate while HM-1 remains on hold and microplastic stays in validation.';
  const whyNow = `The platform currently shows PFAS as ${readinessSignal}, PFAS already has its own bounded packet-and-brief spine, and HM-1 is now explicitly held by ${hm1ProfileRecheck.reportId}; together that is enough for a conservative PFAS-first internal candidate framing.`;

  const operatorChecklist = [
    'Treat PFAS as the new bounded primary candidate only inside internal Nereus review.',
    'Keep HM-1 frozen on hold and do not mix the heavy-metal recovery story back into the PFAS launch wedge.',
    'Keep microplastic explicitly in validation and outside the primary candidate story.',
    'Use the PFAS packet and brief as the next evidence spine instead of recycling the heavy-metal narrative.',
  ];
  const nextSteps = status === 'bounded_internal_candidate'
    ? [
        'Run one PFAS-first confirmation cohort before adding broader commercialization language.',
        'Translate PF-1 into a bounded internal product review if the PFAS replay holds.',
        'Keep PF-1 closed-loop only and avoid any pilot, field, or public-water claims.',
      ]
    : [
        'Keep PF-1 on watch and run another PFAS replay before promoting it to the active internal candidate slot.',
        'Do not widen PFAS commercialization language until the next PFAS replay holds cleanly.',
        'Keep HM-1 and microplastic out of the primary candidate story while PF-1 is still unresolved.',
      ];

  const blockerCodes = status === 'blocked' ? ['nereus_pfas_candidate_not_ready'] : [];
  const generatedAt = new Date().toISOString();
  const candidateId = `nereus-pfas-product-candidate:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pfas-product-candidates', `${candidateId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const candidate: InstitutionalNereusPfasProductCandidate = {
    schemaVersion: 'institution.nereus-pfas-product-candidate.v1',
    candidateId,
    generatedAt,
    status,
    productName: 'Nereus PF-1',
    primaryContaminantFocus: 'pfas_capture',
    recommendedForm: 'modular_polishing_skid',
    roleTransition,
    readinessSignal,
    platformBlueprintRef: blueprint.reportId,
    hm1ProfileRecheckRef: hm1ProfileRecheck.reportId,
    priorPrimaryConceptRef: priorPrimaryConcept?.conceptId,
    leadCampaignRef: leadCampaign.campaignId,
    leadPacketRef: leadPacket.packetId,
    leadBriefRef: leadBrief.briefId,
    leadPartnerPacketRef: leadPartnerPacket?.packetId,
    contrastCampaignRef: hm1ProfileRecheck.leadCampaignRef,
    sourceWaterMatrix: leadTarget.waterMatrix,
    sourceMaterialClass: leadTarget.materialClass,
    headline,
    summary,
    promotionRationale,
    customerProblem,
    proposedBuyer,
    deploymentShape,
    commercialModel,
    productPromise,
    whyNow,
    operatorChecklist,
    nextSteps,
    blockerCodes,
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      blueprint.reportId,
      hm1ProfileRecheck.reportId,
      priorPrimaryConcept?.conceptId,
      leadCampaign.campaignId,
      leadPacket.packetId,
      leadBrief.briefId,
      leadPartnerPacket?.packetId,
      hm1ProfileRecheck.leadCampaignRef,
    ]),
    artifactRefs: [],
    safety: [
      'PF-1 remains advisory-only and closed-loop only.',
      'This candidate does not authorize pilot deployment, field deployment, wet-lab validation, or public-water claims.',
      'PF-1 is an internal product candidate framing, not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  candidate.markdown = renderMarkdown(candidate);
  return storeCandidate(candidate);
}
