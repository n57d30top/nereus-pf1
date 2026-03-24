import { z } from 'zod';

import {
  NereusCalibrationActionCountsSchema,
  NereusCalibrationAverageScoresSchema,
} from './institutional-nereus-calibration-report';

const DateTimeSchema = z.string().datetime();

export const NereusPf1SecondConfirmationReplayStatusSchema = z.enum([
  'confirmed_packet_ready',
  'watch',
  'degraded',
]);

export const NereusPf1SecondConfirmationReplayProofStatusSchema = z.enum([
  'closed',
  'still_open',
]);

export const NereusPf1SecondConfirmationReplayRepeatStatusSchema = z.enum([
  'multi_repeat',
  'single_repeat',
  'not_confirmed',
]);

export const NereusPf1SecondConfirmationReplayNextActionSchema = z.enum([
  'tighten_pf1_product_review',
  'keep_pf1_on_watch',
  'hold_pf1_story',
]);

export const InstitutionalNereusPf1SecondConfirmationReplaySchema = z.object({
  schemaVersion: z.literal('institution.nereus-pf1-second-confirmation-replay.v1').default('institution.nereus-pf1-second-confirmation-replay.v1'),
  reportId: z.string().min(1),
  generatedAt: DateTimeSchema,
  status: NereusPf1SecondConfirmationReplayStatusSchema,
  proofStatus: NereusPf1SecondConfirmationReplayProofStatusSchema,
  repeatClosureStatus: NereusPf1SecondConfirmationReplayRepeatStatusSchema,
  nextAction: NereusPf1SecondConfirmationReplayNextActionSchema,
  productName: z.literal('Nereus PF-1').default('Nereus PF-1'),
  candidateRef: z.string().min(1),
  confirmationReportRef: z.string().min(1),
  productReviewRef: z.string().min(1),
  platformBlueprintRef: z.string().min(1),
  hm1ProfileRecheckRef: z.string().min(1),
  leadCampaignRef: z.string().min(1),
  leadPacketRef: z.string().min(1),
  leadBriefRef: z.string().min(1),
  leadPartnerPacketRef: z.string().min(1).optional(),
  replayCampaignRef: z.string().min(1),
  replayPacketRef: z.string().min(1),
  replayBriefRef: z.string().min(1),
  replayRecommendedNextAction: z.enum(['hold', 'continue_screening', 'prepare_research_packet']),
  replayProfileId: z.string().min(1),
  replayTargetProfile: z.object({
    materialClass: z.string().min(1),
    waterMatrix: z.string().min(1),
    targetRemovalEfficiency: z.number().min(0).max(1),
    targetFluxLmh: z.number().positive(),
    maxRegenerationPenalty: z.number().min(0).max(1),
    maxPressureDropBar: z.number().positive(),
  }).strict(),
  replayAdjustments: z.array(z.string().min(1)).min(1),
  initialActionCounts: NereusCalibrationActionCountsSchema,
  combinedActionCounts: NereusCalibrationActionCountsSchema,
  initialAverageScores: NereusCalibrationAverageScoresSchema,
  replayScores: NereusCalibrationAverageScoresSchema,
  combinedAverageScores: NereusCalibrationAverageScoresSchema,
  replayVsInitialAverageDeltas: z.object({
    captureEfficiencyScore: z.number().nullable(),
    foulingResistanceScore: z.number().nullable(),
    regenerationScore: z.number().nullable(),
    pressureDropScore: z.number().nullable(),
    manufacturabilityScore: z.number().nullable(),
  }).strict(),
  headline: z.string().min(1),
  summary: z.string().min(1),
  findings: z.array(z.string().min(1)).min(1),
  decision: z.array(z.string().min(1)).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  blockerCodes: z.array(z.string().min(1)).default([]),
  markdown: z.string().min(1),
  markdownRef: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  artifactRefs: z.array(z.string().min(1)).default([]),
  safety: z.array(z.string().min(1)).min(1),
  updatedAt: DateTimeSchema,
}).strict();

export type NereusPf1SecondConfirmationReplayStatus = z.infer<typeof NereusPf1SecondConfirmationReplayStatusSchema>;
export type NereusPf1SecondConfirmationReplayProofStatus = z.infer<typeof NereusPf1SecondConfirmationReplayProofStatusSchema>;
export type NereusPf1SecondConfirmationReplayRepeatStatus = z.infer<typeof NereusPf1SecondConfirmationReplayRepeatStatusSchema>;
export type NereusPf1SecondConfirmationReplayNextAction = z.infer<typeof NereusPf1SecondConfirmationReplayNextActionSchema>;
export type InstitutionalNereusPf1SecondConfirmationReplay = z.infer<typeof InstitutionalNereusPf1SecondConfirmationReplaySchema>;
