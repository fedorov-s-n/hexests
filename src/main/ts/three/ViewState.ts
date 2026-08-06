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
    /**
     * Whether the wheel may open out past the coarsest level that still fills the screen. Left alone
     * it may not, and it stops there: the levels above hold fewer cells than the window has places, so
     * they leave the world a patch in the middle with sky all around it. Asked for, the whole range of
     * the hierarchy is there to be turned through, sky and all.
     */
    openWide: boolean = false;

    constructor(settingsStub: SettingsStub) {
        this.settingsStub = settingsStub;
        this.worldSpan = this.spanAt(settingsStub.initialZoom);
    }

    /** What the window spans when a level fills it with the cells it is meant to hold. */
    spanAt(zoom: number): number {
        return SQRT3 * (2 * this.settingsStub.viewRadius + 1) * Math.pow(SQRT7, -zoom);
    }

    /**
     * The widest the view may open: out to the level it starts at, and further, to the coarsest level
     * that still fills the window, when the world is large enough to have one coarser than the start.
     *
     * A wide drawing radius can want more cells than the starting level holds, so opening out to it
     * leaves some sky around the edges; that is allowed -- the view opens no wider than where it
     * starts. The whole range above that, the levels too small to fill however wide the world, is
     * reached by asking for it with `openWide`, which is what that is for.
     */
    get widestSpan(): number {
        return this.spanAt(this.openWide ? 0
            : Math.min(this.coarsestFillingZoom, this.settingsStub.initialZoom));
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
