import {Component} from "../di/Component";
import {DIContainer} from "../di/DIContainer";


@Component
export class CommandCentre {
    private readonly diContainer: DIContainer;

    constructor(diContainer: DIContainer) {
        this.diContainer = diContainer;
    }

    public execute(command: string): string {
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
            if (regExpArray[1] === 'set') {
                const args = this.parseArgs(regExpArray[3])
                object[args[0]] = args[1];
                return 'Set: ' + this.formatObject(object) + '.' + args[0] + ' = ' + args[1];
            }
            const member = object[regExpArray[1]];
            if (!member) return 'No member for ' + chain[i];

            if (!regExpArray[2]) {
                object = member;
            } else if (member instanceof Function) {
                object = (member as Function).apply(object, this.parseArgs(regExpArray[3]));
            } else {
                return 'Cannot handle ' + chain[i];
            }
        }

        return command + ' >> ' + this.formatObject(object);
    }

    private parseArgs(input: string): any[] {
        const numberRegex = /^([0-9]*)$/;
        const argsMatch = input.split(',');
        const args = [];
        for (let j = 0; j < argsMatch.length; ++j) {
            const argMatch = argsMatch[j];
            if (!argMatch || !argMatch.length) break;
            args.push(numberRegex.test(argMatch) ? parseInt(argMatch) : argMatch);
        }
        return args;
    }

    private formatObject(object: any): string {
        return object != null && typeof object === 'object' ? object?.constructor?.name || '{}' : '' + object;
    }
}