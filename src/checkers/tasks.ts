import { InlineKeyboard, type Api, type Context } from 'grammy';
import type { Chat } from 'grammy/types';
import { getTranslation } from '../i18n';
import type { CheckResult, Checker, Task } from '../types';

export class ChannelTask<C extends Context = Context> implements Task<C> {
    public url: string;
    public alwaysShow?: boolean;
    private readonly id: number | string;
    private readonly buttonFn?: (ctx: C) => string;
    private resolved: boolean = false;

    constructor(options: { id: number | string; url?: string; button?: (ctx: C) => string; alwaysShow?: boolean }) {
        this.id = options.id;
        this.url = options.url ?? '';
        this.buttonFn = options.button;
        this.alwaysShow = options.alwaysShow;
        this.resolved = !!options.url;
    }

    button(ctx: C): string {
        if (this.buttonFn) {
            return this.buttonFn(ctx);
        }
        const t = getTranslation(ctx.from?.language_code);
        return t.buttonLabelChannel;
    }

    async resolve(api?: Api): Promise<void> {
        if (this.resolved) {
            return; // Already resolved
        }

        if (!api) {
            if (!this.url) {
                throw new Error(`Channel task ${String(this.id)} requires url or an api instance to resolve it`);
            }
            this.resolved = true;
            return;
        }

        const chat = (await api.getChat(this.id)) as Chat;
        if (!('title' in chat)) {
            throw new Error(`Chat ${String(this.id)} is not a channel`);
        }

        const resolvedUrl =
            this.url ||
            (chat as { invite_link?: string }).invite_link ||
            (chat.username ? `https://t.me/${chat.username}` : undefined);

        if (!resolvedUrl) {
            throw new Error(`Chat ${String(this.id)} has no invite link and no username`);
        }

        this.url = resolvedUrl;
        this.resolved = true;
    }

    async check(ctx: C, api: Api): Promise<boolean> {
        if (!ctx.from) {
            return true;
        }
        const member = await api.getChatMember(this.id, ctx.from.id);
        return member.status !== 'left';
    }
}

export class BotTask<C extends Context = Context> implements Task<C> {
    public url: string;
    public alwaysShow?: boolean;
    private readonly username: string;
    private readonly api?: Api;
    private readonly buttonFn?: (ctx: C) => string;

    constructor(options: {
        username: string;
        url?: string;
        api?: Api;
        button?: (ctx: C) => string;
        alwaysShow?: boolean;
    }) {
        this.username = options.username;
        this.url = options.url || `https://t.me/${options.username}`;
        this.api = options.api;
        this.buttonFn = options.button;
        this.alwaysShow = options.alwaysShow;
    }

    button(ctx: C): string {
        if (this.buttonFn) {
            return this.buttonFn(ctx);
        }
        const t = getTranslation(ctx.from?.language_code);
        return t.buttonLabelBot;
    }

    async check(ctx: C, api: Api): Promise<boolean> {
        // If no api, just show button (skip check)
        if (!this.api) {
            return true;
        }

        if (!ctx.from) {
            return true;
        }

        try {
            // Check if user has started the bot by trying to send a chat action
            // If the user has started the bot, we can send actions to their chat
            // If they haven't, it will throw an error
            await this.api.sendChatAction(ctx.from.id, 'typing');
            return true; // User has started the bot
        } catch {
            // If sendChatAction fails, user hasn't started the bot
            return false;
        }
    }
}

export class CustomTask<C extends Context = Context> implements Task<C> {
    public url: string;
    public alwaysShow?: boolean;
    private readonly checkFn: (ctx: C) => Promise<boolean>;
    private readonly buttonFn?: (ctx: C) => string;

    constructor(options: {
        url: string;
        check: (ctx: C) => Promise<boolean>;
        button?: (ctx: C) => string;
        alwaysShow?: boolean;
    }) {
        this.url = options.url;
        this.checkFn = options.check;
        this.buttonFn = options.button;
        this.alwaysShow = options.alwaysShow;
    }

    button(ctx: C): string {
        if (this.buttonFn) {
            return this.buttonFn(ctx);
        }
        const t = getTranslation(ctx.from?.language_code);
        return t.buttonLabelChannel; // Fallback to channel label
    }

    async check(ctx: C, api: Api): Promise<boolean> {
        return await this.checkFn(ctx);
    }
}

type TaskCheckerOptions<C extends Context = Context> = {
    tasks: Task<C>[];
    api?: Api;
    sendPrompt?: ((ctx: C, tasks: Task<C>[]) => void | Promise<void>) | null; // Optional callback to send prompt message. If null, uses default implementation
};

export class TaskChecker<C extends Context = Context> implements Checker<C> {
    private readonly inputs: Task<C>[];
    private readonly providedApi?: Api;
    private readonly sendPrompt?: ((ctx: C, tasks: Task<C>[]) => void | Promise<void>) | null;
    private tasks: Task<C>[] = [];

    /**
     * Get all tasks
     */
    getTasks(): ReadonlyArray<Task<C>> {
        return this.tasks;
    }

    /**
     * Add a task
     */
    async addTask(task: Task<C>): Promise<void> {
        // Resolve task if needed
        if (task.resolve) {
            await task.resolve(this.providedApi);
        }

        this.tasks.push(task);
    }

    /**
     * Remove a task by URL
     */
    removeTask(url: string): boolean {
        const index = this.tasks.findIndex((t) => t.url === url);
        if (index === -1) {
            return false;
        }
        this.tasks.splice(index, 1);
        return true;
    }

    /**
     * Clear all tasks
     */
    clearTasks(): void {
        this.tasks = [];
    }

    /**
     * Set all tasks. Replaces existing tasks.
     */
    async setTasks(tasks: Task<C>[]): Promise<void> {
        this.tasks = [];
        for (const task of tasks) {
            await this.addTask(task);
        }
    }

    constructor(options: TaskCheckerOptions<C>) {
        this.inputs = options.tasks;
        this.providedApi = options.api;
        this.sendPrompt = options.sendPrompt;
    }

    /**
     * Generate an InlineKeyboard for task prompt
     * @param tasks - Tasks to show in the keyboard
     * @param ctx - Context to get language and generate button labels
     * @returns InlineKeyboard instance
     */
    static generateKeyboard<C extends Context>(tasks: Task<C>[], ctx: C): InlineKeyboard {
        const keyboard = new InlineKeyboard();

        for (const task of tasks) {
            const label = task.button ? task.button(ctx) : 'Task';
            keyboard.url(label, task.url).row();
        }
        return keyboard;
    }

    /**
     * Check all tasks and return both uncompleted tasks and tasks to show
     * @returns Object with uncompleted tasks and tasks to show in keyboard
     */
    private async checkTasks(ctx: C): Promise<{ uncompleted: Task<C>[]; toShow: Task<C>[] }> {
        if (!ctx.from || !this.tasks.length) {
            return { uncompleted: [], toShow: [] };
        }

        const results = await Promise.all(
            this.tasks.map(async (task) => {
                const isCompleted = await task.check(ctx, ctx.api);
                return { task, isCompleted };
            })
        );

        const uncompleted = results.filter((r) => !r.isCompleted).map((r) => r.task);
        // Include uncompleted tasks and tasks with alwaysShow: true
        const toShow = results.filter((r) => !r.isCompleted || r.task.alwaysShow).map((r) => r.task);

        return { uncompleted, toShow };
    }

    async init(): Promise<void> {
        this.tasks = [];
        for (const input of this.inputs) {
            await this.addTask(input);
        }
    }

    async check(ctx: C): Promise<CheckResult> {
        if (!ctx.from) {
            return { ok: true, tasks: this.tasks };
        }

        if (!this.tasks.length) {
            return { ok: true, tasks: [] };
        }

        // Check all tasks once (returns both uncompleted and tasks to show)
        const { uncompleted: uncompletedTasks, toShow: tasksToShow } = await this.checkTasks(ctx);

        // If there are uncompleted tasks, block verification
        if (uncompletedTasks.length > 0) {
            // Call developer's callback to send prompt, or use default implementation
            if (this.sendPrompt) {
                // Pass tasks to show in keyboard (uncompleted + alwaysShow tasks)
                await this.sendPrompt(ctx, tasksToShow);
            } else {
                // Default prompt implementation
                // Show uncompleted and alwaysShow tasks in keyboard
                const t = getTranslation(ctx.from?.language_code);
                const keyboard = TaskChecker.generateKeyboard(tasksToShow, ctx);

                const count = uncompletedTasks.length;
                const text = t.promptText(count);

                await ctx.reply(text, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                });
            }
            // Return uncompleted tasks (alwaysShow tasks don't block verification)
            return { ok: false, tasks: uncompletedTasks };
        }

        return { ok: true, tasks: this.tasks };
    }
}
