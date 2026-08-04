import {Overlay, OverlayCaption} from "./Overlay";
import {LevelManager} from "../level/LevelManager";
import {SettingsStub} from "../util/SettingsStub";
import {DepthOverlay} from "./DepthOverlay";

/**
 * Names the land: the highest hill and the widest water it can find, written across them.
 *
 * The names are found once, on the level the world is generated on, and written wherever that
 * stretch of the world happens to be drawn.
 */
export class LandscapeOverlay implements Overlay {
    readonly name = 'landscape';

    private readonly levelManager: LevelManager;
    private readonly settingsStub: SettingsStub;
    private found: OverlayCaption[] | undefined;

    constructor(levelManager: LevelManager, settingsStub: SettingsStub) {
        this.levelManager = levelManager;
        this.settingsStub = settingsStub;
    }

    captions(): OverlayCaption[] {
        if (!this.found) this.found = this.findThem();
        return this.found;
    }

    /** Written afresh whenever the world is: the names belong to this relief, not to the next. */
    forget() {
        this.found = undefined;
    }

    private findThem(): OverlayCaption[] {
        const zoom = this.settingsStub.generationZoom;
        const field = this.levelManager.cellFields.get(zoom);
        const data = this.levelManager.data.get(zoom);
        const land = data.height.array;
        const water = data.waterLevel.array;

        let peak = 0, deepest = -1;
        for (let cell = 0; cell < field.size; ++cell) {
            if (land[cell] > land[peak]) peak = cell;
            const depth = water[cell] - land[cell];
            if (depth > DepthOverlay.PUDDLE && (deepest < 0 || depth > water[deepest] - land[deepest])) {
                deepest = cell;
            }
        }

        const captions: OverlayCaption[] = [
            {cells: this.stretchAround(peak, zoom), zoom, text: 'Great mountain', colour: '#fff3d0'}
        ];
        if (deepest >= 0) {
            captions.push({cells: this.stretchAround(deepest, zoom), zoom, text: 'The body of water', colour: '#dff3ff'});
        }
        return captions;
    }

    /** A few cells in a row through the place, for the words to bend along. */
    private stretchAround(cell: number, zoom: number): number[] {
        const field = this.levelManager.cellFields.get(zoom);
        const neighbours = new Array<number>(6);
        const cells = [cell];
        let west = cell, east = cell;
        for (let step = 0; step < 2; ++step) {
            field.fillNeighbours(west, neighbours);
            west = neighbours[3];
            cells.unshift(west);
            field.fillNeighbours(east, neighbours);
            east = neighbours[0];
            cells.push(east);
        }
        return cells;
    }
}
