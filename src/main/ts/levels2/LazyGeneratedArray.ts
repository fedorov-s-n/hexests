export class LazyGeneratedArray<T> {
    readonly initial: T;
    readonly generator: (previous: T) => T;
    readonly array: Array<T>;

    constructor(initial: T, generator: (previous: T) => T) {
        this.initial = initial;
        this.generator = generator;
        this.array = [initial];
    }

    get(index: number): T {
        for (let i = this.array.length; i <= index; ++i) {
            this.array.push(this.generator(this.array[i - 1]));
        }
        return this.array[index];
    }
}