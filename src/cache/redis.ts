import type { CacheAdapter } from '../types';

export type RedisLike = {
    get(key: string): Promise<string | null>;
    setEx?: (key: string, ttl: number, value: string) => Promise<unknown>;
    setex?: (key: string, ttl: number, value: string) => Promise<unknown>;
};

export class RedisCache implements CacheAdapter {
    constructor(private readonly client: RedisLike) {}

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
        if (typeof this.client.setEx === 'function') {
            await this.client.setEx(key, ttlSeconds, value);
            return;
        }
        if (typeof this.client.setex === 'function') {
            await this.client.setex(key, ttlSeconds, value);
            return;
        }
        throw new Error('Redis client must expose setEx or setex');
    }
}


