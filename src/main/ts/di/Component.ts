let COUNTER = 0;

export function Component(constructor: Function) {
    let name = constructor.name;

    const stack = new Error().stack || console.trace();
    const address = stack?.split('\n')
        ?.find((s: string) => s.match('__decorate'))
        ?.replace(/.*\((.*)\)/, '$1')
        ?.replace(/\.ts:?\d*:?\d*$/, '')
        ?.split(/[/\\]/);
    const index = address?.indexOf('ts');
    if (index && index >= 0 && address && address.length > index + 1 && address[address.length - 1] == name) {
        name = address.slice(index + 1).join('.');
    } else {
        name += '#' + (++COUNTER); // after all, the only name requirement is to be unique
    }

    Reflect.defineMetadata('class:name', name, constructor);
}