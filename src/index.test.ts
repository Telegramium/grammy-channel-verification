import type { Context } from 'grammy';
import { describe, expect, it, vi } from 'vitest';
import { createVerifier } from './index';
import type { VerificationFlavor } from './types';

type MockCtx = Context &
    VerificationFlavor & {
        reply: ReturnType<typeof vi.fn>;
        from?: { id: number; is_bot: boolean; first_name: string };
        callbackQuery?: { data?: string };
    };

const createContext = (): MockCtx =>
    ({
        from: { id: 1, is_bot: false, first_name: 'Tester' },
        reply: vi.fn(),
    }) as unknown as MockCtx;

describe('createVerifier', () => {
    it('adds verifyTasks method to context', async () => {
        const checker = { check: vi.fn().mockResolvedValue({ ok: true }) };
        const verifier = await createVerifier({ checker });
        const ctx = createContext();
        const next = vi.fn();

        await verifier(ctx, next);

        expect(next).toHaveBeenCalledOnce();
        expect(typeof ctx.verifyTasks).toBe('function');
    });

    it('verifyTasks returns true for verified users', async () => {
        const checker = { check: vi.fn().mockResolvedValue({ ok: true }) };
        const verifier = await createVerifier({ checker });
        const ctx = createContext();
        const next = vi.fn();

        await verifier(ctx, next);
        const verified = await ctx.verifyTasks();

        expect(verified).toBe(true);
        expect(ctx.verification?.ok).toBe(true);
    });

    it('verifyTasks returns false for unverified users', async () => {
        const mockTask = {
            url: 'https://t.me/test',
            check: vi.fn().mockResolvedValue(false),
        };
        const checker = {
            check: vi.fn().mockResolvedValue({
                ok: false,
                tasks: [mockTask],
            }),
        };
        const verifier = await createVerifier({ checker });
        const ctx = createContext();
        const next = vi.fn();

        await verifier(ctx, next);
        const verified = await ctx.verifyTasks();

        expect(verified).toBe(false);
        expect(ctx.verification?.ok).toBe(false);
    });
});
