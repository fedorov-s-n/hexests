import {CellField} from "./CellField";
import {GraphSearchBuilder} from "../util/GraphSearchBuilder";
import {Lazy} from "../util/Lazy";
import {ArrayDataStorageFactory} from "../util/DataStorageFactory";

const NEIGHBOURS = new Array<number>(6);

export class RectangularCellField implements CellField {
    readonly rowCount: number;
    readonly columnCount: number;
    readonly zoom: number;
    readonly size: number;

    private readonly _higher: RectangularCellField | undefined;
    private readonly _lower: Lazy<RectangularCellField>;

    constructor(rowCount: number, columnCount: number, zoomLevel: number, higher?: RectangularCellField) {
        this.rowCount = rowCount;
        this.columnCount = columnCount;
        this.zoom = zoomLevel;
        this._higher = higher;
        this._lower = new Lazy(() => this.generateLowerField());
        this.size = rowCount * columnCount;
    }

    fillNeighbours(index: number, neighbours: number[]) {
        const column = index % this.columnCount;
        const row = (index - column) / this.columnCount;
        const adjustedColumn = column + (row % 2 == 0 ? 0 : -1);
        neighbours[0] = this.getIndex(row, column + 1);
        neighbours[1] = this.getIndex(row + 1, adjustedColumn + 1);
        neighbours[2] = this.getIndex(row + 1, adjustedColumn);
        neighbours[3] = this.getIndex(row, column - 1);
        neighbours[4] = this.getIndex(row - 1, adjustedColumn);
        neighbours[5] = this.getIndex(row - 1, adjustedColumn + 1);
    }

    search(...indices: number[]): GraphSearchBuilder<number> {
        if (indices.length === 0) indices = Array.from(new Array(this.size).keys());
        const builder = new GraphSearchBuilder<number>(indices, index => {
            const neighbours = new Array<number>(6);
            this.fillNeighbours(index, neighbours);
            return neighbours;
        });
        return builder.withStorageFactory(new ArrayDataStorageFactory(this.size));
    }

    forEach(consumer: (index: number) => void) {
        for (let i = 0; i < this.size; ++i) {
            consumer(i);
        }
    }

    getIndex(row: number, column: number): number {
        while (column < 0) column += this.columnCount;
        while (row < 0) row += this.rowCount;
        while (column >= this.columnCount) column -= this.columnCount;
        while (row >= this.rowCount) row -= this.rowCount;
        return this.getIndexUnchecked(row, column);
    }

    getIndexUnchecked(row: number, column: number): number {
        return row * this.columnCount + column;
    }

    generateLowerField(): RectangularCellField {
        // row count is always even -- and it is a used invariant
        const rowCount = 2 * this.columnCount;
        const columnCount = 1.5 * this.rowCount;
        return new RectangularCellField(rowCount, columnCount, this.zoom + 1);
    }

    mapIndexToLowerLevel(index: number): number {
        const columnCount = this.columnCount;
        const column = index % columnCount;
        const row = (index - column) / columnCount;

        const r2 = row % 2;
        const newColumn = 1.5 * (row - r2) + 1 + r2;
        const newRow = 2 * column + 1 - r2;
        const newColumnCount = 1.5 * this.rowCount;

        return newRow * newColumnCount + newColumn;
    }

    get lower(): RectangularCellField {
        return this._lower.value;
    }

    get higher(): RectangularCellField | undefined {
        return this._higher;
    }

    interpolate(highData: number[], lowData: number[]) {
        lowData.fill(0);
        for (let upIndex = 0; upIndex < this.size; ++upIndex) {
            const lowIndex = this.mapIndexToLowerLevel(upIndex);
            this.lower.fillNeighbours(lowIndex, NEIGHBOURS);
            const input = highData[upIndex];
            lowData[lowIndex] = 3 * input;
            for (let ni = 0; ni < 6; ++ni) {
                const index = NEIGHBOURS[ni];
                lowData[index] += input;
            }
        }
        for (let lowIndex = 0; lowIndex < this.lower.size; ++lowIndex) {
            lowData[lowIndex] /= 3;
        }
    }
}