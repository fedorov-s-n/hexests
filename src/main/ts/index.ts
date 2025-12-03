import {DIContainer} from "./di/DIContainer";
import {HexesFieldStartPoint} from "./HexesFieldStartPoint";
import {Random} from "./util/Random";
import {CircusComponent} from "./htmlcomponents/CircusComponent";
import {SingleElementComponent} from "./htmlcomponents/SingleElementComponent";
import {CommandCentre} from "./command/CommandCentre";
import {RecentCommandTracker} from "./command/RecentCommandTracker";
import {ListComponent} from "./htmlcomponents/ListComponent";
import {WidgetService} from "./htmlcomponents/WidgetService";

const document = window.document;
const container = new DIContainer();
const commandCentre = new CommandCentre(container);
container.put(DIContainer, container);
container.put(Random, new Random(0.10909179581460537));
container.put(Document, document);
container.put(CommandCentre, commandCentre);

const circus = new CircusComponent();
circus.attach(document.body);

const rightPanel = new CircusComponent();
const headerWidgets = new ListComponent();
const footerWidgets = new ListComponent();
rightPanel.header = headerWidgets;
rightPanel.footer = footerWidgets;
rightPanel.center = new SingleElementComponent(document.createElement('div')).setup(right => {
    right.className = 'ht-help-panel';

    circus.footer = new SingleElementComponent(document.createElement('input')).setup(input => {
        input.className = 'ht-command-line';
        input.placeholder = 'Enter command...';
        new RecentCommandTracker().subscribeToEvents(input, command => {
            right.innerText += '\n' + commandCentre.execute(command);
        });
    });
});

container.put(WidgetService, new WidgetService(headerWidgets, footerWidgets, document));
const startPoint = container.get(HexesFieldStartPoint);
circus.right = rightPanel;
circus.center = new SingleElementComponent(document.createElement('div')).setup(div => {
    div.className = 'ht-three-js-panel';
    setTimeout(() => startPoint.gogogo(div));
});