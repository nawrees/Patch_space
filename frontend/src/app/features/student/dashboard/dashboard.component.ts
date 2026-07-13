import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class StudentDashboardComponent implements OnInit {
  enrollments: any[] = [];
  progress: any[] = [];
  courseDetails = new Map<string, any>();
  loading = true;
  currentUser: any = null;
  totalCompleted = 0;
  overallPct = 0;

  constructor(private api: ApiService, private user: UserService) {
    this.currentUser = this.user.getCurrentUser();
  }

  ngOnInit() {
    this.api.getMyEnrollments().subscribe({
      next: data => {
        this.enrollments = data.enrollments;
        if (this.enrollments.length === 0) { this.loading = false; return; }

        const courseRequests = this.enrollments.map(e => this.api.getCourse(e.course_id));
        forkJoin([...courseRequests, this.api.getMyProgress()]).subscribe({
          next: results => {
            const progressResult = results[results.length - 1] as any;
            this.progress = progressResult.progress;
            results.slice(0, -1).forEach((r: any) => {
              this.courseDetails.set(r.course.id, r.course);
            });
            this.totalCompleted = this.progress.filter(p => p.status === 'completed').length;
            const allLessons = Array.from(this.courseDetails.values())
              .flatMap(c => c.modules?.flatMap((m: any) => m.lessons ?? []) ?? []);
            this.overallPct = allLessons.length > 0
              ? Math.round((this.totalCompleted / allLessons.length) * 100)
              : 0;
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => { this.loading = false; },
    });
  }

  getProgressPercent(enrollment: any): number {
    const course = this.courseDetails.get(enrollment.course_id);
    const lessons: any[] = course?.modules?.flatMap((m: any) => m.lessons ?? []) ?? [];
    if (lessons.length === 0) return 0;
    const completed = lessons.filter((l: any) =>
      this.progress.some((p: any) => p.lesson_id === l.id && p.status === 'completed')
    ).length;
    return Math.round((completed / lessons.length) * 100);
  }
}
