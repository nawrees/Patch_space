import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

interface DayCell { date: string; count: number; label: string; }

@Component({
  selector: 'app-study-calendar',
  templateUrl: './study-calendar.component.html',
  styleUrls: ['./study-calendar.component.css'],
})
export class StudyCalendarComponent implements OnInit {
  pace: any = null;
  heatmap: DayCell[] = [];
  estimatedCompletion: Date | null = null;
  loading = true;
  skArr = Array(35).fill(0);

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Pace stats from backend
    this.api.getMyPaceStats().subscribe({
      next: r => {
        this.pace = r.paceStats;
        if (this.pace) this.buildHeatmap(this.pace.byDay);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    // Rough completion estimate using enrollment + progress data
    this.api.getMyProgress().subscribe({
      next: pr => {
        const done = (pr.progress ?? []).filter((p: any) => p.status === 'completed').length;
        if (this.pace?.lessonsPerDay > 0) {
          const remaining = Math.max(0, (this.pace.completedLessons + 5) - done);
          const days = Math.ceil(remaining / this.pace.lessonsPerDay);
          this.estimatedCompletion = new Date(Date.now() + days * 86400000);
        }
      },
    });
  }

  buildHeatmap(byDay: Record<string, number>) {
    this.heatmap = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const count = byDay?.[key] ?? 0;
      this.heatmap.push({ date: key, count, label: `${key}: ${count} lesson${count !== 1 ? 's' : ''}` });
    }
  }
}
