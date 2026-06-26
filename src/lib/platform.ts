/**
 * True when running inside the Android WebView (Tauri mobile). The Tauri
 * updater plugin is desktop-only, so update UI is hidden here.
 */
export const isAndroid = /android/i.test(navigator.userAgent);
