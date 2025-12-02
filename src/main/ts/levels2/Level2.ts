import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";
import {CellField} from "../fieldmodel/CellField";
import {CellData} from "./CellData";

export class Level2 {
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
    get lower(): Level2 {
        return new Level2(this.finitePlane.lower, this.cellField.lower, this.data.lower);
    }
    
    equals(other: Level2): boolean {
        return this.zoom === other.zoom && this.depth == other.depth;
    }
}