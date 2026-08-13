import { Component, ElementRef, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';

interface Node {
  x: number; y: number; vx: number; vy: number; r: number;
  // Click-spawned nodes only — ambient nodes never set these and live forever.
  temporary?: boolean;
  createdAt?: number;
  life?: number;
}

const CLICK_NODE_LIFE_MS = 5000;
const CLICK_NODE_FADE_MS = 900;
const MAX_CLICK_NODES = 40;

@Component({
  selector: 'app-node-background',
  templateUrl: './node-background.component.html',
  styleUrls: ['./node-background.component.css'],
})
export class NodeBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private nodes: Node[] = [];
  private w = 0;
  private h = 0;
  private raf: number | null = null;
  private resizeHandler = () => this.resize();
  private clickHandler = (e: MouseEvent) => this.onClick(e);
  private reduceMotion = false;
  private pendingRemovals: ReturnType<typeof setTimeout>[] = [];

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.resize();
    window.addEventListener('resize', this.resizeHandler);

    // The canvas itself sits BEHIND the page (fixed, z-index:-1 — see its
    // .css) so real content stays clickable; that same layering means the
    // canvas can never be the hit-test target of a click. Listen on the
    // document instead, and only treat it as a "click on the background"
    // when it didn't land on an actual interactive element.
    document.addEventListener('click', this.clickHandler);

    if (this.reduceMotion) {
      this.draw(); // single static frame, no animation loop
    } else {
      this.loop();
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.resizeHandler);
    document.removeEventListener('click', this.clickHandler);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    for (const t of this.pendingRemovals) clearTimeout(t);
  }

  private onClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, [role="button"]')) return;

    const clickNodeCount = this.nodes.filter((n) => n.temporary).length;
    if (clickNodeCount >= MAX_CLICK_NODES) return;

    const node: Node = {
      x: e.clientX,
      y: e.clientY,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 2.4,
      temporary: true,
      createdAt: performance.now(),
      life: CLICK_NODE_LIFE_MS,
    };
    this.nodes.push(node);

    const timer = setTimeout(() => {
      const idx = this.nodes.indexOf(node);
      if (idx !== -1) this.nodes.splice(idx, 1);
      if (this.reduceMotion) this.draw();
    }, CLICK_NODE_LIFE_MS);
    this.pendingRemovals.push(timer);

    if (this.reduceMotion) this.draw();
  }

  // 1 for ambient nodes and for most of a click-node's life; ramps down to 0
  // over the last CLICK_NODE_FADE_MS before it's actually removed.
  private nodeAlpha(n: Node): number {
    if (!n.temporary || n.createdAt === undefined || n.life === undefined) return 1;
    const age = performance.now() - n.createdAt;
    const fadeStart = n.life - CLICK_NODE_FADE_MS;
    if (age < fadeStart) return 1;
    return Math.max(0, 1 - (age - fadeStart) / CLICK_NODE_FADE_MS);
  }

  private resize() {
    const canvas = this.canvasRef.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    canvas.width = this.w * dpr;
    canvas.height = this.h * dpr;
    canvas.style.width = this.w + 'px';
    canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.initNodes();
  }

  private initNodes() {
    const count = Math.max(24, Math.round((this.w * this.h) / 30000));
    this.nodes = new Array(count).fill(0).map(() => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.3 + 1,
    }));
  }

  private accentRGB(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '154,69,172';
  }

  private draw() {
    const rgb = this.accentRGB();
    const ctx = this.ctx;
    const linkDist = 150;

    ctx.clearRect(0, 0, this.w, this.h);

    if (!this.reduceMotion) {
      for (const n of this.nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > this.w) n.vx *= -1;
        if (n.y < 0 || n.y > this.h) n.vy *= -1;
      }
    }

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i], b = this.nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDist) {
          const alpha = (1 - d / linkDist) * 0.3 * Math.min(this.nodeAlpha(a), this.nodeAlpha(b));
          if (alpha <= 0) continue;
          ctx.strokeStyle = `rgba(${rgb},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const n of this.nodes) {
      const alpha = this.nodeAlpha(n);
      if (alpha <= 0) continue;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${rgb},${0.7 * alpha})`;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private loop = () => {
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };
}
