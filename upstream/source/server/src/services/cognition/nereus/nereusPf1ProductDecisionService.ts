import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  InstitutionalNereusPf1ProductDecisionSchema,
  type InstitutionalNereusPf1ProductDecision,
} from '../../../../../shared/institutional-nereus-pf1-product-decision';
import { recordInstitutionalGovernanceArtifact } from '../../kernel/institutionalMemoryService';
import {
  getDurableRegistryEntry,
  listDurableRegistryEntries,
  resetDurableRegistry,
  upsertDurableRegistryEntry,
} from '../../kernel/institutionalRegistryStore';
import {
  buildNereusPf1CommercializationTighten,
  getNereusPf1CommercializationTighten,
  listNereusPf1CommercializationTightens,
} from './nereusPf1CommercializationTightenService';
import { resolveNereusPrimaryArtifactRef, writeNereusJsonArtifact, writeNereusTextArtifact } from './nereusRuntime';

const registryOptions = {
  kind: 'nereusPf1ProductDecisions',
  schemaVersion: 'institution.nereus-pf1-product-decision.registry.v1',
  schema: InstitutionalNereusPf1ProductDecisionSchema,
  getKey: (entry: InstitutionalNereusPf1ProductDecision) => entry.decisionId,
} as const;

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function renderMarkdown(decision: InstitutionalNereusPf1ProductDecision): string {
  return [
    '# Nereus PF-1 Product Decision',
    '',
    `Generated at: \`${decision.generatedAt}\``,
    '',
    `- decisionId: \`${decision.decisionId}\``,
    `- productName: ${decision.productName}`,
    `- action: \`${decision.action}\``,
    `- outcome: \`${decision.outcome}\``,
    '',
    '## Rationale',
    '',
    decision.rationale,
    '',
    '## Next Steps',
    '',
    ...decision.nextSteps.map((entry) => `- ${entry}`),
    '',
    '## Safety',
    '',
    ...decision.safety.map((entry) => `- ${entry}`),
    '',
  ].join('\n');
}

function storeDecision(decision: InstitutionalNereusPf1ProductDecision): InstitutionalNereusPf1ProductDecision {
  const parsed = InstitutionalNereusPf1ProductDecisionSchema.parse(decision);
  const jsonArtifactPath = resolveNereusPrimaryArtifactRef(
    path.join('pf1-product-decisions', `${parsed.decisionId.replace(/[:]/g, '_')}.json`),
    parsed.artifactRefs,
  );
  writeNereusJsonArtifact(jsonArtifactPath, parsed);
  writeNereusTextArtifact(parsed.markdownRef, parsed.markdown);
  const stored = upsertDurableRegistryEntry(registryOptions, {
    ...parsed,
    artifactRefs: dedupe([jsonArtifactPath, parsed.markdownRef, ...parsed.artifactRefs]),
  });
  recordInstitutionalGovernanceArtifact({
    artifactId: stored.decisionId,
    kind: 'verification_artifact',
    authorityClass: 'authoritative',
    trustClass: 'high',
    source: 'nereus_pf1_product_decision_service',
    routeId: 'services:cognition.nereus.nereusPf1ProductDecisionService.apply',
    summary: stored.rationale,
    status: stored.outcome,
    recordedAt: stored.generatedAt,
    updatedAt: stored.updatedAt,
    authorityReason: 'nereus_pf1_product_decision_recorded',
  });
  return stored;
}

export function resetNereusPf1ProductDecisionService(): void {
  resetDurableRegistry(registryOptions);
}

export function listNereusPf1ProductDecisions(): InstitutionalNereusPf1ProductDecision[] {
  return listDurableRegistryEntries(registryOptions).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNereusPf1ProductDecision(decisionId: string): InstitutionalNereusPf1ProductDecision | null {
  return getDurableRegistryEntry(registryOptions, decisionId);
}

export async function applyNereusPf1ProductDecision(input?: {
  commercializationTightenId?: string;
  rationale?: string;
}): Promise<InstitutionalNereusPf1ProductDecision> {
  const tighten = input?.commercializationTightenId
    ? getNereusPf1CommercializationTighten(input.commercializationTightenId)
    : listNereusPf1CommercializationTightens()[0] || null;
  const resolvedTighten = tighten || await buildNereusPf1CommercializationTighten();
  if (resolvedTighten.status !== 'bounded_internal_productization_ready') {
    throw new Error('nereus_pf1_product_decision_tighten_not_ready');
  }

  const generatedAt = new Date().toISOString();
  const decisionId = `nereus-pf1-product-decision:${randomUUID()}`;
  const markdownRef = resolveNereusPrimaryArtifactRef(
    path.join('pf1-product-decisions', `${decisionId.replace(/[:]/g, '_')}.md`),
    [],
  );
  const rationale = input?.rationale?.trim() || 'Advance PF-1 as the primary bounded internal Nereus product candidate because PFAS-first proof is now closed, multi-repeat, and already tightened into a conservative product-review and commercialization frame.';
  const decision: InstitutionalNereusPf1ProductDecision = {
    schemaVersion: 'institution.nereus-pf1-product-decision.v1',
    decisionId,
    generatedAt,
    commercializationTightenRef: resolvedTighten.tightenId,
    reviewRefreshRef: resolvedTighten.reviewRefreshRef,
    secondConfirmationReplayRef: resolvedTighten.secondConfirmationReplayRef,
    productReviewRef: resolvedTighten.productReviewRef,
    candidateRef: resolvedTighten.candidateRef,
    productName: 'Nereus PF-1',
    action: 'advance_pf1_primary_internal_candidate',
    status: 'applied',
    outcome: 'pf1_primary_internal_candidate_active',
    rationale,
    commercializationPosture: 'bounded_internal_productization',
    nextOwner: 'nereus_operator',
    blockerCodes: [],
    nextSteps: [
      'Treat PF-1 as the primary bounded internal Nereus product candidate in the next product session.',
      'Keep all PF-1 product materials tied to one closed-loop PFAS polishing story and one conservative industrial buyer profile.',
      'Leave HM-1 on hold and microplastic in validation while PF-1 carries the active product frame.',
    ],
    markdown: '',
    markdownRef,
    evidenceRefs: dedupe([
      resolvedTighten.tightenId,
      resolvedTighten.reviewRefreshRef,
      resolvedTighten.secondConfirmationReplayRef,
      resolvedTighten.productReviewRef,
      resolvedTighten.candidateRef,
      ...resolvedTighten.evidenceRefs,
    ]),
    artifactRefs: [],
    safety: [
      'Decision remains bounded to internal productization only.',
      'No pilot deployment, field deployment, wet-lab validation, or public-water claims are authorized.',
      'PF-1 stays advisory-only and closed-loop only while productization remains internal.',
    ],
    updatedAt: generatedAt,
  };
  decision.markdown = renderMarkdown(decision);
  return storeDecision(decision);
}
