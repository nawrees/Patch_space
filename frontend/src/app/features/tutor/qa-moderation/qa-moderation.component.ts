import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-qa-moderation',
  templateUrl: './qa-moderation.component.html',
  styleUrls: ['./qa-moderation.component.css'],
})
export class QaModerationComponent implements OnInit {
  all: any[] = [];
  filtered: any[] = [];
  loading = true;
  filter: 'all' | 'urgent' | 'pending' | 'answered' | 'dismissed' = 'all';
  activeReply: string | null = null;
  replyText = '';
  submitting = false;
  dismissing: string | null = null;

  get urgentCount() { return this.all.filter(q => q.urgency === 'urgent').length; }
  get pendingCount() { return this.all.filter(q => q.urgency === 'pending').length; }

  constructor(private api: ApiService, private user: UserService) {}

  ngOnInit() { this.loadQuestions(); }

  // Editing an existing answer is restricted server-side (RLS) to whoever
  // wrote it, or an admin — mirror that here so the button doesn't invite a
  // click that's just going to fail.
  canEditAnswer(q: any): boolean {
    if (!q.answer) return true; // not answered yet — anyone assigned can reply
    return this.user.isAdmin() || q.answered_by === this.user.getCurrentUser()?.user.id;
  }

  loadQuestions() {
    this.loading = true;
    this.api.getAllQuestions().subscribe({
      next: r => {
        this.all = r.questions ?? [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setFilter(f: typeof this.filter) {
    this.filter = f;
    this.applyFilter();
  }

  applyFilter() {
    this.filtered = this.filter === 'all'
      ? this.all
      : this.all.filter(q => q.urgency === this.filter);
  }

  startReply(id: string, existing: string | null) {
    this.activeReply = id;
    this.replyText = existing ?? '';
  }

  cancelReply() {
    this.activeReply = null;
    this.replyText = '';
  }

  submitAnswer(id: string) {
    if (!this.replyText.trim()) return;
    this.submitting = true;
    this.api.answerQuestion(id, this.replyText.trim()).subscribe({
      next: r => {
        const idx = this.all.findIndex(q => q.id === id);
        if (idx !== -1) this.all[idx] = { ...r.question, urgency: 'answered' };
        this.applyFilter();
        this.activeReply = null;
        this.replyText = '';
        this.submitting = false;
      },
      error: () => { this.submitting = false; },
    });
  }

  dismiss(id: string) {
    this.dismissing = id;
    this.api.dismissQuestion(id).subscribe({
      next: r => {
        const idx = this.all.findIndex(q => q.id === id);
        if (idx !== -1) this.all[idx] = { ...r.question, urgency: 'dismissed' };
        this.applyFilter();
        this.dismissing = null;
      },
      error: () => { this.dismissing = null; },
    });
  }

  initial(name: string): string {
    return name ? name.trim()[0].toUpperCase() : '?';
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
