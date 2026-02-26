type CacheEntry<T> = {
  expiresAtMs: number;
  value: T;
};

export class WorkspaceSummaryCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlSec: number) {}

  get(key: string): T | null {
    if (this.ttlSec <= 0) {
      return null;
    }

    const hit = this.entries.get(key);
    if (!hit) {
      return null;
    }

    if (Date.now() > hit.expiresAtMs) {
      this.entries.delete(key);
      return null;
    }

    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.ttlSec <= 0) {
      return;
    }
    this.entries.set(key, {
      value,
      expiresAtMs: Date.now() + this.ttlSec * 1000,
    });
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }
}

