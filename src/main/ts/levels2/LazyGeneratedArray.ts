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

    range(start: number, finish: number, step: number = finish >= start ? 1 : -1): T[] {
        const size = Math.floor((finish - start) / step);
        if (size < 0) throw new Error(`Illegal arguments(start=${start},finish=${finish},step=${step})`);
        const result = new Array<T>(size)
        for (let index = start, i = 0; i < size; index += step, i++) {
            result[i] = this.get(index);
        }
        return result;
    }
}