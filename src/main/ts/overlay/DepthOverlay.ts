import {Overlay} from "./Overlay";
import {LevelManager} from "../level/LevelManager";
import {ColorGenerator} from "../util/ColorGenerator";

/**
 * How deep the water is. Where there is none, the overlay says nothing and the map shows through.
 */
export class DepthOverlay implements Overlay {
    /** Less water than this over the ground is no water at all. */
    static readonly PUDDLE = 0.001;

    readonly name = 'depth';
    readonly opacity = 0.7;

    private readonly levelManager: LevelManager;
    private readonly depthColours = ColorGenerator.getWaterColorsIndexFunction();

    constructor(levelManager: LevelManager) {
        this.levelManager = levelManager;
    }

    colourOf(cell: number, zoom: number): string | undefined {
        const data = this.levelManager.data.get(zoom);
        const depth = data.waterLevel.array[cell] - data.height.array[cell];
        return depth > DepthOverlay.PUDDLE ? this.depthColours(depth) : undefined;
    }
}
