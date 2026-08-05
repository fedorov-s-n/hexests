import 'reflect-metadata';
import {describe, expect, test} from '@jest/globals';
import {ViewState} from "../../../main/ts/three/ViewState";
import {SettingsStub} from "../../../main/ts/util/SettingsStub";

describe('the approach', () => {

    test('never opens wider than the coarsest level that can fill the window', () => {
        const settingsStub = new SettingsStub();
        const view = new ViewState(settingsStub);
        const radius = settingsStub.viewRadius;
        const places = 3 * radius * radius + 3 * radius + 1;
        const cells = settingsStub.initialRowCount * settingsStub.initialColumnCount;

        // as far out as it goes, and then some: the wheel runs into the limit and stays there
        view.zoomBy(-400);

        // the level it stops at holds enough cells for the window, and the one above it does not, so
        // this is the widest view with no sky around the world
        const zoom = view.level;
        expect(cells * Math.pow(7, zoom)).toBeGreaterThanOrEqual(places);
        expect(cells * Math.pow(7, zoom - 1)).toBeLessThan(places);
        expect(view.worldSpan).toBeCloseTo(view.spanAt(zoom), 9);
    });

    test('opens out at once to the widest it may go, since that is where it starts', () => {
        const settingsStub = new SettingsStub();
        const view = new ViewState(settingsStub);

        expect(view.worldSpan).toBeCloseTo(view.spanAt(settingsStub.initialZoom), 9);
        expect(view.worldSpan).toBeLessThanOrEqual(view.widestSpan + 1e-9);
    });

    test('opens as wide as the topmost level over a world large enough to fill the window', () => {
        const settingsStub = new SettingsStub();
        // a world whose topmost level already holds more cells than the window has places
        settingsStub.initialRowCount = 40;
        settingsStub.initialColumnCount = 40;
        const view = new ViewState(settingsStub);

        view.zoomBy(-400);

        expect(view.worldSpan).toBeCloseTo(view.spanAt(0), 9);
    });

    test('closes no further in than the deepest level of the hierarchy', () => {
        const settingsStub = new SettingsStub();
        const view = new ViewState(settingsStub);

        view.zoomBy(400);

        expect(view.worldSpan).toBeCloseTo(view.spanAt(settingsStub.maxZoom), 9);
        expect(view.fractionalLevel).toBeCloseTo(settingsStub.maxZoom, 9);
    });
});
