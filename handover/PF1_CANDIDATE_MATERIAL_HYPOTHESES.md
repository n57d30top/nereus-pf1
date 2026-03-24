# PF-1 Candidate Material Hypotheses

## Important Starting Point

There is **no finalized PF-1 material formula yet**.

This handover instead defines a small set of material hypotheses that a professor could use to start real material work without pretending the exact answer is already known.

## Design Logic

The internal `PF-1` score profile suggests a material family that must balance:

- strong PFAS capture
- bounded fouling
- bounded regeneration penalty
- acceptable pressure behavior
- plausible manufacturability

This strongly suggests that `PF-1` should not be treated as one magic chemistry, but as a **family search problem** with a few disciplined starting points.

## Candidate Family A

### Working Name

Porous functional polymer sorbent

### Concept

A structured porous polymer or resin-like medium with PFAS-affine functional groups and a mechanically stable support architecture.

### Why It Fits PF-1

- strong chance of tunable capture chemistry
- more regeneration-friendly than a one-shot carbon-only posture
- plausible cartridge integration

### What To Vary

- functional group density
- pore architecture
- hydrophobic / ionic balance
- binder fraction
- support rigidity

### Main Risk

Capture may look good while fouling or regeneration collapses.

## Candidate Family B

### Working Name

Hybrid sorbent bead or granule

### Concept

A composite bead or granule combining a mechanically robust scaffold with a selective capture phase and a regeneration-tolerant interface.

### Why It Fits PF-1

- good path for cartridge media packing
- easier pressure-drop tuning than a very fine powder system
- potentially better service-window control

### What To Vary

- scaffold material
- active-phase loading
- particle size band
- shell/core distribution
- surface accessibility

### Main Risk

Good hydraulic behavior may come at the cost of too little selective capture.

## Candidate Family C

### Working Name

Structured adsorptive monolith or coated substrate

### Concept

A structured support or monolithic geometry carrying a PFAS-affine coating or active phase to reduce pressure penalty while maintaining bounded capture.

### Why It Fits PF-1

- attractive for the internal pressure-drop profile
- easier interpretation of flow behavior
- potentially cleaner closed-loop polishing-stage integration

### What To Vary

- substrate type
- coating chemistry
- coating thickness
- channel geometry
- regeneration compatibility

### Main Risk

Pressure behavior may improve while total working capacity becomes too low.

## Formula Status

At this stage the right "formula" is not a single chemical formula but a **parameterized material template**:

`support architecture + capture motif + regeneration tolerance + hydraulic packaging`

That is the honest level of maturity today.

## Suggested Initial Preference

If a professor wants the cleanest first pass, the safest starting order is probably:

1. Hybrid sorbent bead or granule
2. Porous functional polymer sorbent
3. Structured monolith or coated substrate

Reason:

- Family B looks strongest for balancing packing, pressure behavior, and regeneration testing.
- Family A looks strongest for tunable chemistry.
- Family C looks strongest for hydraulics but riskiest on total useful capacity.

## Kill Criteria

A candidate family should be deprioritized quickly if it shows any of these early:

- excellent capture but catastrophic regeneration loss
- acceptable regeneration but clearly unworkable pressure behavior
- strong synthetic complexity with no compensating benchmark posture
- obvious fouling fragility under bounded industrial matrix conditions
