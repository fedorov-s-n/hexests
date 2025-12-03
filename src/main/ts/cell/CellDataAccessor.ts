import {DataSource} from "../data/DataSource";
import {CellField} from "./CellField";
import {CellDataKey} from "./CellDataKey";

export class CellDataAccessor<T> {
    private readonly dataSource: DataSource;
    private readonly cellField: CellField;
    readonly key: CellDataKey<T>;
    readonly defaultValue: T | undefined;

    constructor(dataSource: DataSource, cellField: CellField, key: CellDataKey<T>, defaultValue?: T) {
        this.dataSource = dataSource;
        this.cellField = cellField;
        this.key = key;
        this.defaultValue = defaultValue;
    }

    get array(): T[] {
        return this.dataSource.getOrCreate<T>(this.key, this.cellField.size, this.defaultValue);
    }

    set array(array: T[]) {
        this.dataSource.set(this.key, array);
    }

    interpolate() {
        const highData = this.dataSource.get<number>(this.key);
        if (highData === null) throw new Error(`Source does not exist for ${this.key.key}`);
        const lowData = this.dataSource.getOrCreate<number>(this.key.lower, this.cellField.lower.size);

        this.cellField.interpolate(highData, lowData);
    }

    remove() {
        this.dataSource.remove(this.key);
    }
}