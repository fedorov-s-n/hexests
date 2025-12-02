export class Lazy<T> {
    private readonly supplier: () => T;
    private _value: T | undefined;

    constructor(supplier: () => T) {
        this.supplier = supplier;
    }

    get value(): T {
        let value = this._value;
        if (value === undefined) {
            this._value = value = this.supplier();
        }
        return value;
    }
}