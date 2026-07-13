import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const CATEGORIES = [
  'Network Security', 'Web Security', 'Cryptography', 'Malware Analysis',
  'Penetration Testing', 'Digital Forensics', 'OSINT', 'Cloud Security',
  'Application Security', 'Social Engineering',
];

@Component({
  selector: 'app-course-manage',
  templateUrl: './course-manage.component.html',
  styleUrls: ['./course-manage.component.css'],
})
export class CourseManageComponent implements OnInit {
  courses: any[] = [];
  loading = true;
  showForm = false;
  saving = false;
  formError = '';
  editingId: string | null = null;
  deletingCourse: any = null;
  deleting = false;

  difficulties = DIFFICULTIES;
  categories = CATEGORIES;

  form = this.emptyForm();

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadCourses(); }

  loadCourses() {
    this.loading = true;
    this.api.getCourses().subscribe({
      next: (data) => { this.courses = data.courses; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openForm() {
    this.form = this.emptyForm();
    this.editingId = null;
    this.formError = '';
    this.showForm = true;
  }

  openEdit(course: any) {
    this.form = {
      title: course.title ?? '',
      description: course.description ?? '',
      category: course.category ?? '',
      difficulty: course.difficulty ?? 'beginner',
      thumbnail_url: course.thumbnail_url ?? '',
      is_published: course.is_published ?? false,
    };
    this.editingId = course.id;
    this.formError = '';
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeForm() { this.showForm = false; this.editingId = null; }

  private toSlug(title: string): string {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  saveCourse() {
    if (!this.form.title.trim()) return;
    this.saving = true;
    this.formError = '';
    const payload = { ...this.form, slug: this.toSlug(this.form.title) };
    const req = this.editingId
      ? this.api.updateCourse(this.editingId, payload)
      : this.api.createCourse(payload);

    req.subscribe({
      next: (data) => {
        if (this.editingId) {
          const idx = this.courses.findIndex(c => c.id === this.editingId);
          if (idx >= 0) this.courses[idx] = data.course;
        } else {
          this.courses.unshift(data.course);
        }
        this.saving = false;
        this.closeForm();
      },
      error: (err) => {
        this.formError = err?.error?.message || 'Failed to save course.';
        this.saving = false;
      },
    });
  }

  deleteCourse(course: any) { this.deletingCourse = course; }

  confirmDelete() {
    if (!this.deletingCourse) return;
    this.deleting = true;
    this.api.deleteCourse(this.deletingCourse.id).subscribe({
      next: () => {
        this.courses = this.courses.filter(c => c.id !== this.deletingCourse!.id);
        this.deletingCourse = null;
        this.deleting = false;
      },
      error: () => { this.deleting = false; },
    });
  }

  private emptyForm() {
    return { title: '', description: '', category: '', difficulty: 'beginner', thumbnail_url: '', is_published: false };
  }
}
