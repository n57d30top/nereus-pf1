import { z } from 'zod';

const DateTimeSchema = z.string().datetime();

export const NereusPf1InternalProductPacketStatusSchema = z.enum([
  'internal_product_packet_ready',
  'needs_more_review',
]);

export const InstitutionalNereusPf1InternalProductPacketSchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-internal-product-packet.v1').default('institution.nereus-pf1-internal-product-packet.v1'),
  packetId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1InternalProductPacketStatusSchema,
  productName: z.literal('Nereus PF-1'),
  productDecisionRef: z.string().min(1),
  commercializationPrepRef: z.string().min(1),
  commercializationTightenRef: z.string().min(1),
  reviewRefreshRef: z.string().min(1),
  secondConfirmationReplayRef: z.string().min(1),
  productReviewRef: z.string().min(1),
  candidateRef: z.string().min(1),
  packetHeadline: z.string().min(1),
  packetSummary: z.string().min(1),
  productFrame: z.string().min(1),
  launchNarrative: z.string().min(1),
  targetCustomerProfile: z.string().min(1),
  firstCommercialShape: z.string().min(1),
  placementEnvelope: z.string().min(1),
  serviceCycleEnvelope: z.string().min(1),
  pricingEnvelope: z.string().min(1),
  reviewQuestions: z.array(z.string().min(1)).min(1),
  operatorChecklist: z.array(z.string().min(1)).min(1),
  launchReadinessSignals: z.array(z.string().min(1)).min(1),
  blockerCodes: z.array(z.string().min(1)).default([]),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type InstitutionalNereusPf1InternalProductPacket = z.infer<typeof InstitutionalNereusPf1InternalProductPacketSchema>;
