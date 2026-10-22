/** Per-process TTL cache with shared in-flight requests. Failures are never cached. */
export function ttlCache<A extends unknown[], T>(load: (...args: A) => Promise<T>, ttl = 30_000) {
  const entries = new Map<string, { expires: number; value: Promise<T> }>();
  return (...args: A): Promise<T> => {
    const key = JSON.stringify(args);
    const cached = entries.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    if (entries.size >= 250) entries.delete(entries.keys().next().value!);
    const entry = { expires: Infinity, value: Promise.resolve().then(() => load(...args)) };
    entries.set(key, entry);
    entry.value = entry.value.then(value => {
      entry.expires = Date.now() + ttl;
      return value;
    }).catch(error => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    });
    return entry.value;
  };
}

/** One bounded feed entry: coalesces refreshes and preserves the last verified value. */
export function staleFeedCache<T extends { asOf: string; isStale: boolean }>(
  load: () => Promise<T>, seed: T, ttl: () => number,
  now: () => number = Date.now,
) {
  let value = { ...seed, isStale: true };
  let expires = 0;
  let pending: Promise<T> | null = null;
  return (): Promise<T> => {
    if (pending) return pending;
    if (now() < expires) return Promise.resolve(value);
    pending = Promise.resolve().then(load).then(next => {
      value = next;
      expires = now() + ttl();
      return value;
    }).catch(() => {
      value = { ...value, isStale: true };
      expires = now() + 5 * 60_000; // Back off upstream outages without relabelling old data.
      return value;
    }).finally(() => { pending = null; });
    return pending;
  };
}
