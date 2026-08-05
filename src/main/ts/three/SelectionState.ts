import {Component} from "../di/Component";

/** How large a selection is, in cells around the cell under the pointer. */
@Component
export class SelectionState {
    static readonly SMALLEST = 0;
    static readonly LARGEST = 7;

    /** A radius of nothing is the cell alone; seven is the largest a selection may be. */
    radius: number = 1;
}
