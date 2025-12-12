import type { Context, MiddlewareFn } from 'grammy';
import {
    type CacheAdapter,
    type CheckResult,
    type Checker,
    type VerificationOptions,
    type WithVerificationContext,
} from './types';
export { MemoryCache } from './cache/memory';
export { RedisCache } from './cache/redis';
export { FlyerChecker } from './checkers/flyer';
export { BotTask, ChannelTask, CustomTask, TaskChecker } from './checkers/tasks';
export { getTranslation, t } from './i18n';
export * from './types';
export type { Task } from './types';

const DEFAULT_TTL_SECONDS = 3600;
const DEFAULT_CACHE_KEY = (ctx: Context) => (ctx.from ? `c-verif:${ctx.from.id}` : null);

type RunCheckResult = { result: CheckResult; fromCache: boolean };

async function runChecker<C extends Context>(checker: Checker<C>, ctx: C): Promise<CheckResult> {
    const result = await checker.check(ctx);
    return {
        ok: result.ok,
        tasks: result.tasks,
        meta: result.meta ?? {},
    };
}

async function tryWithCache<C extends Context>(
    cache: CacheAdapter | undefined,
    cacheKey: string | null,
    ttl: number,
    task: () => Promise<CheckResult>
): Promise<RunCheckResult> {
    if (cache && cacheKey) {
        const cached = await cache.get(cacheKey);
        if (cached === '1') {
            return { result: { ok: true }, fromCache: true };
        }
    }

    const result = await task();

    if (cache && cacheKey && result.ok) {
        await cache.setex(cacheKey, ttl, '1');
    }

    return { result, fromCache: false };
}

export async function createChannelVerification<C extends Context = Context>(
    options: VerificationOptions<C>
): Promise<MiddlewareFn<WithVerificationContext<C>>> {
    const {
        checker,
        cache,
        cacheTtlSeconds = DEFAULT_TTL_SECONDS,
        cacheKey = DEFAULT_CACHE_KEY,
        onError,
        failOpen = true,
    } = options;

    if (checker.init) {
        await checker.init();
    }

    // Return middleware that adds verifyTasks method to context
    return async (ctx: WithVerificationContext<C>, next) => {
        ctx.verifyTasks = async (
            onVerified?: (ctx: WithVerificationContext<C>) => void | Promise<void>
        ): Promise<boolean> => {
            // If already verified in this request, return early
            if (ctx.verification?.ok === true) {
                return true;
            }

            // If no user, return true
            if (!ctx.from) {
                return true;
            }

            try {
                const key = cacheKey(ctx);
                const { result } = await tryWithCache(cache, key, cacheTtlSeconds, () => runChecker(checker, ctx));

                ctx.verification = result;

                if (result.ok) {
                    await onVerified?.(ctx);
                    return true;
                }

                // Checker handles its own prompt via callbacks (e.g., TaskChecker's sendPrompt callback, Flyer handles it)
                return false;
            } catch (error) {
                onError?.(error, ctx);
                if (failOpen) {
                    ctx.verification = { ok: true };
                    return true;
                }
                // Fail-closed: keep user blocked but do not crash
                ctx.verification = {
                    ok: false,
                    meta: { error: 'verification_failed' },
                };
                return false;
            }
        };

        return next();
    };
}
