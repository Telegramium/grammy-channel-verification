import type { Api, Context } from 'grammy';
import { getTranslation } from '../../i18n';
import type { Task } from '../../types';

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

