type Translations = {
    promptText: (count: number) => string;
    buttonLabelChannel: string;
    buttonLabelBot: string;
};

const translations: Record<string, Translations> = {
    en: {
        promptText: (count) => `Please complete the task${count > 1 ? 's' : ''} to continue.`,
        buttonLabelChannel: 'Subscribe to channel',
        buttonLabelBot: 'Start bot',
    },
    ru: {
        promptText: (count) => `Пожалуйста, выполните задание${count > 1 ? 'я' : ''}, чтобы продолжить.`,
        buttonLabelChannel: 'Подписаться на канал',
        buttonLabelBot: 'Запустить бота',
    },
    es: {
        promptText: (count) => `Por favor, complete la tarea${count > 1 ? 's' : ''} para continuar.`,
        buttonLabelChannel: 'Suscribirse al canal',
        buttonLabelBot: 'Iniciar bot',
    },
    de: {
        promptText: (count) => `Bitte erledigen Sie die Aufgabe${count > 1 ? 'n' : ''}, um fortzufahren.`,
        buttonLabelChannel: 'Kanal abonnieren',
        buttonLabelBot: 'Bot starten',
    },
    fr: {
        promptText: (count) => `Veuillez compléter la tâche${count > 1 ? 's' : ''} pour continuer.`,
        buttonLabelChannel: "S'abonner à la chaîne",
        buttonLabelBot: 'Démarrer le bot',
    },
    it: {
        promptText: (count) => `Per favore, completa il compito${count > 1 ? 'i' : ''} per continuare.`,
        buttonLabelChannel: 'Iscriviti al canale',
        buttonLabelBot: 'Avvia bot',
    },
    pt: {
        promptText: (count) => `Por favor, complete a tarefa${count > 1 ? 's' : ''} para continuar.`,
        buttonLabelChannel: 'Inscrever-se no canal',
        buttonLabelBot: 'Iniciar bot',
    },
    ar: {
        promptText: (count) => `يرجى إكمال المهمة${count > 1 ? 'ات' : ''} للمتابعة.`,
        buttonLabelChannel: 'الاشتراك في القناة',
        buttonLabelBot: 'بدء البوت',
    },
    zh: {
        promptText: (count) => `请完成任务${count > 1 ? 's' : ''}以继续。`,
        buttonLabelChannel: '订阅频道',
        buttonLabelBot: '启动机器人',
    },
    ja: {
        promptText: (count) => `続行するには、タスク${count > 1 ? 's' : ''}を完了してください。`,
        buttonLabelChannel: 'チャンネルに登録',
        buttonLabelBot: 'ボットを開始',
    },
    ko: {
        promptText: (count) => `계속하려면 작업${count > 1 ? 's' : ''}을 완료하세요.`,
        buttonLabelChannel: '채널 구독',
        buttonLabelBot: '봇 시작',
    },
    tr: {
        promptText: (count) => `Devam etmek için görevi${count > 1 ? 'leri' : ''} tamamlayın.`,
        buttonLabelChannel: 'Kanala abone ol',
        buttonLabelBot: 'Botu başlat',
    },
    uk: {
        promptText: (count) => `Будь ласка, виконайте завдання${count > 1 ? 'я' : ''}, щоб продовжити.`,
        buttonLabelChannel: 'Підписатися на канал',
        buttonLabelBot: 'Запустити бота',
    },
    pl: {
        promptText: (count) => `Proszę ukończyć zadanie${count > 1 ? 'nia' : ''}, aby kontynuować.`,
        buttonLabelChannel: 'Subskrybuj kanał',
        buttonLabelBot: 'Uruchom bota',
    },
    hi: {
        promptText: (count) => `कृपया कार्य${count > 1 ? 's' : ''} पूरा करें जारी रखने के लिए।`,
        buttonLabelChannel: 'चैनल सब्सक्राइब करें',
        buttonLabelBot: 'बॉट शुरू करें',
    },
    id: {
        promptText: (count) => `Silakan selesaikan tugas${count > 1 ? 's' : ''} untuk melanjutkan.`,
        buttonLabelChannel: 'Berlangganan saluran',
        buttonLabelBot: 'Mulai bot',
    },
    vi: {
        promptText: (count) => `Vui lòng hoàn thành nhiệm vụ${count > 1 ? 's' : ''} để tiếp tục.`,
        buttonLabelChannel: 'Đăng ký kênh',
        buttonLabelBot: 'Khởi động bot',
    },
    th: {
        promptText: (count) => `กรุณาทำงาน${count > 1 ? 's' : ''}ให้เสร็จเพื่อดำเนินการต่อ`,
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
