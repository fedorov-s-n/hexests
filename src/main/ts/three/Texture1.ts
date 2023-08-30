import {CanvasTexture, RepeatWrapping, UVMapping} from "three";
import {Shift} from "../fieldmodel/Shift";
import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";
import {Point2d} from "../fieldmodel/Point2d";

export class Texture1 extends CanvasTexture {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private fpOffset!: Point2d;
    private canvasAsPattern!: CanvasPattern;
    private shift!: Shift;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this.canvas = canvas;
        this.context = canvas.getContext('2d')!!;

        this.mapping = UVMapping;
        this.wrapS = RepeatWrapping;
        this.wrapT = RepeatWrapping;
    }

    paintExample(border: number) {
        this.context.fillStyle = '#ff0000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = '#0000ff';
        this.context.fillRect(border, border, this.canvas.width - 2 * border, this.canvas.height - 2 * border);
        this.needsUpdate = true;
    }

    loadFrom(finitePlane: FinitePlaneAbstraction, fillStyleProcedure: (index: number) => string | CanvasGradient | CanvasPattern) {
        this.clear();

        const xs = new Array<number>(6);
        const ys = new Array<number>(6);

        const dxs = [-this.canvas.width, 0, +this.canvas.width];
        const dys = [-this.canvas.height, 0, +this.canvas.height];

        const xifs = [false, true, false];
        const yifs = [false, true, false];

        const shift = this.shift = finitePlane.getShift(0, 0);
        const offset = this.fpOffset = finitePlane.offset;

        for (let cellIndex = 0; cellIndex < finitePlane.size; ++cellIndex) {
            finitePlane.fillPoints(cellIndex, xs, ys);
            for (let j = 0; j < 6; ++j) {
                xs[j] = (xs[j] - offset.x) / shift.workArea.x * this.canvas.width;
                ys[j] = (1 - (ys[j] - offset.y) / shift.workArea.y) * this.canvas.height;
            }
            xifs[0] = Math.max(...xs) > this.canvas.width;
            xifs[2] = Math.min(...xs) < 0;
            yifs[0] = Math.max(...ys) > this.canvas.height;
            yifs[2] = Math.min(...ys) < 0;

            this.context.fillStyle = fillStyleProcedure(cellIndex);

            for (let ix = 0; ix < 3; ++ix) {
                if (xifs[ix]) {
                    for (let iy = 0; iy < 3; ++iy) {
                        if (yifs[iy]) {
                            this.context.beginPath();
                            this.context.moveTo(xs[0] + dxs[ix], ys[0] + dys[iy]);
                            for (let i = 1; i < 6; ++i) {
                                this.context.lineTo(xs[i] + dxs[ix], ys[i] + dys[iy]);
                            }
                            this.context.fill();
                        }
                    }
                }
            }
        }

        this.repeat.set(1 / shift.workArea.x, 1 / shift.workArea.y);
        this.canvasAsPattern = this.context.createPattern(this.canvas, "repeat")!!;
        this.repaint();
    }

    getShift(): Shift {
        return this.shift;
    }

    setShift(shift: Shift) {
        this.shift = shift;
        this.repaint();
    }

    clear() {
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    repaint() {
        const dx: number = this.canvas.width * (this.shift.actual.x - this.fpOffset.x) / this.shift.workArea.x;
        const dy: number = this.canvas.height * (this.shift.actual.y - this.fpOffset.y) / this.shift.workArea.y;

        this.clear();
        this.context.fillStyle = this.canvasAsPattern;
        this.context.setTransform(1, 0, 0, 1, -dx, dy);
        this.context.fillRect(dx, -dy, this.canvas.width, this.canvas.height);
        this.needsUpdate = true;
    }
}