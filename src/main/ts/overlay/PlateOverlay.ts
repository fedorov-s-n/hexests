import {Overlay, OverlayLabel} from "./Overlay";
import {LevelManager} from "../level/LevelManager";
import {HeightGeneration} from "../algorithms/HeightGeneration";
import {SettingsStub} from "../util/SettingsStub";
import {ColorGenerator} from "../util/ColorGenerator";

/**
 * The plates the relief was drifted from. They are known on the level the relief was generated on
 * and shown on any level, since a cell of any level lies over one of them.
 */
export class PlateOverlay implements Overlay {
    readonly name = 'plates';
    readonly opacity = 0.5;

    private static readonly LABEL_ZOOM = 5;
    private static readonly LABEL_CELL = 0;

    private readonly levelManager: LevelManager;
    private readonly settingsStub: SettingsStub;
    private readonly colours = new ColorGenerator(-1);

    constructor(levelManager: LevelManager, settingsStub: SettingsStub) {
        this.levelManager = levelManager;
        this.settingsStub = settingsStub;
    }

    colourOf(cell: number, zoom: number): string | undefined {
        const home = this.settingsStub.generationZoom;
        const plates = this.levelManager.data.get(home).accessor<number>(HeightGeneration.PLATES, 0).array;
        const plate = plates[zoom === home ? cell : this.levelManager.mapCell(cell, zoom, home)];
        return plate === undefined ? undefined : this.colours.toColor(plate);
    }

    labels(): OverlayLabel[] {
        return [{
            cell: PlateOverlay.LABEL_CELL,
            zoom: PlateOverlay.LABEL_ZOOM,
            text: 'Cell 0\nlevel 5',
            colour: '#ffffff',
            background: '#333333'
        }];
    }
}
