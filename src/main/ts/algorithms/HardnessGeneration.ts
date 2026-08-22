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
 * over a couple of hundred cells, and the finest octave is given its full weight so the last level
 * carries real cell-to-cell detail and not a smoothed-over interpolation. The seams between plates,
 * where the lithosphere grinds against itself, do not draw a line: they raise the chance that a clump
 * of really hard cells crops up along them, so the seam shows as scattered hard clusters, sharp
 * against the ground around, and the field is then stretched hard to bring its gradation out.
 */
@Component
export class HardnessGeneration {
    /** Each finer octave weighs a little less than the one above, but not so much the fine detail is lost. */
    private static readonly PERSISTENCE = 0.6;
    /** The finest octave is lifted again so the last level keeps a distinct cell-by-cell grain. */
    private static readonly FINEST_BOOST = 2.5;
    /** How many cells out from a seam a hard clump can still crop up. */
    private static readonly BOUNDARY_REACH = 3;
    /** How much a fired seam clump is pushed up towards really hard rock. */
    private static readonly SEAM_BOOST = 0.9;
    /** How readily the seam band fires into hard clumps, right on the seam. */
    private static readonly SEAM_CHANCE = 0.6;
    /** How hard the gradation is stretched around the middle, to sharpen it. */
    private static readonly CONTRAST = 2.2;

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
        const proximity = this.boundaryProximity(cellField, plates, size);
        const clump = this.clumpMask(zoom, size);

        const raw = new Array<number>(size);
        for (let i = 0; i < size; ++i) {
            // the seam is not a line: near it the clump mask can fire, and where it does a patch of
            // neighbouring cells is shoved up together into a cluster of really hard rock.
            let value = noise[i];
            const threshold = 1 - proximity[i] * HardnessGeneration.SEAM_CHANCE;
            if (clump[i] >= threshold) value += HardnessGeneration.SEAM_BOOST * clump[i];
            raw[i] = value;
        }

        let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < size; ++i) {
            if (raw[i] < min) min = raw[i];
            if (raw[i] > max) max = raw[i];
        }
        const span = max - min || 1;
        const hardness = data.hardness.array;
        for (let i = 0; i < size; ++i) {
            hardness[i] = this.sharpen((raw[i] - min) / span);
        }
    }

    /** Pull the values apart around the middle so the gradation comes out sharp, not washed flat. */
    private sharpen(value: number): number {
        const stretched = 0.5 + (value - 0.5) * HardnessGeneration.CONTRAST;
        return stretched < 0 ? 0 : stretched > 1 ? 1 : stretched;
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
            let amplitude = Math.pow(HardnessGeneration.PERSISTENCE, level);
            if (level === zoom) amplitude *= HardnessGeneration.FINEST_BOOST;
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

    /**
     * A clumping mask: a random value read off the level one coarser than the one being made on, so
     * a patch of neighbouring fine cells shares the same draw. A high draw is what lets a seam fire a
     * whole cluster of hard cells at once rather than a scatter of lone ones.
     */
    private clumpMask(zoom: number, size: number): number[] {
        const clumpLevel = Math.max(0, zoom - 1);
        const coarseSize = this.levelManager.cellFields.get(clumpLevel).size;
        const values = new Array<number>(coarseSize);
        for (let c = 0; c < coarseSize; ++c) values[c] = this.random.nextFloat();
        const result = new Array<number>(size);
        for (let i = 0; i < size; ++i) {
            const coarse = clumpLevel === zoom ? i : this.levelManager.mapCell(i, zoom, clumpLevel);
            result[i] = values[coarse];
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
