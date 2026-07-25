import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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

  pendingImageFile: File | null = null;
  thumbnailPreview: string | null = null;

  difficulties = DIFFICULTIES;
  categories = CATEGORIES;

  form = this.emptyForm();

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadCourses(); }

  loadCourses() {
    this.loading = true;
    this.api.getCourses({ mine: true }).subscribe({
      next: (data) => { this.courses = data.courses; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openForm() {
    this.form = this.emptyForm();
    this.editingId = null;
    this.formError = '';
    this.pendingImageFile = null;
    this.thumbnailPreview = null;
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
    this.pendingImageFile = null;
    this.thumbnailPreview = course.thumbnail_url || null;
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.pendingImageFile = null;
    this.thumbnailPreview = null;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.thumbnailPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeThumbnail() {
    this.pendingImageFile = null;
    this.thumbnailPreview = null;
    this.form.thumbnail_url = '';
  }

  private toSlug(title: string): string {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async saveCourse() {
    if (!this.form.title.trim()) return;
    this.saving = true;
    this.formError = '';

    try {
      const slug = this.toSlug(this.form.title);

      if (!this.editingId) {
        // ── CREATE ──────────────────────────────────────────────
        const created = await firstValueFrom(this.api.createCourse({
          title: this.form.title,
          description: this.form.description,
          category: this.form.category,
          difficulty: this.form.difficulty,
          is_published: this.form.is_published,
          slug,
        }));
        let finalCourse = created.course;

        if (this.pendingImageFile) {
          const uploaded = await firstValueFrom(
            this.api.uploadCourseThumbnail(finalCourse.id, this.pendingImageFile)
          );
          finalCourse = uploaded.course;
        }

        this.courses.unshift(finalCourse);
      } else {
        // ── EDIT ────────────────────────────────────────────────
        const payload: any = { ...this.form, slug };

        if (this.pendingImageFile) {
          const uploaded = await firstValueFrom(
            this.api.uploadCourseThumbnail(this.editingId, this.pendingImageFile)
          );
          payload.thumbnail_url = uploaded.thumbnail_url;
        }

        const updated = await firstValueFrom(this.api.updateCourse(this.editingId, payload));
        const idx = this.courses.findIndex(c => c.id === this.editingId);
        if (idx >= 0) this.courses[idx] = updated.course;
      }

      this.saving = false;
      this.closeForm();
    } catch (err: any) {
      this.formError = err?.error?.message || err?.message || 'Failed to save course.';
      this.saving = false;
    }
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
