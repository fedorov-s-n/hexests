/**
 * Something shown over the map: what is drawn is not the world itself but what is known about it.
 *
 * An overlay may colour the cells, pin labels to places, and write captions over stretches of the
 * map. It says nothing about how any of that is drawn.
 */
export interface Overlay {
    /** Shown in the panel, beside the switch that turns the overlay on and off. */
    readonly name: string;

    /**
     * The colour a cell is to be tinted with, over whatever the map shows there, or nothing to
     * leave the cell as it is. The zoom is the level the cell belongs to.
     */
    colourOf?(cell: number, zoom: number): string | undefined;

    /** How strongly the colour is laid over the map, from nothing to opaque. */
    readonly opacity?: number;

    /** Labels pinned to cells, in the coordinates of the level they were made for. */
    labels?(): OverlayLabel[];

    /** Words written over a stretch of the map. */
    captions?(): OverlayCaption[];
}

export interface OverlayLabel {
    /** The cell the label is pinned to, and the level that cell belongs to. */
    readonly cell: number;
    readonly zoom: number;
    /** Lines of text; an icon is just a short line of its own. */
    readonly text: string;
    readonly colour?: string;
    readonly background?: string;
}

export interface OverlayCaption {
    /** The cells the caption is written across; the first and the last set its ends. */
    readonly cells: number[];
    readonly zoom: number;
    readonly text: string;
    readonly colour?: string;
}
