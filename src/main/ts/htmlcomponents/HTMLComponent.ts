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
}

