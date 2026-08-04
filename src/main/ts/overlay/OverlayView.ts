import {Component} from "../di/Component";
import {OverlayManager} from "./OverlayManager";
import {LevelManager} from "../level/LevelManager";
import {LayerManager} from "../three/LayerManager";
import {SecondScene} from "../three/SecondScene";
import {Vector3} from "three";

/**
 * Where the labels and the captions of the shown overlays are on the screen right now.
 *
 * A label is pinned to a cell of a level of its own; it is followed to the level being looked at
 * and to the place of the window that cell has flowed under. When the window does not reach it --
 * it is off the map, or the level is too coarse to hold it apart -- the label is not shown.
 */
@Component
export class OverlayView {
    private readonly overlays: OverlayManager;
    private readonly levelManager: LevelManager;
    private readonly layerManager: LayerManager;
    private readonly scene: SecondScene;

    private readonly point = new Vector3();
    private readonly cells = [0];
    private readonly xs = [0];
    private readonly ys = [0];
    private readonly zs = [0];

    private _labels: PlacedLabel[] = [];
    private _captions: PlacedCaption[] = [];
    private readonly listeners: Array<() => void> = [];

    constructor(overlays: OverlayManager, levelManager: LevelManager, layerManager: LayerManager,
                scene: SecondScene) {
        this.overlays = overlays;
        this.levelManager = levelManager;
        this.layerManager = layerManager;
        this.scene = scene;
    }

    get labels(): PlacedLabel[] {
        return this._labels;
    }

    get captions(): PlacedCaption[] {
        return this._captions;
    }

    onChange(listener: () => void) {
        this.listeners.push(listener);
    }

    /** Works out where everything is; tells its followers only when something has actually moved. */
    refresh() {
        const labels: PlacedLabel[] = [];
        this.overlays.labels.forEach(label => {
            const at = this.screenPositionOf(label.cell, label.zoom);
            if (at) labels.push({...at, text: label.text, colour: label.colour, background: label.background});
        });

        const captions: PlacedCaption[] = [];
        this.overlays.captions.forEach(caption => {
            const points = caption.cells
                .map(cell => this.screenPositionOf(cell, caption.zoom))
                .filter(point => point) as Array<{ x: number, y: number }>;
            // a caption is written only while the whole stretch it belongs to is on the screen
            if (points.length === caption.cells.length && points.length >= 2) {
                captions.push({points, text: caption.text, colour: caption.colour});
            }
        });

        if (this.same(labels, captions)) return;
        this._labels = labels;
        this._captions = captions;
        this.listeners.forEach(listener => listener());
    }

    private screenPositionOf(cell: number, zoom: number): { x: number, y: number } | undefined {
        const layer = this.layerManager.visible;
        const shownZoom = layer.level.zoom;
        const here = zoom === shownZoom ? cell : this.levelManager.mapCell(cell, zoom, shownZoom);

        this.cells[0] = here;
        this.xs[0] = Number.NaN;
        layer.landGeometry.fillCellsXYZ(this.cells, this.xs, this.ys, this.zs);
        if (!Number.isFinite(this.xs[0])) return undefined;

        this.point.set(this.xs[0], this.ys[0], this.zs[0]);
        this.point.project(this.scene.camera);
        if (Math.abs(this.point.x) > 1 || Math.abs(this.point.y) > 1) return undefined;

        const container = this.scene.container;
        return {
            x: (this.point.x * 0.5 + 0.5) * container.clientWidth,
            y: (-this.point.y * 0.5 + 0.5) * container.clientHeight
        };
    }

    /** A move of less than a pixel is not worth redrawing for. */
    private same(labels: PlacedLabel[], captions: PlacedCaption[]): boolean {
        if (labels.length !== this._labels.length || captions.length !== this._captions.length) return false;
        const close = (one: { x: number, y: number }, other: { x: number, y: number }) =>
            Math.abs(one.x - other.x) < 1 && Math.abs(one.y - other.y) < 1;
        return labels.every((label, at) => label.text === this._labels[at].text && close(label, this._labels[at]))
            && captions.every((caption, at) => caption.text === this._captions[at].text
                && caption.points.every((point, i) => close(point, this._captions[at].points[i])));
    }
}

export interface PlacedLabel {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly colour?: string;
    readonly background?: string;
}

export interface PlacedCaption {
    readonly points: Array<{ x: number, y: number }>;
    readonly text: string;
    readonly colour?: string;
}
