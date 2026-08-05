import * as React from "react";
import {useEffect, useState} from "react";
import {OverlayView, PlacedCaption} from "../overlay/OverlayView";
import {curveThrough, reachFor} from "../overlay/CaptionCurve";

/**
 * The labels and the captions of the overlays, drawn over the map in plain HTML: text stays sharp
 * that way, and the map below is never touched.
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

/** Written along a curve laid through the places it belongs to. */
function Caption({caption}: { caption: PlacedCaption }) {
    const identifier = 'caption-' + caption.text.replace(/\W+/g, '-');
    const points = caption.points;
    const reach = reachFor(caption.text, CAPTION_FONT_SIZE);
    const height = Math.max(...points.map(point => point.y)) + reach;
    const width = Math.max(...points.map(point => point.x)) + reach;

    return (
        <svg className="ht-overlay-caption" width={width} height={height}>
            <path id={identifier} d={curveThrough(points, reach)} fill="none"/>
            <text fill={caption.colour || '#ffffff'} stroke="#00000066" strokeWidth={3} paintOrder="stroke">
                <textPath href={'#' + identifier} startOffset="50%" textAnchor="middle">{caption.text}</textPath>
            </text>
        </svg>
    );
}

