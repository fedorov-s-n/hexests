import {HTMLComponent} from "./HTMLComponent";

export class HTMLPair {
    private readonly element: HTMLElement;
    private component: HTMLComponent | undefined;

    constructor(element: HTMLElement) {
        this.element = element;
    }

    static find(root: HTMLElement, className: string): HTMLPair {
        const elements = root.getElementsByClassName(className);
        if (elements.length != 1) {
            throw new Error('Unexpected content of ' + root.outerHTML);
        }
        const element = elements[0];
        if (element instanceof HTMLElement) {
            return new HTMLPair(element);
        } else {
            throw new Error('Not a HTML element: ' + element.outerHTML);
        }
    }

    public getComponent(): HTMLComponent | undefined {
        return this.component;
    }

    public setComponent(component: HTMLComponent | undefined): void {
        if (this.component) this.component.detach();
        this.component = component;
        if (component) component.attach(this.element);
    }
}