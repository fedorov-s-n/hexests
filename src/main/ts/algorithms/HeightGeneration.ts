import {Component} from "../di/Component";
import {GenericMetropolis} from "./GenericMetropolis";
import {BrownianDrift} from "./BrownianDrift";
import {LevelManager} from "../level/LevelManager";

@Component
export class HeightGeneration {
    private readonly levelManager: LevelManager;
    private readonly genericMetropolis: GenericMetropolis;
    private readonly brownianDrift: BrownianDrift;

    constructor(levelManager: LevelManager, genericMetropolis: GenericMetropolis, brownianDrift: BrownianDrift) {
        this.levelManager = levelManager;
        this.genericMetropolis = genericMetropolis;
        this.brownianDrift = brownianDrift;
    }

    run(options: HeightGenerationOptions) {
        this.genericMetropolis.run({
            stepCountMultiplier: options.metropolisStepCountMultiplier,
            zoomLevel: options.zoomLevel,
            domainTypeCount: options.domainTypeCount,
            temperatures: options.temperatures,
            skipClear: true
        });
        this.brownianDrift.run({
            stepCount: options.driftStepCount,
            zoomLevel: options.zoomLevel,
            plateTagger: (index: number) => this.genericMetropolis.data.array[index],
            output: options.output
        });
        this.genericMetropolis.clear();
    }

    generateDefault() {
        const heights = this.levelManager.levels.initial.data.height.array.fill(0);
        this.run({
            zoomLevel: 0,
            domainTypeCount: 3,
            output: (index: number, value: number) => heights[index] = value
        });
        this.levelManager.data.range(0, 2).forEach(data => data.height.interpolate());
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