import {HTMLComponent} from "./HTMLComponent";

export class ListComponent extends HTMLComponent {
    private readonly _children = new Array<HTMLComponent>();
    private _horizontal: boolean = false;
    private wrapDiv!: HTMLElement;

    attach(attachPoint: HTMLElement): void {
        super.attach(attachPoint);
        this.wrapDiv = attachPoint.ownerDocument.createElement('div');
        attachPoint.appendChild(this.wrapDiv);
        this.updateClass();
        this._children.forEach(component => this.attach0(component));
    }

    addComponent(component: HTMLComponent) {
        this._children.push(component);
        if (this.wrapDiv) {
            this.attach0(component);
        }
    }

    removeComponent(component: HTMLComponent) {
        const index = this._children.findIndex(c => c === component);
        if (index >= 0) {
            this._children.splice(index, 1);
            this.wrapDiv.children[index].remove();
        }
    }

    get horizontal(): boolean {
        return this._horizontal;
    }

    set horizontal(value: boolean) {
        this._horizontal = value;
        this.updateClass();
    }

    private attach0(component: HTMLComponent) {
        const div = this.wrapDiv.ownerDocument.createElement('div');
        this.wrapDiv.appendChild(div);
        component.attach(div);
    }

    private updateClass() {
        if (this.wrapDiv) {
            this.wrapDiv.className = this._horizontal ? 'ht-horizontal-list-component' : 'ht-vertical-list-component';
        }
    }
}