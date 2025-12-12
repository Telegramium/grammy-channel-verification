import { LRUCache } from 'lru-cache';
import type { CacheAdapter } from '../types';

export type MemoryCacheOptions = {
    /** Max entries; defaults to 5000 */
    max?: number;
    /** Default TTL seconds when setex not used (unused here, but kept for compatibility) */
    ttlSeconds?: number;
};

export class MemoryCache implements CacheAdapter {
    private readonly cache: LRUCache<string, string>;

    constructor(options: MemoryCacheOptions = {}) {
        this.cache = new LRUCache<string, string>({
            max: options.max ?? 5000,
            ttl: (options.ttlSeconds ?? 3600) * 1000,
        });
    }

    async get(key: string): Promise<string | null> {
        return this.cache.get(key) ?? null;
    }

    async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
        this.cache.set(key, value, { ttl: ttlSeconds * 1000 });
    }
}


