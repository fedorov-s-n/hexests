import {Component} from "../di/Component";

/** How large a selection is, in cells around the cell under the pointer, and whether it is shown. */
@Component
export class SelectionState {
    static readonly SMALLEST = 0;
    static readonly LARGEST = 7;

    /** A radius of nothing is the cell alone; seven is the largest a selection may be. */
    radius: number = SelectionState.SMALLEST;
    /** Switched from the list of overlays: when it is off, nothing is picked and nothing is drawn. */
    shown: boolean = true;
    /** Whether the cell-index tooltip is shown over the selected cell. Off to begin with. */
    tooltipShown: boolean = false;

    /**
     * What the radius comes to on a level: the chosen one, held down to strictly less than two to the
     * power of the level. The coarser the lattice, the fewer of its cells a selection may hold -- one
     * only at the top, one or two a level below, and from the third level down the whole range the
     * slider offers. What the slider shows is what was chosen; this is what is drawn.
     */
    radiusAt(zoom: number): number {
        return Math.min(this.radius, Math.pow(2, zoom) - 1);
    }
}
