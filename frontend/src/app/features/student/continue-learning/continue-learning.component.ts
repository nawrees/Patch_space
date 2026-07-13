import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-continue-learning',
  templateUrl: './continue-learning.component.html',
  styleUrls: ['./continue-learning.component.css'],
})
export class ContinueLearningComponent implements OnInit {
  item: any = null;
  loading = true;

  constructor(private api: ApiService, public router: Router) {}

  ngOnInit() {
    this.api.getContinueLearning().subscribe({
      next: r => { this.item = r.continueLearning; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  resume() {
    if (!this.item) return;
    this.router.navigate(['/student/lesson', this.item.lessonId], {
      queryParams: { courseId: this.item.courseId, ts: this.item.videoTimestamp || 0 },
    });
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
