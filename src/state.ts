import type { AppState } from './types';

type Listener = (state: Readonly<AppState>) => void;

export class AppStore {
  private state: AppState;

  private readonly listeners = new Set<Listener>();

  public constructor(initial: AppState) {
    this.state = initial;
  }

  public getState(): Readonly<AppState> {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public set(partial: Partial<AppState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.emit();
  }

  public setBricks(bricks: AppState['bricks']): void {
    this.state = {
      ...this.state,
      bricks,
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
