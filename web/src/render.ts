import { FALL_DURATION, Game } from './engine.ts';
import type { Block } from './engine.ts';

// Canvas-only drawing roles; the surrounding interface uses CSS semantic tokens.
const ink = {
  board: '#102640', grid: '#1a3551', majorGrid: '#24415d',
  blueprint: '#6f96b9', muted: '#a1b3c9', yellow: '#f5cf55',
  block: '#173c59', blockTop: '#244d67', blockSide: '#0d2b45',
  yellowTop: '#ffe083', yellowSide: '#bb9339', dark: '#0b192b',
};
export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  height = 400;
  dirty = true;
  observer: ResizeObserver;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    this.ctx = context;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }
  resize() {
    this.dirty = true;
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(bounds.width * dpr);
    this.canvas.height = Math.round(bounds.height * dpr);
    this.height = 600 * bounds.height / bounds.width;
    this.ctx.setTransform(this.canvas.width / 600, 0, 0, this.canvas.width / 600, 0, 0);
  }
  line(x1: number, y1: number, x2: number, y2: number, color = ink.blueprint, width = 1) {
    const c = this.ctx; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  poly(points: number[][], fill: string, stroke: string) {
    const c = this.ctx; c.beginPath();
    points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
    c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1; c.stroke();
  }
  block(block: Block, y: number, active = false) {
    const {x, width: w} = block; const h = 27, depth = Math.min(12, w * .2);
    const c = this.ctx, stroke = active ? ink.yellow : ink.blueprint;
    this.poly([[x,y],[x+depth,y-8],[x+w+depth,y-8],[x+w,y]], active ? ink.yellowTop : ink.blockTop, stroke);
    this.poly([[x+w,y],[x+w+depth,y-8],[x+w+depth,y+h-8],[x+w,y+h]], active ? ink.yellowSide : ink.blockSide, stroke);
    this.poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]], active ? ink.yellow : ink.block, stroke);
    if (w > 35) {
      for (let px = x+12; px < x+w-5; px += 21) {
        this.line(px, y+6, px, y+h-6, active ? ink.yellowSide : ink.blueprint, .7);
      }
      if (active && w > 95) {
        c.fillStyle = ink.dark; c.font = '9px monospace'; c.textAlign = 'center';
        c.fillText('BLOCK ' + String(block.floor).padStart(2, '0'), x+w/2, y+17);
      }
    }
    for (const px of [x+5,x+w-5]) if (w > 16) {
      c.fillStyle = active ? ink.dark : ink.blueprint;
      c.fillRect(px, y+4, 1.5, 1.5); c.fillRect(px, y+h-5, 1.5, 1.5);
    }
  }
  draw(game: Game, reduced: boolean) {
    const c = this.ctx, h = this.height;
    c.fillStyle = ink.board; c.fillRect(0,0,600,h);
    for (let x=0; x<=600; x+=24) this.line(x,0,x,h,x%120===0?ink.majorGrid:ink.grid,.6);
    for (let y=0; y<=h; y+=24) this.line(0,y,600,y,y%120===0?ink.majorGrid:ink.grid,.6);
    // Survey registration marks and a vertical height scale.
    for (const x of [18,582]) for (const y of [55,h-58]) {
      this.line(x-4,y,x+4,y,ink.blueprint,.8); this.line(x,y-4,x,y+4,ink.blueprint,.8);
    }
    const baseY = h - 82;
    const camera = Math.max(0, game.score * 29 - (baseY - h * .62));
    const firstTick = Math.max(0, Math.ceil((baseY+camera-h+55)/29));
    for (let i=firstTick, y=baseY+camera-firstTick*29; y>65; y-=29, i++) {
      if(y>h-55) continue;
      this.line(566,y,573+(i%5===0?5:0),y,ink.blueprint,.7);
      if(i%5===0) { c.fillStyle=ink.muted; c.font='8px monospace'; c.textAlign='right'; c.fillText(String(i).padStart(2,'0'),561,y+3); }
    }
    // Faint construction outline, independent from playable blocks.
    this.line(48,baseY+30,548,baseY+30,ink.blueprint,1);
    for (let x=48;x<548;x+=10) this.line(x,baseY+30,x-5,baseY+37,ink.majorGrid,.8);
    c.setLineDash([3,5]); this.line(300,80,300,h-54,ink.majorGrid,.8); c.setLineDash([]);
    const craneY = 66;
    this.line(48,craneY,540,craneY,ink.blueprint,1.2);
    this.line(48,craneY+15,540,craneY+15,ink.blueprint,1.2);
    for(let x=48;x<528;x+=24) {
      this.line(x,craneY,x+12,craneY+15,ink.blueprint,.8);
      this.line(x+12,craneY+15,x+24,craneY,ink.blueprint,.8);
    }
    this.line(70,craneY-17,70,baseY+29,ink.majorGrid,1.2);
    this.line(90,craneY-17,90,baseY+29,ink.majorGrid,1.2);
    for(let y=craneY+16;y<baseY;y+=28) {
      this.line(70,y,90,y+28,ink.majorGrid,.8);this.line(90,y,70,y+28,ink.majorGrid,.8);
    }
    this.line(80,craneY-18,220,craneY,ink.blueprint,.8);
    this.line(80,craneY-18,520,craneY,ink.blueprint,.8);
    this.poly([[51,craneY+17],[101,craneY+17],[101,craneY+39],[51,craneY+39]],ink.blockSide,ink.blueprint);
    this.line(76,craneY+17,76,craneY+39,ink.blueprint,.8);
    for(const block of game.blocks) {
      const y=baseY-block.floor*29+camera;
      if(y<h+35) this.block(block,y);
    }
    const targetY = baseY-(game.score+1)*29+camera;
    const suspendedY = Math.min(135, targetY-65);
    const fraction = Math.min(game.fallTime/FALL_DURATION,1);
    const miss = game.landing?.kind==='miss';
    const blockY = game.falling ? suspendedY + ((miss ? h+50 : targetY)-suspendedY)*fraction*fraction : suspendedY;
    const center = game.x+game.width/2;
    const trolley = center - Math.cos(game.phase)*12;
    c.fillStyle = ink.yellow; c.fillRect(trolley-9,craneY+9,18,10);
    c.fillStyle = ink.dark; c.fillRect(trolley-4,craneY+11,8,6);
    if (!game.falling && game.mode!=='over') {
      this.line(trolley,craneY+19,center,suspendedY-29,ink.yellow,1.2);
      this.line(center,suspendedY-29,center,suspendedY-20,ink.yellow,1.4);
      this.line(center,suspendedY-20,game.x+game.width*.2,suspendedY-5,ink.yellow,1);
      this.line(center,suspendedY-20,game.x+game.width*.8,suspendedY-5,ink.yellow,1);
    } else this.line(trolley,craneY+19,trolley,suspendedY-29,ink.yellow,1.2);
    if(game.mode!=='over') this.block({x:game.x,width:game.width,floor:game.score+1},blockY,true);
    if(game.debris && !reduced) {
      const y=baseY-game.debris.floor*29+camera+game.debrisTime*game.debrisTime*620;
      c.save();c.globalAlpha=Math.max(0,1-game.debrisTime/0.65);this.block(game.debris,y,true);c.restore();
    }
  }
}
