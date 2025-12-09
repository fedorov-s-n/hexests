export interface CellSource {
    get size(): number;

    forEach(consumer: (index: number) => void): void;
}