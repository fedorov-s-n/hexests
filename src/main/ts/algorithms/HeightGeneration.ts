import {Component} from "../di/Component";
import {GenericMetropolis} from "./GenericMetropolis";
import {BrownianDrift} from "./BrownianDrift";

@Component
export class HeightGeneration {
    private readonly genericMetropolis: GenericMetropolis;
    private readonly brownianDrift: BrownianDrift;

    constructor(genericMetropolis: GenericMetropolis, brownianDrift: BrownianDrift) {
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
}

export interface HeightGenerationOptions {
    metropolisStepCountMultiplier?: number,
    zoomLevel?: number,
    domainTypeCount?: number,
    temperatures?: number[],
    driftStepCount?: number,
    output: (index: number, value: number) => void
}