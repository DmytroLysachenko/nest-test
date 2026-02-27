type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class RunDiagnosticsSummaryCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string) {
    if (this.ttlMs <= 0) {
      return null;
    }

    const hit = this.entries.get(key);
    if (!hit) {
      return null;
    }
    if (hit.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return hit.value;
  }

  set(key: string, value: T) {
    if (this.ttlMs <= 0) {
      return;
    }

    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
