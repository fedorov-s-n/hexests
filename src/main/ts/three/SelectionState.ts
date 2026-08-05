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
}
