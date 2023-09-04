import {CanvasTexture, RepeatWrapping, UVMapping} from "three";
import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";

export class Texture1 extends CanvasTexture {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private repaintProcedure!: () => void;

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

        for (let cellIndex = 0; cellIndex < finitePlane.size; ++cellIndex) {
            finitePlane.fillPointsXY(cellIndex, xs, ys);
            for (let j = 0; j < 6; ++j) {
                xs[j] = (xs[j] - finitePlane.offset.x) / finitePlane.workArea.x * this.canvas.width;
                ys[j] = (1 - (ys[j] - finitePlane.offset.y) / finitePlane.workArea.y) * this.canvas.height;
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

        this.repeat.set(1 / finitePlane.workArea.x, 1 / finitePlane.workArea.y);
        const canvasAsPattern = this.context.createPattern(this.canvas, "repeat")!!;
        this.repaintProcedure = () => this.repaint0(canvasAsPattern, finitePlane);
        this.repaint();
    }

    clear() {
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    repaint() {
        if (this.repaintProcedure) {
            this.repaintProcedure();
        }
    }

    private repaint0(canvasAsPattern: CanvasPattern, finitePlane: FinitePlaneAbstraction) {
        const dx: number = this.canvas.width * (finitePlane.shift.x - finitePlane.offset.x) / finitePlane.workArea.x;
        const dy: number = this.canvas.height * (finitePlane.shift.y - finitePlane.offset.y) / finitePlane.workArea.y;

        this.clear();
        this.context.fillStyle = canvasAsPattern;
        this.context.setTransform(1, 0, 0, 1, -dx, dy);
        this.context.fillRect(dx, -dy, this.canvas.width, this.canvas.height);
        this.needsUpdate = true;
    }
}