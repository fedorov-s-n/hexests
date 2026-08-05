# hexests — project rules and remembered decisions

This file is the project's memory. Anything worth remembering about this repository lives **here, in
the repository**, not in a per-machine memory store outside it. Everything is written in English.

## Everything that belongs to this project belongs in the repository

Every file that has anything to do with this project's code — sources, tests, configuration,
notes, agent instructions, skills (`.claude/skills`), task lists, run logs worth keeping — is kept
inside the repository and committed. Nothing about the project is left in a home-directory store, a
scratch folder or a session that will be forgotten.

## Panning with W, A, S, D, and the world moving as one

Moving the map with the `W`, `A`, `S` and `D` keys is a permanent, first-class feature of the app,
not a debugging aid. `PositionHelper` turns a key into a step, `ViewState.panX/panY` holds where the
window looks, and `FinitePlaneAbstraction` splits the pan into whole cells of the lattice, which the
data flows through, and the remainder below one cell, which moves the mesh.

**The whole world moves at once, and it always will.** Ground, water, the grid of cell outlines,
every texture painted on them, every overlay tint, every pinned label and every caption, and the
selection marker are one picture: after a pan they must all stand in the same relation to each other
as before. A part that lags, leads, jumps by a cell, or drifts the other way is a bug, however
plausible its own arithmetic looks in isolation. Panning must also be *smooth* — no jerking back and
forth as whole cells are crossed.

## What must not break, and how it broke before

These are the invariants of the drawing. Every one of them has already been broken once, each time by
a change that looked perfectly reasonable on its own, and each break showed up as jerking, jumping or
smearing rather than as an error. Anything touching the window, the texture, the overlays or the
heights must be checked against all of them.

1. **The world moves as one.** See above. Guarded by *the texture and the window between them carry
   exactly the panning* and *undoing the panning finds the place a cell of the world has flowed
   under* (`src/test/ts/lattice/latticeTest.ts`). The pan is split into whole cells of the lattice,
   carried by the texture, and the remainder below one cell, carried by the mesh; the two must add up
   to the pan itself. Flipping the sign of either one alone makes the picture lurch back and forth by
   two cells at every cell boundary — which is exactly what happened.
2. **A level is drawn from its own data, and from nothing else.** A corner of a cell is where three
   cells *of that same level* meet, and it stands at their centroid, so its value is their mean. The
   finer lattice below is not consulted: its cells do not sit inside the coarser ones, so its values
   are not the coarser level's business. Guarded by *takes the corners of its cells from its own data
   and nothing else* and *leaves no crack between neighbours: a shared corner has one height*
   (`src/test/ts/finiteplane/drawingTest.ts`). If two cells ever disagree about a corner they share,
   the ground tears open along that edge.
3. **A label or a caption is pinned to a cell of the world, not to a place of the window.** Asking
   where a cell is drawn undoes the panning step first (`FinitePlaneAbstraction.getUnshiftedCellIndex`).
   Get this wrong and the names sit still while the land slides out from under them. Guarded by *a
   cell is drawn where the place it has flowed under is drawn*.
4. **A stretch of the world is never torn by the seam.** The world closes on itself, and every cell
   is drawn on the turn around the torus nearest the middle of the window, so a stretch lying across
   that seam would come back as two pieces a whole world apart. `FinitePlaneModel.fillCellsXYZ` puts
   every cell of a request on the turn of the first one; so anything spanning several cells must be
   asked for in **one** call, never cell by cell. Guarded by *a stretch of the world is never torn by
   the seam the map closes on*.
5. **A name is flat, and the same name from anywhere.** Labels and captions are plain HTML floating
   over the place they belong to: they follow the world, but the words themselves never bend, turn or
   reflow, whichever way the camera is pointed. Nothing about them is drawn into the scene. Captions
   used to be written along a curve through the land, which looked charming and cost dearly: the
   curve was shorter than the words, so a browser silently dropped the letters that fell off its
   ends — different letters at every step of a pan.
6. **A fresh texture arrives already in its place.** The colours are painted from a level of their
   own, finer than the one on the screen, but the shift they must follow belongs to the level on the
   screen — that is the lattice the data has stepped along. `Texture1.loadFrom` takes the two apart
   for that reason. Get it wrong and switching an overlay lays the new colours a few cells off, until
   the next pan happens to put them right.
7. **Nothing on the map hides the grid.** The outlines ask nothing of the depth buffer and are drawn
   last, so a hill in front of them cannot swallow them.
8. **A window is a hexagon of cells, and the screen fits inside it.** Every disc of places — the
   window into a level and the selection alike — is measured in steps of the lattice, so it reaches
   the same number of cells every way, whichever way that level's lattice is turned; the radius is the
   same count of cells at every level, and only the cells differ in size. The screen is then fitted
   inside the hexagon (`SecondScene.fittingDistance`), which is what keeps the ground under the
   corners of the screen instead of leaving sky there. Guarded by *reaches the same number of cells
   every way, however the level is turned* and *leaves out no cell of a level it can reach around*
   (`src/test/ts/lattice/latticeTest.ts`). Two ways of getting this wrong have already been tried: a
   disc stretched to the shape of the screen, which came out an ellipse leaning with the lattice and
   losing corners to a search box too small for it; and a disc measured as a circle of the world,
   which takes in the cells beyond the hexagon's corners and, over a level small enough to be seen
   whole, still leaves a corner of the torus out — a hexagon holding as many cells as the level has is
   not the same as one reaching all of them, which is what `radiusCovering` is for.
9. **Zero is an index like any other.** Cells, places, corners, vertices and plates are all numbered
   from zero, so `if (something.index)` is a bug wherever it appears: ask whether the thing is there,
   not whether its number is true. This cost three cells around the middle of the window their right
   to be picked at all — the pointer discarded every triangle that used vertex number zero, so those
   cells flickered and took several tries to select, ninety times out of ninety-six. It cost cell zero
   its tooltip as well, since the bubble asked whether it had a value by asking whether the value was
   true. Twice in one afternoon, in code written months apart: expect a third.

Two of these cannot be reached from a unit test, because they live in a canvas and in a browser's
text layout. After touching the texture or the captions, look at the running app: pan with `W`, `A`,
`S`, `D` a good twenty times with an overlay switched on, and check that nothing shears, that every
letter of every caption is present, and that switching an overlay does not shift the colours.

## Committing

Commit on `master` itself: no feature branch, no merge step. It is a personal single-author
repository with no review flow, so a branch and a merge are pure overhead. Keep the repository's own
`user.name` and `user.email`; never pass `--author`.

## Getting the app in front of you

- build with `npx webpack`; copy the page with
  `npx copyfiles -u 2 "src/main/html/**" "src/main/css/**" target/`;
- it is served by the IDE at `http://localhost:63342/hexests/target/html/index.html` (a 404 on every
  path means IntelliJ is refusing unsigned requests — ask for the setting);
- `window.di` is the whole DI container, for the JavaScript console; see the `runtime-inspect` skill,
  which also holds the rule that a picture looking wrong is a hypothesis, not a diagnosis: read the
  arrays;
- `npx jest` runs the tests.

## Other files to read

- `tasks.md` — what is to be done, what is vague, what is finished;
- `LONG-RUN-NOTES.md` — what an unattended long run did and what it left behind.
