const COMMANDS_CACHE_SIZE = 20;

export class RecentCommandTracker {
    private index = -1;
    private readonly commandsCache: Array<string> = [];

    public resetIndex() {
        this.index = -1;
    }

    public maybeIncrement(di: number): boolean {
        const newIndex = Math.min(Math.max(this.index + di, -1), this.commandsCache.length - 1);
        if (newIndex === this.index) return false;
        this.index = newIndex;
        return true;
    }

    public pushCommand(command: string) {
        this.commandsCache.unshift(command);
        if (this.commandsCache.length > COMMANDS_CACHE_SIZE) {
            this.commandsCache.length = COMMANDS_CACHE_SIZE;
        }
    }

    public handleEvent(event: KeyboardEvent, input: HTMLInputElement) {
        event.stopPropagation();
        const di = event.key === 'ArrowUp' ? +1 : event.key === 'ArrowDown' ? -1 : 0;
        if (this.maybeIncrement(di)) {
            const value = this.index === -1 ? '' : this.commandsCache[this.index];
            input.value = value;
            setTimeout(() => {
                input.setSelectionRange(value.length, value.length);
                input.focus();
            });
        }
    }

    public subscribeToEvents(input: HTMLInputElement) {
        input.addEventListener("keydown", event => this.handleEvent(event, input));
    }
}
    