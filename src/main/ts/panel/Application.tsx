import * as React from "react";
import {memo, useEffect, useRef} from "react";
import {Panel} from "./Panel";
import {PanelModel} from "./PanelModel";

/**
 * The page: the map on the left, the panel on the right.
 *
 * The map is not React's to draw. Its element is handed over once, three.js keeps the canvas in it,
 * and nothing that happens in the panel ever touches it again.
 */
export function Application({model, start}: { model: PanelModel, start: (container: HTMLElement) => void }) {
    return (
        <div className="ht-application">
            <MapArea start={start}/>
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
