export class CellDataDescriptor<T> {
    static HEIGHT = new CellDataDescriptor<number>('height');
    static COLOR = new CellDataDescriptor<string>('color');

    readonly key: string;

    constructor(key: string) {
        this.key = key;
    }

    equals(other: CellDataDescriptor<any>): boolean {
        return this.key === other.key;
    }
}