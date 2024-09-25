type EventHandler<T> = (data: T) => void;

// Simple pubsub
export class SimpleEventEmitter<T> {
    private handlers: EventHandler<T>[] = [];

    public register(handler: EventHandler<T>): void {
        this.handlers.push(handler);
    }

    public unregister(handler: EventHandler<T>): void {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public emit(data: T): void {
        this.handlers.forEach(handler => handler(data));
    }
}