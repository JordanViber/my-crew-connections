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
  return globalThis.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in globalThis.navigator && Boolean(globalThis.navigator.standalone));
}

export function getPushEnvironment(options: PushEnvironmentOptions = {}) {
  const userAgent = options.userAgent ?? globalThis.navigator.userAgent;
  const standalone = options.standalone ?? isStandaloneDisplay();
  const notificationSupported = options.notificationSupported ?? ("Notification" in globalThis.window);
  const serviceWorkerSupported = options.serviceWorkerSupported ?? ("serviceWorker" in globalThis.navigator);
  const pushManagerSupported = options.pushManagerSupported ?? ("PushManager" in globalThis.window);
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