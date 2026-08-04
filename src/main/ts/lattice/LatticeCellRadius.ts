import {CellRadius} from "../cell/CellRadius";
import {LatticeCellField} from "./LatticeCellField";

/** A hexagonal disc of cells around a moving centre. */
export class LatticeCellRadius implements CellRadius {
    cellIndex: number;
    radius: number;

    private readonly cellField: LatticeCellField;
    private readonly initialCentreQ: number;
    private readonly initialCentreR: number;

    constructor(cellField: LatticeCellField, cellIndex?: number, radius?: number) {
        this.cellField = cellField;
        this.cellIndex = cellIndex || 0;
        this.radius = radius || 0;

        const axial = new Array<number>(2);
        cellField.nearestVector(cellField.world.width / 2, cellField.world.height / 2, axial);
        const centre = cellField.indexOf(axial[0], axial[1]);
        this.initialCentreQ = cellField.q(centre);
        this.initialCentreR = cellField.r(centre);
    }

    forEach(consumer: (index: number) => void): void {
        const centreQ = this.cellField.q(this.cellIndex);
        const centreR = this.cellField.r(this.cellIndex);
        for (let dq = -this.radius; dq <= this.radius; ++dq) {
            const from = Math.max(-this.radius, -dq - this.radius);
            const to = Math.min(+this.radius, -dq + this.radius);
            for (let dr = from; dr <= to; ++dr) {
                consumer(this.cellField.indexOf(centreQ + dq, centreR + dr));
            }
        }
    }

    get size() {
        const r = this.radius;
        return 3 * r * r + 3 * r + 1;
    }

    /** The same cell of the disc, but taken around the resting centre: keeps the mesh points stable. */
    getShiftedCellIndex(index: number): number {
        const dq = this.cellField.q(index) - this.cellField.q(this.cellIndex);
        const dr = this.cellField.r(index) - this.cellField.r(this.cellIndex);
        return this.cellField.indexOf(this.initialCentreQ + dq, this.initialCentreR + dr);
    }
}
