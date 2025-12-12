import type { Context } from 'grammy';
import type { CheckResult, Checker } from '../types';

type FlyerCheckerOptions = {
    key: string;
    timeoutMs?: number;
    verifyOnInit?: boolean;
    message?: {
        rows?: number;
        text?: string;
        button_bot?: string;
        button_channel?: string;
        button_boost?: string;
        button_url?: string;
        button_fp?: string;
    };
};

type FlyerResponse = {
    skip?: boolean;
    error?: string;
    warning?: string;
    info?: string;
    [key: string]: unknown;
};

type FlyerGetMeResponse = {
    status?: boolean;
    error?: string;
};

export class FlyerChecker<C extends Context = Context> implements Checker<C> {
    private readonly key: string;
    private readonly timeoutMs: number;
    private readonly message?: FlyerCheckerOptions['message'];
    private readonly verifyOnInit: boolean;

    constructor(options: FlyerCheckerOptions) {
        this.key = options.key;
        this.timeoutMs = options.timeoutMs ?? 15000;
        this.message = options.message;
        this.verifyOnInit = options.verifyOnInit ?? true;
    }

    async init(): Promise<void> {
        if (!this.verifyOnInit) return;

        const data = await this.post<FlyerGetMeResponse>(
            'https://api.flyerservice.io/get_me',
            {
                key: this.key,
            },
            this.timeoutMs
        );

        if (data.status !== true) {
            throw new Error(
                data.error ? `Flyer key verification failed: ${data.error}` : 'Flyer key verification failed'
            );
        }
    }

    async check(ctx: C): Promise<CheckResult> {
        if (!ctx.from) {
            return { ok: true };
        }

        try {
            const data = await this.post<FlyerResponse>(
                'https://api.flyerservice.io/check',
                {
                    key: this.key,
                    user_id: ctx.from.id,
                    language_code: ctx.from.language_code,
                    ...(this.message ? { message: this.message } : {}),
                },
                this.timeoutMs
            );
            const ok = data.skip === true;

            return {
                ok,
                // No tasks = Flyer handles its own prompt
                meta: { flyer: data },
            };
        } catch (error) {
            return {
                ok: false,
                // No tasks = no prompt from middleware
                meta: { error: 'flyer_request_failed', details: String(error) },
            };
        }
    }

    private async post<T>(url: string, payload: Record<string, unknown>, timeoutMs: number): Promise<T> {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify(payload),
        });
        return (await response.json()) as T;
    }
}
