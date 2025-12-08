export interface CellSource {
    size: number;

    forEach(consumer: (index: number) => void): void;
}