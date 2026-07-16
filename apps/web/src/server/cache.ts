type CacheEntry<T> = {
  value: T;
  updatedAt: number;
  freshUntil: number;
  staleUntil: number;
};

export type CacheValue<T> = {
  value: T;
  updatedAt: number;
  isStale: boolean;
};

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<CacheValue<T>>>();

  constructor(
    private readonly ttlMs: number,
    private readonly staleMs = ttlMs * 3,
    private readonly now: () => number = Date.now
  ) {}

  get(key: string): CacheValue<T> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    const current = this.now();
    if (current > entry.staleUntil) {
      this.entries.delete(key);
      return undefined;
    }
    return { value: entry.value, updatedAt: entry.updatedAt, isStale: current > entry.freshUntil };
  }

  set(key: string, value: T): CacheValue<T> {
    const updatedAt = this.now();
    this.entries.set(key, {
      value,
      updatedAt,
      freshUntil: updatedAt + this.ttlMs,
      staleUntil: updatedAt + this.ttlMs + this.staleMs
    });
    return { value, updatedAt, isStale: false };
  }

  private load(key: string, loader: () => Promise<T>) {
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const request = loader()
      .then((value) => this.set(key, value))
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  async getOrSetWithMetadata(key: string, loader: () => Promise<T>): Promise<CacheValue<T>> {
    const cached = this.get(key);
    if (cached && !cached.isStale) return cached;
    if (cached) {
      void this.load(key, loader).catch(() => undefined);
      return cached;
    }
    return this.load(key, loader);
  }

  async getOrSet(key: string, loader: () => Promise<T>): Promise<T> {
    return (await this.getOrSetWithMetadata(key, loader)).value;
  }

  clear() {
    this.entries.clear();
    this.inFlight.clear();
  }
}
