# Long run of the 5th of August 2026

What was done while nobody was watching, in order, and what a reader of this file should know to
pick the work up. Written for myself, in a session that will not remember any of this.

## Where the work stands

Everything below is committed on `master`. The tests are green (`npx jest`), the bundle builds
(`npx webpack`), and the app was checked in the browser after every step -- it is served by the IDE
at `http://localhost:63342/hexests/target/html/index.html`, and `window.di` gives the whole DI
container to the javascript console (see the `runtime-inspect` skill).

### Before this run

- the level hierarchy sits on an aperture seven lattice: a cell covers exactly seven cells of the
  level below, and every level cuts the same rectangle of the world;
- the world is drawn through a window: a disc of cells stretched to the shape of the screen, which
  stands still while the data flows through it;
- the wheel changes how closely the world is looked at, smoothly, and the level follows;
- two grids fade into one another across a level switch.

### Done in this run

1. **Committed the window rework** with its shortcomings written into the commit message.
2. **Relief no longer flattens with the lattice.** Heights are magnified by the same approach as the
   ground, so a hill keeps its shape when the level changes.
3. **Performance.** Laying the window out cost about eight milliseconds per thousand places; almost
   all of it was a fresh data accessor built for every cell and corner names recomputed although the
   mesh keeps its points. Fixed inside the two commits above. A smooth roll of the wheel across four
   levels now holds a median frame of seventeen milliseconds against a hundred and more before.
   What is left is a single hitch of about a quarter of a second the first time a level is entered.

## Still open, known and deliberate

- the window breathes: between two level switches it grows by up to the square root of seven;
- entering a level for the first time builds its data, its mesh and its lookups at once;
- the deepest level a level can be looked at is `maxZoom - 1` in `SettingsStub`, because a level
  reads the heights of its corners from the level below.
