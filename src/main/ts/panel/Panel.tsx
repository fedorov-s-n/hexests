import * as React from "react";
import {useSyncExternalStore} from "react";
import {NumberField, PanelModel} from "./PanelModel";

/**
 * The panel beside the map: the numbers that can be edited, the buttons, and the lines the world
 * keeps up to date. It follows the model and redraws only when the model says something changed.
 */
export function Panel({model}: { model: PanelModel }) {
    useSyncExternalStore(model.subscribe, model.version);

    return (
        <div className="ht-panel">
            <div className="ht-panel-numbers">
                {model.numbers.map(field => <NumberEditor key={field.name} field={field}/>)}
            </div>
            <div className="ht-panel-indicators">
                {model.indicators.map(indicator => (
                    <div className="ht-panel-indicator" key={indicator.label}>
                        {indicator.label}: {indicator.value}
                    </div>
                ))}
            </div>
            <div className="ht-panel-buttons">
                {model.buttons.map(button => (
                    <button key={button.label} onClick={() => button.press()}>{button.label}</button>
                ))}
            </div>
        </div>
    );
}

/** A number is taken when it is typed in full: on Enter, or when the field is left. */
function NumberEditor({field}: { field: NumberField }) {
    const [typed, setTyped] = React.useState<string | null>(null);
    const shown = typed !== null ? typed : String(field.value);

    const commit = () => {
        if (typed === null) return;
        const value = Number.parseFloat(typed);
        if (Number.isFinite(value)) field.value = value;
        setTyped(null);
    };

    return (
        <label className="ht-number-input">
            <span className="ht-number-input-label">{field.name}: {field.value}</span>
            <input type="number" className="ht-number-input-input" value={shown}
                   onChange={event => setTyped(event.target.value)}
                   onBlur={commit}
                   onKeyDown={event => {
                       if (event.key === 'Enter') {
                           commit();
                           (event.target as HTMLInputElement).blur();
                       }
                   }}/>
        </label>
    );
}
