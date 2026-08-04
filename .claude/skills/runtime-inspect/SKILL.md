---
name: runtime-inspect
description: Inspect this project at runtime through the DI container exposed as window.di. Use whenever a question is about what the running app actually holds - cell fields, levels, layers, heights, water, geometry, selection, shifts - instead of reading the sources and guessing. Also use to verify a change in the real app after rebuilding.
---

# Inspecting hexests at runtime

Everything in this app is a component of one `DIContainer`, and the container is exported to the
page as `window.di` (see `src/main/ts/index.ts`). So any state of the running app is two calls away:
never guess a runtime value from the sources, measure it.

## Getting the app in front of you

1. Build: `npx webpack` (types are checked by ts-loader, so a type error fails the build).
2. The files are hosted by the IDE, not by a server of your own:
   `http://localhost:63342/hexests/target/html/index.html`.
   A 404 on every path means IntelliJ is refusing unsigned requests - ask the user to switch on
   Settings, Build Execution Deployment, Debugger, "Allow unsigned requests".
3. Open that URL with the Playwright tools and read state with `browser_evaluate`.

## The handle

```js
const di = window.di;                          // the DIContainer itself
const levelManager = di.getIfExists('LevelManager');
```

`getIfExists` takes the simple class name and returns the instance, but only for components that
have already been created. `DIContainer.get(type)` needs the class object, which the console does
not have; take the constructor off an existing instance if you really need it.

The same container backs the command line at the bottom of the page (`CommandCentre`), so
`LevelManager.visible.zoom` typed there works as well. `browser_evaluate` is better: it computes.

## What hangs off which component

- `LevelManager` - `cellFields.get(zoom)`, `data.get(zoom)`, `levels.get(zoom)`,
  `finitePlainAbstractions.get(zoom)`, `visible`. The arrays are lazy: `get` builds the level.
- a cell field (`LatticeCellField`) - `size`, `zoom`, `q(index)`, `r(index)`, `indexOf(q, r)`,
  `fillNeighbours(index, out)`, `neighbour(index, direction)`, `worldX/worldY`, `lower`, `higher`,
  `mapIndexToLowerLevel(index)`, `fillLowerCells(index, out)`, `world` (the shared rectangle).
- `data.get(zoom)` - `height.array`, `waterLevel.array`, `color.array`, `accessor(name)`.
- `LayerManager` - `visible`, `layers.array`; a layer has `level`, `landMesh`, `waterMesh`,
  `landGeometry`, `waterGeometry`, `selector`, `visible`.
- `SecondScene` - `scene`, `camera`, `renderer`; `PositionHelper` - shifts and selection;
  `SettingsStub` - the sizes of the field and of the plane; `Random` - `getSeed()`.

## Measuring instead of eyeballing

The screen shows a picture; the numbers tell what it is. Useful shapes:

```js
// the box a level occupies, straight from the mesh
const p = di.getIfExists('LayerManager').visible.landMesh.geometry.getAttribute('position');
// directional bias of a field: compare the three axes
field.fillNeighbours(i, ns); Math.abs(h[i] - h[ns[axis]]);
// every cell of a level, and the seven it covers below
field.fillLowerCells(i, cells);
```

Two rules that come out of experience here:

- A picture that looks wrong is a hypothesis, not a diagnosis. Read the arrays, compare levels,
  count cells, look at ranges - the bug is usually visible as a number.
- The user drives the same browser. Re-read the state before reporting anything: the camera may
  have been turned, a button pressed, the page reloaded.
