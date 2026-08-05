import {Overlay, OverlayCaption} from "./Overlay";
import {LevelManager} from "../level/LevelManager";
import {SettingsStub} from "../util/SettingsStub";
import {DepthOverlay} from "./DepthOverlay";

/**
 * Names the land: the highest hill and the deepest water it can find, written over them.
 *
 * The names are found once, on the level the world is generated on, and written wherever that place
 * of the world happens to be drawn.
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
            {cell: peak, zoom, text: 'Great mountain', colour: '#fff3d0'}
        ];
        if (deepest >= 0) {
            captions.push({cell: deepest, zoom, text: 'The body of water', colour: '#dff3ff'});
        }
        return captions;
    }
}
