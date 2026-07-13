import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css'],
})
export class CourseDetailComponent implements OnInit {
  course: any = null;
  progress: any[] = [];
  loading = true;
  error = '';
  expandedModules = new Set<string>();
  isSaved = false;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCourse(id).subscribe({
      next: (data) => {
        this.course = data.course;
        if (this.course.modules?.length > 0) {
          this.expandedModules.add(this.course.modules[0].id);
        }
        this.api.getMyProgress().subscribe({
          next: (p) => { this.progress = p.progress; this.loading = false; },
          error: () => { this.loading = false; },
        });
      },
      error: () => {
        this.error = 'Course not found or you do not have access.';
        this.loading = false;
      },
    });

    this.api.getSaved().subscribe({
      next: d => {
        const courseId = this.route.snapshot.paramMap.get('id')!;
        this.isSaved = d.saved.some((s: any) => (s.course?.id ?? s.course_id) === courseId);
      },
    });
  }

  toggleSave() {
    const courseId = this.route.snapshot.paramMap.get('id')!;
    if (this.isSaved) {
      this.isSaved = false;
      this.api.unsaveCourse(courseId).subscribe({ error: () => this.isSaved = true });
    } else {
      this.isSaved = true;
      this.api.saveCourse(courseId).subscribe({ error: () => this.isSaved = false });
    }
  }

  toggleModule(id: string) {
    if (this.expandedModules.has(id)) this.expandedModules.delete(id);
    else this.expandedModules.add(id);
  }

  isLessonComplete(lessonId: string): boolean {
    return this.progress.some(p => p.lesson_id === lessonId && p.status === 'completed');
  }

  getTotalLessons(): number {
    return this.course?.modules?.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0) ?? 0;
  }

  getCompletedLessons(): number {
    const all = this.course?.modules?.flatMap((m: any) => m.lessons ?? []) ?? [];
    return all.filter((l: any) => this.isLessonComplete(l.id)).length;
  }

  getCourseProgress(): number {
    const total = this.getTotalLessons();
    return total === 0 ? 0 : Math.round((this.getCompletedLessons() / total) * 100);
  }
}
