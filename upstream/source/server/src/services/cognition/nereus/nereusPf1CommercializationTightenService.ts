import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1CommercializationTightenSchema,
  type InstitutionalNereusPf1CommercializationTighten,
} from '../../../../../shared/institutional-nereus-pf1-commercialization-tighten';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import {
  buildNereusPf1ProductReviewRefresh,
  getNereusPf1ProductReviewRefresh,
  listNereusPf1ProductReviewRefreshes,
} from './nereusPf1ProductReviewRefreshService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1CommercializationTightens',
  schemaVersion: 'institution.nereus-pf1-commercialization-tighten.registry.v1',
  schema: InstitutionalNereusPf1CommercializationTightenSchema,
  getKey: (entry: InstitutionalNereusPf1CommercializationTighten) => entry.tightenId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function renderMarkdown(tighten: InstitutionalNereusPf1CommercializationTighten): string {
  return [
    '# Nereus PF-1 Commercialization Tighten',
    '',
    `Generated at: \`${tighten.generatedAt}\``,
    '',
    `- tightenId: \`${tighten.tightenId}\``,
    `- productName: ${tighten.productName}`,
    `- status: \`${tighten.status}\``,
    '',
    '## Commercial Frame',
    '',
    `- targetCustomerProfile: ${tighten.targetCustomerProfile}`,
    `- firstCommercialShape: ${tighten.firstCommercialShape}`,
    `- placementEnvelope: ${tighten.placementEnvelope}`,
    `- serviceCycleEnvelope: ${tighten.serviceCycleEnvelope}`,
    `- pricingEnvelope: ${tighten.pricingEnvelope}`,
    '',
    '## Narrative',
    '',
    tighten.commercializationNarrative,
    '',
    '## Required Commercial Proof',
    '',
    ...tighten.requiredCommercialProof.map((entry) => `- ${entry}`),
    '',
    '## No-Go Claims',
    '',
    ...tighten.noGoClaims.map((entry) => `- ${entry}`),
    '',
    '## Operator Checklist',
    '',
    ...tighten.operatorChecklist.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...tighten.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...tighten.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeTighten(tighten: InstitutionalNereusPf1CommercializationTighten): InstitutionalNereusPf1CommercializationTighten {
  const parsed = InstitutionalNereusPf1CommercializationTightenSchema.parse(tighten);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-commercialization-tighten', `${parsed.tightenId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.tightenId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_commercialization_tighten_service',
    routeId: 'services:cognition.nereus.nereusPf1CommercializationTightenService.build',
    summary: stored.commercializationNarrative,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_commercialization_tighten_recorded',
  });
  return stored;
}

export function resetNereusPf1CommercializationTightenService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1CommercializationTightens(): InstitutionalNereusPf1CommercializationTighten[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1CommercializationTighten(tightenId: string): InstitutionalNereusPf1CommercializationTighten | null {
  return getDurableRegistryEntry(registryOptions, tightenId);
}

export async function buildNereusPf1CommercializationTighten(input?: {
  reviewRefreshId?: string;
  secondConfirmationReplayId?: string;
  productReviewId?: string;
  candidateId?: string;
}): Promise<InstitutionalNereusPf1CommercializationTighten> {
  const refresh = input?.reviewRefreshId
    ? getNereusPf1ProductReviewRefresh(input.reviewRefreshId) || listNereusPf1ProductReviewRefreshes()[0] || null
    : listNereusPf1ProductReviewRefreshes()[0] || null;
  const resolvedRefresh = refresh || await buildNereusPf1ProductReviewRefresh({
    secondConfirmationReplayId: input?.secondConfirmationReplayId,
    productReviewId: input?.productReviewId,
    candidateId: input?.candidateId,
  });
  const isReady = resolvedRefresh.status === 'tightened_bounded_internal_review'
    && resolvedRefresh.proofStatus === 'closed'
    && resolvedRefresh.tighteningStatus === 'tightened';
  const generatedAt = new Date().toISOString();
  const tightenId = `nereus-pf1-commercialization-tighten:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-commercialization-tighten', `${tightenId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const tighten: InstitutionalNereusPf1CommercializationTighten = {
    schemaVersion: 'institution.nereus-pf1-commercialization-tighten.v1',
    tightenId,
    generatedAt,
    status: isReady ? 'bounded_internal_productization_ready' : 'needs_more_replay',
    productName: 'Nereus PF-1',
    reviewRefreshRef: resolvedRefresh.refreshId,
    secondConfirmationReplayRef: resolvedRefresh.secondConfirmationReplayRef,
    productReviewRef: resolvedRefresh.productReviewRef,
    candidateRef: resolvedRefresh.candidateRef,
    targetCustomerProfile: 'Industrial PFAS remediation and process-water operators that need a conservative closed-loop polishing module inside bounded wastewater handling systems.',
    firstCommercialShape: 'A bounded PFAS polishing skid with replaceable media modules and operator-reviewed service cycles, sold first into one explicit closed-loop wastewater polishing scenario.',
    placementEnvelope: 'Install PF-1 behind existing pre-treatment and upstream of final discharge guards or recirculation return points, and keep the story limited to one closed-loop PFAS polishing envelope.',
    serviceCycleEnvelope: 'Treat swap and regeneration as bounded, operator-reviewed service windows anchored to the repeat-confirmed PFAS profile rather than as field-proven lifecycle promises.',
    pricingEnvelope: 'Position PF-1 as a premium specialty polishing module plus bounded service review, not as a commodity media pack or a broad platform-wide managed service.',
    commercializationNarrative: isReady
      ? 'Nereus PF-1 now deserves a tighter bounded internal productization frame: one closed-loop PFAS polishing module, one conservative industrial buyer story, one bounded service-cycle model, and no widened field or public-water claims.'
      : 'Nereus PF-1 still needs more replay proof before commercialization language tightens beyond the current bounded watch posture.',
    requiredCommercialProof: isReady
      ? [
          'Keep the repeated PFAS-first packet-ready evidence as the canonical proof anchor for PF-1 productization.',
          'Validate one conservative media swap and regeneration review rhythm without claiming field economics.',
          'Keep placement and buyer story tied to one closed-loop wastewater polishing scenario.',
        ]
      : [
          'Run another PFAS-first replay before tightening commercialization language.',
          'Do not harden swap-cycle or pricing posture while repeat proof remains open.',
        ],
    noGoClaims: [
      'No pilot, field, wet-lab, or public-water deployment claim.',
      'No universal Nereus family claim spanning PFAS, microplastic, and heavy metals in one commercial release.',
      'No promise of field-proven regeneration economics beyond bounded internal assumptions.',
    ],
    operatorChecklist: isReady
      ? [
          'Keep PF-1 as the bounded primary Nereus productization story.',
          'Use one closed-loop PFAS buyer profile and one insertion point in all internal product materials.',
          'Keep HM-1 on hold and microplastic in validation while PF-1 carries the commercial frame.',
        ]
      : [
          'Keep PF-1 on bounded watch and avoid stronger productization language.',
          'Do not widen commercialization language until PF-1 proof is closed.',
        ],
    nextSteps: isReady
      ? [
          'Refresh the PF-1 internal product review and commercial narrative in the next Nereus product session.',
          'Keep PF-1 advisory-only and closed-loop only while preparing the next bounded internal review pack.',
          'Do not reopen HM-1 or mix microplastic into the PF-1 launch wedge.',
        ]
      : [
          'Run another PFAS-first replay before productization language tightens further.',
          'Keep PF-1 commercialization bounded to watch posture.',
        ],
    blockerCodes: isReady ? [] : ['nereus_pf1_commercialization_tighten_proof_open'],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedRefresh.refreshId,
      resolvedRefresh.secondConfirmationReplayRef,
      resolvedRefresh.productReviewRef,
      resolvedRefresh.candidateRef,
      resolvedRefresh.confirmationReportRef,
      resolvedRefresh.conceptRef,
      resolvedRefresh.platformBlueprintRef,
      resolvedRefresh.hm1ProfileRecheckRef,
      resolvedRefresh.leadCampaignRef,
      resolvedRefresh.leadPacketRef,
      resolvedRefresh.leadBriefRef,
      resolvedRefresh.leadPartnerPacketRef,
      resolvedRefresh.replayCampaignRef,
      resolvedRefresh.replayPacketRef,
      resolvedRefresh.replayBriefRef,
      ...resolvedRefresh.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'PF-1 commercialization tighten remains internal, bounded, and advisory-only.',
      'No pilot deployment, field deployment, wet-lab validation, or public-water claims are authorized.',
      'PF-1 remains an internal product candidate framing, not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  tighten.markdown = renderMarkdown(tighten);
  return storeTighten(tighten);
}
