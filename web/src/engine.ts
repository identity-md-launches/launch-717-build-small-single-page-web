export type Mode = 'ready' | 'playing' | 'paused' | 'over';
export interface Block { x: number; width: number; floor: number }
export interface Landing { kind: 'perfect' | 'trimmed' | 'miss'; block: Block; cut: Block | null }
export const INITIAL_WIDTH = 142;
export const PERFECT_TOLERANCE = 7;
export const FALL_DURATION = 0.46;
export const foundation = (): Block => ({ x: (600 - INITIAL_WIDTH) / 2, width: INITIAL_WIDTH, floor: 0 });

export function resolveLanding(x: number, width: number, support: Block): Landing {
  const floor = support.floor + 1;
  if (Math.abs(x - support.x) <= PERFECT_TOLERANCE) {
    return { kind: 'perfect', block: { x: support.x, width: support.width, floor }, cut: null };
  }
  const left = Math.max(x, support.x);
  const right = Math.min(x + width, support.x + support.width);
  if (right - left < 1) return { kind: 'miss', block: { x, width, floor }, cut: null };
  const block = { x: left, width: right - left, floor };
  const cut = x < support.x ? { x, width: left - x, floor } : { x: right, width: x + width - right, floor };
  return { kind: 'trimmed', block, cut };
}

export class Game {
  mode: Mode = 'ready';
  score = 0;
  blocks: Block[] = [foundation()];
  phase = 0.65;
  x = 356;
  width = INITIAL_WIDTH;
  falling = false;
  fallTime = 0;
  landing: Landing | null = null;
  debris: Block | null = null;
  debrisTime = 0;
  feedback = '';
  feedbackTime = 0;
  onLand: ((kind: Landing['kind']) => void) | undefined;

  start() {
    this.mode = 'playing'; this.score = 0; this.blocks = [foundation()];
    this.phase = 0.65; this.width = INITIAL_WIDTH; this.falling = false;
    this.fallTime = 0; this.landing = null; this.debris = null;
    this.feedback = ''; this.feedbackTime = 0;
    this.position();
  }
  position() { this.x = 300 - this.width / 2 + Math.sin(this.phase) * 208; }
  drop() {
    if (this.mode !== 'playing' || this.falling) return false;
    this.falling = true; this.fallTime = 0;
    this.landing = resolveLanding(this.x, this.width, this.blocks[this.blocks.length - 1]);
    return true;
  }
  pause() { if (this.mode === 'playing') this.mode = 'paused'; }
  resume() { if (this.mode === 'paused') this.mode = 'playing'; }
  tick(delta: number) {
    if (this.mode !== 'playing') return;
    const dt = Math.max(0, Math.min(delta, 0.05));
    this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    if (this.debris) { this.debrisTime += dt; if (this.debrisTime > 0.65) this.debris = null; }
    if (!this.falling) {
      this.phase += dt * Math.min(1.45 + this.score * 0.055, 2.8);
      this.position();
      return;
    }
    this.fallTime += dt;
    if (this.fallTime < FALL_DURATION || !this.landing) return;
    const result = this.landing;
    if (result.kind === 'miss') {
      this.mode = 'over'; this.falling = false; this.onLand?.('miss'); return;
    }
    this.blocks.push(result.block);
    // Keep rendering and memory bounded even after a very long run.
    if (this.blocks.length > 24) this.blocks.shift();
    this.score++; this.width = result.block.width;
    this.debris = result.cut; this.debrisTime = 0;
    this.feedback = result.kind === 'perfect' ? 'Perfect placement  +1' : 'Block placed  +1';
    this.feedbackTime = 1.25; this.falling = false; this.landing = null;
    this.phase = this.score % 2 ? -Math.PI / 2 : Math.PI / 2;
    this.position(); this.onLand?.(result.kind);
  }
}

export function parseBest(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}
