export interface DataKey<T> {
    get key(): string;
}

export class DataKeyImpl<T> implements DataKey<T> {
    private readonly _key: string;

    constructor(_key: string) {
        this._key = _key;
    }

    get key(): string {
        return this._key;
    }
}