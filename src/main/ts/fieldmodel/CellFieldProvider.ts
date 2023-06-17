import {CellDataTable} from "./CellDataTable";
import {EvenRectangularCellField, OddRectangularCellField} from "./RectangularCellField";
import {Component} from "../di/Component";
import {CellField} from "./CellField";

@Component
export class CellFieldProvider {
    private readonly dataTable: CellDataTable;
    private readonly hardcodedSize: number = 20;

    constructor(dataTable: CellDataTable) {
        this.dataTable = dataTable;
    }

    getField(depth: number, zoom: number): CellField {
        if (zoom % 2 === 0) {
            return new EvenRectangularCellField(this.hardcodedSize, this.hardcodedSize, depth, zoom, this.dataTable);
        } else {
            return new OddRectangularCellField(this.hardcodedSize, this.hardcodedSize, depth, zoom, this.dataTable);
        }
    }
}