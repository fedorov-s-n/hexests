import {SingleElementComponent} from "./SingleElementComponent";

export class SingleLineComponent extends SingleElementComponent<HTMLInputElement> {
    public onEnter: (input: string) => void;

    constructor(element: HTMLInputElement, onEnter: (input: string) => void) {
        super(element);
        this.onEnter = onEnter;
    }

    attach(attachPoint: HTMLElement) {
        super.attach(attachPoint);
        this.element.setAttribute('type', 'text');
        this.element.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.onEnter(this.element.value);
                this.element.value = '';
            }
            event.stopPropagation();
        });
        attachPoint.appendChild(this.element);
    }
}