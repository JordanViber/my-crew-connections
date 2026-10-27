export type DeviceFamily = "ios" | "android" | "desktop" | "unknown";
export type BrowserFamily = "safari" | "chrome" | "edge" | "firefox" | "samsung" | "unknown";
export type InstallState = "installed" | "home-screen-required" | "prompt-available" | "manual-install" | "browser-tab" | "unsupported";

type PushEnvironmentOptions = {
  userAgent?: string;
  standalone?: boolean;
  notificationSupported?: boolean;
  serviceWorkerSupported?: boolean;
  pushManagerSupported?: boolean;
  installPromptAvailable?: boolean;
};

export function detectDeviceFamily(userAgent: string): DeviceFamily {
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }

  if (/android/i.test(userAgent)) {
    return "android";
  }

  if (/macintosh|windows|linux/i.test(userAgent)) {
    return "desktop";
  }

  return "unknown";
}

export function detectBrowserFamily(userAgent: string): BrowserFamily {
  if (/edgios|edg/i.test(userAgent)) {
    return "edge";
  }

  if (/samsungbrowser/i.test(userAgent)) {
    return "samsung";
  }

  if (/firefox|fxios/i.test(userAgent)) {
    return "firefox";
  }

  if (/crios|chrome/i.test(userAgent)) {
    return "chrome";
  }

  if (/safari/i.test(userAgent)) {
    return "safari";
  }

  return "unknown";
}

export function isStandaloneDisplay() {
  const iosStandalone = typeof navigator !== "undefined"
    && "standalone" in navigator
    && Boolean(navigator.standalone);

  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return iosStandalone;
  }

  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

export function getPushEnvironment(options: PushEnvironmentOptions = {}) {
  const onClient = typeof window !== "undefined";
  const userAgent = options.userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const standalone = options.standalone ?? (onClient ? isStandaloneDisplay() : false);
  const notificationSupported = options.notificationSupported ?? (onClient && "Notification" in window);
  const serviceWorkerSupported = options.serviceWorkerSupported ?? (typeof navigator !== "undefined" && "serviceWorker" in navigator);
  const pushManagerSupported = options.pushManagerSupported ?? (onClient && "PushManager" in window);
  const installPromptAvailable = options.installPromptAvailable ?? false;
  const deviceFamily = detectDeviceFamily(userAgent);
  const browserFamily = detectBrowserFamily(userAgent);
  const supportsPush = notificationSupported && serviceWorkerSupported && pushManagerSupported;
  const requiresInstallForPush = deviceFamily === "ios" && browserFamily === "safari" && !standalone;

  let installState: InstallState = "unsupported";

  if (standalone) {
    installState = "installed";
  } else if (deviceFamily === "ios" && browserFamily === "safari") {
    installState = "home-screen-required";
  } else if (installPromptAvailable) {
    installState = "prompt-available";
  } else if (deviceFamily === "android") {
    installState = "manual-install";
  } else if (supportsPush) {
    installState = "browser-tab";
  }

  return {
    userAgent,
    deviceFamily,
    browserFamily,
    standalone,
    supportsPush,
    requiresInstallForPush,
    installState,
  };
}

export type PwaBannerMode = "hidden" | "install-prompt" | "ios-manual" | "android-manual";

export function getPwaBannerVisibility(options: {
  standalone: boolean;
  recentlyDismissed?: boolean;
  storedInstalled: boolean;
  installPromptAvailable: boolean;
  iosSafari: boolean;
  androidDevice: boolean;
}): { visible: boolean; mode: PwaBannerMode } {
  if (options.standalone || options.recentlyDismissed) {
    return { visible: false, mode: "hidden" };
  }

  if (options.installPromptAvailable) {
    return { visible: true, mode: "install-prompt" };
  }

  if (options.storedInstalled) {
    return { visible: false, mode: "hidden" };
  }

  if (options.iosSafari) {
    return { visible: true, mode: "ios-manual" };
  }

  if (options.androidDevice) {
    return { visible: true, mode: "android-manual" };
  }

  return { visible: false, mode: "hidden" };
}
