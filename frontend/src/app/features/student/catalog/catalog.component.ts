import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-course-catalog',
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css'],
})
export class CourseCatalogComponent implements OnInit {
  courses: any[] = [];
  filteredCourses: any[] = [];
  loading = true;
  selectedDifficulty = '';
  searchQuery = '';
  enrolledIds = new Set<string>();
  savedIds = new Set<string>();
  difficulties = ['All', 'beginner', 'intermediate', 'advanced'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCourses().subscribe({
      next: d => {
        this.courses = d.courses.filter(c => c.is_published);
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    this.api.getMyEnrollments().subscribe({
      next: d => d.enrollments.forEach((e: any) => this.enrolledIds.add(e.course_id)),
    });

    this.api.getSaved().subscribe({
      next: d => {
        this.savedIds = new Set(d.saved.map((s: any) => s.course?.id ?? s.course_id));
      },
    });
  }

  filterByDifficulty(d: string) {
    this.selectedDifficulty = d === 'All' ? '' : d;
    this.applyFilters();
  }

  applyFilters() {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredCourses = this.courses.filter(c => {
      const matchesDiff = !this.selectedDifficulty || c.difficulty === this.selectedDifficulty;
      const matchesSearch = !q
        || c.title?.toLowerCase().includes(q)
        || c.description?.toLowerCase().includes(q)
        || c.category?.toLowerCase().includes(q);
      return matchesDiff && matchesSearch;
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilters();
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedDifficulty = '';
    this.filteredCourses = [...this.courses];
  }

  enroll(courseId: string) {
    if (this.enrolledIds.has(courseId)) return;
    this.api.enrollInCourse(courseId).subscribe({
      next: () => this.enrolledIds.add(courseId),
    });
  }

  toggleSave(courseId: string) {
    if (this.savedIds.has(courseId)) {
      this.savedIds = new Set([...this.savedIds].filter(id => id !== courseId));
      this.api.unsaveCourse(courseId).subscribe({
        error: () => { this.savedIds = new Set([...this.savedIds, courseId]); },
      });
    } else {
      this.savedIds = new Set([...this.savedIds, courseId]);
      this.api.saveCourse(courseId).subscribe({
        error: () => { this.savedIds = new Set([...this.savedIds].filter(id => id !== courseId)); },
      });
    }
  }
}
