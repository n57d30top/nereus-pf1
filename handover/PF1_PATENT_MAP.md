# PF-1 Patent Map

## Purpose

This page is a practical patent-or-not map for the current PF-1 repo state.

It is not legal advice.

It is a technical triage tool for deciding:

- what already exists in the repo
- what is only partially specified
- what is still missing for a stronger patent position
- what should not be openly widened before patent review

## Category 1: Already Present In The Repo

These elements are already present at concept or bounded technical-handover level:

### PF-1 Product Candidate Definition

Present in:

- `handover/PF1_CANONICAL_PRODUCT_DOSSIER.md`
- `docs/PF1_LAUNCH_REVIEW.md`

Patent value:

- useful as framing
- weak on its own
- not enough by itself for a strong claim set

### PF1-C1 Composite Architecture

Present in:

- `handover/PF1_CANDIDATE_MATERIALS_TABLE.md`
- `handover/PF1_C1_EXPLORATORY_SYNTHESIS_SOP.md`

Current level:

- core
- tie layer
- selective shell
- regeneration-aware packed-media logic

Patent value:

- potentially meaningful
- currently still too high-level for a strong filing by itself

### Closed-Loop PFAS Polishing Use Case

Present in:

- `handover/PF1_CANONICAL_PRODUCT_DOSSIER.md`
- `handover/TECHNICAL_BRIEF.md`

Patent value:

- useful application framing
- weak by itself unless tied to a specific new material or method

### Crystalline Side Branch

Present in:

- `handover/PF1_X1_CRYSTALLINE_BRANCH.md`
- `structures/PF1_X1_HYPOTHETICAL_ACTIVE_PHASE.cif`

Patent value:

- currently weak
- mainly useful as discussion and computational scaffold

## Category 2: Partially Present

These are hinted at in the repo but not yet strong enough for a serious patent posture.

### New Material Composition

Current status:

- partially present as candidate families and candidate branches
- not present as one precise novel composition with evidence

What is missing:

- exact composition
- exact material identity
- proof that the composition is actually the winning branch

### New Manufacturing Route

Current status:

- partially present as exploratory SOP logic
- not present as a validated or optimized process

What is missing:

- exact precursor choices
- defined process windows
- reproducibility evidence
- reasons that the process is technically superior or non-obvious

### Material + Module + Regeneration Combination

Current status:

- partially present as an architecture story
- not yet present as a concrete, evidenced technical package

What is missing:

- exact combination
- real technical effect data
- clear evidence that the combination outperforms simpler alternatives

## Category 3: Missing For A Stronger Patent Position

These are the main missing layers if PF-1 is going to become patent-serious.

### 1. Concrete Composition

You would need:

- a specific composition or narrow composition family
- a clear statement of what is actually new

### 2. Technical Effect Evidence

You would need:

- real PFAS capture evidence
- regeneration evidence
- fouling behavior
- hydraulic behavior
- ideally comparison against a simpler baseline

### 3. Reproducible Preparation

You would need:

- a reproducible preparation route
- bounded process windows
- repeatability

### 4. Claimable Distinction Over Known Art

You would need:

- a reason why the candidate is not just a routine variant of known PFAS sorbents, coated media, ion-exchange media, or layered host materials

## Category 4: Better Not Openly Widen Yet

These are the areas that should be handled carefully if patent review is a real goal.

### Keep Tight

- any more exact PF1-C1 shell chemistry
- any more exact precursor lists
- any more exact process windows
- any experimentally successful composition details
- any stronger refinement of the crystalline branch if it starts to look genuinely novel

### Safe To Keep Open

- bounded product framing
- high-level closed-loop use case
- benchmark and evaluation logic
- explicit claim guardrails
- high-level professor handover framing

## Practical Read On Current PF-1 Patentability

### Potentially Patent-Interesting

- PF1-C1 style composite architecture
- a real new material composition inside that architecture
- a specific preparation route for that composition
- a specific regeneration-aware PFAS polishing method using that material

### Probably Weak On Their Own

- the `.cif` file as a file
- the current hypothetical PF1-X1 host branch
- the general idea of a PFAS filter
- benchmark or product language without technical implementation

## Current Recommendation

If patent review matters, the strongest next technical path is probably:

1. keep `PF1-C1` as the main branch,
2. instantiate a small concrete composition set,
3. generate first real technical effect data,
4. only then decide whether to file or publish more.
