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

    /**
     * A colour of its own for every whole number, spread apart so that neighbouring numbers land far
     * around the wheel. Meant for plates: each plate keeps its colour whatever its kind, and two
     * plates of one kind still come out different. The same number always gives the same colour.
     */
    toDistinctColor(index: number): string {
        const hue = (index * 137.508) % 360;
        const saturation = 0.55 + 0.25 * ((index % 3) / 2);
        const lightness = 0.42 + 0.16 * (index % 2);
        return ColorGenerator.hslToHex(hue, saturation, lightness);
    }

    private static hslToHex(h: number, s: number, l: number): string {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        const channel = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
        return '#' + channel(r) + channel(g) + channel(b);
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