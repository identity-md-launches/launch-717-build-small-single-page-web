import './style.css';
import { Game, parseBest } from './engine.ts';
import { Renderer } from './render.ts';

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
}
const game = new Game();
const renderer = new Renderer(element<HTMLCanvasElement>('scene'));
const action = element<HTMLButtonElement>('action');
const field = element<HTMLButtonElement>('playfield');
const pause = element<HTMLButtonElement>('pause');
const sound = element<HTMLButtonElement>('sound');
const message = element('scene-message');
const announcer = element('announcer');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const storageKey = 'highrise.best.v1';
let best = 0;
let storageAvailable = true;
let soundEnabled = false;
let audio: AudioContext | null = null;
let bestAtStart = 0;
try {
  best = parseBest(localStorage.getItem(storageKey));
  localStorage.setItem(storageKey, String(best));
} catch { storageAvailable = false; }

function tone(kind: 'perfect' | 'trimmed' | 'miss') {
  if (!soundEnabled || !audio) return;
  try {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = kind === 'perfect' ? 660 : kind === 'trimmed' ? 420 : 150;
    gain.gain.setValueAtTime(.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime+.18);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime+.2);
  } catch { /* Audio is optional; gameplay remains available. */ }
}
function announce(text: string) { announcer.textContent = text; }
function update() {
  renderer.dirty = true;
  const {mode, score} = game;
  element('score').textContent = String(score).padStart(2,'0');
  element('best').textContent = String(best).padStart(2,'0');
  element('score-note').textContent = score === 0 ? 'Every great tower starts at zero.' : score > bestAtStart ? 'A new personal best. Keep going.' : 'One more block. A little higher.';
  element('storage-note').textContent = storageAvailable ? 'Saved in this browser.' : 'Best kept for this visit only.';
  element('storage-note').classList.toggle('is-warning', !storageAvailable);
  element('site-state').textContent = {ready:'Ready to build',playing:'Build in progress',paused:'On a short break',over:'Run complete'}[mode];
  const label = {ready:'Start building',playing:'Drop block',paused:'Resume building',over:'Build again'}[mode];
  element('action-label').textContent = label;
  field.setAttribute('aria-label',label);
  // Keep the drop button focusable between frames, but reject duplicate drops in the engine.
  action.setAttribute('aria-disabled',String(mode==='playing' && game.falling));
  field.setAttribute('aria-disabled',String(mode==='playing' && game.falling));
  pause.disabled = mode==='ready' || mode==='over';
  pause.setAttribute('aria-label',mode==='paused'?'Resume game':'Pause game');
  pause.title = mode==='paused'?'Resume game (P)':'Pause game (P)';
  document.getElementById('pause-mark')?.setAttribute('d',mode==='paused'?'m8 5 11 7-11 7Z':'M8 5v14M16 5v14');
  message.hidden = mode==='playing';
  message.classList.toggle('is-status',mode==='paused' || mode==='over');
  if(mode==='ready') {
    element('message-tag').textContent='A fresh foundation';
    element('message-title').innerHTML='There’s only one way.<br />Up.';
    element('message-body').textContent='Your next best starts with one block.';
  } else if(mode==='paused') {
    element('message-tag').textContent='Take a breath';
    element('message-title').textContent='The sky can wait.';
    element('message-body').textContent='Resume whenever you’re ready.';
  } else if(mode==='over') {
    element('message-tag').textContent=score>bestAtStart?'New personal best':'Until the next highrise';
    element('message-title').textContent=score===1?'1 block. A solid start.':`${score} blocks. Nicely built.`;
    if(score===0) element('message-title').textContent='A little more alignment.';
    element('message-body').textContent='You missed the tower. Build again and aim higher.';
  }
}
game.onLand = (kind) => {
  if(game.score>best) {
    best=game.score;
    if(storageAvailable) try { localStorage.setItem(storageKey,String(best)); } catch { storageAvailable=false; }
  }
  tone(kind);
  announce(kind==='miss' ? `Run complete. Score ${game.score}. Best score ${best}. Select Build again to restart.` : `${kind==='perfect'?'Perfect placement.':'Block placed.'} Score ${game.score}.`);
  update();
};
function activate() {
  if(game.mode==='ready' || game.mode==='over') {
    bestAtStart=best; game.start(); announce('Building started. Tap the play area or press Space to drop a block.');
  } else if(game.mode==='paused') { game.resume(); announce('Game resumed.'); }
  else game.drop();
  update();
}
function togglePause() {
  if(game.mode==='playing') { game.pause(); announce('Game paused. Resume when ready.'); }
  else if(game.mode==='paused') { game.resume(); announce('Game resumed.'); }
  update();
}
action.addEventListener('click',activate);
field.addEventListener('click',activate);
pause.addEventListener('click',togglePause);
sound.addEventListener('click',async () => {
  soundEnabled=!soundEnabled;
  if(soundEnabled) {
    try { audio??=new AudioContext(); await audio.resume(); }
    catch { soundEnabled=false; announce('Sound is unavailable in this browser. You can keep playing.'); }
  }
  sound.setAttribute('aria-pressed',String(soundEnabled));
  sound.setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');
  sound.title=soundEnabled?'Mute sound':'Enable sound';
  document.getElementById('sound-mark')?.setAttribute('d',soundEnabled?'M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14':'m16 9 6 6m0-6-6 6');
  if(soundEnabled) tone('perfect');
});
window.addEventListener('keydown',(event) => {
  if(event.altKey || event.ctrlKey || event.metaKey) return;
  if(event.code==='KeyP' || event.code==='Escape') {
    if(event.repeat) return;
    if(event.code==='Escape' && game.mode!=='playing') return;
    event.preventDefault(); togglePause();
  }
  if(event.code==='Space' && !(event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select'))) {
    event.preventDefault(); if(!event.repeat) activate();
  } else if(event.code==='Space' && event.repeat) event.preventDefault();
});
function pauseAway() { if(game.mode==='playing') { game.pause(); announce('Game paused while you were away.'); update(); } }
document.addEventListener('visibilitychange',() => { if(document.hidden) pauseAway(); });
window.addEventListener('blur',pauseAway);
window.addEventListener('storage',(event) => {
  if(event.key===storageKey) { best=Math.max(best,parseBest(event.newValue)); update(); }
});
let previous = performance.now();
let lastFeedback = '';
reduced.addEventListener('change', () => { renderer.dirty = true; });
function frame(now: number) {
  const wasFalling = game.falling;
  game.tick((now-previous)/1000); previous=now;
  if (game.mode === 'playing' || renderer.dirty) {
    renderer.draw(game,reduced.matches);
    renderer.dirty = false;
  }
  const feedback=game.mode==='playing' && game.feedbackTime>0?game.feedback:'';
  if(feedback!==lastFeedback) { element('placement').textContent=feedback; lastFeedback=feedback; }
  if(wasFalling && !game.falling) update();
  requestAnimationFrame(frame);
}
update();
requestAnimationFrame(frame);
