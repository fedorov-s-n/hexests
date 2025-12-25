import {TinyStateMachine} from "../util/TinyStateMachine";
import {HTMLComponent} from "./HTMLComponent";
import {Point2d} from "../util/Point2d";

enum TooltipState {
    HIDDEN,
    SHOWING,
    SHOWN,
    HIDING,
}

export class Tooltip<T> extends HTMLComponent {
    private static readonly TOOLTIP_OVERFLOW_KEYS: Record<string, boolean> = {
        auto: true,
        clip: true,
        hidden: true,
        overlay: true,
        scroll: true
    };
    private static readonly SCROLLBAR_WIDTH = 15; // approximately
    private static readonly DISTANCE_TO_BUBBLE = 20;
    private static readonly DEFAULT_DELAY_IN = 150; // to avoid flickering when you don't stop the mouse
    private static readonly DEFAULT_DELAY_OUT = 300; // it's enough to hover over the tooltip

    private static readonly ON_EVENTS = 'mouseenter focus';
    private static readonly OFF_EVENTS = 'mouseleave blur';

    private static readonly MIN_WIDTH = 40;
    private static readonly MIN_HEIGHT = 20;
    private static readonly MAX_WIDTH = 500;
    private static readonly MAX_HEIGHT = 300;

    private readonly minWidth: number;
    private readonly minHeight: number;
    private readonly maxWidth: number;
    private readonly maxHeight: number;

    private readonly enterElement: (e?: Event) => void;
    private readonly leaveElement: (e?: Event) => void;
    private readonly enterTooltip: (e?: Event) => void;
    private readonly leaveTooltip: (e?: Event) => void;
    private readonly enterPointListener: ((e: Event) => void) | undefined;
    private readonly leavePointListener: ((e: Event) => void) | undefined;

    private tooltip!: HTMLElement;
    private tooltipContent!: HTMLElement;
    private xLimitingParent!: HTMLElement;
    private yLimitingParent!: HTMLElement;

    private readonly top = (element: HTMLElement) => element.offsetTop || 0;
    private readonly bottom = (element: HTMLElement) => this.top(element) + this.height(element);
    private readonly left = (element: HTMLElement) => element.offsetLeft || 0;
    private readonly right = (element: HTMLElement) => this.left(element) + this.width(element);
    private readonly width = (element: HTMLElement) => element.clientWidth || 0;
    private readonly height = (element: HTMLElement) => element.clientHeight || 0;

    private readonly contentGetter: (element: T) => string;
    private readonly positionGetter: (element: T) => Point2d;

    private timeoutId: number | undefined;
    private _element: T | undefined;
    private readonly stateMachine: TinyStateMachine<TooltipState>;

    constructor(contentGetter: (element: T) => string, positionGetter: (element: T) => Point2d,
                handlePointEvent: ((e: PointerEvent) => T | undefined) | undefined = undefined,
                maxWidth: number = Tooltip.MAX_WIDTH, maxHeight: number = Tooltip.MAX_HEIGHT,
                minWidth: number = Tooltip.MIN_WIDTH, minHeight: number = Tooltip.MIN_HEIGHT,
                delayIn: number = Tooltip.DEFAULT_DELAY_IN, delayOut: number = Tooltip.DEFAULT_DELAY_OUT) {
        super();
        this.contentGetter = contentGetter;
        this.positionGetter = positionGetter;
        this.minWidth = minWidth;
        this.minHeight = minHeight;
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;

        // State machine graph:
        // showing < = > hidden
        //    ||           ^
        //    V           ||
        // shown  < = > hiding
        const sm = new TinyStateMachine(TooltipState.HIDDEN);
        const showingToShown = sm.transition(TooltipState.SHOWING, TooltipState.SHOWN, () => this.show());
        const hiddenToShowing = sm.transition(TooltipState.HIDDEN, TooltipState.SHOWING, () => {
            this.timeoutId = window.setTimeout(() => sm.transit(showingToShown), delayIn);
        });
        const showingToHidden = sm.transition(TooltipState.SHOWING, TooltipState.HIDDEN, () => this.hide());
        const hidingToHidden = sm.transition(TooltipState.HIDING, TooltipState.HIDDEN, () => this.hide());
        const shownToHiding = sm.transition(TooltipState.SHOWN, TooltipState.HIDING, () => {
            this.timeoutId = window.setTimeout(() => sm.transit(hidingToHidden), delayOut);
        });
        const hidingToShown = sm.transition(TooltipState.HIDING, TooltipState.SHOWN, () => this.show());

        this.enterElement = (e) => sm.transit(hiddenToShowing) || sm.transit(hidingToShown) || this.logIllegalState(e);
        this.leaveElement = (e) => sm.transit(showingToHidden) || sm.transit(shownToHiding) || this.logIllegalState(e);
        this.enterTooltip = e => sm.transit(hidingToShown) || this.logIllegalState(e);
        this.leaveTooltip = e => sm.transit(shownToHiding) || this.logIllegalState(e);

        this.enterPointListener = !handlePointEvent ? undefined : e => {
            if (e instanceof PointerEvent) {
                this.setElement(handlePointEvent!!(e), e, true);
            }
        };
        this.leavePointListener = !handlePointEvent ? undefined : e => {
            if (e instanceof PointerEvent) {
                if (handlePointEvent!!(e)) {
                    this.leaveElement(e);
                }
            }
        };
        this.stateMachine = sm;
    }

    static createForHTML(contentGetter: (element: HTMLElement) => string) {
        return new Tooltip<HTMLElement>(contentGetter, e => {
            const x = Math.round(e.offsetLeft + e.clientWidth / 2);
            const y = e.offsetTop;
            return new Point2d(x, y);
        }, e => {
            const element = document.elementFromPoint(e.clientX, e.clientY);
            return element instanceof HTMLElement ? element : undefined;
        })
    }

    attach(attachPoint: HTMLElement) {
        super.attach(attachPoint);

        attachPoint.insertAdjacentHTML('beforeend', `
            <div class="ht-tooltip-body">
                <div class="ht-tooltip-content">
                </div>
            </div>
        `);

        this.tooltip = this.find(attachPoint, 'ht-tooltip-body');
        this.tooltipContent = this.find(attachPoint, 'ht-tooltip-content');
        this.xLimitingParent = this.limitingParent(this.tooltip, 'overflow-x');
        this.yLimitingParent = this.limitingParent(this.tooltip, 'overflow-y');

        this.enterPointListener && attachPoint.addEventListener(Tooltip.ON_EVENTS, this.enterPointListener);
        this.leavePointListener && attachPoint.addEventListener(Tooltip.OFF_EVENTS, this.leavePointListener);
        this.tooltip.addEventListener(Tooltip.ON_EVENTS, (e: Event) => this.enterTooltip(e));
        this.tooltip.addEventListener(Tooltip.OFF_EVENTS, (e: Event) => this.leaveTooltip(e));
    }

    detach() {
        super.detach();
        this.enterPointListener && this.attachPoint!!.removeEventListener(Tooltip.ON_EVENTS, this.enterPointListener);
        this.leavePointListener && this.attachPoint!!.removeEventListener(Tooltip.OFF_EVENTS, this.leavePointListener);
    }

    private show() {
        const element = this._element;
        if (!element) {
            this.hide();
            return;
        }
        const content = this.contentGetter(element);
        if (!content) {
            this.hide();
            return;
        }

        this.tooltipContent.innerHTML = content;
        this.tooltip.style.setProperty('display', 'block');

        const position = this.positionGetter(element);
        const width = Math.max(this.minWidth, Math.min(this.maxWidth, this.width(this.tooltip) + Tooltip.SCROLLBAR_WIDTH));
        const height = Math.max(this.minWidth, Math.min(this.maxHeight, this.height(this.tooltip)));

        const leftLimit = this.left(this.xLimitingParent);
        const rightLimit = this.right(this.xLimitingParent);
        let leftPosition = Math.max(leftLimit, position.x - width / 2);
        let rightPosition = Math.min(rightLimit, leftPosition + width);
        leftPosition = Math.max(leftLimit, rightPosition - width);
        const correctedWidth = Math.max(this.minWidth, rightPosition - leftPosition);

        const topLimit = this.top(this.yLimitingParent);
        let bottomPosition = Math.max(topLimit, position.y - Tooltip.DISTANCE_TO_BUBBLE);
        let topPosition = Math.max(topLimit, bottomPosition - height);
        const correctedHeight = Math.max(this.minHeight, topPosition - bottomPosition);
        topPosition = bottomPosition - correctedHeight; // intended
        const trianglePosition = position.x - leftPosition;

        this.tooltip.style.setProperty('left', `${leftPosition}px`);
        this.tooltip.style.setProperty('top', `${topPosition}px`);
        this.tooltip.style.setProperty('--ht-tooltip-triangle-position', `${trianglePosition}px`);
        this.tooltipContent.style.setProperty('max-width', `${correctedWidth}px`);
        this.tooltipContent.style.setProperty('max-height', `${correctedHeight}px`);
    }

    private hide(): void {
        this.clearTimeout();
        this.tooltip.style.removeProperty('display');
        this.tooltipContent.innerHTML = '';
        this._element = undefined;
    }

    get element(): T | undefined {
        return this._element;
    }

    set element(value: T | undefined) {
        this.setElement(value);
    }

    setElement(value: T | undefined, event?: Event, skipOnUndefined?: boolean) {
        if (skipOnUndefined && value === undefined) {
            return;
        }
        this._element = value;

        if (value === undefined) {
            if (this.stateMachine.state !== TooltipState.HIDDEN) {
                this.leaveElement(event);
            }
        } else {
            if (this.stateMachine.state === TooltipState.SHOWN) {
                this.show();
            } else {
                this.enterElement(event);
            }
        }
    }

    private limitingParent(tooltip: HTMLElement, property: string): HTMLElement {
        let lastElement: HTMLElement = tooltip;
        for (let element: HTMLElement | null | undefined = tooltip; element; element = element?.parentElement) {
            const cssValue: string = window.getComputedStyle(element).getPropertyValue(property);
            const v = !!cssValue && Tooltip.TOOLTIP_OVERFLOW_KEYS[cssValue];
            if (v) return element;
            lastElement = element;
        }
        return lastElement;
    }

    private logIllegalState(e?: Event): void {
        // console.log(`Cannot transit to another state from "${this.stateMachine.state}" on ${e?.type}`);
    }

    private clearTimeout() {
        clearTimeout(this.timeoutId);
        this.timeoutId = undefined;
    }
}