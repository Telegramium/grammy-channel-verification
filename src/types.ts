import type { Api, Context } from 'grammy';

export interface Task<C extends Context = Context> {
    url: string;
    check(ctx: C, api: Api): Promise<boolean>;
    resolve?(api?: Api): Promise<void>;
    button?(ctx: C): string;
    alwaysShow?: boolean; // If true, task will be shown in keyboard even if completed
}

export type CheckResult = {
    ok: boolean;
    tasks?: Task[]; // If provided, middleware will show prompt with task buttons
    meta?: Record<string, unknown>;
};

export interface Checker<C extends Context = Context> {
    init?(): Promise<void>;
    check(ctx: C): Promise<CheckResult>;
}

export interface CacheAdapter {
    get(key: string): Promise<string | null>;
    setex(key: string, ttlSeconds: number, value: string): Promise<void>;
}

export type VerificationFlavor = {
    verification?: CheckResult;
    verifyTasks(): Promise<boolean>; // Returns true if verified, false if blocked
};

export type VerificationOptions<C extends Context = Context> = {
    checker: Checker<C>;
    cache?: CacheAdapter;
    cacheTtlSeconds?: number;
    cacheKey?: (ctx: C) => string | null;
    onError?: (error: unknown, ctx: C) => void;
    failOpen?: boolean;
};

export type WithVerificationContext<C extends Context = Context> = C & VerificationFlavor;
