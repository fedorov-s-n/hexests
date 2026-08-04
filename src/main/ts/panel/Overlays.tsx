import * as React from "react";
import {useEffect, useState} from "react";
import {OverlayView, PlacedCaption} from "../overlay/OverlayView";

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

/** Written along a curve laid through the places it belongs to. */
function Caption({caption}: { caption: PlacedCaption }) {
    const identifier = 'caption-' + caption.text.replace(/\W+/g, '-');
    const points = caption.points;
    const height = Math.max(...points.map(point => point.y)) + 40;
    const width = Math.max(...points.map(point => point.x)) + 40;

    return (
        <svg className="ht-overlay-caption" width={width} height={height}>
            <path id={identifier} d={curveThrough(points)} fill="none"/>
            <text fill={caption.colour || '#ffffff'} stroke="#00000066" strokeWidth={3} paintOrder="stroke">
                <textPath href={'#' + identifier} startOffset="50%" textAnchor="middle">{caption.text}</textPath>
            </text>
        </svg>
    );
}

/** A smooth line through the points, so that the words bend with the land under them. */
function curveThrough(points: Array<{ x: number, y: number }>): string {
    if (points.length < 3) {
        return `M ${points[0].x} ${points[0].y} L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let at = 1; at < points.length - 1; ++at) {
        const middleX = (points[at].x + points[at + 1].x) / 2;
        const middleY = (points[at].y + points[at + 1].y) / 2;
        path += ` Q ${points[at].x} ${points[at].y} ${middleX} ${middleY}`;
    }
    const last = points[points.length - 1];
    return path + ` T ${last.x} ${last.y}`;
}
