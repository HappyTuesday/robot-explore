import { wordSheetNames } from './engine';

// One shared request per atlas, including across StrictMode effects and questions.
// Failed loads are evicted; retry reuses successful atlases and in-flight requests.
const requests = new Map<string, Promise<void>>();
export function loadWordSheet(src: string): Promise<void> {
  const cached = requests.get(src);
  if (cached) return cached;
  const pending = new Promise<void>((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      image.onload = null; image.onerror = null;
      if (error) reject(error); else resolve();
    };
    const timeout = setTimeout(() => finish(new Error('Word atlas loading timed out')), 10000);
    image.onload = () => finish();
    image.onerror = () => finish(new Error('Word atlas could not be loaded'));
    image.src = src;
  }).catch(error => { requests.delete(src); throw error; });
  requests.set(src, pending);
  return pending;
}
export function preloadWordSheets() {
  return Promise.all(wordSheetNames.map(sheet => loadWordSheet(`${import.meta.env.BASE_URL}assets/words/${sheet}`)));
}
