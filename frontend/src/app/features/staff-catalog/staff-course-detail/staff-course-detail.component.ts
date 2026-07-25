import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-staff-course-detail',
  templateUrl: './staff-course-detail.component.html',
  styleUrls: ['./staff-course-detail.component.css'],
})
export class StaffCourseDetailComponent implements OnInit {
  course: any = null;
  loading = true;
  error = '';
  expanded = new Set<string>();
  backRoute = '/tutor/courses';

  // Read-only lesson-detail preview (theory content / video / lab
  // instructions) — fetched lazily per lesson and cached so re-expanding
  // doesn't re-fetch.
  expandedLessonId: string | null = null;
  detailLoadingId: string | null = null;
  detailError = '';
  lessonDetails: Record<string, any> = {};
  safeVideoUrls: Record<string, SafeResourceUrl> = {};

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private userSvc: UserService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    const role = this.userSvc.getUserRole();
    this.backRoute = role === 'admin' ? '/admin/courses' : '/tutor/courses';

    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCourse(id).subscribe({
      next: d => {
        this.course = d.course;
        if (this.course.modules?.length) this.expanded.add(this.course.modules[0].id);
        this.loading = false;
      },
      error: () => {
        this.error = 'Course not found or access denied.';
        this.loading = false;
      },
    });
  }

  toggle(id: string) {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
  }

  toggleLessonDetail(lessonId: string) {
    if (this.expandedLessonId === lessonId) {
      this.expandedLessonId = null;
      return;
    }
    this.expandedLessonId = lessonId;
    this.detailError = '';
    if (this.lessonDetails[lessonId]) return; // already cached

    this.detailLoadingId = lessonId;
    this.api.getLesson(lessonId).subscribe({
      next: (d) => {
        this.lessonDetails[lessonId] = d.lesson;
        if (d.lesson.video_url) {
          this.safeVideoUrls[lessonId] = this.sanitizer.bypassSecurityTrustResourceUrl(d.lesson.video_url);
        }
        this.detailLoadingId = null;
      },
      error: () => {
        this.detailError = 'Could not load this lesson\'s content.';
        this.detailLoadingId = null;
      },
    });
  }

  get totalModules(): number { return this.course?.modules?.length ?? 0; }
  get totalLessons(): number {
    return this.course?.modules?.reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0) ?? 0;
  }
  get totalLabs(): number {
    return this.course?.modules?.reduce((s: number, m: any) =>
      s + (m.lessons?.filter((l: any) => l.lab).length ?? 0), 0) ?? 0;
  }
}
