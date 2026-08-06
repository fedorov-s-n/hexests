import 'reflect-metadata';
import {describe, expect, test} from '@jest/globals';
import {ViewState} from "../../../main/ts/three/ViewState";
import {SettingsStub} from "../../../main/ts/util/SettingsStub";

describe('the approach', () => {

    test('opens out no wider than the level it starts at, or the coarsest that fills a large world', () => {
        const settingsStub = new SettingsStub();
        const view = new ViewState(settingsStub);
        const radius = settingsStub.viewRadius;
        const places = 3 * radius * radius + 3 * radius + 1;
        const cells = settingsStub.initialRowCount * settingsStub.initialColumnCount;

        // the coarsest level that still holds enough cells for the window
        let fill = 0;
        while (fill < settingsStub.maxZoom && cells * Math.pow(7, fill) < places) ++fill;

        // as far out as it goes, and then some: the wheel runs into the limit and stays there
        view.zoomBy(-400);

        // it stops at the coarser of where it opens and the coarsest filling level: for a small world
        // that is the starting level, sky and all; for a large one it can be coarser
        const zoom = Math.min(fill, settingsStub.initialZoom);
        expect(view.level).toBe(zoom);
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
        const radius = settingsStub.viewRadius;
        const side = Math.ceil(Math.sqrt(3 * radius * radius + 3 * radius + 1));
        settingsStub.initialRowCount = side;
        settingsStub.initialColumnCount = side;
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
