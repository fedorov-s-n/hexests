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
    bigTextureSize = 512;
    planeSideSize = 10;
    shiftMultiplier = 10;
}
