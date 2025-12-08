import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {CellField} from "../cell/CellField";
import {CellData} from "../cell/CellData";

export class Level {
    readonly finitePlaneAbstraction: FinitePlaneAbstraction;
    readonly cellField: CellField;
    readonly data: CellData;

    constructor(finitePlaneAbstraction: FinitePlaneAbstraction, cellField: CellField, cellData: CellData) {
        this.finitePlaneAbstraction = finitePlaneAbstraction;
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
        return this.finitePlaneAbstraction.depth;
    }

    // to be deleted due to high dependency on depth
    get lower(): Level {
        return new Level(this.finitePlaneAbstraction.lower, this.cellField.lower, this.data.lower);
    }

    equals(other: Level): boolean {
        return this.zoom === other.zoom && this.depth == other.depth;
    }
}