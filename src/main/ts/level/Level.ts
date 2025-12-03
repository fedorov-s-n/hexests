import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {CellField} from "../cell/CellField";
import {CellData} from "../cell/CellData";

export class Level {
    readonly finitePlane: FinitePlaneAbstraction;
    readonly cellField: CellField;
    readonly data: CellData;

    constructor(finitePlane: FinitePlaneAbstraction, cellField: CellField, cellData: CellData) {
        this.finitePlane = finitePlane;
        this.cellField = cellField;
        this.data = cellData;
    }

    get size(): number {
        return this.cellField.size;
    }

    get zoom(): number {
        return this.cellField.zoom;
    }

    get depth(): number {
        return this.finitePlane.depth;
    }

    // to be deleted due to high dependency on depth
    get lower(): Level {
        return new Level(this.finitePlane.lower, this.cellField.lower, this.data.lower);
    }

    equals(other: Level): boolean {
        return this.zoom === other.zoom && this.depth == other.depth;
    }
}