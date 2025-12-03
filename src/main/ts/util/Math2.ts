export class Math2 {
    static sum = function sum(...values: number[]): number {
        return values.reduce((a, b) => a + b, 0);
    }
    static sum2 = function sum2(values: number[]): number {
        return values.reduce((a, b) => a + b, 0);
    }
    static byKey = function byKey<T>(getter: (arg: T) => number): (x: T, y: T) => number {
        return (x: T, y: T) => getter(x) - getter(y);
    }
    static sortBy = function sortBy<T>(array: T[], getter: (arg: T) => number): T[] {
        return array.sort(Math2.byKey(getter));
    }
}