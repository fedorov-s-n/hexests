export class TinyStateMachine<T> {
    private _state: T;
    private readonly transitions: StateMachineTransition<T>[];

    constructor(initialState: T) {
        this._state = initialState;
        this.transitions = [];
    }

    transition(from: T, to: T, handler: (args: any) => void): number {
        const id = this.transitions.length;
        this.transitions.push({from: from, to: to, handler: handler});
        return id;
    }

    transit(transitionId: number, ...args: any): boolean {
        const transition = this.transitions[transitionId];
        if (this._state === transition.from) {
            this._state = transition.to;
            transition.handler.apply(null, args);
            return true;
        } else {
            return false;
        }
    }

    get state(): T {
        return this._state;
    }
}

interface StateMachineTransition<T> {
    from: T;
    to: T;
    handler: (args: any) => void;
}