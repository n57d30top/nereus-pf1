import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1CommercializationPrepSchema,
  type InstitutionalNereusPf1CommercializationPrep,
} from '../../../../../shared/institutional-nereus-pf1-commercialization-prep';
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
import { getNereusPf1CommercializationTighten } from './nereusPf1CommercializationTightenService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1CommercializationPreps',
  schemaVersion: 'institution.nereus-pf1-commercialization-prep.registry.v1',
  schema: InstitutionalNereusPf1CommercializationPrepSchema,
  getKey: (entry: InstitutionalNereusPf1CommercializationPrep) => entry.prepId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function renderMarkdown(prep: InstitutionalNereusPf1CommercializationPrep): string {
  return [
    '# Nereus PF-1 Commercialization Prep',
    '',
    `Generated at: \`${prep.generatedAt}\``,
    '',
    `- prepId: \`${prep.prepId}\``,
    `- productName: ${prep.productName}`,
    `- status: \`${prep.status}\``,
    '',
    '## Commercial Frame',
    '',
    `- targetCustomerProfile: ${prep.targetCustomerProfile}`,
    `- firstCommercialShape: ${prep.firstCommercialShape}`,
    `- placementEnvelope: ${prep.placementEnvelope}`,
    `- serviceCycleEnvelope: ${prep.serviceCycleEnvelope}`,
    `- pricingEnvelope: ${prep.pricingEnvelope}`,
    '',
    '## Narrative',
    '',
    prep.commercializationNarrative,
    '',
    '## Required Commercial Proof',
    '',
    ...prep.requiredCommercialProof.map((entry) => `- ${entry}`),
    '',
    '## No-Go Claims',
    '',
    ...prep.noGoClaims.map((entry) => `- ${entry}`),
    '',
    '## Operator Checklist',
    '',
    ...prep.operatorChecklist.map((entry) => `- ${entry}`),
    '',
    '## Next Steps',
    '',
    ...prep.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...prep.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storePrep(prep: InstitutionalNereusPf1CommercializationPrep): InstitutionalNereusPf1CommercializationPrep {
  const parsed = InstitutionalNereusPf1CommercializationPrepSchema.parse(prep);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-commercialization-preps', `${parsed.prepId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.prepId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_commercialization_prep_service',
    routeId: 'services:cognition.nereus.nereusPf1CommercializationPrepService.build',
    summary: stored.commercializationNarrative,
    status: stored.status,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_commercialization_prep_recorded',
  });
  return stored;
}

export function resetNereusPf1CommercializationPrepService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1CommercializationPreps(): InstitutionalNereusPf1CommercializationPrep[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1CommercializationPrep(prepId: string): InstitutionalNereusPf1CommercializationPrep | null {
  return getDurableRegistryEntry(registryOptions, prepId);
}

export async function buildNereusPf1CommercializationPrep(input?: {
  decisionId?: string;
}): Promise<InstitutionalNereusPf1CommercializationPrep> {
  const decision = input?.decisionId
    ? getNereusPf1ProductDecision(input.decisionId)
    : listNereusPf1ProductDecisions()[0] || null;
  const resolvedDecision = decision || await applyNereusPf1ProductDecision();
  const tighten = getNereusPf1CommercializationTighten(resolvedDecision.commercializationTightenRef);
  if (!tighten) {
    throw new Error('nereus_pf1_commercialization_prep_tighten_missing');
  }

  const generatedAt = new Date().toISOString();
  const prepId = `nereus-pf1-commercialization-prep:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-commercialization-preps', `${prepId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const prep: InstitutionalNereusPf1CommercializationPrep = {
    schemaVersion: 'institution.nereus-pf1-commercialization-prep.v1',
    prepId,
    generatedAt,
    status: tighten.status === 'bounded_internal_productization_ready' ? 'internal_preparation_ready' : 'needs_more_replay',
    productName: 'Nereus PF-1',
    decisionRef: resolvedDecision.decisionId,
    commercializationTightenRef: tighten.tightenId,
    reviewRefreshRef: tighten.reviewRefreshRef,
    secondConfirmationReplayRef: tighten.secondConfirmationReplayRef,
    productReviewRef: tighten.productReviewRef,
    candidateRef: tighten.candidateRef,
    targetCustomerProfile: 'Industrial PFAS remediation and process-water operators that need one conservative closed-loop polishing stage inside bounded wastewater loops.',
    firstCommercialShape: 'One bounded PFAS polishing module with replaceable media packs and operator-reviewed service cycles, initially framed for a single closed-loop wastewater use case.',
    placementEnvelope: 'Deploy PF-1 only as a polishing stage behind pre-treatment and before final guard stages or recirculation return points inside controlled wastewater systems.',
    serviceCycleEnvelope: 'Use a conservative swap-plus-offline-regeneration service cadence reviewed customer-by-customer, without promising field-proven lifecycle economics.',
    pricingEnvelope: 'Position PF-1 as a premium specialty polishing module plus bounded service review rather than as a commodity consumable or broad managed-treatment platform.',
    commercializationNarrative: 'Nereus PF-1 should now be handled as one bounded internal productization program: one closed-loop PFAS polishing module, one conservative buyer profile, one insertion-point story, and one service-cycle model kept inside internal review discipline.',
    requiredCommercialProof: [
      'Keep the multi-repeat PFAS-first proof set as the canonical productization anchor.',
      'Hold the insertion-point story to one closed-loop wastewater polishing scenario.',
      'Treat service-cycle assumptions as bounded internal planning inputs until a later evidence gate explicitly widens them.',
    ],
    noGoClaims: [
      'No pilot, field, wet-lab, or public-water deployment claim.',
      'No universal Nereus family claim spanning PFAS, microplastic, and heavy metals in one commercial release.',
      'No promise of field-proven regeneration economics beyond bounded internal assumptions.',
    ],
    operatorChecklist: [
      'Keep PF-1 as the primary Nereus productization story and keep the language closed-loop only.',
      'Use one buyer profile and one insertion-point narrative in internal product materials.',
      'Keep HM-1 on hold and microplastic in validation while PF-1 stays primary.',
    ],
    nextSteps: [
      'Refresh the internal PF-1 product packet with the tighter buyer, placement, and service-cycle frame.',
      'Use PF-1 as the active productization wedge in the next Nereus review instead of reopening HM-1.',
      'Do not widen beyond bounded internal productization until a later gate explicitly allows it.',
    ],
    blockerCodes: tighten.status === 'bounded_internal_productization_ready' ? [] : ['nereus_pf1_commercialization_prep_proof_open'],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedDecision.decisionId,
      tighten.tightenId,
      tighten.reviewRefreshRef,
      tighten.secondConfirmationReplayRef,
      tighten.productReviewRef,
      tighten.candidateRef,
      ...resolvedDecision.evidenceRefs,
      ...tighten.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'PF-1 commercialization prep remains internal, bounded, and advisory-only.',
      'No pilot deployment, field deployment, wet-lab validation, or public-water claims are authorized.',
      'PF-1 remains an internal product candidate program, not a released PFAS treatment product.',
    ],
    updatedAt: generatedAt,
  };
  prep.markdown = renderMarkdown(prep);
  return storePrep(prep);
}
