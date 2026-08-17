import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  required: number;
}

export const BADGES: Badge[] = [
  { id: 'first-step',   icon: 'sprout', title: 'First Step',   description: 'Maintained a 1-day streak',    required: 1   },
  { id: 'on-fire',      icon: 'flame',  title: 'On Fire',       description: 'Maintained a 3-day streak',    required: 3   },
  { id: 'momentum',     icon: 'zap',    title: 'Momentum',      description: 'Maintained a 7-day streak',    required: 7   },
  { id: 'dedicated',    icon: 'gem',    title: 'Dedicated',     description: 'Maintained a 14-day streak',   required: 14  },
  { id: 'unstoppable',  icon: 'trophy', title: 'Unstoppable',   description: 'Maintained a 30-day streak',   required: 30  },
  { id: 'legend',       icon: 'crown',  title: 'Legend',        description: 'Maintained a 60-day streak',   required: 60  },
  { id: 'streak-master',icon: 'rocket', title: 'Streak Master', description: 'Maintained a 100-day streak',  required: 100 },
];

@Component({
  selector: 'app-badges',
  templateUrl: './badges.component.html',
  styleUrls: ['./badges.component.css'],
})
export class BadgesComponent implements OnInit {
  loading = true;
  currentStreak = 0;
  longestStreak = 0;
  activeToday = false;

  readonly badges = BADGES;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getStreak().subscribe({
      next: s => {
        this.currentStreak  = s.current_streak;
        this.longestStreak  = s.longest_streak;
        this.activeToday    = s.active_today;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  isEarned(badge: Badge): boolean {
    return this.longestStreak >= badge.required;
  }

  earnedCount(): number {
    return this.badges.filter(b => this.isEarned(b)).length;
  }

  nextBadge(): Badge | null {
    return this.badges.find(b => !this.isEarned(b)) ?? null;
  }

  progressToNext(): number {
    const next = this.nextBadge();
    if (!next) return 100;
    const prev = this.badges[this.badges.indexOf(next) - 1];
    const from = prev ? prev.required : 0;
    const span = next.required - from;
    const done = Math.min(this.longestStreak, next.required) - from;
    return Math.max(0, Math.round((done / span) * 100));
  }
}
