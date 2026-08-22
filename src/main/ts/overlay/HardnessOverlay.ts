import {Overlay} from "./Overlay";
import {LevelManager} from "../level/LevelManager";
import {ColorGenerator} from "../util/ColorGenerator";

/**
 * The hardness of the rock, from soft to hard, on whatever level is shown. The colour runs the whole
 * way of a continuous ramp -- soft blues through a pale middle to a hard red -- so soft ground,
 * middling terrain and the hardest rock all stand apart, and nothing is flattened to a plain
 * hard-or-soft.
 */
export class HardnessOverlay implements Overlay {
    readonly name = 'hardness';
    readonly opacity = 0.7;

    private readonly levelManager: LevelManager;
    private readonly colours = ColorGenerator.getHardnessColorsFunction();

    constructor(levelManager: LevelManager) {
        this.levelManager = levelManager;
    }

    colourOf(cell: number, zoom: number): string | undefined {
        const hardness = this.levelManager.data.get(zoom).hardness.array[cell];
        return hardness === undefined ? undefined : this.colours(hardness);
    }
}
