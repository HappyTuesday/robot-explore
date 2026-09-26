import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronLeft, ChevronRight, CircleHelp, Flag, Footprints, Home, RotateCcw, Settings2, ShieldCheck, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import { Diver as Robot, Octopus as Monster, OceanDecor, Treasure } from '../components/OceanArtwork';
import WordChallenge from '../components/WordChallenge';
import { preloadWordSheets } from '../game/ocean/assets';
import '../ocean.css';
import Modal from '../components/Modal';
import { DIFFICULTIES } from '../game/engine';
import { abandonOcean as abandonChallenge, answerOcean as answerQuestion, createOcean as createGame, moveOcean as move, zone, WORDS, wordSpriteStyle } from '../game/ocean/engine';
import { loadOceanProgress } from '../game/ocean/storage';
const isAdjacent = (state: GameState, target: number) => target >= 0 && target < state.tiles.length && Math.abs(Math.floor(target / state.cols) - Math.floor(state.position / state.cols)) + Math.abs(target % state.cols - state.position % state.cols) === 1;
import type { Difficulty } from '../game/engine';
import type { OceanState as GameState } from '../game/ocean/engine';
import { sound, unlockAudio } from '../game/audio';
export default function OceanGame({ onWin, onHelp, onAttempt, soundEnabled }: { onWin: (energy: number, monsters: number, level: number) => void; onHelp: () => void; onAttempt: (id: string, correct: boolean, missed: string[]) => void; soundEnabled: boolean }) {
  const [state, setState] = useState(() => { const progress = loadOceanProgress(); return createGame('easy', undefined, progress.highestLevel, progress.missed); });
  const [settings, setSettings] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [flash, setFlash] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);
  const boardStageRef = useRef<HTMLDivElement>(null);
  const [boardMetrics, setBoardMetrics] = useState({ cell: 40, gap: 8 });
  useLayoutEffect(() => {
    const stage = boardStageRef.current;
    if (!stage) return;
    const updateSize = (width: number, height: number) => {
      const gap = width < 400 || height < 300 ? 6 : 8;
      const cell = Math.max(1, Math.floor(Math.min(
        (width - gap * (state.cols - 1)) / state.cols,
        (height - gap * (state.rows - 1)) / state.rows,
      )));
      setBoardMetrics(current => current.cell === cell && current.gap === gap ? current : { cell, gap });
    };
    // Measure before paint when changing difficulty, so old cell sizes never flash.
    const padding = getComputedStyle(stage);
    updateSize(stage.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight),
      stage.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom));
    const observer = new ResizeObserver(([entry]) => updateSize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [state.rows, state.cols]);
  const stateRef = useRef(state); stateRef.current = state;
  const onWinRef = useRef(onWin); onWinRef.current = onWin;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const endRef = useRef(false);
  const answerLock = useRef(false);
  const blockers = settings || resetConfirm || paused;
  useEffect(() => { void preloadWordSheets().catch(() => { /* Challenge exposes retry without blocking exploration. */ }); return () => { clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); }; }, []);
  useEffect(() => { if (state.status === 'won' && !endRef.current) { endRef.current = true; sound('win'); setCelebrate(true); onWinRef.current(state.energy, state.monsters, state.level); } if (state.status === 'lost' && !endRef.current) { endRef.current = true; sound('lose'); } }, [state]);
  useEffect(() => { if (state.status !== 'won' && state.status !== 'lost') { setShowResult(false); return; } const id = setTimeout(() => setShowResult(true), state.status === 'lost' ? 850 : 150); return () => clearTimeout(id); }, [state.status]);
  const commit = useCallback((next: GameState) => { stateRef.current = next; setState(next); }, []);
  const go = useCallback((target: number) => {
    if (blockers || feedback !== null || document.querySelector('[role="dialog"]')) return;
    unlockAudio(); const old = stateRef.current; const next = move(old, target); if (next === old) return;
    commit(next); if (next.status !== 'lost' && next.status !== 'won') sound(next.lastEffect);
    setFlash(`${next.lastEffect}-${next.steps}`);
  }, [blockers, feedback, commit]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || (e.target instanceof HTMLElement && ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))) return; const s = stateRef.current; const deltas: Record<string, number> = { ArrowUp: -s.cols, w: -s.cols, ArrowDown: s.cols, s: s.cols, ArrowLeft: -1, a: -1, ArrowRight: 1, d: 1 }; if (e.key in deltas && !document.querySelector('[role="dialog"]')) { e.preventDefault(); go(s.position + deltas[e.key]); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [go]);
  useEffect(() => { const visibility = () => { if (document.hidden && stateRef.current.status === 'playing') setPaused(true); }; document.addEventListener('visibilitychange', visibility); return () => document.removeEventListener('visibilitychange', visibility); }, []);
  function restart(newDifficulty = state.difficulty, nextLevel = state.level, sameMap = true) { clearTimeout(timerRef.current); endRef.current = false; answerLock.current = false; setCelebrate(false); setFeedback(null); setFlash(''); setSettings(false); setResetConfirm(false); setPaused(false); commit(createGame(newDifficulty, sameMap ? state.seed : Math.floor(Math.random() * 1e8), nextLevel, state.missed)); }
  function choose(answer: string) {
    if (answerLock.current || feedback !== null || !stateRef.current.question) return;
    unlockAudio();
    const current = stateRef.current;
    const next = answerQuestion(current, answer);
    if (next === current) return;
    const correct = answer === current.question!.word.id;
    onAttempt(current.question!.word.id, correct, next.missed);
    if (!correct) { sound('drain'); commit(next); return; }
    answerLock.current = true; sound('correct'); setFeedback(answer);
    timerRef.current = setTimeout(() => { answerLock.current = false; setFeedback(null); commit(next); }, 1000);
  }
  function giveUp() {
    if (answerLock.current || feedback !== null) return;
    const next = abandonChallenge(stateRef.current);
    if (next === stateRef.current) return;
    unlockAudio();
    commit(next);
    if (next.status !== 'lost') sound('drain');
    setFlash(`retreat-${next.energy}`);
  }
  const stars = state.energy >= 70 ? 3 : state.energy >= 35 ? 2 : 1;
  const directions = [{ icon: <ArrowUp/>, delta: -state.cols, label: '向上移动', name: 'up' }, { icon: <ArrowLeft/>, delta: -1, label: '向左移动', name: 'left' }, { icon: <ArrowDown/>, delta: state.cols, label: '向下移动', name: 'down' }, { icon: <ArrowRight/>, delta: 1, label: '向右移动', name: 'right' }];
  return <><div className="game-breadcrumb"><a href="#/"><ChevronLeft size={16}/>返回探索乐园</a><span>/</span><span>深海单词寻宝</span></div><div className="game-heading"><div><div className="eyebrow"><span/> THE OCEAN WORD QUEST</div><h1>深海单词寻宝 <span>✦</span></h1><p>读懂单词，穿过珊瑚，寻找海底宝箱！</p></div><div className="game-heading-actions"><button className="button secondary small" onClick={onHelp}><CircleHelp size={17}/>怎么玩</button><button className="icon-button bordered" aria-label="地图设置" onClick={()=>{setDifficulty(state.difficulty);setSettings(true);}}><Settings2 size={19}/></button></div></div>
  <div className="play-layout"><section className="play-panel"><div className="play-topbar"><div className="level-chip"><Flag size={15}/> 第 {String(state.level).padStart(2,'0')} 关 <span>·</span> {zone(state.level)}</div><div className="board-size">{state.rows} × {state.cols}<span>探索地图</span></div><button className="icon-button" aria-label="重新开始本关" title="重新开始本关" onClick={()=>setResetConfirm(true)}><RotateCcw size={18}/></button></div><div className="forest-playfield ocean-playfield"><OceanDecor/><div className="board-stage" ref={boardStageRef}><div className="board" style={{ '--cols': state.cols, '--rows': state.rows, '--cell-size': `${boardMetrics.cell}px`, '--board-gap': `${boardMetrics.gap}px` } as CSSProperties} role="group" aria-label="探险地图"><div className="start-label">起点 <span>↘</span></div>{state.tiles.map((tile,index)=>{
    const isHere=state.position===index; const visited=state.visited.includes(index); const adjacent=isAdjacent(state,index);
    return <button key={index} className={`board-cell cell-${tile.kind} ${isHere?'current':''} ${visited?'visited':''} ${tile.kind==='monster'&&!visited?'monster-waiting':''} ${adjacent&&state.status==='playing'?'reachable':''}`} style={{'--tile-color':tile.color} as CSSProperties} onClick={()=>go(index)} disabled={!adjacent || state.status!=='playing' || blockers} aria-label={`第${Math.floor(index/state.cols)+1}行第${index%state.cols+1}列，${{start:'起点',finish:'终点',boost:'能量加15',drain:`能量减${-tile.amount}`,monster:visited?'已通过的章鱼守卫':'章鱼单词挑战',plain:'安全格'}[tile.kind]}${isHere?'，机器人当前位置':''}`} data-index={index} data-kind={tile.kind}>
    {isHere ? <div key={flash} className={`cell-robot ${state.lastEffect==='boost'?'powered-up':''} ${state.status==='lost'?'robot-explodes':''}`}><Robot mood={state.status==='lost'?'sad':'happy'}/>{state.lastEffect==='boost'&&<span className="floating-energy">+15</span>}</div> : tile.kind==='monster'&&!visited ? <><Monster className="cell-monster"/><span className="monster-question-badge">?</span><span className="character-label monster-label">章鱼守卫</span></> : tile.kind==='finish' ? <span className="finish-icon"><Treasure/><span>宝箱</span></span> : tile.kind==='boost' ? <span className="tile-content"><span className="oxygen-icon">O₂</span><small>{visited?'已收集':'+15'}</small></span> : tile.kind==='drain' ? <span className="tile-content"><span className="drain-mark">◎</span><small>{visited?'已通过':tile.amount}</small></span> : tile.kind==='monster'&&visited ? <Check size={24} className="visited-check"/> : tile.kind==='start' ? <Home size={21} className="tile-home"/> : <span className="plain-mark">✧</span>}
    {isHere&&<span className="character-label robot-label">小绿</span>}{visited&&!isHere&&tile.kind!=='start'&&<span className="visited-dot"/>}{isHere&&state.status==='lost'&&<span className="explosion">💥</span>}
    </button>;
  })}</div></div><div className="board-hint"><span className="hint-dot"/> 点击机器人旁边的虚线格子移动</div></div><div className={`game-message message-${state.lastEffect}`} role="status" aria-live="polite"><Sparkles size={18}/><span>{state.message}</span></div><div className="legend"><span><i className="legend-boost"/>氧气泡</span><span><i className="legend-drain"/>海流旋涡</span><span><i className="legend-monster"/>单词挑战</span><span><i className="legend-plain"/>海底沙地</span></div></section>
  <aside className="companion-panel"><div className="companion-heading"><span>你的探险伙伴</span><span className="online-dot"/></div><div className="companion-profile"><div className={`companion-portrait ${state.energy<=20?'low-energy':''}`}><Robot mood={state.status==='lost'?'sad':'happy'}/><span>01</span></div><h2>小绿 · DIVER</h2><span className="robot-status">{state.energy<=20?'需要一点能量！':state.energy>=80?'能量满满，勇敢向前！':'今天也是勇敢的小机器人'}</span></div><div className="energy-section"><div><span><Zap size={16}/> 当前能量</span><strong>{state.energy}<small> / 100</small></strong></div><div className={`energy-track ${state.energy<=20?'danger':''}`} role="progressbar" aria-label="机器人能量" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.energy}><span style={{width:`${state.energy}%`}}/></div><p>{state.energy<=20?'氧气偏低，优先寻找氧气泡。':'收集氧气泡，给潜水服补充能量。'}</p></div><div className="mini-stats"><div><Footprints size={19}/><strong>{state.steps}</strong><span>探索步数</span></div><span/><div><ShieldCheck size={19}/><strong>{state.monsters}</strong><span>答对单词</span></div></div><div className="control-section"><span className="control-label">小手指挥站</span><div className="direction-pad">{directions.map(d=><button key={d.name} className={`direction-${d.name}`} onClick={()=>go(state.position+d.delta)} aria-label={d.label} disabled={state.status!=='playing'||!isAdjacent(state,state.position+d.delta)||blockers}>{d.icon}</button>)}<div className="direction-center"><span/></div></div><p>点击方向按钮 · 也支持键盘 <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></p></div><div className="little-tip"><span>💡</span><p><b>小小探险提示</b>不用走得最快，试着找到能量最充足的路线吧！</p></div></aside></div><div className="play-bottom"><HeartText/><span>没有倒计时，慢慢来就很棒。</span></div>
  {state.status==='question'&&state.question&&<WordChallenge question={state.question} feedback={feedback} message={state.message} soundEnabled={soundEnabled} onAnswer={choose} onAbandon={giveUp}/>}
  {showResult&&(state.status==='won'||state.status==='lost')&&<Modal title={state.status==='won'?'探险成功':'再接再厉'} className={`result-modal ${state.status==='lost'?'lost-modal':''}`}>{state.status==='won'?<><div className="result-trophy"><Trophy size={58}/><span>✦</span><span>✧</span></div><div className="result-stars">{[1,2,3].map(n=><Star key={n} size={39} fill={n<=stars?'currentColor':'none'} className={n<=stars?'earned':''}/>)}</div><h2>{state.level===9?'你是海底单词探险家！':'太棒啦，找到宝藏！'}</h2><p>你用勇气和智慧，带小绿打开了海底宝箱。</p><div className="ocean-word-review">{state.learned.slice(0, 3).map(id => { const word = WORDS.find(w => w.id === id)!; return <span key={id}><span className="word-review-sprite" style={wordSpriteStyle(word)} aria-hidden="true"/>{word.english}<small>{word.chinese}</small></span>; })}</div><div className="result-stats"><span><b>{state.steps}</b>探索步数</span><span><b>{state.energy}</b>剩余能量</span><span><b>{state.monsters}</b>答对单词</span></div><button className="button primary full-width" onClick={()=>restart(state.difficulty,state.level===9?1:state.level+1,false)}>{state.level===9?'开启新的探险':'探索下一关'}<ChevronRight size={19}/></button></>:<><div className="sad-robot"><Robot mood="sad"/><span className="result-smoke">✧</span></div><span className="challenge-tag">小绿需要重新充电啦</span><h2>再接再厉，你一定可以！</h2><p>{state.message}</p><div className="retry-note">每一次尝试，都会让我们变得更聪明一点。</div><button className="button primary full-width" onClick={()=>restart()}>再试一次 <RotateCcw size={18}/></button></>}<a className="result-home" href="#/">回到探索乐园</a></Modal>}
  {celebrate&&<div className="confetti" aria-hidden="true">{Array.from({length:55},(_,i)=><i key={i} style={{'--x':`${(i*31)%100}%`,'--delay':`${(i%9)*.13}s`,'--rotate':`${i*31}deg`,background:['#8db999','#edbd65','#a496cc','#eea589'][i%4]} as CSSProperties}/>)}</div>}
  {settings&&<Modal title="地图设置" onClose={()=>setSettings(false)}><span className="modal-symbol"><Settings2 size={29}/></span><h2>选择你的冒险</h2><p className="modal-intro">地图越大，藏着的惊喜越多。更换后从新地图出发。</p><div className="difficulty-options">{(Object.entries(DIFFICULTIES) as [Difficulty,typeof DIFFICULTIES.easy][]).map(([key,value])=><button key={key} className={key===difficulty?'selected':''} onClick={()=>setDifficulty(key)}><span>{key==='easy'?'🌱':key==='normal'?'🌿':'🌳'}</span><div><b>{value.label}</b><small>{value.rows} 行 × {value.cols} 列</small></div>{key===difficulty&&<Check size={20}/>}</button>)}</div><button className="button primary full-width" onClick={()=>restart(difficulty,1,false)}>开始新的探险 <ArrowRight size={18}/></button></Modal>}
  {resetConfirm&&<Modal title="重新开始" onClose={()=>setResetConfirm(false)}><span className="modal-symbol"><RotateCcw size={29}/></span><h2>重新探索这张地图？</h2><p className="modal-intro">小绿会回到起点，恢复 60 点能量。这一次，试试新的路线吧！</p><button className="button primary full-width" onClick={()=>restart()}>准备好了，重新出发</button><button className="button text-button full-width" onClick={()=>setResetConfirm(false)}>继续当前探险</button></Modal>}
  {paused&&!settings&&!resetConfirm&&state.status==='playing'&&<Modal title="欢迎回来"><div className="pause-robot"><Robot/></div><h2>小绿在等你回来</h2><p className="modal-intro">探险进度好好地保留着，准备好继续了吗？</p><button className="button primary full-width" onClick={()=>setPaused(false)}>继续探险 <ArrowRight size={18}/></button></Modal>}
  </>;
}
function HeartText(){return <span className="play-bottom-heart">♡</span>;}
