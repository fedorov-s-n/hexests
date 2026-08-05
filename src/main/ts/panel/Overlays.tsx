import * as React from "react";
import {useEffect, useState} from "react";
import {OverlayView, PlacedCaption} from "../overlay/OverlayView";

/**
 * The labels and the captions of the overlays, drawn over the map in plain HTML: text stays sharp
 * that way, and the map below is never touched.
 *
 * Both float over the place they belong to, upright and flat. They are read, not looked at: turning
 * or tilting the camera carries them with the world but leaves the words exactly as they were, so a
 * name is the same name from wherever the world is being looked at.
 */
export function Overlays({view}: { view: OverlayView }) {
    const [, redraw] = useState(0);
    useEffect(() => view.onChange(() => redraw(count => count + 1)), [view]);

    return (
        <div className="ht-overlays">
            {view.captions.map((caption, at) => <Caption key={caption.text + at} caption={caption}/>)}
            {view.labels.map((label, at) => (
                <div className="ht-overlay-label" key={label.text + at}
                     style={{left: label.x, top: label.y, color: label.colour, background: label.background}}>
                    {label.text.split('\n').map((line, lineAt) => <div key={lineAt}>{line}</div>)}
                </div>
            ))}
        </div>
    );
}

/** The size the stylesheet gives a caption; the room the words need is measured against it. */
const CAPTION_FONT_SIZE = 22;
/** A letter is never as wide as it is tall; erring upwards is what keeps every letter on the line. */
const CAPTION_LETTER_WIDTH = 0.7;
/** The line is this much longer than the words, so no letter can fall off either end of it. */
const CAPTION_SLACK = 1.6;
/** How far the middle of the line rises over its ends, as a share of the line: a hint of an arch. */
const CAPTION_ARCH = 0.06;

/**
 * A caption arches a little, for the look of a name written on a map. The arch is the same whatever
 * the world is doing: it is worked out from the words alone, so it never bends with the land, never
 * turns with the camera, and never lays the letters out twice.
 */
function Caption({caption}: { caption: PlacedCaption }) {
    const identifier = 'caption-' + caption.text.replace(/\W+/g, '-');
    const line = caption.text.length * CAPTION_FONT_SIZE * CAPTION_LETTER_WIDTH * CAPTION_SLACK;
    const rise = line * CAPTION_ARCH;
    const width = line + 2 * CAPTION_FONT_SIZE;
    const height = rise + 3 * CAPTION_FONT_SIZE;
    // the words sit at the top of the arch, and that is what has to land on the place named
    const baseline = height / 2 + rise;

    return (
        <svg className="ht-overlay-caption" width={width} height={height}
             style={{left: caption.x, top: caption.y}}>
            <path id={identifier} fill="none"
                  d={`M ${CAPTION_FONT_SIZE} ${baseline}` +
                      ` Q ${width / 2} ${baseline - 2 * rise} ${width - CAPTION_FONT_SIZE} ${baseline}`}/>
            <text fill={caption.colour || '#ffffff'} stroke="#000000aa" strokeWidth={3} paintOrder="stroke">
                <textPath href={'#' + identifier} startOffset="50%" textAnchor="middle">{caption.text}</textPath>
            </text>
        </svg>
    );
}
