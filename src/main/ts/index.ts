import {DIContainer} from "./di/DIContainer";
import {HexesFieldStartPoint} from "./HexesFieldStartPoint";
import {Random} from "./algorithms/Random";
import {CircusComponent} from "./htmlcomponents/CircusComponent";
import {SingleElementComponent} from "./htmlcomponents/SingleElementComponent";
import {SingleLineComponent} from "./htmlcomponents/SingleLineComponent";
import {CommandCentre} from "./command/CommandCentre";
import {RecentCommandTracker} from "./command/RecentCommandTracker";

const document = window.document;
const container = new DIContainer();
container.put(DIContainer, container);
container.put(Random, new Random());
container.put(Document, document);

const startPoint = container.get(HexesFieldStartPoint);
const commandCentre = container.get(CommandCentre);

const circus = new CircusComponent();
circus.attach(document.body);

circus.right = new SingleElementComponent(document.createElement('div')).setup(right => {
    right.className = 'ht-help-panel';

    const rct = new RecentCommandTracker();
    const onCommand = (command: string) => {
        rct.pushCommand(command);
        rct.resetIndex();
        right.innerText += '\n' + commandCentre.execute(command);
    }
    circus.footer = new SingleLineComponent(document.createElement('input'), onCommand).setup(input => {
        input.className = 'ht-command-line';
        input.placeholder = 'Enter command...';
        rct.subscribeToEvents(input);
    });
});

circus.center = new SingleElementComponent(document.createElement('div')).setup(div => {
    div.className = 'ht-three-js-panel';
    setTimeout(() => startPoint.gogogo(div));
});