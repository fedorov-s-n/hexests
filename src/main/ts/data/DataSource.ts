import {DataKey} from "./DataKey";

export interface DataSource {
    get<T>(key: DataKey<T>): Array<T> | null;

    getOrCreate<T>(key: DataKey<T>, length: number, defaultValue?: T): Array<T>;

    set<T>(key: DataKey<T>, value: Array<T>): void;

    remove<T>(key: DataKey<T>): void;

    getMap<T>(key: DataKey<T>): Map<string, T> | null;

    setMap<T>(key: DataKey<T>, value: Map<string, T>): void;

    removeMap<T>(key: DataKey<T>): void;
}