/**
 * A tiny read-through cache with a time-to-live. Used for facts that are read on every request but change rarely
 * (an organisation's status), so a database lookup per request is avoided without making changes wait long to apply.
 *
 * Concurrent lookups for the same key share one in-flight load. A failed load is NOT cached.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>()
  private readonly inflight = new Map<string, Promise<V>>()

  constructor(
    private readonly load: (key: string) => Promise<V>,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async get(key: string): Promise<V> {
    const hit = this.entries.get(key)
    if (hit && hit.expiresAt > this.now()) return hit.value

    const pending = this.inflight.get(key)
    if (pending) return pending

    const p = this.load(key)
      .then((value) => {
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs })
        return value
      })
      .finally(() => this.inflight.delete(key))
    this.inflight.set(key, p)
    return p
  }

  /** Drop one entry (or everything), e.g. right after the value is known to have changed. */
  invalidate(key?: string): void {
    if (key === undefined) this.entries.clear()
    else this.entries.delete(key)
  }
}
