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
 * it is off the map, or the level is too coarse to hold it apart -- the label is not shown. A caption
 * is the same thing said larger, so both are worked out the same way.
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
            const at = this.screenPositionsOf([label.cell], label.zoom);
            if (at) labels.push({...at[0], text: label.text, colour: label.colour, background: label.background});
        });

        const captions: PlacedCaption[] = [];
        this.overlays.captions.forEach(caption => {
            const at = this.screenPositionsOf([caption.cell], caption.zoom);
            if (at) captions.push({...at[0], text: caption.text, colour: caption.colour});
        });

        if (this.same(labels, captions)) return;
        this._labels = labels;
        this._captions = captions;
        this.listeners.forEach(listener => listener());
    }

    /**
     * Where a stretch of the world is on the screen, or nothing while the window does not reach the
     * whole of it. The stretch is asked for in one go, so the seam where the map closes on itself
     * cannot tear it in two: it travels, and leaves, as one piece.
     */
    private screenPositionsOf(cells: number[], zoom: number): Array<{ x: number, y: number }> | undefined {
        const layer = this.layerManager.visible;
        const shownZoom = layer.level.zoom;

        this.cells.length = cells.length;
        for (let at = 0; at < cells.length; ++at) {
            this.cells[at] = zoom === shownZoom ? cells[at] : this.levelManager.mapCell(cells[at], zoom, shownZoom);
            this.xs[at] = Number.NaN;
        }
        layer.landGeometry.fillCellsXYZ(this.cells, this.xs, this.ys, this.zs);

        const container = this.scene.container;
        const points: Array<{ x: number, y: number }> = [];
        for (let at = 0; at < cells.length; ++at) {
            if (!Number.isFinite(this.xs[at])) return undefined;
            this.point.set(this.xs[at], this.ys[at], this.zs[at]);
            this.point.project(this.scene.camera);
            if (Math.abs(this.point.x) > 1 || Math.abs(this.point.y) > 1) return undefined;
            points.push({
                x: (this.point.x * 0.5 + 0.5) * container.clientWidth,
                y: (-this.point.y * 0.5 + 0.5) * container.clientHeight
            });
        }
        return points;
    }

    /**
     * Nothing moved at all, so nothing is redrawn. The allowance is a twentieth of a pixel and not a
     * whole one: a name that only moves in whole pixels while the land under it moves smoothly is a
     * name that trembles against the land, which the eye catches at once.
     */
    private same(labels: PlacedLabel[], captions: PlacedCaption[]): boolean {
        if (labels.length !== this._labels.length || captions.length !== this._captions.length) return false;
        const close = (one: { x: number, y: number }, other: { x: number, y: number }) =>
            Math.abs(one.x - other.x) < 0.05 && Math.abs(one.y - other.y) < 0.05;
        return labels.every((label, at) => label.text === this._labels[at].text && close(label, this._labels[at]))
            && captions.every((caption, at) => caption.text === this._captions[at].text
                && close(caption, this._captions[at]));
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
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly colour?: string;
}
