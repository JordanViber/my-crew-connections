import { describe, expect, it } from "vitest";
import { detectBrowserFamily, detectDeviceFamily, getPushEnvironment, getPwaBannerVisibility } from "@/lib/pwa-client";

describe("pwa-client", () => {
  it("detects iPhone Safari as requiring Home Screen install for push", () => {
    const environment = getPushEnvironment({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      standalone: false,
      notificationSupported: true,
      serviceWorkerSupported: true,
      pushManagerSupported: true,
    });

    expect(environment.deviceFamily).toBe("ios");
    expect(environment.browserFamily).toBe("safari");
    expect(environment.requiresInstallForPush).toBe(true);
    expect(environment.installState).toBe("home-screen-required");
  });

  it("detects Android Chrome as installable with or without the native prompt", () => {
    const promptEnvironment = getPushEnvironment({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      standalone: false,
      notificationSupported: true,
      serviceWorkerSupported: true,
      pushManagerSupported: true,
      installPromptAvailable: true,
    });
    const manualEnvironment = getPushEnvironment({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      standalone: false,
      notificationSupported: true,
      serviceWorkerSupported: true,
      pushManagerSupported: true,
      installPromptAvailable: false,
    });

    expect(promptEnvironment.deviceFamily).toBe("android");
    expect(promptEnvironment.browserFamily).toBe("chrome");
    expect(promptEnvironment.installState).toBe("prompt-available");
    expect(manualEnvironment.installState).toBe("manual-install");
  });

  it("keeps browser-only push enabled on desktop browsers", () => {
    expect(detectDeviceFamily("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/135.0.0.0 Safari/537.36")).toBe("desktop");
    expect(detectBrowserFamily("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/135.0.0.0 Safari/537.36")).toBe("chrome");
  });
});
describe("getPwaBannerVisibility", () => {
  const base = {
    standalone: false,
    recentlyDismissed: false,
    storedInstalled: false,
    installPromptAvailable: false,
    iosSafari: false,
    androidDevice: false,
  };

  it("stays hidden in standalone display-mode", () => {
    expect(getPwaBannerVisibility({ ...base, standalone: true, storedInstalled: true, installPromptAvailable: true })).toEqual({
      visible: false,
      mode: "hidden",
    });
  });

  it("hides the post-install Open banner in a normal browser tab", () => {
    expect(getPwaBannerVisibility({ ...base, storedInstalled: true })).toEqual({
      visible: false,
      mode: "hidden",
    });
  });

  it("keeps a real Install prompt when beforeinstallprompt exists", () => {
    expect(getPwaBannerVisibility({ ...base, storedInstalled: true, installPromptAvailable: true })).toEqual({
      visible: true,
      mode: "install-prompt",
    });
    expect(getPwaBannerVisibility({ ...base, installPromptAvailable: true })).toEqual({
      visible: true,
      mode: "install-prompt",
    });
  });

  it("shows manual install steps on iOS and Android when not installed", () => {
    expect(getPwaBannerVisibility({ ...base, iosSafari: true })).toEqual({
      visible: true,
      mode: "ios-manual",
    });
    expect(getPwaBannerVisibility({ ...base, androidDevice: true })).toEqual({
      visible: true,
      mode: "android-manual",
    });
  });
});
