import {HTMLComponent} from "./HTMLComponent";

export class SingleElementComponent<E extends HTMLElement> extends HTMLComponent {
    public readonly element: E;

    constructor(element: E) {
        super();
        this.element = element;
    }

    attach(attachPoint: HTMLElement) {
        super.attach(attachPoint);
        attachPoint.appendChild(this.element);
    }

    setup(code: (element: E) => void): SingleElementComponent<E> {
        code(this.element);
        return this;
    }
}