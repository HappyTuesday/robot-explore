// Request fullscreen only from a user gesture; CSS viewport mode works regardless.
type SafariElement = HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };
type SafariDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void | Promise<void> };
export function isFullscreen() {
  return Boolean(document.fullscreenElement || (document as SafariDocument).webkitFullscreenElement);
}
export async function enterFullscreen(): Promise<boolean> {
  if (isFullscreen() || window.matchMedia('(display-mode: standalone)').matches) return true;
  const root = document.documentElement as SafariElement;
  try {
    if (root.requestFullscreen) await root.requestFullscreen();
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    else return false;
    return isFullscreen();
  } catch { return false; }
}
export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await (document as SafariDocument).webkitExitFullscreen?.();
  } catch { /* Browser-driven exits can race with navigation. */ }
}
