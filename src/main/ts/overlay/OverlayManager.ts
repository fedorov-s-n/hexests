import {Component} from "../di/Component";
import {Overlay, OverlayCaption, OverlayLabel} from "./Overlay";

/**
 * The overlays there are, and which of them are switched on. Several may be on at once; they are
 * laid over the map in the order they were added.
 */
@Component
export class OverlayManager {
    private readonly overlays: Overlay[] = [];
    private readonly switchedOn = new Set<string>();
    private readonly listeners: Array<(overlay?: Overlay) => void> = [];

    add(overlay: Overlay) {
        this.overlays.push(overlay);
        this.changed(overlay);
    }

    /** Switched on without being asked: an overlay the map opens with. */
    show(overlay: Overlay) {
        if (!this.isOn(overlay)) this.toggle(overlay);
    }

    get all(): ReadonlyArray<Overlay> {
        return this.overlays;
    }

    isOn(overlay: Overlay): boolean {
        return this.switchedOn.has(overlay.name);
    }

    toggle(overlay: Overlay) {
        if (this.switchedOn.has(overlay.name)) this.switchedOn.delete(overlay.name);
        else this.switchedOn.add(overlay.name);
        this.changed(overlay);
    }

    get shown(): Overlay[] {
        return this.overlays.filter(overlay => this.switchedOn.has(overlay.name));
    }

    /** The colour of a cell with every overlay that has something to say laid over the last. */
    colourOf(cell: number, zoom: number, beneath: string): string {
        let colour = beneath;
        for (const overlay of this.shown) {
            const above = overlay.colourOf?.(cell, zoom);
            if (above) colour = blend(colour, above, overlay.opacity === undefined ? 0.55 : overlay.opacity);
        }
        return colour;
    }

    get labels(): OverlayLabel[] {
        return this.shown.flatMap(overlay => overlay.labels?.() || []);
    }

    get captions(): OverlayCaption[] {
        return this.shown.flatMap(overlay => overlay.captions?.() || []);
    }

    /** Anything that draws overlays follows this, and is told which overlay it was that changed. */
    onChange(listener: (overlay?: Overlay) => void) {
        this.listeners.push(listener);
    }

    changed(overlay?: Overlay) {
        this.listeners.forEach(listener => listener(overlay));
    }
}

/** Lays one colour over another; both are written as three or six digits after a hash. */
export function blend(beneath: string, above: string, opacity: number): string {
    const parse = (colour: string): number[] => {
        const digits = colour.replace('#', '');
        const size = digits.length === 3 ? 1 : 2;
        const at = (channel: number) => {
            const part = digits.substr(channel * size, size);
            return Number.parseInt(size === 1 ? part + part : part, 16);
        };
        return [at(0), at(1), at(2)];
    };
    const under = parse(beneath);
    const over = parse(above);
    const mixed = under.map((value, channel) => Math.round(value * (1 - opacity) + over[channel] * opacity));
    return '#' + mixed.map(value => value.toString(16).padStart(2, '0')).join('');
}
