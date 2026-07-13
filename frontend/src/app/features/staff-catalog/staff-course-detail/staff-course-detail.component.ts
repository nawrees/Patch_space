import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private userSvc: UserService,
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

  get totalModules(): number { return this.course?.modules?.length ?? 0; }
  get totalLessons(): number {
    return this.course?.modules?.reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0) ?? 0;
  }
  get totalLabs(): number {
    return this.course?.modules?.reduce((s: number, m: any) =>
      s + (m.lessons?.filter((l: any) => l.lab).length ?? 0), 0) ?? 0;
  }
}
