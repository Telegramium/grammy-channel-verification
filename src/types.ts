import type { Api, Context } from 'grammy';

export interface Task<C extends Context = Context> {
    /** URL or identifier for the task */
    url: string;
    /** Check if the task is completed. Returns true if completed, false otherwise. */
    check(ctx: C, api: Api): Promise<boolean>;
    /** Optional function to resolve/complete the task programmatically */
    resolve?(api?: Api): Promise<void>;
    /** Function that returns the button text for this task */
    button?(ctx: C): string;
    /** If true, task will be shown in keyboard even if completed. Default: false */
    alwaysShow?: boolean;
}

export type CheckResult = {
    /** Whether the verification check passed (true) or failed (false) */
    ok: boolean;
    /** If provided, middleware will show prompt with task buttons for user to complete */
    tasks?: Task[];
    /** Optional metadata to attach to the verification result */
    meta?: Record<string, unknown>;
};

export interface Checker<C extends Context = Context> {
    /** Optional initialization method called once when the verifier is created */
    init?(): Promise<void>;
    /** Perform the verification check. Returns a CheckResult indicating if verification passed. */
    check(ctx: C): Promise<CheckResult>;
}

export interface CacheAdapter {
    /** Get a value from cache by key. Returns null if not found. */
    get(key: string): Promise<string | null>;
    /** Set a value in cache with TTL (time to live) in seconds */
    setex(key: string, ttlSeconds: number, value: string): Promise<void>;
}

export type VerificationFlavor = {
    /** The current verification result, if available */
    verification?: CheckResult;
    /** Check if user has completed verification tasks. Returns true if verified, false if blocked. */
    verifyTasks(): Promise<boolean>;
};

export type VerificationOptions<C extends Context = Context> = {
    /** The checker implementation that performs the verification */
    checker: Checker<C>;
    /** Optional cache adapter for storing verification results. If not provided, no caching is used. */
    cache?: CacheAdapter;
    /** Seconds to keep cache. Default: 3600 (1 hour) */
    cacheTtlSeconds?: number;
    /** Function to generate cache key from context. Default: `(ctx) => ctx.from ? 'c-verif:' + ctx.from.id : null` */
    cacheKey?: (ctx: C) => string | null;
    /** Error handler callback. Called when verification check fails with an error. */
    onError?: (error: unknown, ctx: C) => void;
    /** If true, allow users through on error (fail-open). If false, block users on error (fail-closed). Default: true */
    failOpen?: boolean;
};

export type WithVerificationContext<C extends Context = Context> = C & VerificationFlavor;
