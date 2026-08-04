import {Component} from "../di/Component";

/**
 * What the panel beside the map holds. The world itself knows nothing about the panel: it fills
 * this model in, and the panel draws whatever is in it.
 */
@Component
export class PanelModel {
    readonly numbers: NumberField[] = [];
    readonly sliders: Slider[] = [];
    readonly toggles: Toggle[] = [];
    readonly buttons: PanelButton[] = [];
    readonly indicators: Indicator[] = [];

    private readonly listeners: Array<() => void> = [];
    private _version: number = 0;

    /** Every number of an object that can be edited by hand, in the order they are declared. */
    addNumberFields(object: any) {
        for (const name in object) {
            if (object.hasOwnProperty(name) && Number.isFinite(object[name])) {
                this.numbers.push(new NumberField(name, object, this));
            }
        }
        this.changed();
    }

    /** Every method of an object that takes no arguments, as a button of its own. */
    addFunctionButtons(object: any, andThen?: () => void) {
        const prototype = Object.getPrototypeOf(object);
        Object.getOwnPropertyNames(prototype).forEach(name => {
            const member = prototype[name];
            if (member instanceof Function && member.length === 0 && name !== 'constructor') {
                this.addButton(name + '()', () => {
                    member.call(object);
                    andThen?.();
                });
            }
        });
    }

    addButton(label: string, press: () => void) {
        this.buttons.push(new PanelButton(label, press, this));
        this.changed();
    }

    /** A value chosen by dragging, shown beside the slider. */
    addSlider(label: string, smallest: number, largest: number, read: () => number,
              write: (value: number) => void) {
        this.sliders.push(new Slider(label, smallest, largest, read, value => {
            write(value);
            this.changed();
        }));
        this.changed();
    }

    /** Something that is either on or off. */
    addToggle(label: string, isOn: () => boolean, toggle: () => void) {
        this.toggles.push(new Toggle(label, isOn, () => {
            toggle();
            this.changed();
        }));
        this.changed();
    }

    /** A line of text the world keeps up to date; returns the way to set it. */
    addIndicator(label: string): (value: string) => void {
        const indicator = new Indicator(label);
        this.indicators.push(indicator);
        this.changed();
        return value => {
            if (indicator.value === value) return;
            indicator.value = value;
            this.changed();
        };
    }

    changed() {
        ++this._version;
        this.listeners.forEach(listener => listener());
    }

    /** For the panel to follow the model without asking every frame. */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.push(listener);
        return () => {
            const at = this.listeners.indexOf(listener);
            if (at >= 0) this.listeners.splice(at, 1);
        };
    };

    version = (): number => this._version;
}

export class Toggle {
    readonly label: string;
    readonly isOn: () => boolean;
    readonly toggle: () => void;

    constructor(label: string, isOn: () => boolean, toggle: () => void) {
        this.label = label;
        this.isOn = isOn;
        this.toggle = toggle;
    }
}

export class Slider {
    readonly label: string;
    readonly smallest: number;
    readonly largest: number;
    readonly read: () => number;
    readonly write: (value: number) => void;

    constructor(label: string, smallest: number, largest: number, read: () => number,
                write: (value: number) => void) {
        this.label = label;
        this.smallest = smallest;
        this.largest = largest;
        this.read = read;
        this.write = write;
    }
}

export class NumberField {
    readonly name: string;
    private readonly object: any;
    private readonly model: PanelModel;

    constructor(name: string, object: any, model: PanelModel) {
        this.name = name;
        this.object = object;
        this.model = model;
    }

    get value(): number {
        return this.object[this.name];
    }

    set value(value: number) {
        this.object[this.name] = value;
        this.model.changed();
    }
}

export class PanelButton {
    readonly label: string;
    private readonly action: () => void;
    private readonly model: PanelModel;

    constructor(label: string, action: () => void, model: PanelModel) {
        this.label = label;
        this.action = action;
        this.model = model;
    }

    press() {
        this.action();
        this.model.changed();
    }
}

export class Indicator {
    readonly label: string;
    value: string = '';

    constructor(label: string) {
        this.label = label;
    }
}
