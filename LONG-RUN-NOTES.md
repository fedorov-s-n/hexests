# Long run of the 5th of August 2026

What was done while nobody was watching, in order, and what a reader of this file should know to
pick the work up. Written for myself, in a session that will not remember any of this.

## How to get the app in front of you

- build with `npx webpack`; copy the page with `npx copyfiles -u 2 "src/main/html/**" "src/main/css/**" target/`;
- it is served by the IDE at `http://localhost:63342/hexests/target/html/index.html`
  (a 404 on every path means IntelliJ is refusing unsigned requests -- ask for the setting);
- `window.di` is the whole DI container, for the javascript console; see the `runtime-inspect` skill;
- `npx jest` runs sixty tests, all green at the end of this run.

## Done in this run, in order, one commit each

1. **The window rework was committed** with its shortcomings written into the message.
2. **The relief no longer flattens with the lattice.** Heights are magnified by the same approach as
   the ground (`FinitePlaneModel.height`), so a hill keeps its shape across a level change.
3. **Performance.** Laying the window out cost about eight milliseconds per thousand places. Almost
   all of it was a fresh data accessor -- a new object and a new key string -- built for every cell,
   and corner names recomputed although the mesh keeps its points for good. The heights of the level
   below are now taken once per refresh, the vertices of every place are remembered when the mesh is
   built, a place is found in an array rather than a hash map, and the three cells under a corner
   are worked out when a cell is first drawn. A smooth roll of the wheel across four levels holds a
   median frame of seventeen milliseconds against a hundred and more before. What is left is a hitch
   of about a quarter of a second the first time a level is entered, when its data, its mesh and its
   lookups are built.
4. **React.** The panel beside the map is React (`src/main/ts/panel`), fed by `PanelModel`: numbers,
   sliders, switches, buttons and indicator lines. The map area is handed to three.js once and never
   redrawn by React. The command centre, the recent command tracker and the hand-written widgets are
   deleted. The tooltip over the map is not a control and stayed as it was.
5. **Selection of any radius from one to seven**, chosen by an upright slider that shows its reading.
   Two real bugs were fixed on the way: the marker was laid at the height of the cell it stood on
   while the ground is drawn from the corners of the level below, so it cut through hills; and its
   mesh was tied to the cells it covered when it was built, so moving it scrambled the mesh. Places
   of a disc are numbered from the middle outwards now (`CellRadius`), and that numbering holds
   while the disc is moved about.
6. **Overlays** (`src/main/ts/overlay`). An overlay is what is known about the world rather than the
   world itself: it may tint cells, pin labels and write captions. Several may be on at once, each
   with a switch in the panel. The map itself now only says land or water, water being plain and
   flat. Three test overlays: **plates** (the domains the relief was drifted from, kept from the
   generation and shown on any level, with the label `Cell 0 / level 5`), **depth** (colour-coded
   water, nothing where it is dry), **landscape** (finds the highest hill and the deepest water and
   writes `Great mountain` and `The body of water` along a curve through them).

## Where the tasks stand

`tasks.md` holds the list. Everything under "Well-specified" at the start of this run is done and
moved to "Finished". Nothing under "Vague" was touched -- those want a conversation first.

## Known and deliberate, worth picking up

- the window breathes: between two level switches it grows by up to the square root of seven;
- entering a level for the first time builds its data, its mesh and its lookups at once, which is
  the quarter of a second hitch;
- a caption is written along the lattice's own east, which at deep levels is turned well away from
  the screen's east, so long captions can stand almost upright; picking the direction by the shape
  of the land itself is the obvious next step;
- an overlay is repainted into the whole texture, so switching one on repaints a level of colours;
  at the finest painted level that is about a third of a second;
- overlays survive scrolling by construction; a label survives a zoom only while the window reaches
  its cell, which is the rule that was asked for, but nothing yet thins labels out when many of them
  crowd one place;
- `SettingsStub` holds the knobs: `viewRadius`, `generationZoom`, `initialZoom`, `textureZoom`,
  `maxZoom`, `screenFill`.
