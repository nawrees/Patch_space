import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

type LabState = 'checking' | 'idle' | 'provisioning' | 'running' | 'stopped' | 'expired' | 'error';

@Component({
  selector: 'app-lab',
  templateUrl: './lab.component.html',
  styleUrls: ['./lab.component.css'],
})
export class LabComponent implements OnInit, OnDestroy {
  @Input() lab!: any;

  state: LabState = 'checking';
  session: any = null;
  submissions: any[] = [];
  flagInput = '';
  flagResult: { isCorrect: boolean; attempts: number } | null = null;
  submitting = false;
  stopping = false;
  showLogs = false;
  showInstructions = false;
  logs = '';
  timerDisplay = '';
  timerWarn = false;
  errorMsg = '';

  // Difficulty rating
  avgRating: number | null = null;
  totalRatings = 0;
  userRating: number | null = null;
  ratingSubmitting = false;
  readonly difficultyLevels = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];

  private pollId: any;
  private timerId: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Seed avg rating from the lab object (populated by getLesson)
    this.avgRating = this.lab.avgRating ?? null;
    this.totalRatings = this.lab.totalRatings ?? 0;
    this.checkSession();
  }

  ngOnDestroy() {
    this.clearAll();
  }

  get stateLabel(): string {
    const map: Record<LabState, string> = {
      checking: 'Checking', idle: 'Ready', provisioning: 'Starting',
      running: 'Live', stopped: 'Stopped', expired: 'Expired', error: 'Error',
    };
    return map[this.state] ?? this.state;
  }

  checkSession() {
    this.state = 'checking';
    this.api.getLabSession(this.lab.id).subscribe({
      next: r => {
        this.session = r.session;
        this.submissions = r.submissions ?? [];
        if (r.userRating) this.userRating = r.userRating;
        this.applyState();
      },
      error: () => { this.state = 'idle'; },
    });
  }

  applyState() {
    if (!this.session) { this.state = 'idle'; return; }
    const s = this.session.status as LabState;
    this.state = s;
    if (s === 'provisioning') {
      this.startPolling(3000);
    } else if (s === 'running') {
      this.startTimer();
      this.startPolling(10000);
    } else {
      this.clearAll();
    }
  }

  start() {
    this.state = 'provisioning';
    this.flagResult = null;
    this.api.startLab(this.lab.id).subscribe({
      next: r => {
        this.session = r.session;
        this.startPolling(3000);
      },
      error: err => {
        this.errorMsg = err?.error?.error || 'Failed to start lab';
        this.state = 'error';
      },
    });
  }

  stop() {
    this.stopping = true;
    this.api.stopLab(this.lab.id).subscribe({
      next: () => {
        this.clearAll();
        this.state = 'stopped';
        this.stopping = false;
      },
      error: () => { this.stopping = false; },
    });
  }

  restart() {
    this.session = null;
    this.submissions = [];
    this.flagResult = null;
    this.flagInput = '';
    this.logs = '';
    this.errorMsg = '';
    this.clearAll();
    this.state = 'idle';
  }

  submitFlag() {
    if (!this.flagInput.trim() || this.submitting) return;
    this.submitting = true;
    this.api.submitFlag(this.lab.id, this.flagInput.trim()).subscribe({
      next: r => {
        this.flagResult = { isCorrect: r.isCorrect, attempts: r.attemptsUsed };
        this.submitting = false;
        if (r.isCorrect) {
          this.clearAll();
          this.state = 'stopped';
        } else {
          this.flagInput = '';
          // Refresh submissions list
          this.api.getLabSession(this.lab.id).subscribe({
            next: r2 => { this.submissions = r2.submissions ?? []; },
          });
        }
      },
      error: () => { this.submitting = false; },
    });
  }

  rateLabDifficulty(rating: number) {
    if (this.ratingSubmitting) return;
    this.ratingSubmitting = true;
    this.api.rateLab(this.lab.id, rating).subscribe({
      next: r => {
        this.userRating = r.userRating;
        this.avgRating = r.avgRating;
        this.totalRatings = r.totalRatings;
        this.ratingSubmitting = false;
      },
      error: () => { this.ratingSubmitting = false; },
    });
  }

  difficultyLabel(avg: number): string {
    if (avg <= 1.5) return 'Very Easy';
    if (avg <= 2.5) return 'Easy';
    if (avg <= 3.5) return 'Medium';
    if (avg <= 4.5) return 'Hard';
    return 'Very Hard';
  }

  toggleLogs() {
    if (!this.showLogs) {
      this.api.getLabLogs(this.lab.id).subscribe({
        next: r => { this.logs = r.logs; this.showLogs = true; },
        error: () => { this.logs = 'Failed to fetch logs.'; this.showLogs = true; },
      });
    } else {
      this.showLogs = false;
    }
  }

  private startPolling(ms: number) {
    this.clearPolling();
    this.pollId = setInterval(() => {
      this.api.getLabSession(this.lab.id).subscribe({
        next: r => {
          const prev = this.state;
          this.session = r.session;
          this.submissions = r.submissions ?? [];
          if (!r.session || !['provisioning', 'running'].includes(r.session.status)) {
            this.clearPolling();
          }
          if (r.session?.status !== prev) this.applyState();
        },
      });
    }, ms);
  }

  private startTimer() {
    this.clearTimer();
    this.timerId = setInterval(() => {
      if (!this.session?.expires_at) return;
      const secs = Math.max(0, Math.floor((new Date(this.session.expires_at).getTime() - Date.now()) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      this.timerDisplay = `${m}:${s.toString().padStart(2, '0')}`;
      this.timerWarn = secs < 300; // warn below 5 min
      if (secs === 0) {
        this.clearAll();
        this.state = 'expired';
      }
    }, 1000);
  }

  private clearPolling() {
    if (this.pollId) { clearInterval(this.pollId); this.pollId = null; }
  }

  private clearTimer() {
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
  }

  private clearAll() {
    this.clearPolling();
    this.clearTimer();
  }
}
