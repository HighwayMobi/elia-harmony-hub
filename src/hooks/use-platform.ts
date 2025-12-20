import { Capacitor } from "@capacitor/core";

export type Platform = "ios" | "android" | "web";

export const usePlatform = () => {
  const platform = Capacitor.getPlatform() as Platform;
  
  return {
    platform,
    isIOS: platform === "ios",
    isAndroid: platform === "android",
    isWeb: platform === "web",
    isNative: platform === "ios" || platform === "android",
  };
};
