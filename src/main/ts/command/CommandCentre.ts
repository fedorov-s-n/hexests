import {Component} from "../di/Component";
import {DIContainer} from "../di/DIContainer";

const COMMANDS_CACHE_SIZE = 20;

@Component
export class CommandCentre {
    private readonly diContainer: DIContainer;
    private readonly commandsCache: Array<string> = [];

    constructor(diContainer: DIContainer) {
        this.diContainer = diContainer;
    }

    public execute(command: string): string {
        this.pushCommand(command);
        const chain = command.split('.');
        if (!chain.length) return 'Empty request';
        let object = this.diContainer.getIfExists(chain[0]);
        if (!object) return 'No component for ' + chain[0];

        for (let i = 1; i < chain.length; ++i) {
            const regex = /^([a-zA-Z0-9]*)(\(([a-zA-Z0-9]*(,\s*[a-zA-Z0-9]*)*)\))?$/;
            const regExpArray = regex.exec(chain[i]);
            if (!regExpArray) return 'Unrecognized call ' + chain[i];
            if (!object) return 'NPE calling null.' + chain[i];
            if (regExpArray[0] === 'log()') {
                console.log(object);
                return 'Logged ' + this.formatObject(object);
            }
            const member = object[regExpArray[1]];
            if (!member) return 'No member for ' + chain[i];

            if (!regExpArray[2]) {
                object = member;
            } else if (member instanceof Function) {
                const numberRegex = /^([0-9]*)$/;
                const argsMatch = regExpArray[3].split(',');
                const args = [];
                for (let j = 0; j < argsMatch.length; ++j) {
                    const argMatch = argsMatch[j];
                    if (!argMatch || !argMatch.length) break;
                    args.push(numberRegex.test(argMatch) ? parseInt(argMatch) : argMatch);
                }
                object = (member as Function).apply(object, args);
            } else {
                return 'Cannot handle ' + chain[i];
            }
        }

        return command + ' >> ' + this.formatObject(object);
    }

    private pushCommand(command: string) {
        this.commandsCache.unshift(command);
        if (this.commandsCache.length > COMMANDS_CACHE_SIZE) {
            this.commandsCache.length = COMMANDS_CACHE_SIZE;
        }
    }

    public getRecentCommands(): string[] {
        return this.commandsCache;
    }

    private formatObject(object: any): string {
        return object != null && typeof object === 'object' ? object?.constructor?.name || '{}' : '' + object;
    }
}