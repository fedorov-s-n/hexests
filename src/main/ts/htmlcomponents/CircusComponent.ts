import {HTMLComponent} from "./HTMLComponent";
import {HTMLPair} from "./HTMLPair";

export class CircusComponent extends HTMLComponent {
    private _header!: HTMLPair;
    private _left!: HTMLPair;
    private _center!: HTMLPair;
    private _right!: HTMLPair;
    private _footer!: HTMLPair;

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
        this._header = HTMLPair.find(attachPoint, 'ht-circus-header');
        this._left = HTMLPair.find(attachPoint, 'ht-circus-left');
        this._center = HTMLPair.find(attachPoint, 'ht-circus-center');
        this._right = HTMLPair.find(attachPoint, 'ht-circus-right');
        this._footer = HTMLPair.find(attachPoint, 'ht-circus-footer');
    }

    get header(): HTMLComponent | undefined {
        return this._header.getComponent();
    }

    set header(value: HTMLComponent | undefined) {
        this._header.setComponent(value);
    }

    get left(): HTMLComponent | undefined {
        return this._left.getComponent();
    }

    set left(value: HTMLComponent | undefined) {
        this._left.setComponent(value);
    }

    get center(): HTMLComponent | undefined {
        return this._center.getComponent();
    }

    set center(value: HTMLComponent | undefined) {
        this._center.setComponent(value);
    }

    get right(): HTMLComponent | undefined {
        return this._right.getComponent();
    }

    set right(value: HTMLComponent | undefined) {
        this._right.setComponent(value);
    }

    get footer(): HTMLComponent | undefined {
        return this._footer.getComponent();
    }

    set footer(value: HTMLComponent | undefined) {
        this._footer.setComponent(value);
    }
}