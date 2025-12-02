import {CellDataKey} from "./CellDataKey";
import {DataSource} from "../data2/DataSource";
import {CellField} from "../fieldmodel/CellField";

export class CellData {
    static readonly HEIGHT = 'height';
    static readonly WATER_LEVEL = 'water-level';
    static readonly COLOR = 'color';

    readonly zoom: number;
    readonly depth: number;

    readonly dataSource: DataSource;
    readonly cellField: CellField;
    readonly heightKey: CellDataKey<number>;
    readonly waterLevelKey: CellDataKey<number>;
    readonly colorKey: CellDataKey<string>;

    constructor(dataSource: DataSource, cellField: CellField, zoom: number, depth: number) {
        this.dataSource = dataSource;
        this.cellField = cellField;
        this.zoom = zoom;
        this.depth = depth;
        this.heightKey = this.createKey(CellData.HEIGHT, 0);
        this.waterLevelKey = this.createKey(CellData.WATER_LEVEL, 0);
        this.colorKey = this.createKey(CellData.COLOR, '#ffffff');
    }

    createKey<T>(name: string, defaultValue?: T): CellDataKey<T> {
        return new CellDataKey(name, this.zoom, this.depth, defaultValue);
    }

    get height(): number[] {
        return this.dataSource.getOrCreate<number>(this.heightKey, this.cellField.size, this.heightKey.defaultValue);
    }

    set height(array: number[]) {
        this.dataSource.set(this.heightKey, array);
    }

    get waterLevel(): number[] {
        return this.dataSource.getOrCreate<number>(this.waterLevelKey, this.cellField.size, this.waterLevelKey.defaultValue);
    }

    set waterLevel(array: number[]) {
        this.dataSource.set(this.waterLevelKey, array);
    }

    get color(): string[] {
        return this.dataSource.getOrCreate<string>(this.colorKey, this.cellField.size, this.colorKey.defaultValue);
    }

    set color(array: string[]) {
        this.dataSource.set(this.colorKey, array);
    }

    // to be deleted due to high dependency on depth
    get lower(): CellData {
        return new CellData(this.dataSource, this.cellField.lower, this.zoom + 1, this.depth);
    }
}