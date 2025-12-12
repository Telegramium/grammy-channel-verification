type Translations = {
    promptText: (count: number) => string;
    buttonLabelChannel: string;
    buttonLabelBot: string;
};

const translations: Record<string, Translations> = {
    en: {
        promptText: (count) => `Please complete the task${count === 1 ? '' : 's'} to continue.`,
        buttonLabelChannel: 'Subscribe to channel',
        buttonLabelBot: 'Start bot',
    },
    ru: {
        promptText: (count) => `Пожалуйста, выполните ${count === 1 ? 'задание' : 'задания'}, чтобы продолжить.`,
        buttonLabelChannel: 'Подписаться на канал',
        buttonLabelBot: 'Запустить бота',
    },
    es: {
        promptText: (count) => `Por favor, complete ${count === 1 ? 'la tarea' : 'las tareas'} para continuar.`,
        buttonLabelChannel: 'Suscribirse al canal',
        buttonLabelBot: 'Iniciar bot',
    },
    de: {
        promptText: (count) => `Bitte erledigen Sie ${count === 1 ? 'die Aufgabe' : 'die Aufgaben'}, um fortzufahren.`,
        buttonLabelChannel: 'Kanal abonnieren',
        buttonLabelBot: 'Bot starten',
    },
    fr: {
        promptText: (count) => `Veuillez compléter ${count === 1 ? 'la tâche' : 'les tâches'} pour continuer.`,
        buttonLabelChannel: "S'abonner à la chaîne",
        buttonLabelBot: 'Démarrer le bot',
    },
    it: {
        promptText: (count) => `Per favore, completa ${count === 1 ? 'il compito' : 'i compiti'} per continuare.`,
        buttonLabelChannel: 'Iscriviti al canale',
        buttonLabelBot: 'Avvia bot',
    },
    pt: {
        promptText: (count) => `Por favor, complete ${count === 1 ? 'a tarefa' : 'as tarefas'} para continuar.`,
        buttonLabelChannel: 'Inscrever-se no canal',
        buttonLabelBot: 'Iniciar bot',
    },
    ar: {
        promptText: (count) => `يرجى إكمال ${count === 1 ? 'المهمة' : 'المهام'} للمتابعة.`,
        buttonLabelChannel: 'الاشتراك في القناة',
        buttonLabelBot: 'بدء البوت',
    },
    zh: {
        // Chinese doesn't use an -s; keep a single sentence (works for any count)
        promptText: (count) => `请完成任务以继续。`,
        buttonLabelChannel: '订阅频道',
        buttonLabelBot: '启动机器人',
    },
    ja: {
        // Japanese doesn't mark plural with "s"
        promptText: (count) => `続行するには、タスクを完了してください。`,
        buttonLabelChannel: 'チャンネルに登録',
        buttonLabelBot: 'ボットを開始',
    },
    ko: {
        promptText: (count) => `계속하려면 작업을 완료하세요.`,
        buttonLabelChannel: '채널 구독',
        buttonLabelBot: '봇 시작',
    },
    tr: {
        promptText: (count) => `Devam etmek için ${count === 1 ? 'görevi' : 'görevleri'} tamamlayın.`,
        buttonLabelChannel: 'Kanala abone ol',
        buttonLabelBot: 'Botu başlat',
    },
    uk: {
        promptText: (count) => `Будь ласка, виконайте ${count === 1 ? 'завдання' : 'завдання'}, щоб продовжити.`,
        // Note: in Ukrainian 'завдання' is both singular and plural in many contexts;
        // you can keep the same noun for both forms or implement full plural rules if needed.
        buttonLabelChannel: 'Підписатися на канал',
        buttonLabelBot: 'Запустити бота',
    },
    pl: {
        promptText: (count) => `Proszę ukończyć ${count === 1 ? 'zadanie' : 'zadania'}, aby kontynuować.`,
        buttonLabelChannel: 'Subskrybuj kanał',
        buttonLabelBot: 'Uruchom bota',
    },
    hi: {
        // Hindi often uses the same word for singular/plural in UI contexts
        promptText: (count) => `कृपया कार्य पूरा करें ताकि आप जारी रख सकें।`,
        buttonLabelChannel: 'चैनल सब्सक्राइब करें',
        buttonLabelBot: 'बॉट शुरू करें',
    },
    id: {
        // Indonesian doesn't mark English-style plural with 's'
        promptText: (count) => `Silakan selesaikan tugas untuk melanjutkan.`,
        buttonLabelChannel: 'Berlangganan saluran',
        buttonLabelBot: 'Mulai bot',
    },
    vi: {
        promptText: (count) => `Vui lòng hoàn thành nhiệm vụ để tiếp tục.`,
        buttonLabelChannel: 'Đăng ký kênh',
        buttonLabelBot: 'Khởi động bot',
    },
    th: {
        promptText: (count) => `กรุณาทำงานให้เสร็จเพื่อดำเนินการต่อ`,
        buttonLabelChannel: 'สมัครสมาชิกช่อง',
        buttonLabelBot: 'เริ่มบอท',
    },
};

function extractLanguageCode(langCode?: string | null): string {
    if (!langCode) return 'en';
    const parts = langCode.split('_');
    return parts[0].toLowerCase();
}

export function getTranslation(langCode?: string | null): Translations {
    const code = extractLanguageCode(langCode);
    return translations[code] ?? translations.en;
}

export function t(key: 'promptText', langCode: string | null | undefined, count: number): string;
export function t(key: Exclude<keyof Translations, 'promptText'>, langCode?: string | null): string;
export function t(key: keyof Translations, langCode?: string | null, count?: number): string {
    const trans = getTranslation(langCode);
    const value = trans[key];
    if (typeof value === 'function') {
        return value(count ?? 0);
    }
    return value as string;
}
