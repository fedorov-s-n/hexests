export abstract class AbstractAlgorithm {
    public abstract step(): void;

    public abstract generateDefault(): void;

    public steps(count: number) {
        for (let i = 0; i < count; ++i) {
            this.step();
        }
    }
}