import {HTMLComponent} from "./HTMLComponent";

export class CircusComponent extends HTMLComponent {
    private readonly _header = new HTMLPair();
    private readonly _left = new HTMLPair();
    private readonly _center = new HTMLPair();
    private readonly _right = new HTMLPair();
    private readonly _footer = new HTMLPair();

    attach(attachPoint: HTMLElement): void {
        super.attach(attachPoint);
        attachPoint.innerHTML = `
            <div class="ht-circus-vertical">
                <div class="ht-circus-header"></div>
                <div class="ht-circus-horizontal">
                    <div class="ht-circus-left"></div>
                    <div class="ht-circus-center"></div>
                    <div class="ht-circus-right"></div>
                </div>
                <div class="ht-circus-footer"></div>
            </div>
        `;

        const classNames = [
            'ht-circus-header',
            'ht-circus-left',
            'ht-circus-center',
            'ht-circus-right',
            'ht-circus-footer'
        ];

        const pairs = [
            this._header,
            this._left,
            this._center,
            this._right,
            this._footer
        ];

        const elements = classNames.map(className => this.find(attachPoint, className));
        for (let i = 0; i < 5; ++i) {
            pairs[i].element = elements[i];
        }
    }

    private find(root: HTMLElement, className: string): HTMLElement {
        const elements = root.getElementsByClassName(className);
        if (elements.length != 1) {
            throw new Error('Unexpected content of ' + root.outerHTML);
        }
        const element = elements[0];
        if (element instanceof HTMLElement) {
            return element;
        } else {
            throw new Error('Not a HTML element: ' + element.outerHTML);
        }
    }

    get header(): HTMLComponent | undefined {
        return this._header.component;
    }

    set header(value: HTMLComponent | undefined) {
        this._header.component = value;
    }

    get left(): HTMLComponent | undefined {
        return this._left.component;
    }

    set left(value: HTMLComponent | undefined) {
        this._left.component = value;
    }

    get center(): HTMLComponent | undefined {
        return this._center.component;
    }

    set center(value: HTMLComponent | undefined) {
        this._center.component = value;
    }

    get right(): HTMLComponent | undefined {
        return this._right.component;
    }

    set right(value: HTMLComponent | undefined) {
        this._right.component = value;
    }

    get footer(): HTMLComponent | undefined {
        return this._footer.component;
    }

    set footer(value: HTMLComponent | undefined) {
        this._footer.component = value;
    }
}

class HTMLPair {
    private _element: HTMLElement | undefined;
    private _component: HTMLComponent | undefined;

    get element(): HTMLElement | undefined {
        return this._element;
    }

    set element(element: HTMLElement | undefined) {
        this.reattach(element, this._component);
    }

    get component(): HTMLComponent | undefined {
        return this._component;
    }

    set component(component: HTMLComponent | undefined) {
        this.reattach(this._element, component);
    }

    private reattach(element: HTMLElement | undefined, component: HTMLComponent | undefined) {
        if (this._component) this._component.detach();
        this._element = element;
        this._component = component
        if (component && element) component.attach(element);
    }
}