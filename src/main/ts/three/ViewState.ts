import {Component} from "../di/Component";
import {SettingsStub} from "../util/SettingsStub";
import {SQRT3, SQRT7} from "../lattice/HexLattice";

/**
 * Where the world is looked at from and how closely: shared by every level, so that switching to a
 * finer or coarser lattice leaves the world itself exactly where it was.
 *
 * The approach is smooth. The level only decides how fine the lattice under the world is, and it is
 * chosen so that a cell keeps about the same size on the screen.
 */
@Component
export class ViewState {
    /** One notch of the wheel; a level apart is sqrt(7), so it takes about twenty of them. */
    private static readonly NOTCH = 1.05;

    private readonly settingsStub: SettingsStub;

    /** How much of the world the plane shows across, in the units of the topmost lattice. */
    worldSpan: number;
    /** The shape of the screen: the window is stretched to it, so nothing of it is wasted. */
    aspect: number = 1;
    /** Where the window looks, as an offset from the middle of the world, in the same units. */
    panX: number = 0;
    panY: number = 0;

    constructor(settingsStub: SettingsStub) {
        this.settingsStub = settingsStub;
        this.worldSpan = this.spanAt(settingsStub.initialZoom);
        if (typeof window !== 'undefined' && window.innerHeight) {
            this.aspect = window.innerWidth / window.innerHeight;
        }
    }

    /** What the window spans when a level fills it with the cells it is meant to hold. */
    spanAt(zoom: number): number {
        return SQRT3 * (2 * this.settingsStub.viewRadius + 1) * Math.pow(SQRT7, -zoom);
    }

    zoomBy(notches: number) {
        const span = this.worldSpan * Math.pow(ViewState.NOTCH, -notches);
        // the deepest level is drawn over its whole range, down to where the next one would begin
        const closest = this.spanAt(this.settingsStub.maxZoom);
        const widest = this.spanAt(0);
        this.worldSpan = Math.max(closest, Math.min(widest, span));
    }

    /** Where the approach stands between the levels; whole numbers are the levels themselves. */
    get fractionalLevel(): number {
        const zoom = 2 * Math.log(this.spanAt(0) / this.worldSpan) / Math.log(7);
        return Math.max(0, Math.min(this.settingsStub.maxZoom, zoom));
    }

    /**
     * The level to draw: the coarser of the two the approach stands between, so its window is never
     * smaller than the screen and there is always ground under the feet.
     */
    get level(): number {
        return Math.floor(this.fractionalLevel + 1e-9);
    }
}
