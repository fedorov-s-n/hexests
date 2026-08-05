import {Component} from "../di/Component";

@Component
export class SettingsStub {
    /** The topmost level is deliberately tiny: every level below it holds seven times more cells. */
    initialRowCount = 2;
    initialColumnCount = 2;
    /** The hierarchy never goes deeper than this; a level draws its corners from the one below. */
    maxZoom = 7;
    /** The level the relief and the water are computed on. */
    generationZoom = 2;
    /** The level shown when the page opens. */
    initialZoom = 3;
    /** The level the colours are painted from: the texture is finer than the cells being drawn. */
    textureZoom = 5;
    /**
     * The window is a hexagon of this many cells around its centre, whatever the level. It decides
     * how much of the world is on the screen as well: the screen is fitted inside the hexagon, so
     * about one and a half times this many cells lie across it, and the count of them drawn grows as
     * the square of it.
     */
    viewRadius = 18;
    /** How much of the window's reach the corner of the screen takes; the rest is a margin. */
    screenFill = 0.95;
    bigTextureSize = 512;
    planeSideSize = 10;
    shiftMultiplier = 10;
}
