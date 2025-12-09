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
        } else if (index === 2) {
            return '#0000ff';
        } else if (index === 3) {
            return '#00ffff';
        } else if (index === 4) {
            return '#ff00ff';
        } else if (index === 5) {
            return '#ffff00';
        } else if (index === 6) {
            return '#000000';
        } else {
            return '#ffffff';
        }
        // let num = Math.round((0xFF0000 * index) / this.colorsCount);

        // num >>>= 0;
        // let b = num & 0xFF,
        //     g = (num & 0xFF00) >>> 8,
        //     r = (num & 0xFF0000) >>> 16,
        //     a = ((num & 0xFF000000) >>> 24) / 255;
        // return "rgba(" + [r, g, b, a].join(",") + ")";
    }

    static getWaterColorsIndexFunction(): (value: number) => string {
        const wheightBuckets = [
            0.001, 0.002, 0.005, 0.01,
            0.02, 0.05, 0.1, 0.2,
            0.5, 0.8, 1.0
        ];
        const wheightColors = [
            '#f1e4a7', '#d9f1f8', '#b0e9ff', '#6fdaff',
            '#34b2fb', '#0e87d5', '#4113b6', '#7d13ba',
            '#dc06d7', '#e10f81', '#f30b0b', '#f4520d'
        ];
        return value => {
            let bucketIndex = wheightBuckets.findIndex((limit) => value <= limit);
            if (bucketIndex < 0) bucketIndex = wheightBuckets.length;
            return wheightColors[bucketIndex];
        };
    }
}