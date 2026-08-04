import Rand, {PRNG} from "rand-seed";
import {Component} from "../di/Component";

@Component
export class Random {
    private readonly seed: number;
    private readonly rand: Rand;

    constructor(seed?: number) {
        this.seed = seed || Math.random();
        this.rand = new Rand(this.seed.toString(), PRNG.xoshiro128ss);
    }

    getSeed(): number {
        return this.seed;
    }

    nextFloat(): number {
        return this.rand.next();
    }

    /** Uniform over 0 .. max - 1: rounding instead of flooring would halve the chance of the ends. */
    nextInt(max: number): number {
        return Math.min(max - 1, Math.floor(this.nextFloat() * max));
    }
}