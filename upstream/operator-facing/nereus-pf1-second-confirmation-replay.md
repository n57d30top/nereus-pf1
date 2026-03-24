# Nereus PF-1 Second Confirmation Replay

Generated at: `2026-03-23T16:02:17.218Z`

- reportId: `nereus-pf1-second-confirmation-replay:b7bf94f7-6180-4008-bc26-6cd61dcbad09`
- productName: Nereus PF-1
- status: `confirmed_packet_ready`
- proofStatus: `closed`
- repeatClosureStatus: `multi_repeat`
- nextAction: `tighten_pf1_product_review`
- replayRecommendedNextAction: `prepare_research_packet`

## Headline

Nereus PF-1 repeated packet-ready PFAS evidence strongly enough to tighten the bounded product-review story.

## Summary

PF-1 now has enough repeated PFAS-first packet-ready evidence to support a tighter bounded internal product-review frame.

## Replay Profile

- replayProfileId: pf1_second_confirmation_replay_v1
- materialClass: adsorbent
- waterMatrix: wastewater
- targetRemovalEfficiency: 0.920
- targetFluxLmh: 65.0
- maxRegenerationPenalty: 0.180
- maxPressureDropBar: 0.850

- Repeat the PF-1 replay on the same adsorbent/wastewater bounded PFAS profile so this pass tests replay closure instead of a new wedge.
- Keep target flux at 65.0 LMH and pressure/drop limits at 0.850 bar so the second confirmation stays directly comparable to the first cohort.
- Do not widen to pilot, field, wet-lab, or public-water positioning while PF-1 proof remains bounded.

## Counts

- initial prepare/continue/hold: 1/0/2
- combined prepare/continue/hold: 2/0/2

## Score Readout

- initial average capture/fouling/regeneration/pressure/manufacturability: 0.817 / 0.72 / 0.687 / 0.75 / 0.817
- replay capture/fouling/regeneration/pressure/manufacturability: 0.75 / 0.74 / 0.72 / 0.85 / 0.83
- combined average capture/fouling/regeneration/pressure/manufacturability: 0.8 / 0.725 / 0.695 / 0.775 / 0.82
- replay vs initial average deltas: -0.067 / 0.02 / 0.033 / 0.1 / 0.013

## Findings

- PF-1 second confirmation replay used candidate nereus-pfas-product-candidate:65a2f0cd-fbfd-4c80-b086-05bb304f7756 and prior confirmation nereus-pfas-confirmation-cohort:f4e1322b-5226-450b-88f9-a01b3aef48a9 as its evidence anchor.
- Replay campaign nereus-campaign:b27ed028-1989-46ab-8464-9059ec9ef8d3 resolved to prepare_research_packet.
- Combined prepare/continue/hold counts are now 2/0/2.
- Replay vs initial average deltas: fouling=0.02, regeneration=0.033, pressure=0.1.

## Decision

- Treat PF-1 as a repeated PFAS-first bounded candidate with enough replay proof to tighten the internal product-review story.
- Keep HM-1 on hold and microplastic in validation while PF-1 carries the primary bounded narrative.

## Next Steps

- Refresh the PF-1 product review so placement, buyer story, and regeneration language reflect repeated replay proof.
- Keep PF-1 advisory-only and closed-loop only.
- Do not widen to pilot, field, wet-lab, or public-water claims.

## Safety

- PF-1 second confirmation replay remains advisory-only and closed-loop only.
- This report does not authorize pilot deployment, field deployment, wet-lab validation, or public-water claims.
- PF-1 remains an internal product candidate, not a released PFAS treatment product.
