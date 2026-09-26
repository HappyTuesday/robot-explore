import { describe, expect, it } from 'vitest';
import { chooseEnglishVoice } from './audio';

describe('English voice selection', () => {
  const voice = (lang: string, localService: boolean, name = lang) => ({ lang, localService, name } as SpeechSynthesisVoice);
  it('prefers a local en-US voice over unstable browser list order', () => {
    expect(chooseEnglishVoice([voice('en-GB', true), voice('zh-CN', true), voice('en-US', false), voice('en-US', true, 'Samantha')] )?.name).toBe('Samantha');
  });
  it('falls back to any English voice, never a Chinese voice', () => {
    expect(chooseEnglishVoice([voice('zh-CN', true), voice('en-AU', false)])?.lang).toBe('en-AU');
    expect(chooseEnglishVoice([voice('zh-CN', true)])).toBeUndefined();
  });
});
