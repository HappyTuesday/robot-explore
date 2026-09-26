import { useEffect, useState } from 'react';
import { ArrowLeft, Check, RefreshCw, Volume2 } from 'lucide-react';
import Modal from './Modal';
import { Octopus } from './OceanArtwork';
import { wordSpriteStyle } from '../game/ocean/engine';
import { preloadWordSheets } from '../game/ocean/assets';
import type { WordQuestion } from '../game/ocean/engine';
import { speakWord } from '../game/audio';

export default function WordChallenge({ question, feedback, message, soundEnabled, onAnswer, onAbandon }: {
  question: WordQuestion; feedback: string | null; message: string; soundEnabled: boolean;
  onAnswer: (id: string) => void; onAbandon: () => void;
}) {
  const [loading, setLoading] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [voiceMessage, setVoiceMessage] = useState('');
  useEffect(() => {
    let active = true;
    setLoading('loading');
    preloadWordSheets().then(() => { if (active) setLoading('ready'); }, () => { if (active) setLoading('error'); });
    return () => { active = false; };
  }, [retry]);
  return <Modal title="章鱼守卫的单词挑战" className="word-modal">
    <div className="word-challenge-header"><Octopus/><div><span className="challenge-tag">OCTOPUS WORD CLUB</span><h2>{feedback ? '答对啦，海底探险家！' : '找到单词对应的图片'}</h2></div></div>
    <div className="word-prompt"><strong lang="en">{question.word.english}</strong><button className="icon-button" disabled={!soundEnabled || !('speechSynthesis' in window)} onClick={() => setVoiceMessage(speakWord(question.word.english) ? '' : '暂时无法朗读，可以继续看单词选图。')} aria-label={`朗读 ${question.word.english}`} title={soundEnabled ? '听单词发音' : '先开启顶部声音'}><Volume2/></button></div>
    <p className="word-feedback" role="status" aria-live="polite">{feedback ? `${question.word.english} · ${question.word.chinese}` : question.rejected.length ? message : '仔细观察，点一点。不着急，没有倒计时。'}</p>
    {loading === 'error' ? <div className="word-load-error" role="alert"><p>图片还没准备好，重新加载后再答题。</p><button className="button secondary" onClick={() => setRetry(r => r + 1)}><RefreshCw size={16}/>重新加载图片</button></div> : <div className="word-choices" aria-label="图片选项" aria-busy={loading !== 'ready'}>{question.choices.map((word, i) => <button key={word.id} className={`${feedback === word.id ? 'word-correct' : ''} ${question.rejected.includes(word.id) ? 'word-rejected' : ''}`} disabled={loading !== 'ready' || feedback !== null || question.rejected.includes(word.id)} onClick={() => onAnswer(word.id)} aria-label={`图片 ${i + 1}：${word.chinese}`}>
      <span className="word-option-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><span className="word-sprite" role="img" aria-label={word.chinese} style={loading === 'ready' ? wordSpriteStyle(word) : undefined} />{feedback === word.id && <Check className="word-check"/>}{question.rejected.includes(word.id) && <span className="word-try-again">再试试其他图片</span>}
    </button>)}</div>}
    {loading === 'loading' && <p role="status">正在准备图片…</p>}
    {voiceMessage && <p role="status">{voiceMessage}</p>}
    <button className="button abandon-button" onClick={onAbandon} disabled={feedback !== null}><ArrowLeft size={16}/>放弃挑战<span>−1 能量 · 留在原地</span></button>
    <small className="word-credit">仔细看图片，把单词和它的样子连起来。</small>
  </Modal>;
}
