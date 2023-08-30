export interface DataStorageFactory<T> {
    createStorage<V>(): DataStorage<T, V>;
}

export interface DataStorage<K, V> {
    getValue(key: K): V | undefined;

    putValue(key: K, value: V): void;

    getOrDefault(key: K, defaultValue: V): V
}

export class MapDataStorageFactory<T> implements DataStorageFactory<T> {
    public static INSTANCE = new MapDataStorageFactory();

    createStorage<V>(): DataStorage<T, V> {
        return new MapSearchStorage<T, V>();
    }
}

export class ArrayDataStorageFactory implements DataStorageFactory<number> {
    private readonly size: number;

    constructor(size: number) {
        this.size = size;
    }

    createStorage<V>(): DataStorage<number, V> {
        return new ArraySearchStorage(new Array<V>(this.size));
    }
}

export class MapSearchStorage<K, V> implements DataStorage<K, V> {
    private readonly map: Map<K, V> = new Map<K, V>();

    public getValue(key: K): V | undefined {
        return this.map.get(key);
    }

    public putValue(key: K, value: V): void {
        this.map.set(key, value);
    }

    public getOrDefault(key: K, defaultValue: V): V {
        const value = this.map.get(key);
        return value === undefined ? defaultValue : value;
    }
}

export class ArraySearchStorage<V> implements DataStorage<number, V> {
    private readonly array: V[];

    constructor(array: V[]) {
        this.array = array;
    }

    public getValue(key: number): V | undefined {
        return this.array[key];
    }

    public putValue(key: number, value: V): void {
        this.array[key] = value;
    }

    public getOrDefault(key: number, defaultValue: V): V {
        const value = this.array[key];
        return value === undefined ? defaultValue : value;
    }
}