# Well-specified: ready to do


# Vague: may require clarification before execution

## Hierarchy

- define hierarchy levels purposes
- resolve how to keep data on level 14

## Flora

- choose flora subset to model
- introduce generation algorithm and painting way
- object insertion, model set of supported fauna set
- object flattening for optimization

## Fauna

- choose fauna subset to model
- introduce "life game" - based iteration
- get model set with idle animation

# Finished: to be actualized before a commit

- make the whole world move as one when the map is panned
    - the texture was dragged the opposite way from the ground, so every whole cell crossed threw the
      picture back: panning is smooth again, and the grid, the ground and the colours stay together
    - labels and captions are pinned to their own cells of the world and travel with them
    - the grid of the level the approach is heading for follows the pan as well
    - the axes helper in the middle of the map is gone

- create support for layers
    - an overlay may tint cells, pin labels and write captions along a curve; several may be shown
      at once, each with a switch in the panel
    - the map itself now only says land or water; how deep the water is, is an overlay
    - test overlays: plates (kept from the generation, shown on any level, with the label on cell 0
      of level 5), depth, landscape captions over the highest hill and the deepest water
    - overlays survive scrolling; a label survives a zoom while the window reaches its cell

- bring in react
    - the panel is a React component fed by a panel model; the map area is handed to three.js once
      and never redrawn by React
    - the command centre and the hand-written widgets are gone
- make it possible to select areas with an arbitrary radius
    - a round disc of one to seven cells, chosen by an upright slider that shows its value
    - the marker lay on the ground and tore itself apart; both are fixed

- make scroll-based scaling with auto-changed level
    - the wheel changes the approach smoothly, about twenty notches to a level
    - the level follows the approach and is shown in the panel, with a correction field
    - the world stays put across a level change; the lattice under it turns and thickens