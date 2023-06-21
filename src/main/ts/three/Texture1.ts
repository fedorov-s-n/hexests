import {CanvasTexture} from "three";

export class Texture1 extends CanvasTexture {
    private readonly canvas: HTMLCanvasElement
    readonly width: number
    readonly height: number
    private readonly context: CanvasRenderingContext2D
    private pattern!: CanvasPattern

    constructor(canvas: HTMLCanvasElement, width: number, height: number) {
        super(canvas);
        this.canvas = canvas;
        this.width = width;
        this.height = height;

        canvas.height = height;
        canvas.width = width;

        this.context = canvas.getContext('2d')!!;
    }

    paintExample(border: number) {
        this.context.fillStyle = '#ff0000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = '#0000ff';
        this.context.fillRect(border, border, this.canvas.width - 2 * border, this.canvas.height - 2 * border);
    }

    remember() {
        this.pattern = this.context.createPattern(this.canvas, "repeat")!!;
    }

    translate(dx: number, dy: number) {
        this.context.fillStyle = this.pattern;
        this.context.setTransform(1, 0, 0, 1, -dx, dy);                     // translate absolute x
        this.context.fillRect(dx, -dy, this.canvas.width, this.canvas.height);
        this.needsUpdate = true;
    }
}