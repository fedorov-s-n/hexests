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
        let pointCounter = 0;
        this.clear();
        cellField.traversePoints((cellIndex: number, pointId: number, pointOrder: number, xpos: number, ypos: number) => {
            if (pointOrder !== 0) {
                const x = xpos * cellField.getWorkingAreaX() * this.canvas.width;
                const y = ypos * cellField.getWorkingAreaY() * this.canvas.height;
                if (pointCounter === 0) {
                    this.context.beginPath();
                    this.context.moveTo(x, y);
                    this.context.fillStyle = cellField.getData(cellIndex, CellDataDescriptor.COLOR) || '#ffffff';
                } else if (pointCounter === 5) {
                    this.context.lineTo(x, y);
                    this.context.fill();
                } else {
                    this.context.lineTo(x, y);
                }
                pointCounter = (pointCounter + 1) % 6;
            }
        });
        this.repeat.set(1 / cellField.getWorkingAreaX(), 1 / cellField.getWorkingAreaY());
        this.canvasChanged = true;
        this.needsUpdate = true;
    }

    translate(shift: Shift) {
        const dx: number = this.canvas.width * shift.getActualX();
        const dy: number = this.canvas.height * shift.getActualY();
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