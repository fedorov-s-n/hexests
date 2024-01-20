import {HTMLComponent} from "./HTMLComponent";

export class NumberInput extends HTMLComponent {
    private readonly object: any;
    private readonly property: string;

    private label!: HTMLElement;
    private input!: HTMLInputElement;

    constructor(object: any, property: string) {
        super();
        this.object = object;
        this.property = property;
    }

    attach(attachPoint: HTMLElement): void {
        super.attach(attachPoint);
        attachPoint.innerHTML = `
            <div class="ht-number-input">
                <div class="ht-number-input-label">${this.property}</div>
                <input type="number" class="ht-number-input-input"/>
            </div>
        `;
        this.label = this.find(attachPoint, 'ht-number-input-label');
        this.input = this.find(attachPoint, 'ht-number-input-input') as HTMLInputElement;
        this.updateView();
        this.subscribeToEvents(this.input);
    }

    updateView() {
        const value = this.object[this.property];
        const string = value === undefined ? '' : value.toString();
        this.input.value = string;
        this.label.innerText = this.property + ': ' + string;
    }

    updateValue() {
        const string = this.input.value;
        // noinspection UnnecessaryLocalVariableJS
        const value = string ? Number.parseFloat(string) : undefined;
        this.object[this.property] = value;
        this.updateView();
    }

    private handleEvent(event: KeyboardEvent, input: HTMLInputElement) {
        if (event.key === "Enter") {
            this.updateValue();
            input.blur()
            event.stopPropagation();
            event.preventDefault();
            return;
        }
    }

    private subscribeToEvents(input: HTMLInputElement) {
        input.addEventListener("keydown", event => this.handleEvent(event, input));
    }
}
