import type { Api, Context } from 'grammy';
import type { Chat } from 'grammy/types';
import { getTranslation } from '../../i18n';
import type { Task } from '../../types';

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

