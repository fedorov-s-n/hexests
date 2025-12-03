import {CellDataKey} from "./CellDataKey";
import {DataSource} from "../data2/DataSource";
import {CellField} from "../fieldmodel/CellField";
import {CellDataAccessor} from "./CellDataAccessor";

export class CellData {
    static readonly HEIGHT = 'height';
    static readonly WATER_LEVEL = 'water-level';
    static readonly COLOR = 'color';

    readonly zoom: number;
    readonly depth: number;

    readonly dataSource: DataSource;
    readonly cellField: CellField;

    readonly height: CellDataAccessor<number>;
    readonly waterLevel: CellDataAccessor<number>;
    readonly color: CellDataAccessor<string>;

    constructor(dataSource: DataSource, cellField: CellField, zoom: number, depth: number) {
        this.dataSource = dataSource;
        this.cellField = cellField;
        this.zoom = zoom;
        this.depth = depth;
        this.height = this.accessor(CellData.HEIGHT, 0);
        this.waterLevel = this.accessor(CellData.WATER_LEVEL, 0);
        this.color = this.accessor(CellData.COLOR, '#ffffff');
    }

    accessor<T>(name: string, defaultValue?: T): CellDataAccessor<T> {
        const key = new CellDataKey<T>(name, this.zoom, this.depth);
        return new CellDataAccessor<T>(this.dataSource, this.cellField, key, defaultValue);
    }

    // to be deleted due to high dependency on depth
    get lower(): CellData {
        return new CellData(this.dataSource, this.cellField.lower, this.zoom + 1, this.depth);
    }
}