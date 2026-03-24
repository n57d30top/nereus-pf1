# PF1-X1 Crystalline Branch

## Why This Exists

Most of the current PF-1 branches are not naturally single-crystal or single-phase materials, so a `.cif` is not the right primary artifact for them.

If a professor still wants one crystallographically expressible PF-1-adjacent branch, the cleanest honest route is a **crystalline active-phase hypothesis** under the `PF1-C3` structured/coated path.

## Branch Definition

`PF1-X1` is a **hypothetical crystalline active scaffold branch** for PF-1 screening.

It is not the whole PF-1 product and not the final winning material.

It is:

- one possible crystalline host phase
- intended for use as an exploratory active coating or active subphase
- useful only because it permits a `.cif`-style structure hypothesis

## Current Working Idea

Use a **layered anion-exchange-like host** as the active crystalline branch.

Why this is the most honest current choice:

- it matches PFAS capture logic better than forcing a random crystal
- it supports an exchange-oriented interpretation
- it can be represented as a host lattice in `.cif` form
- it fits better under the `PF1-C3` coated-structure branch than under `PF1-C1`

## Scope Boundary

The draft `.cif` in `structures/PF1_X1_HYPOTHETICAL_ACTIVE_PHASE.cif` should be read as:

- a host-structure hypothesis
- not a validated calculated crystal
- not a DFT-relaxed final material
- not proof that PF1-X1 is the right branch

## What The `.cif` Is Good For

- discussion with crystallography- or materials-oriented collaborators
- selecting whether a crystalline branch is even worth pursuing
- defining a first structure-based computational follow-up

## What The `.cif` Is Not Good For

- claiming that PF-1 is solved
- skipping bench validation
- claiming a field-ready or production-ready phase
- pretending that the whole PF-1 module is a single crystal

## Next Honest Computational Step

If a professor wants to pursue `PF1-X1`, the next real step would be:

1. choose the exact chemistry family,
2. refine the host composition,
3. relax or optimize the structure computationally,
4. compare that branch against the simpler `PF1-C1` packed-media path.
