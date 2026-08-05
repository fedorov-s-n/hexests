import {Overlay} from "./Overlay";

/**
 * The outlines of the cells of the level being looked at.
 *
 * Where the cells are is something known about the world rather than the world itself, so the
 * outlines are an overlay like any other and are switched on and off from the same list. This one
 * paints nothing into the map: the outlines are lines of their own, drawn over the ground, and all
 * the overlay has to say is whether they are wanted.
 */
export class GridOverlay implements Overlay {
    readonly name = 'grid';
}
