import {Overlay} from "./Overlay";

/**
 * The marker under the pointer: the cells that would be taken if something were done to them.
 *
 * What is picked is something known about the world rather than the world itself, so the marker is an
 * overlay like any other and is switched on and off from the same list. It paints nothing into the
 * map -- the marker is a patch of its own, laid on the ground -- and all the overlay has to say is
 * whether it is wanted. How wide it is, is the slider's business.
 */
export class SelectionOverlay implements Overlay {
    readonly name = 'selection';
}
