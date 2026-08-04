# Well-specified: ready to do

- create support for layers
    - layer is an ability to select a "layer" which displays information over the map
    - ways of displaying information include several things; on the start it is
        - color
            - it may code numerical values
            - it may color-denote a discrete option
            - color is transparent, user is still able to see the map, but a layer is displayed on top, showing
              intensity oor diversity
        - label
            - pinned to a point
            - may be a small icon
            - may be text
            - may have designated color and bg color
        - caption
            - written over significant part of the map
            - examples: Apl mountains, Narrow fields, Volga river
            - curved text only
            - curvature may be driven by landscape
    - layer may be toggled on and off
    - there may be several layers at the same time
    - implement test layers to verify all the options
        - plate
            - derive values from metropolis run for height generation; save values in a cell data; it's ok to only
              preserve the level of generation - but to display layer on any level
            - show different clusters - plates - with different color
            - at cell 0 on level 5 add a label "Cell 0 \n level 5"
        - depth
            - show color-coded depth, color-coding is how water is shown now
            - if no water, then no indication
            - display water just as light blue, to make the change testable
        - landscape caption
            - find a mountain (or highest hill) and write over it "Great mountain"
            - find a body of water and write over it "The body of water"
    - layers should survive
        - always survive scrolling
        - in some cases survive zoom changing
            - whether it survives depends on if there's enough space for it

# Vague: may require clarification before execution

## Hierarchy

- define hierarchy levels purposes

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