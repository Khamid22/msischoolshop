interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
  };
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  ready: () => void;
  expand: () => void;
  onEvent?: (eventType: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged', callback: () => void) => void;
  showAlert?: (message: string) => void;
}

interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
