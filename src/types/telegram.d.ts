interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  version: string;
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
  };
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  isFullscreen?: boolean;
  ready: () => void;
  expand: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  requestFullscreen?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  onEvent?: (eventType: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged' | 'fullscreenChanged' | 'fullscreenFailed', callback: () => void) => void;
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
