# Nereus PF-1

Private handover repository for `PF-1`.

This repo is meant for a professor or senior materials collaborator who needs to answer one practical question:

**Is `PF-1` strong enough to justify real material-development work?**

## What PF-1 Is

`PF-1` is the current strongest surviving `Nereus` candidate.

In the cleanest current form, it should be read as:

- one **bounded closed-loop PFAS polishing module**
- for **controlled industrial wastewater loops**
- with a **PFAS-first** product story
- strong enough for real technical review
- not yet strong enough for certification, field, or market claims

## What This Repo Is For

This repo is designed as a **technical handover**, not as a marketing deck and not as a finished manufacturing package.

It should help a professor quickly understand:

- what `PF-1` is
- why it won internally
- what evidence exists
- what is still missing
- which material families are worth trying first
- how to start a bounded first validation effort

## What This Repo Is Not

This repo is **not**:

- a certified product file
- a field-deployment packet
- a public-water claim package
- a finished molecular formula
- a final synthesis protocol
- a proven manufacturing transfer

## The Fastest Reading Path

If you only read a few files, read these in order:

1. `handover/COVER_LETTER_FOR_PROFESSOR.md`
2. `handover/PF1_CANONICAL_PRODUCT_DOSSIER.md`
3. `handover/TECHNICAL_BRIEF.md`
4. `handover/PF1_CANDIDATE_MATERIALS_TABLE.md`
5. `handover/PF1_C1_EXPLORATORY_SYNTHESIS_SOP.md`
6. `handover/PF1_X1_CRYSTALLINE_BRANCH.md`
7. `handover/PF1_PATENT_MAP.md`
8. `handover/PF1_FIRST_VALIDATION_PROGRAM.md`
9. `handover/PF1_COMPLETE_TRANSFER_INDEX.md`

## What Is In The Repo

### Frontdoor

- `handover/COVER_LETTER_FOR_PROFESSOR.md`
- `handover/PF1_CANONICAL_PRODUCT_DOSSIER.md`
- `handover/PROFESSOR_HANDOVER.md`
- `handover/TECHNICAL_BRIEF.md`

### Material Start Points

- `handover/PF1_CANDIDATE_MATERIAL_HYPOTHESES.md`
- `handover/PF1_CANDIDATE_MATERIALS_TABLE.md`
- `handover/PF1_C1_EXPLORATORY_SYNTHESIS_SOP.md`
- `handover/PF1_X1_CRYSTALLINE_BRANCH.md`
- `structures/PF1_X1_HYPOTHETICAL_ACTIVE_PHASE.cif`

### Validation And Evidence

- `handover/PF1_PATENT_MAP.md`
- `handover/PF1_FIRST_VALIDATION_PROGRAM.md`
- `handover/PF1_COMPLETE_TRANSFER_INDEX.md`
- `handover/EVIDENCE_PACKAGE.md`
- `handover/PRODUCTION_READINESS_GAPS.md`
- `handover/QUESTIONS_FOR_PROFESSOR.md`
- `docs/PF1_LAUNCH_REVIEW.md`
- `docs/PF1_BASELINE_BENCHMARK_EXECUTION.md`
- `docs/PF1_MARKET_COMPARISON_MATRIX.md`
- `docs/CLAIM_GUARDRAILS.md`

### Upstream PF-1 Core Snapshots

- `upstream/operator-facing/`
- `upstream/runtime/`
- `upstream/source/shared/`
- `upstream/source/server/src/services/cognition/nereus/`

## The Current Honest Status

### What Is Already Strong

- `PF-1` is the main surviving `Nereus` candidate.
- It held the best internal balance across capture, fouling, regeneration, pressure behavior, and manufacturability.
- It survived a bounded internal confirmation and benchmark chain strongly enough to justify real material work.

### What Is Still Open

- there is no finalized real material instantiation
- there is no finished production recipe
- there is no proven field behavior
- there is no certification-ready claim basis
- there is no defensible public "better than market" percentage claim

## How To Read The Material Work

There are currently two useful ways to approach PF-1:

### Path A: Realistic First Material Path

`PF1-C1` is the most practical first branch.

Read:

1. `handover/PF1_CANDIDATE_MATERIALS_TABLE.md`
2. `handover/PF1_C1_EXPLORATORY_SYNTHESIS_SOP.md`
3. `handover/PF1_FIRST_VALIDATION_PROGRAM.md`

### Path B: Crystalline Exploratory Side Branch

`PF1-X1` exists only because some collaborators may want a crystallographically expressible branch and a `.cif`-style structure hypothesis.

Read:

1. `handover/PF1_X1_CRYSTALLINE_BRANCH.md`
2. `structures/PF1_X1_HYPOTHETICAL_ACTIVE_PHASE.cif`

Important:

`PF1-X1` is a **hypothetical side branch**, not proof that the final PF-1 material is crystalline.

## The Main Ask To A Professor

Please use this repo to answer:

1. Is the PF-1 material logic scientifically plausible enough to justify real work?
2. Which first material family should be instantiated?
3. What is the smallest useful first validation program?
4. What are the biggest hidden failure risks?

## The Best Next Step

The next useful step is **not** broad productization.

It is:

- choose the first candidate family
- instantiate a small bounded candidate set
- run a short bench validation program
- decide quickly whether PF-1 survives contact with real material work

## Complete Transfer Note

This repo now includes not only the handover-facing PF-1 summaries, but also the core PF-1 upstream artifacts and source snapshots from the main `SovrynClean` repo.

Use `handover/PF1_COMPLETE_TRANSFER_INDEX.md` as the master map for what was copied in and where the patent-interesting surfaces currently sit.
