export class HTMLComponent {
    private attachPoint: HTMLElement | undefined;

    public attach(attachPoint: HTMLElement): void {
        this.attachPoint = attachPoint;
    }

    public detach(): void {
        if (!this.attachPoint) return;
        const children = this.attachPoint.children;
        for (let i = 0; i < children.length; ++i) {
            this.attachPoint.removeChild(children[i]);
        }
        this.attachPoint = undefined;
    }
    
    protected find(root: HTMLElement, className: string): HTMLElement {
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
}

