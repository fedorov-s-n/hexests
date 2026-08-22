import {Component} from "../di/Component";
import {LevelManager} from "../level/LevelManager";
import {SettingsStub} from "../util/SettingsStub";
import {Random} from "../util/Random";
import {HeightGeneration} from "./HeightGeneration";
import {LatticeCellField} from "../lattice/LatticeCellField";

/**
 * The hardness of the rock: how well it resists whatever will one day carve it. A number from 0
 * (soft) to 1 (hard) for every cell, made once the plates are known and kept beside them.
 *
 * It is not another simulation. The bulk of it is a few octaves of value noise read off the level
 * hierarchy itself -- the coarse levels give the broad rock masses, the finer ones the ridges and
 * the small clusters -- so structures fall out at every scale for the cost of a handful of passes
 * over a couple of hundred cells. The plates only lean on it: each plate carries a hardness of its
 * own, and the seams between plates, where the lithosphere grinds against itself, are raised into
 * broken ranges. None of that fixes the field; the noise breaks the plate outlines so hardness never
 * simply retraces the plate map, and it varies within a plate as much as between plates.
 */
@Component
export class HardnessGeneration {
    /** Each finer octave weighs half of the one above it, so the broad shapes lead. */
    private static readonly PERSISTENCE = 0.5;
    /** How many cells out from a seam the range it raises still reaches. */
    private static readonly BOUNDARY_REACH = 3;
    /** The share of the three parts in the raw field, before it is stretched to fill 0..1. */
    private static readonly W_NOISE = 0.55;
    private static readonly W_PLATE = 0.3;
    private static readonly W_BOUNDARY = 0.4;

    private readonly levelManager: LevelManager;
    private readonly settingsStub: SettingsStub;
    private readonly random: Random;

    constructor(levelManager: LevelManager, settingsStub: SettingsStub, random: Random) {
        this.levelManager = levelManager;
        this.settingsStub = settingsStub;
        this.random = random;
    }

    /** Made on the level the plates were made on; spreading it over the others is up to the caller. */
    generateDefault() {
        this.run(this.settingsStub.generationZoom);
    }

    run(zoom: number) {
        const cellField = this.levelManager.cellFields.get(zoom) as LatticeCellField;
        const data = this.levelManager.data.get(zoom);
        const size = cellField.size;
        const plates = data.accessor<number>(HeightGeneration.PLATES, 0).array;

        const noise = this.fractalNoise(zoom, size);
        const plateBaseline = this.plateBaseline(plates, size);
        const proximity = this.boundaryProximity(cellField, plates, size);
        const grain = new Array<number>(size);
        for (let i = 0; i < size; ++i) grain[i] = this.random.nextFloat();

        const raw = new Array<number>(size);
        for (let i = 0; i < size; ++i) {
            // the seam range is itself broken by the grain, so it comes out a broken range, not a wall
            const seam = proximity[i] * (0.3 + 0.7 * grain[i]);
            raw[i] = HardnessGeneration.W_NOISE * noise[i]
                + HardnessGeneration.W_PLATE * plateBaseline[i]
                + HardnessGeneration.W_BOUNDARY * seam;
        }

        let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < size; ++i) {
            if (raw[i] < min) min = raw[i];
            if (raw[i] > max) max = raw[i];
        }
        const span = max - min || 1;
        const hardness = data.hardness.array;
        for (let i = 0; i < size; ++i) hardness[i] = (raw[i] - min) / span;
    }

    /**
     * A few octaves of value noise, one per level from the coarsest up to the one being made on. Each
     * cell reads the octave off the coarse cell that covers it, so a whole patch of fine cells shares
     * a coarse value and the broad shapes stand while the fine octave still stipples them.
     */
    private fractalNoise(zoom: number, size: number): number[] {
        const result = new Array<number>(size).fill(0);
        let total = 0;
        for (let level = 0; level <= zoom; ++level) {
            const amplitude = Math.pow(HardnessGeneration.PERSISTENCE, level);
            total += amplitude;
            const coarseSize = this.levelManager.cellFields.get(level).size;
            const values = new Array<number>(coarseSize);
            for (let c = 0; c < coarseSize; ++c) values[c] = this.random.nextFloat();
            for (let i = 0; i < size; ++i) {
                const coarse = level === zoom ? i : this.levelManager.mapCell(i, zoom, level);
                result[i] += amplitude * values[coarse];
            }
        }
        for (let i = 0; i < size; ++i) result[i] /= total;
        return result;
    }

    /** A hardness of its own for every plate: some plates are simply harder rock than others. */
    private plateBaseline(plates: number[], size: number): number[] {
        const valueOf = new Map<number, number>();
        const result = new Array<number>(size);
        for (let i = 0; i < size; ++i) {
            const plate = plates[i];
            let value = valueOf.get(plate);
            if (value === undefined) {
                value = this.random.nextFloat();
                valueOf.set(plate, value);
            }
            result[i] = value;
        }
        return result;
    }

    /**
     * How near a cell lies to a plate seam, from 1 on the seam itself down to 0 once past its reach.
     * A cell is on a seam when one of its neighbours belongs to another plate. Found by a breadth
     * search out from the seams, which on a couple of hundred cells costs next to nothing.
     */
    private boundaryProximity(cellField: LatticeCellField, plates: number[], size: number): number[] {
        const distance = new Array<number>(size).fill(Number.POSITIVE_INFINITY);
        const neighbours = new Array<number>(6);
        const queue: number[] = [];
        for (let i = 0; i < size; ++i) {
            cellField.fillNeighbours(i, neighbours);
            for (let d = 0; d < 6; ++d) {
                const n = neighbours[d];
                if (n >= 0 && plates[n] !== plates[i]) {
                    distance[i] = 0;
                    queue.push(i);
                    break;
                }
            }
        }
        for (let head = 0; head < queue.length; ++head) {
            const cell = queue[head];
            if (distance[cell] >= HardnessGeneration.BOUNDARY_REACH) continue;
            cellField.fillNeighbours(cell, neighbours);
            for (let d = 0; d < 6; ++d) {
                const n = neighbours[d];
                if (n >= 0 && distance[n] > distance[cell] + 1) {
                    distance[n] = distance[cell] + 1;
                    queue.push(n);
                }
            }
        }
        const reach = HardnessGeneration.BOUNDARY_REACH;
        const result = new Array<number>(size);
        for (let i = 0; i < size; ++i) {
            result[i] = distance[i] > reach ? 0 : 1 - distance[i] / (reach + 1);
        }
        return result;
    }
}
