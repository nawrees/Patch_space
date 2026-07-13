import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-student-progress',
  templateUrl: './student-progress.component.html',
  styleUrls: ['./student-progress.component.css'],
})
export class StudentProgressComponent implements OnInit {
  enrollments: any[] = [];
  enrichedEnrollments: any[] = [];
  progress: any[] = [];
  loading = true;
  error = '';

  studentName = '';
  studentEmail = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const studentId = this.route.snapshot.paramMap.get('id')!;
    this.studentName = this.route.snapshot.queryParamMap.get('name') ?? 'Student';
    this.studentEmail = this.route.snapshot.queryParamMap.get('email') ?? '';

    this.api.getStudentOverview(studentId).subscribe({
      next: (data) => {
        this.enrollments = data.enrollments;
        this.progress = data.progress;

        if (this.enrollments.length === 0) { this.loading = false; return; }

        // Load full course data to get total lesson counts
        const courseRequests = this.enrollments.map(e => this.api.getCourse(e.course_id));
        forkJoin(courseRequests).subscribe({
          next: (courses) => {
            const courseMap = new Map<string, any>();
            courses.forEach((c: any) => courseMap.set(c.course.id, c.course));
            this.enrichedEnrollments = this.buildEnriched(courseMap);
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => {
        this.error = 'Could not load student data. You may not have access to this student.';
        this.loading = false;
      },
    });
  }

  private buildEnriched(courseMap: Map<string, any>): any[] {
    return this.enrollments.map(e => {
      const course = courseMap.get(e.course_id);
      const allLessons = course?.modules?.flatMap((m: any) => m.lessons ?? []) ?? [];
      const lessonProgress = allLessons.map((l: any) => {
        const p = this.progress.find((pr: any) => pr.lesson_id === l.id);
        return { title: l.title, completed: p?.status === 'completed', status: p?.status ?? 'not started' };
      });
      const completedLessons = lessonProgress.filter((l: any) => l.completed).length;
      const totalLessons = allLessons.length;
      const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
      return { ...e, lessons: lessonProgress, completedLessons, totalLessons, percent };
    });
  }

  get initials(): string {
    return this.studentName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  get totalCompleted(): number {
    return this.progress.filter(p => p.status === 'completed').length;
  }

  get overallPercent(): number {
    const total = this.enrichedEnrollments.reduce((s, e) => s + e.totalLessons, 0);
    if (total === 0) return 0;
    const done = this.enrichedEnrollments.reduce((s, e) => s + e.completedLessons, 0);
    return Math.round((done / total) * 100);
  }
}
