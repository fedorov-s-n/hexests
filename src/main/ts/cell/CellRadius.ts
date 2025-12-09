import {CellSource} from "./CellSource";
import {CellShiftSupplier} from "./CellShiftSupplier";

export interface CellRadius extends CellSource, CellShiftSupplier {
    cellIndex: number;
    radius: number;
}