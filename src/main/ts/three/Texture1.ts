import {CanvasTexture, RepeatWrapping, UVMapping} from "three";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";

export class Texture1 extends CanvasTexture {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private repaintData!: RepaintData;

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

    loadFrom(finitePlaneAbstraction: FinitePlaneAbstraction, fillStyleProcedure: (index: number) => string | CanvasGradient | CanvasPattern) {
        this.clear();

        const xs = new Array<number>(6);
        const ys = new Array<number>(6);

        const dxs = [-this.canvas.width, 0, +this.canvas.width];
        const dys = [-this.canvas.height, 0, +this.canvas.height];

        const xifs = [false, true, false];
        const yifs = [false, true, false];

        const workArea = finitePlaneAbstraction.textureWorkArea;

        for (let cellIndex = 0; cellIndex < finitePlaneAbstraction.size; ++cellIndex) {
            finitePlaneAbstraction.fillWorldPointsXY(cellIndex, xs, ys);
            for (let j = 0; j < 6; ++j) {
                xs[j] = (xs[j] - finitePlaneAbstraction.orientationOffset.x) / workArea.x * this.canvas.width;
                ys[j] = (1 - (ys[j] - finitePlaneAbstraction.orientationOffset.y) / workArea.y) * this.canvas.height;
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

        this.repeat.set(1 / workArea.x, 1 / workArea.y);
        const canvasAsPattern = this.context.createPattern(this.canvas, "repeat")!!;
        this.repaintData = new RepaintData(finitePlaneAbstraction, canvasAsPattern);
        this.repaint();
    }

    updatePlane(finitePlaneAbstraction: FinitePlaneAbstraction) {
        if (this.repaintData) {
            this.repaintData.finitePlaneAbstraction = finitePlaneAbstraction;
            this.repaint();
        }
    }

    clear() {
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    repaint() {
        if (!this.repaintData) return;
        const finitePlaneAbstraction = this.repaintData.finitePlaneAbstraction;
        const workArea = finitePlaneAbstraction.textureWorkArea;
        // the picture is dragged the same way the data has stepped, so the whole world moves as one:
        // the shift of the texture is the shift of the mesh, only counted in whole cells
        const dx: number = this.canvas.width * (finitePlaneAbstraction.textureShift.x - finitePlaneAbstraction.orientationOffset.x) / workArea.x;
        // the canvas counts its rows downwards while the world counts them upwards
        const dy: number = -this.canvas.height * (finitePlaneAbstraction.textureShift.y + finitePlaneAbstraction.orientationOffset.y) / workArea.y;

        this.clear();
        this.context.fillStyle = this.repaintData.pattern;
        this.context.setTransform(1, 0, 0, 1, dx, dy);
        this.context.fillRect(-dx, -dy, this.canvas.width, this.canvas.height);
        this.needsUpdate = true;
    }
}

class RepaintData {
    finitePlaneAbstraction: FinitePlaneAbstraction;
    pattern: CanvasPattern;

    constructor(finitePlaneAbstraction: FinitePlaneAbstraction, pattern: CanvasPattern) {
        this.finitePlaneAbstraction = finitePlaneAbstraction;
        this.pattern = pattern;
    }
}