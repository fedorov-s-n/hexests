export class DataDescriptor<T> {
    static HEIGHT = new DataDescriptor<number>('height');
    static WATER_LEVEL = new DataDescriptor<number>('water-level');
    static COLOR = new DataDescriptor<string>('color');

    readonly key: string;

    constructor(key: string) {
        this.key = key;
    }

    equals(other: DataDescriptor<any>): boolean {
        return this.key === other.key;
    }
}