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
    /** Where the window looks, as an offset from the middle of the world, in the same units. */
    panX: number = 0;
    panY: number = 0;

    constructor(settingsStub: SettingsStub) {
        this.settingsStub = settingsStub;
        this.worldSpan = this.spanAt(settingsStub.initialZoom);
    }

    /** What the window spans when a level fills it with the cells it is meant to hold. */
    spanAt(zoom: number): number {
        return SQRT3 * (2 * this.settingsStub.viewRadius + 1) * Math.pow(SQRT7, -zoom);
    }

    /**
     * The widest the view may open: where the coarsest level that can fill the window stands.
     *
     * The topmost levels hold fewer cells than the window has places -- four of them, and
     * twenty-eight -- and the world is drawn once, gathered around the middle, never repeated around
     * the torus. So opening out that far would leave the whole world a patch in the middle of the
     * screen with sky all around it, and the further out, the smaller the patch. The view stops where
     * the last level that fills the screen stands; the coarser ones are reached by the level
     * correction, which draws them over a view that stays where it is.
     */
    get widestSpan(): number {
        return this.spanAt(this.coarsestFillingZoom);
    }

    /**
     * The coarsest level holding at least as many cells as the window has places. A level with fewer
     * of them cannot fill the window however it is turned; that it has enough is not quite a promise
     * that they reach around the window either, which is the lattice's own business
     * (`FinitePlaneAbstraction.radiusCovering`), but for a world whose sides are of a kind it is one.
     */
    private get coarsestFillingZoom(): number {
        const radius = this.settingsStub.viewRadius;
        const places = 3 * radius * radius + 3 * radius + 1;
        const cells = this.settingsStub.initialRowCount * this.settingsStub.initialColumnCount;
        let zoom = 0;
        while (zoom < this.settingsStub.maxZoom && cells * Math.pow(7, zoom) < places) ++zoom;
        return zoom;
    }

    zoomBy(notches: number) {
        const span = this.worldSpan * Math.pow(ViewState.NOTCH, -notches);
        // the deepest level is drawn over its whole range, down to where the next one would begin
        const closest = this.spanAt(this.settingsStub.maxZoom);
        this.worldSpan = Math.max(closest, Math.min(this.widestSpan, span));
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
