import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../core/services/user.service';
import { ApiService } from '../core/services/api.service';

type TermLine = { kind: 'cmd' | 'result' | 'pill'; text: string; cls?: string };

// Same beats as the previewed terminal-typewriter artifact: type the
// command, a believable pause while it "executes", then the result.
const TERM_STEPS: Array<{ kind: 'cmd' | 'result' | 'pill'; text: string; cls?: string }> = [
  { kind: 'cmd', text: 'docker start lab-cmd-injection-01' },
  { kind: 'result', text: '✓ container running — access granted', cls: 'term-ok' },
  { kind: 'cmd', text: 'curl target/api?cmd=whoami' },
  { kind: 'result', text: 'www-data', cls: 'term-ok' },
  { kind: 'cmd', text: 'submit flag' },
  { kind: 'pill', text: 'FLAG CAPTURED' },
];
const TYPE_MS = 32;
const AFTER_CMD_PAUSE = 450;
const AFTER_RESULT_PAUSE = 480;
const HOLD_MS = 2600;
const RESTART_PAUSE = 500;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  constructor(private user: UserService, private api: ApiService) {}

  // ── Hero terminal typing loop ───────────────────────────
  termLines: TermLine[] = [];
  currentTypingText: string | null = null;
  private reduceMotion = false;
  private termRunToken = 0;
  private termTimer: ReturnType<typeof setTimeout> | null = null;

  private termSleep(ms: number): Promise<void> {
    return new Promise((resolve) => { this.termTimer = setTimeout(resolve, ms); });
  }

  private async runTerminal() {
    const token = ++this.termRunToken;
    this.termLines = [];
    this.currentTypingText = null;

    for (const step of TERM_STEPS) {
      if (token !== this.termRunToken) return;

      if (step.kind === 'cmd') {
        if (this.reduceMotion) {
          this.currentTypingText = step.text;
        } else {
          this.currentTypingText = '';
          for (let i = 0; i < step.text.length; i++) {
            if (token !== this.termRunToken) return;
            this.currentTypingText += step.text[i];
            await this.termSleep(TYPE_MS);
          }
        }
        this.termLines = [...this.termLines, { kind: 'cmd', text: step.text }];
        this.currentTypingText = null;
        await this.termSleep(this.reduceMotion ? 0 : AFTER_CMD_PAUSE);
      } else {
        this.termLines = [...this.termLines, step];
        await this.termSleep(this.reduceMotion ? 0 : AFTER_RESULT_PAUSE);
      }
    }

    if (this.reduceMotion) return; // static end-state, no auto-loop
    await this.termSleep(HOLD_MS);
    if (token !== this.termRunToken) return;
    this.termLines = [];
    await this.termSleep(RESTART_PAUSE);
    if (token !== this.termRunToken) return;
    this.runTerminal();
  }

  ngOnDestroy() {
    this.termRunToken++; // stop any in-flight loop
    if (this.termTimer) clearTimeout(this.termTimer);
  }

  // Defaults shown until (or if) the admin-editable settings load — keeps
  // the page from ever looking blank/broken on a slow or failed fetch.
  heroEyebrow = 'Cybersecurity training';
  heroTitle = 'Learn to break things safely.';
  heroSubtitle = "Hands-on courses and real Docker-backed labs for people who'd rather exploit a vulnerability than just read about one.";
  ctaTitle = 'Ready to start your first lab?';
  ctaBody = 'Create an account and start learning today.';

  ngOnInit() {
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.runTerminal();

    this.api.getSiteSettings().subscribe({
      next: (data) => {
        const s = data.settings;
        if (s.home_hero_eyebrow) this.heroEyebrow = s.home_hero_eyebrow;
        if (s.home_hero_title) this.heroTitle = s.home_hero_title;
        if (s.home_hero_subtitle) this.heroSubtitle = s.home_hero_subtitle;
        if (s.home_cta_title) this.ctaTitle = s.home_cta_title;
        if (s.home_cta_body) this.ctaBody = s.home_cta_body;
        if (Array.isArray(s.home_features) && s.home_features.length) this.features = s.home_features;
      },
      error: () => {}, // keep the hardcoded defaults above
    });
  }

  // The nav no longer needs this (it's always visible, see AppComponent) —
  // but the hero and closing CTA are direct sign-up prompts, which don't
  // make sense to show someone who already has an account, whatever their role.
  get isAuthenticated(): boolean {
    return this.user.getUserRole() !== null;
  }

  get dashboardLink(): string {
    const role = this.user.getUserRole();
    if (role === 'admin') return '/admin';
    if (role === 'tutor') return '/tutor';
    return '/student';
  }

  features = [
    {
      icon: 'box',
      title: 'Hands-on Docker labs',
      body: 'Every lab boots a real, isolated container just for you — exploit it, break it, capture the flag. Nothing simulated.',
    },
    {
      icon: 'book-open',
      title: 'Structured courses',
      body: 'Lessons build on each other with tracked progress, so you always know what to tackle next.',
    },
    {
      icon: 'flame',
      title: 'Streaks & badges',
      body: 'Daily streaks and earned badges turn steady practice into visible progress.',
    },
    {
      icon: 'message-circle',
      title: 'Tutor support',
      body: 'Stuck on a lab? Ask a real tutor and get an answer, not a canned hint.',
    },
  ];
}
