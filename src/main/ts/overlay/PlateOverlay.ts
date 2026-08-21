import {Overlay, OverlayLabel} from "./Overlay";
import {LevelManager} from "../level/LevelManager";
import {HeightGeneration} from "../algorithms/HeightGeneration";
import {SettingsStub} from "../util/SettingsStub";
import {ColorGenerator} from "../util/ColorGenerator";

/**
 * The plates the relief was drifted from. They are known on the level the relief was generated on
 * and shown on any level, since a cell of any level lies over one of them.
 *
 * A plate is a patch of the world that drifted as one piece. The colour tells the plate itself, by
 * the number the generation gave it, so every plate stands apart -- two plates drawn from one kind
 * are still two colours. The label repeats that number for those who want to read it.
 */
export class PlateOverlay implements Overlay {
    readonly name = 'plates';
    readonly opacity = 0.5;

    private readonly levelManager: LevelManager;
    private readonly settingsStub: SettingsStub;
    private readonly colours = new ColorGenerator(-1);
    private found: OverlayLabel[] | undefined;

    constructor(levelManager: LevelManager, settingsStub: SettingsStub) {
        this.levelManager = levelManager;
        this.settingsStub = settingsStub;
    }

    colourOf(cell: number, zoom: number): string | undefined {
        const home = this.settingsStub.generationZoom;
        const plates = this.levelManager.data.get(home).accessor<number>(HeightGeneration.PLATES, 0).array;
        const plate = plates[zoom === home ? cell : this.levelManager.mapCell(cell, zoom, home)];
        return plate === undefined ? undefined : this.colours.toDistinctColor(plate);
    }

    labels(): OverlayLabel[] {
        if (!this.found) this.found = this.findThem();
        return this.found;
    }

    /** Named afresh whenever the world is: these are this generation's plates, not the next one's. */
    forget() {
        this.found = undefined;
    }

    private findThem(): OverlayLabel[] {
        const zoom = this.settingsStub.generationZoom;
        const plates = this.levelManager.data.get(zoom).accessor<number>(HeightGeneration.PLATES, 0).array;

        const cellsOf = new Map<number, number[]>();
        plates.forEach((plate, cell) => {
            if (plate === undefined) return;
            const cells = cellsOf.get(plate);
            if (cells) cells.push(cell); else cellsOf.set(plate, [cell]);
        });

        return Array.from(cellsOf.keys()).sort((one, other) => one - other).map(plate => {
            const cell = this.middleOf(cellsOf.get(plate)!, zoom);
            return {
                cell, zoom,
                text: `Plate ${plate}`,
                colour: '#ffffff',
                background: this.colours.toDistinctColor(plate)
            };
        });
    }

    /**
     * The cell of a plate that stands in the middle of it: the one whose distances to all the others
     * are the smallest. Taken from the plate's own cells, so the name never lands beside the plate --
     * which the mean of the positions would do to a plate bent round a bay or split by the seam the
     * world closes on. A generation level holds few enough cells for every pair to be measured.
     */
    private middleOf(cells: number[], zoom: number): number {
        const field = this.levelManager.finitePlainAbstractions.get(zoom).cellField;
        const world = field.world;
        const wrap = (distance: number, period: number) => distance - period * Math.round(distance / period);

        let middle = cells[0];
        let smallest = Number.POSITIVE_INFINITY;
        for (const one of cells) {
            const x = field.worldX(field.q(one), field.r(one));
            const y = field.worldY(field.q(one), field.r(one));
            let total = 0;
            for (const other of cells) {
                const dx = wrap(field.worldX(field.q(other), field.r(other)) - x, world.width);
                const dy = wrap(field.worldY(field.q(other), field.r(other)) - y, world.height);
                total += Math.hypot(dx, dy);
            }
            if (total < smallest) {
                smallest = total;
                middle = one;
            }
        }
        return middle;
    }
}
