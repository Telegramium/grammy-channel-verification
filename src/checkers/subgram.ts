import type { Context } from 'grammy';
import { getTranslation } from '../i18n';
import type { CheckResult, Checker, Task } from '../types';
import { TaskChecker } from './tasks';
import { CustomTask } from './tasks/custom';

type SubGramCheckerOptions<C extends Context = Context> = {
    key: string;
    timeoutMs?: number;
    verifyOnInit?: boolean;
    exclude_resource_ids?: number[];
    exclude_ads_ids?: number[];
    max_sponsors?: number;
    /**
     * If true, uses "Get links" mode where you handle prompts manually.
     * If false, uses "Turnkey" mode where SubGram handles prompts automatically.
     * If undefined, the mode is determined automatically from SubGram settings based on API response.
     * Set to true if you haven't shared bot token with SubGram or have "Получать ссылки по API" enabled.
     */
    getLinksMode?: boolean;
    /**
     * Optional callback to send prompt message. If null, uses default implementation.
     * If undefined, uses default implementation.
     */
    sendPrompt?: ((ctx: C, tasks: Task<C>[]) => void | Promise<void>) | null;
    /**
     * Action type for sponsor list management:
     * - "subscribe" (default): List of sponsors is pinned to the user for N amount of time.
     *   Subscription check can be performed by repeated request with the same user_id.
     * - "newtask": List is not pinned. On each new request, the service will reassemble the list of sponsors.
     *   Subscription check is performed through the "Check subscriptions" method.
     * - "task": List is "conditionally" pinned. Sponsors are also remembered in the system, but on repeated
     *   request with the same user_id in case of successful subscription, the list is deleted and on a new
     *   request a new list will be selected. This method is a mixed variant between subscribe and newtask.
     */
    action?: 'subscribe' | 'newtask' | 'task';
};

type SubGramSponsor = {
    id?: number;
    link?: string;
    button_text?: string;
    status?: 'subscribed' | 'unsubscribed';
    available_now?: boolean;
    [key: string]: unknown;
};

type SubGramResponse = {
    status?: 'ok' | 'warning' | 'error';
    code?: number;
    message?: string;
    result?: {
        sponsors?: SubGramSponsor[];
        [key: string]: unknown;
    };
    additional?: {
        sponsors?: SubGramSponsor[];
        [key: string]: unknown;
    };
    error?: string;
};

type SubGramBalanceResponse = {
    status?: string;
    code?: number;
    message?: string;
    balance?: number;
    bots_info?: Array<{
        bot_id?: number;
        bot_username?: string;
        total_followers?: number;
        revenue?: number;
        [key: string]: unknown;
    }>;
    error?: string;
};

export class SubGramChecker<C extends Context = Context> implements Checker<C> {
    private readonly key: string;
    private readonly timeoutMs: number;
    private readonly verifyOnInit: boolean;
    private readonly excludeResourceIds?: number[];
    private readonly excludeAdsIds?: number[];
    private readonly maxSponsors?: number;
    private readonly getLinksMode?: boolean;
    private readonly sendPrompt?: ((ctx: C, tasks: Task<C>[]) => void | Promise<void>) | null;
    private readonly action?: 'subscribe' | 'newtask' | 'task';

    constructor(options: SubGramCheckerOptions<C>) {
        this.key = options.key;
        this.timeoutMs = options.timeoutMs ?? 15000;
        this.verifyOnInit = options.verifyOnInit ?? true;
        this.excludeResourceIds = options.exclude_resource_ids;
        this.excludeAdsIds = options.exclude_ads_ids;
        this.maxSponsors = options.max_sponsors;
        // Don't default to false - keep it undefined if not provided
        // Mode will be determined from API response if undefined
        this.getLinksMode = options.getLinksMode;
        this.sendPrompt = options.sendPrompt;
        this.action = options.action;
    }

    async init(): Promise<void> {
        if (!this.verifyOnInit) return;

        // Verify the API key using the /get-balance endpoint
        // This endpoint requires the API Token, but we can use it to verify token validity
        try {
            const data = await this.post<SubGramBalanceResponse>(
                'https://api.subgram.org/get-balance',
                {},
                this.timeoutMs
            );

            // If we get an authentication error, the key is invalid
            if (data.code === 401 || (data.status === 'error' && data.code === 401)) {
                throw new Error('SubGram API key verification failed: Invalid API key');
            }

            // If status is not ok, consider it a verification failure
            if (data.status === 'error') {
                throw new Error(
                    `SubGram API key verification failed: ${data.message || data.error || 'Unknown error'}`
                );
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('verification failed')) {
                throw error;
            }
            // For other errors (like network issues), we'll allow it to pass
            // The actual check will fail if the key is truly invalid
        }
    }

    async check(ctx: C): Promise<CheckResult> {
        if (!ctx.from) {
            return { ok: true };
        }

        if (!ctx.chat) {
            return { ok: true };
        }

        try {
            const payload: Record<string, unknown> = {
                chat_id: ctx.chat.id,
                user_id: ctx.from.id,
                ...(ctx.from.first_name && { first_name: ctx.from.first_name }),
                ...(ctx.from.username && { username: ctx.from.username }),
                ...(ctx.from.language_code && { language_code: ctx.from.language_code }),
                ...(ctx.from.is_premium !== undefined && { is_premium: ctx.from.is_premium }),
            };

            // Add optional parameters if provided
            if (this.excludeResourceIds && this.excludeResourceIds.length > 0) {
                payload.exclude_resource_ids = this.excludeResourceIds;
            }
            if (this.excludeAdsIds && this.excludeAdsIds.length > 0) {
                payload.exclude_ads_ids = this.excludeAdsIds;
            }
            if (this.maxSponsors !== undefined) {
                payload.max_sponsors = this.maxSponsors;
            }
            if (this.action) {
                payload.action = this.action;
            }

            const data = await this.post<SubGramResponse>(
                'https://api.subgram.org/get-sponsors',
                payload,
                this.timeoutMs
            );

            const status = data.status;

            // Handle error status - allow user through (fail-open)
            if (status === 'error' || data.code !== 200) {
                return {
                    ok: true, // Fail-open: allow user through on error
                    meta: {
                        subgram: data,
                        error: data.error || data.message || 'subgram_request_failed',
                    },
                };
            }

            // Handle warning status - user needs to subscribe
            if (status === 'warning') {
                // Determine mode: use explicit value if provided, otherwise detect from response
                const isGetLinksMode =
                    this.getLinksMode !== undefined
                        ? this.getLinksMode
                        : // If undefined, check if additional.sponsors exists (indicates "get links" mode)
                          data.additional?.sponsors !== undefined;

                if (isGetLinksMode) {
                    // "Get links" mode: we need to return tasks for manual handling
                    const sponsors = data.additional?.sponsors || data.result?.sponsors || [];
                    const tasks = this.createTasksFromSponsors(sponsors);

                    // Call developer's callback to send prompt, or use default implementation
                    if (tasks.length > 0) {
                        if (this.sendPrompt) {
                            // Pass tasks to show in keyboard
                            await this.sendPrompt(ctx, tasks);
                        } else {
                            // Default prompt implementation
                            const t = getTranslation(ctx.from?.language_code);
                            const keyboard = TaskChecker.generateKeyboard(tasks, ctx);
                            const text = t.promptText(tasks.length);

                            await ctx.reply(text, {
                                parse_mode: 'HTML',
                                reply_markup: keyboard,
                            });
                        }
                    }

                    return {
                        ok: false,
                        tasks: tasks.length > 0 ? tasks : undefined,
                        meta: { subgram: data },
                    };
                } else {
                    // "Turnkey" mode: SubGram handles the prompt automatically
                    // Just return ok: false and SubGram will send the message
                    return {
                        ok: false,
                        // No tasks = SubGram handles its own prompt
                        meta: { subgram: data },
                    };
                }
            }

            // Handle ok status or unknown status - allow user through
            return {
                ok: true,
                meta: { subgram: data },
            };
        } catch (error) {
            return {
                ok: false,
                // No tasks = no prompt from middleware
                meta: { error: 'subgram_request_failed', details: String(error) },
            };
        }
    }

    private async post<T>(url: string, payload: Record<string, unknown>, timeoutMs: number): Promise<T> {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Auth: this.key,
            },
            signal: AbortSignal.timeout(timeoutMs),
            body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData: unknown;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText, status: 'error', code: response.status };
            }
            return errorData as T;
        }

        return (await response.json()) as T;
    }

    private createTasksFromSponsors(sponsors: SubGramSponsor[]): Task<C>[] {
        const tasks: Task<C>[] = [];

        for (const sponsor of sponsors) {
            // Only show sponsors that need subscription
            if (sponsor.link && sponsor.available_now && sponsor.status === 'unsubscribed') {
                const buttonText = sponsor.button_text || 'Subscribe';
                const link = sponsor.link;

                tasks.push(
                    new CustomTask<C>({
                        url: link,
                        button: () => buttonText,
                        check: async () => {
                            // In "get links" mode, we can't verify subscriptions automatically
                            // without the bot token. The verification happens when verifyTasks()
                            // is called again (e.g., when user clicks "I've done" button),
                            // which will call SubGram API again to check the current status.
                            // Always return false here - the actual verification is done
                            // by the SubGramChecker.check() method when called again.
                            return false;
                        },
                    })
                );
            }
        }

        return tasks;
    }
}
