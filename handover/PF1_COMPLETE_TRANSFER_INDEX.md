# PF-1 Complete Transfer Index

## Purpose

This page explains what has been copied from the main `SovrynClean` repo into this private PF-1 transfer repo.

It exists so that a reviewer does not have to guess whether the private repo contains only summaries or also the real PF-1 supporting surfaces.

## What Is Included Now

This repo now contains four layers of PF-1 material:

1. frontdoor handover docs
2. bounded material and validation docs
3. copied operator-facing and runtime PF-1 artifacts
4. copied source snapshots of the main PF-1 contracts and services

## Layer 1: Frontdoor Handover

Primary entry files:

- `handover/COVER_LETTER_FOR_PROFESSOR.md`
- `handover/PF1_CANONICAL_PRODUCT_DOSSIER.md`
- `handover/PROFESSOR_HANDOVER.md`
- `handover/TECHNICAL_BRIEF.md`

Use this layer if the goal is simply to understand what PF-1 is.

## Layer 2: Material And Patent Work

Primary files:

- `handover/PF1_CANDIDATE_MATERIAL_HYPOTHESES.md`
- `handover/PF1_CANDIDATE_MATERIALS_TABLE.md`
- `handover/PF1_C1_EXPLORATORY_SYNTHESIS_SOP.md`
- `handover/PF1_X1_CRYSTALLINE_BRANCH.md`
- `structures/PF1_X1_HYPOTHETICAL_ACTIVE_PHASE.cif`
- `handover/PF1_PATENT_MAP.md`
- `handover/PF1_FIRST_VALIDATION_PROGRAM.md`

Use this layer if the goal is to decide what to build or protect next.

## Layer 3: Copied PF-1 Artifacts From The Main Repo

### Operator-Facing Copies

Located in:

- `upstream/operator-facing/`

Included there are the latest PF-1 and PFAS-candidate operator-facing md/json artifacts, including:

- PFAS product candidate
- PFAS product review
- PF-1 product decision
- PF-1 product review refresh
- PF-1 commercialization tighten
- PF-1 commercialization prep
- PF-1 second confirmation replay
- PF-1 market comparison matrix
- PF-1 head-to-head benchmark
- PF-1 baseline benchmark execution
- PF-1 internal product packet
- PF-1 launch review
- PF-1 open-source release

### Runtime Copies

Located in:

- `upstream/runtime/`

Included there are the selected runtime md/json artifacts that correspond to the main PF-1 chain and the precursor PFAS candidate path.

Use this layer if someone wants the exact IDs and serialized artifacts from the source repo.

## Layer 4: Copied Source Snapshots

### Shared Contracts

Located in:

- `upstream/source/shared/`

Included there are snapshots of the main PF-1 and PFAS candidate contracts from the source repo.

### Server Services

Located in:

- `upstream/source/server/src/services/cognition/nereus/`

Included there are snapshots of the main PF-1 and PFAS candidate services from the source repo, including the services for:

- PFAS product candidate
- PFAS product review
- PF-1 product decision
- PF-1 product review refresh
- PF-1 commercialization tighten
- PF-1 commercialization prep
- PF-1 second confirmation replay
- PF-1 market comparison matrix
- PF-1 head-to-head benchmark
- PF-1 baseline benchmark execution
- PF-1 internal product packet
- PF-1 launch review

Use this layer if someone needs the underlying repo-native technical implementation, not just the handover prose.

## Where The Most Patent-Interesting Surfaces Currently Sit

The most patent-interesting current surfaces are concentrated in:

- `handover/PF1_CANDIDATE_MATERIALS_TABLE.md`
- `handover/PF1_C1_EXPLORATORY_SYNTHESIS_SOP.md`
- `handover/PF1_PATENT_MAP.md`
- `upstream/source/shared/institutional-nereus-pfas-product-candidate.ts`
- `upstream/source/server/src/services/cognition/nereus/nereusPfasProductCandidateService.ts`
- `upstream/source/server/src/services/cognition/nereus/nereusPfasProductReviewService.ts`
- `upstream/source/server/src/services/cognition/nereus/nereusPf1ProductDecisionService.ts`

These are still not a finished patent package, but they are the closest current surfaces to a protectable technical core.

## What Is Still Not Here

Even after this transfer, the repo still does not contain:

- a validated final material formula
- a production-ready manufacturing route
- real bench data proving the composition
- a filed patent application

## Suggested Review Order For A Serious Technical Transfer

1. `handover/PF1_CANONICAL_PRODUCT_DOSSIER.md`
2. `handover/PF1_PATENT_MAP.md`
3. `handover/PF1_CANDIDATE_MATERIALS_TABLE.md`
4. `handover/PF1_C1_EXPLORATORY_SYNTHESIS_SOP.md`
5. `upstream/operator-facing/`
6. `upstream/source/`
