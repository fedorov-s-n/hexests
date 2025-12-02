import {DataStorage, DataStorageFactory, MapDataStorageFactory} from "./DataStorageFactory";

export class GraphSearchBuilder<T> {
    private readonly startVertices: T[];
    private readonly traversalSupport: (vertex: T) => T[];
    private childFilters: ((vertex: T) => boolean)[] = [];
    private onEnterFunctions: ((vertex: T) => void)[] = [];
    private onStartFunctions: ((vertex: T) => boolean)[] = [];
    private onFinishFunctions: ((vertex: T) => boolean)[] = [];
    private onExitFunctions: ((vertex: T) => void)[] = [];
    private storageFactory: DataStorageFactory<T> = MapDataStorageFactory.INSTANCE;

    constructor(startVertices: T[], traversalSupport: (vertex: T) => T[]) {
        this.startVertices = startVertices;
        this.traversalSupport = traversalSupport;
    }

    /**
     * This call adds a function.
     * @param callback function that is executed when another vertex is polled
     *                from start collection
     */
    public onEnter(callback: (vertex: T) => void): GraphSearchBuilder<T> {
        this.onEnterFunctions.push(callback);
        return this;
    }

    /**
     * This call adds a function.
     * @param callback function that is executed on enter to vertex
     */
    public onStart(callback: (vertex: T) => void): GraphSearchBuilder<T> {
        this.onStartFunctions.push(vertex => {
            callback(vertex);
            return false;
        });
        return this;
    }

    /**
     * This call adds a function.
     * @param callback function that is executed on exit from vertex
     */
    public onFinish(callback: (vertex: T) => void): GraphSearchBuilder<T> {
        this.onFinishFunctions.push(vertex => {
            callback(vertex);
            return false;
        });
        return this;
    }

    /**
     * This call adds a function.
     * @param callback function that is executed on enter to vertex, should
     *                return true if vertex fits under criteria and should be returned by the
     *                method; false otherwise
     */
    public withOnStartPredicate(callback: (vertex: T) => boolean): GraphSearchBuilder<T> {
        this.onStartFunctions.push(callback);
        return this;
    }

    /**
     * This call adds a function.
     * @param callback function that is executed on exit from vertex, should
     *                 return true if vertex fits under criteria and should be returned by the
     *                 method; false otherwise
     */
    public withOnFinishPredicate(callback: (vertex: T) => boolean): GraphSearchBuilder<T> {
        this.onFinishFunctions.push(callback);
        return this;
    }

    /**
     * This call adds a function.
     * @param callback function that is executed when there are no more vertices
     *               in current sub-traverse
     */
    public onExit(callback: (vertex: T) => void): GraphSearchBuilder<T> {
        this.onExitFunctions.push(callback);
        return this;
    }

    /**
     * This call replaces a helper class.
     * @param storageFactory an object to keep intermediate results.
     * May be overridden for performance gains or when a default one can't handle the key type.
     */
    public withStorageFactory(storageFactory: DataStorageFactory<T>): GraphSearchBuilder<T> {
        this.storageFactory = storageFactory;
        return this;
    }

    /**
     * This call adds a function.
     * @param childFilter a predicate to execute after traversal support returned child vertices.
     */
    public withChildFilter(childFilter: (vertex: T) => boolean): GraphSearchBuilder<T> {
        this.childFilters.push(childFilter);
        return this;
    }

    /**
     * Traverse graph with breadth-first search until the requested vertex is
     * found or there are no nodes to continue scanning.
     *
     * @return the first vertex fitting under onStart or onFinish criteria or
     * undefined if there is no such vertex
     */
    public bfs(): T | undefined {
        const searchStorage: DataStorage<T, Color> = this.storageFactory.createStorage();

        const list: T[] = [];
        for (const vertex of this.startVertices) {
            if (searchStorage.getOrDefault(vertex, Color.WHITE) == Color.WHITE) {
                list.push(vertex);
                searchStorage.putValue(vertex, Color.GRAY);
            }
        }
        const startNodeCount = list.length;

        for (let index = 0; index < list.length; ++index) {
            const vertex: T = list[index];
            if (index < startNodeCount) this.onEnterFunctions.forEach(f => f(vertex));
            if (this.onStartFunctions.some(f => f(vertex))) {
                return vertex;
            }

            const children = this.traversalSupport(vertex);
            for (const child of children) {
                if (!this.childFilters.every(f => f(child))) continue;
                if (searchStorage.getOrDefault(child, Color.WHITE) == Color.WHITE) {
                    list.push(child);
                    searchStorage.putValue(child, Color.GRAY);
                }
            }
        }
        for (let index = list.length - 1; index >= 0; --index) {
            const vertex: T = list[index];
            if (searchStorage.getValue(vertex) !== Color.GRAY) throw new Error('Wrong state');
            if (this.onFinishFunctions.some(f => f(vertex))) {
                return vertex;
            }
            if (index < startNodeCount) this.onExitFunctions.forEach(f => f(vertex));
        }

        return undefined;
    }

    /**
     * Traverse graph with depth-first search until the requested vertex is
     * found or there are no nodes to continue scanning.
     *
     * @return the first vertex fitting under onStart or onFinish criteria or
     * undefined if there is no such vertex
     */
    public dfs(): T | undefined {
        const searchStorage: DataStorage<T, Color> = this.storageFactory.createStorage();
        for (const vertex of this.startVertices) {
            if (searchStorage.getOrDefault(vertex, Color.WHITE) != Color.WHITE) continue;
            this.onEnterFunctions.forEach(f => f(vertex));
            const ret: T | undefined = this.dfs0(vertex, searchStorage);
            this.onExitFunctions.forEach(f => f(vertex));
            if (ret != undefined) return ret;
        }
        return undefined;
    }

    private dfs0(startVertex: T, colors: DataStorage<T, Color>): T | undefined {
        const vertexStack: T[] = [startVertex];
        const childrenStack: T[][] = [this.traversalSupport(startVertex)];
        const indexStack: number[] = [0];
        let stackPointer = 0;
        do {
            const vertex: T = vertexStack[stackPointer];
            const color: Color = colors.getOrDefault(vertex, Color.WHITE);
            switch (color) {
                case Color.WHITE:
                    colors.putValue(vertex, Color.GRAY);
                    if (this.onStartFunctions.some(f => f(vertex))) {
                        return vertex;
                    }
                // noinspection FallThroughInSwitchStatementJS
                case Color.GRAY:
                    let finished: boolean = true;
                    const children: T[] = childrenStack[stackPointer];
                    let index: number = indexStack[stackPointer];
                    for (; index < children.length; ++index) {
                        const child: T = children[index];
                        if (!this.childFilters.every(f => f(child))) continue;
                        indexStack[stackPointer] = index + 1;
                        if (colors.getOrDefault(child, Color.WHITE) == Color.WHITE) {
                            finished = false;
                            vertexStack.push(child);
                            childrenStack.push(this.traversalSupport(child));
                            indexStack.push(0);
                            stackPointer++;
                            break;
                        }
                    }
                    if (finished) {
                        if (this.onFinishFunctions.some(f => f(vertex))) {
                            return vertex;
                        }
                        colors.putValue(vertex, Color.BLACK);
                        vertexStack.pop();
                        childrenStack.pop();
                        indexStack.pop();
                        stackPointer--;
                    }
                    break;
                case Color.BLACK:
                default:
                    throw new Error('Illegal State');
            }
        } while (stackPointer >= 0);

        return undefined;
    }
}

enum Color {
    WHITE,
    GRAY,
    BLACK
}

