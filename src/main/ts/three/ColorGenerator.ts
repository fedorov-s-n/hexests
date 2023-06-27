export class ColorGenerator {
    private readonly colorsCount: number;

    constructor(colorsCount: number) {
        this.colorsCount = colorsCount;
    }

    toColor(index: number): string {
        if (index === 0) {
            return '#ff0000';
        } else if (index === 1) {
            return '#00ff00';
        } else {
            return '#0000ff';
        }
        // let num = Math.round((0xFF0000 * index) / this.colorsCount);

        // num >>>= 0;
        // let b = num & 0xFF,
        //     g = (num & 0xFF00) >>> 8,
        //     r = (num & 0xFF0000) >>> 16,
        //     a = ((num & 0xFF000000) >>> 24) / 255;
        // return "rgba(" + [r, g, b, a].join(",") + ")";
    }
}