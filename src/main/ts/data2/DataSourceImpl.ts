import {DataSource} from "./DataSource";
import {DataKey} from "./DataKey";

export class DataSourceImpl implements DataSource {
    private readonly arrays: Map<string, Array<any>> = new Map<string, Array<any>>();
    private readonly maps: Map<string, Map<string, any>> = new Map<string, Map<string, any>>();

    get<T>(key: DataKey<T>): Array<T> | null {
        return this.arrays.get(key.key) as Array<T> | null;
    }

    getOrCreate<T>(key: DataKey<T>, length: number, defaultValue?: T): Array<T> {
        let array = this.arrays.get(key.key);
        if (array === undefined) {
            array = new Array<T>(length);
            if (defaultValue !== undefined) {
                array.fill(defaultValue);
            }
            this.arrays.set(key.key, array);
        }
        return array;
    }

    set<T>(key: DataKey<T>, value: Array<T>): void {
        this.arrays.set(key.key, value);
    }

    remove<T>(key: DataKey<T>): void {
        this.arrays.delete(key.key);
    }

    getMap<T>(key: DataKey<T>): Map<string, T> | null {
        return this.maps.get(key.key) as Map<string, T> | null;
    }

    setMap<T>(key: DataKey<T>, value: Map<string, T>): void {
        this.maps.set(key.key, value);
    }

    removeMap<T>(key: DataKey<T>): void {
        this.maps.delete(key.key);
    }
}