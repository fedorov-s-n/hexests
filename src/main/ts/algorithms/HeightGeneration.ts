import {Component} from "../di/Component";
import {GenericMetropolis} from "./GenericMetropolis";
import {BrownianDrift} from "./BrownianDrift";
import {LevelManager} from "../level/LevelManager";
import {SettingsStub} from "../util/SettingsStub";

@Component
export class HeightGeneration {
    /**
     * Where the plates of the last generation are kept, on the level they were made on: the plate of
     * every cell, numbered as the generation found them, and the kind the plate was drawn from.
     * Plates of one kind drift alike but are each their own patch of the world.
     */
    static readonly PLATES = 'plate';
    static readonly PLATE_KINDS = 'plate-kind';

    private readonly levelManager: LevelManager;
    private readonly genericMetropolis: GenericMetropolis;
    private readonly brownianDrift: BrownianDrift;
    private readonly settingsStub: SettingsStub;

    constructor(levelManager: LevelManager, genericMetropolis: GenericMetropolis, brownianDrift: BrownianDrift,
                settingsStub: SettingsStub) {
        this.levelManager = levelManager;
        this.genericMetropolis = genericMetropolis;
        this.brownianDrift = brownianDrift;
        this.settingsStub = settingsStub;
    }

    run(options: HeightGenerationOptions) {
        this.genericMetropolis.run({
            stepCountMultiplier: options.metropolisStepCountMultiplier,
            zoomLevel: options.zoomLevel,
            domainTypeCount: options.domainTypeCount,
            temperatures: options.temperatures,
            skipClear: true
        });
        // which plate a cell belonged to outlives the generation: an overlay shows them
        const data = this.levelManager.levels.get(options.zoomLevel || 0).data;
        this.brownianDrift.run({
            stepCount: options.driftStepCount,
            zoomLevel: options.zoomLevel,
            plateTagger: (index: number) => this.genericMetropolis.data.array[index],
            output: options.output,
            plates: plateOfCell => {
                const plates = data.accessor<number>(HeightGeneration.PLATES, 0).array;
                plateOfCell.forEach((plate, index) => plates[index] = plate);
            }
        });
        const kinds = data.accessor<number>(HeightGeneration.PLATE_KINDS, 0).array;
        this.genericMetropolis.data.array.forEach((kind, index) => kinds[index] = kind);
        this.genericMetropolis.clear();
    }

    /** The relief is made on one level only; spreading it over the others is up to the caller. */
    generateDefault() {
        const zoomLevel = this.settingsStub.generationZoom;
        const heights = this.levelManager.data.get(zoomLevel).height.array.fill(0);
        // A small level coarsens into a single domain, which drifts as a whole and leaves no
        // relief. Every next attempt stirs the domains less, so more of them survive.
        for (const metropolisStepCountMultiplier of [150, 50, 20, 5, 1]) {
            this.run({
                metropolisStepCountMultiplier,
                zoomLevel,
                domainTypeCount: 3,
                output: (index: number, value: number) => heights[index] = value
            });
            if (Math.max(...heights) - Math.min(...heights) > 0.01) break;
        }
    }
}

export interface HeightGenerationOptions {
    metropolisStepCountMultiplier?: number,
    zoomLevel?: number,
    domainTypeCount?: number,
    temperatures?: number[],
    driftStepCount?: number,
    output: (index: number, value: number) => void
}