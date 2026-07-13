import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  activeTab = 'users';

  users: any[] = [];
  loadingUsers = true;
  search = '';
  roleFilter = '';
  roleFilters = ['', 'student', 'tutor', 'admin'];

  courses: any[] = [];
  loadingCourses = false;

  assignForm = { tutorId: '', studentId: '', courseId: '' };
  assigning = false;
  assignFeedback = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'courses' && this.courses.length === 0) this.loadCourses();
    if (tab === 'assign' && this.courses.length === 0) this.loadCourses();
  }

  // ── Users ──────────────────────────────────────────────

  loadUsers() {
    this.loadingUsers = true;
    this.api.getUsers().subscribe({
      next: (data) => {
        this.users = data.users.map(u => ({ ...u, _newRole: u.role, _updating: false, _feedback: '' }));
        this.loadingUsers = false;
      },
      error: () => { this.loadingUsers = false; },
    });
  }

  get filteredUsers(): any[] {
    const q = this.search.toLowerCase();
    return this.users.filter(u => {
      const matchSearch = !q || (u.full_name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = !this.roleFilter || u.role === this.roleFilter;
      return matchSearch && matchRole;
    });
  }

  applyRoleChange(user: any) {
    if (user._newRole === user.role || user._updating) return;
    user._updating = true;
    user._feedback = '';
    this.api.updateUserRole(user.id, user._newRole).subscribe({
      next: (data) => {
        user.role = data.user.role;
        user._newRole = data.user.role;
        user._feedback = 'ok';
        user._updating = false;
        setTimeout(() => { user._feedback = ''; }, 2500);
      },
      error: () => {
        user._feedback = 'err';
        user._newRole = user.role;
        user._updating = false;
        setTimeout(() => { user._feedback = ''; }, 2500);
      },
    });
  }

  initials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Courses ────────────────────────────────────────────

  loadCourses() {
    this.loadingCourses = true;
    this.api.getCourses().subscribe({
      next: (data) => { this.courses = data.courses; this.loadingCourses = false; },
      error: () => { this.loadingCourses = false; },
    });
  }

  get publishedCount(): number {
    return this.courses.filter(c => c.is_published).length;
  }

  // ── Tutor Assignment ───────────────────────────────────

  get tutors(): any[] { return this.users.filter(u => u.role === 'tutor'); }
  get students(): any[] { return this.users.filter(u => u.role === 'student'); }

  createAssignment() {
    if (!this.assignForm.tutorId || !this.assignForm.studentId) return;
    this.assigning = true;
    this.assignFeedback = '';
    this.api.assignTutor({
      tutorId: this.assignForm.tutorId,
      studentId: this.assignForm.studentId,
      courseId: this.assignForm.courseId || undefined,
    }).subscribe({
      next: () => {
        this.assignFeedback = 'ok';
        this.assignForm = { tutorId: '', studentId: '', courseId: '' };
        this.assigning = false;
        setTimeout(() => { this.assignFeedback = ''; }, 3000);
      },
      error: () => {
        this.assignFeedback = 'err';
        this.assigning = false;
        setTimeout(() => { this.assignFeedback = ''; }, 3000);
      },
    });
  }
}
