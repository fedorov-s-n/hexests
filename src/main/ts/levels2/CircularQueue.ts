export class CircularQueue<T> {
    private readonly array = Array<T>()
    private readonly limit: number;

    constructor(limit: number) {
        this.limit = limit;
    }

    get(index: number) {
        return this.array[index];
    }

    put(element: T) {
        this.array.unshift(element);
        if (this.array.length > this.limit) {
            this.array.length = this.limit;
        }
    }
}