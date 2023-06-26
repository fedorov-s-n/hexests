import {CanvasTexture, RepeatWrapping, UVMapping} from "three";
import {Shift} from "../fieldmodel/Shift";
import {CellField} from "../fieldmodel/CellField";
import {CellDataDescriptor} from "../fieldmodel/CellDataDescriptor";

export class Texture1 extends CanvasTexture {
    private readonly canvas: HTMLCanvasElement
    private readonly context: CanvasRenderingContext2D
    private canvasAsPattern!: CanvasPattern
    private canvasChanged: boolean = false;

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
        this.canvasChanged = true;
        this.needsUpdate = true;
    }

    loadFrom(cellField: CellField) {
        this.clear();

        const xs = new Array<number>(6);
        const ys = new Array<number>(6);

        const dxs = [-this.canvas.width, 0, +this.canvas.width];
        const dys = [-this.canvas.height, 0, +this.canvas.height];

        const xifs = [false, true, false];
        const yifs = [false, true, false];

        cellField.traversePoints((cellIndex: number, pointId: number, pointOrder: number, xpos: number, ypos: number) => {
            if (pointOrder !== 0) {
                const x = xpos / cellField.getWorkingAreaX() * this.canvas.width;
                const y = (1 - ypos / cellField.getWorkingAreaY()) * this.canvas.height;
                xs[pointOrder - 1] = x;
                ys[pointOrder - 1] = y;
                if (pointOrder === 6) {
                    xifs[0] = Math.max(...xs) > this.canvas.width;
                    xifs[2] = Math.min(...xs) < 0;
                    yifs[0] = Math.max(...ys) > this.canvas.height;
                    yifs[2] = Math.min(...ys) < 0;

                    this.context.fillStyle = cellField.getData(cellIndex, CellDataDescriptor.COLOR) || '#ffffff';

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
            }
        });
        this.repeat.set(1 / cellField.getWorkingAreaX(), 1 / cellField.getWorkingAreaY());
        this.canvasChanged = true;
        this.needsUpdate = true;
    }

    translate(shift: Shift) {
        const dx: number = this.canvas.width * shift.getActualX() / shift.getWorkingAreaX();
        const dy: number = this.canvas.height * shift.getActualY() / shift.getWorkingAreaY();
        if (this.canvasChanged) {
            this.canvasAsPattern = this.context.createPattern(this.canvas, "repeat")!!;
            this.canvasChanged = false;
        }
        this.clear();
        this.context.fillStyle = this.canvasAsPattern;
        this.context.setTransform(1, 0, 0, 1, -dx, dy);
        this.context.fillRect(dx, -dy, this.canvas.width, this.canvas.height);
        this.needsUpdate = true;
    }

    clear() {
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}