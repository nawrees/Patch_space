import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-staff-catalog',
  templateUrl: './staff-catalog.component.html',
  styleUrls: ['./staff-catalog.component.css'],
})
export class StaffCatalogComponent implements OnInit {
  courses: any[] = [];
  filteredCourses: any[] = [];
  loading = true;
  query = '';
  difficulty = '';
  statusFilter = '';
  isAdmin = false;
  routePrefix = '/tutor';
  difficulties = ['All', 'beginner', 'intermediate', 'advanced'];

  constructor(private api: ApiService, private userSvc: UserService) {}

  ngOnInit() {
    const role = this.userSvc.getUserRole();
    this.isAdmin = role === 'admin';
    this.routePrefix = this.isAdmin ? '/admin' : '/tutor';

    this.api.getCourses().subscribe({
      next: d => {
        this.courses = d.courses;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters() {
    const q = this.query.trim().toLowerCase();
    this.filteredCourses = this.courses.filter(c => {
      if (this.difficulty && c.difficulty !== this.difficulty) return false;
      if (this.statusFilter === 'published' && !c.is_published) return false;
      if (this.statusFilter === 'draft' && c.is_published) return false;
      if (!q) return true;
      return c.title?.toLowerCase().includes(q)
          || c.description?.toLowerCase().includes(q)
          || c.category?.toLowerCase().includes(q);
    });
  }

  resetFilters() {
    this.query = '';
    this.difficulty = '';
    this.statusFilter = '';
    this.filteredCourses = [...this.courses];
  }
}
