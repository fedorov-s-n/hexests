import * as React from "react";
import {memo, useEffect, useRef, useState} from "react";
import {Panel} from "./Panel";
import {PanelModel} from "./PanelModel";
import {Overlays} from "./Overlays";
import {OverlayView} from "../overlay/OverlayView";

/**
 * The page: the map on the left, the panel on the right.
 *
 * The map is not React's to draw. Its element is handed over once, three.js keeps the canvas in it,
 * and nothing that happens in the panel ever touches it again.
 *
 * On a wide screen the panel simply stands beside the map. On a narrow one it stays out of the way,
 * off the bottom of the screen, and slides up over the map only when its button is pressed, so the
 * map keeps the whole viewport until the options are wanted.
 */
export function Application({model, view, start}:
                                { model: PanelModel, view: OverlayView, start: (container: HTMLElement) => void }) {
    const [panelOpen, setPanelOpen] = useState(false);
    return (
        <div className={panelOpen ? "ht-application ht-panel-open" : "ht-application"}>
            <div className="ht-map">
                <MapArea start={start}/>
                <Overlays view={view}/>
            </div>
            <button className="ht-panel-toggle" onClick={() => setPanelOpen(open => !open)}
                    aria-label={panelOpen ? "Hide options" : "Show options"}>
                {panelOpen ? "✕" : "☰"}
            </button>
            <Panel model={model}/>
        </div>
    );
}

const MapArea = memo(function MapArea({start}: { start: (container: HTMLElement) => void }) {
    const container = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        if (started.current || !container.current) return;
        started.current = true;
        start(container.current);
    }, [start]);

    return <div className="ht-three-js-panel" ref={container}/>;
}, () => true);
