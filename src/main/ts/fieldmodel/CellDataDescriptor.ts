export class CellDataDescriptor<T> {
    static X_POS = new CellDataDescriptor<number>('xpos');
    static Y_POS = new CellDataDescriptor<number>('ypos');
    static Z_POS = new CellDataDescriptor<number>('zpos');

    readonly key: string;

    constructor(key: string) {
        this.key = key;
    }

    equals(other: CellDataDescriptor<any>): boolean {
        return this.key === other.key;
    }
}