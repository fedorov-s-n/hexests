import {Component} from "../di/Component";
import {LevelManager} from "../level/LevelManager";

@Component
export class AltitudeMeter {
    private readonly levelManager: LevelManager;

    constructor(levelManager: LevelManager) {
        this.levelManager = levelManager;
    }

    run(options: AltitudeMeterOptions): number[] {
        const cellField = this.levelManager.cellFields.get(options.zoomLevel || 0);
        const heights = new Array<number>(cellField.size);
        cellField.forEach(i => heights[i] = options.input(i));
        heights.sort((a, b) => a - b);
        let buckets = options.buckets;
        if (!buckets) {
            const bucketCount = options.bucketCount || 10;
            buckets = new Array<number>(bucketCount);
            for (let i = 0; i < bucketCount; ++i) {
                buckets[i] = i / bucketCount;
            }
        }
        return buckets.map(bucket => heights[Math.max(0, Math.min(Math.round(bucket * cellField.size), cellField.size - 1))]);
    }

    getSimpleHeightLimits() {
        const heightBuckets = [
            0.15, 0.2, 0.25, 0.3,
            0.35, 0.4, 0.5, 0.65,
            0.75, 0.9, 0.95
        ];
        const heightColors = [
            '#91C0D4', '#B6E3E4', '#D4F1EF', '#EBE7CD',
            '#E7D4BF', '#B3E078', '#6dd76d', '#a89b35',
            '#e5ca5d', '#f1e4a7', '#b4b4b4', '#ffffff'
        ];
        const heights = this.levelManager.levels.initial.data.height.array;

        return this.run({
            zoomLevel: 0,
            input: (index: number) => heights[index],
            buckets: heightBuckets
        });
    }

}

export interface AltitudeMeterOptions {
    zoomLevel?: number,
    input: (index: number) => number,
    buckets?: number[],
    bucketCount?: number
}