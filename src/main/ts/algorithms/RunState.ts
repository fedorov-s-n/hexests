export class RunState {
    running: boolean;
    stepCount: number;

    constructor(running: boolean, stepCount: number) {
        this.running = running;
        this.stepCount = stepCount;
    }

    start() {
        this.running = true;
    }

    stop() {
        this.running = false;
    }
}