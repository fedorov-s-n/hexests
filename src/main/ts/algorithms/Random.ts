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

    nextInt(max: number): number {
        return Math.round(this.nextFloat() * (max - 1));
    }
}