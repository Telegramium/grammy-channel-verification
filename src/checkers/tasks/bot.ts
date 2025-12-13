import type { Api, Context } from 'grammy';
import { getTranslation } from '../../i18n';
import type { Task } from '../../types';

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


