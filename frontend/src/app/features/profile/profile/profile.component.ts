import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { BADGES, Badge } from '../badges/badges.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profile: any = null;
  enrollments: any[] = [];
  statsLoading = true;
  stats = { enrollments: 0, completed: 0, labsSolved: 0, overallPct: 0 };

  isTutor = false;
  myStudents: any[] = [];
  tutorStats = { studentsCount: 0, coursesCreated: 0, questionsAnswered: 0, pendingQuestions: 0 };

  earnedBadges: Badge[] = [];

  // BADGES is ordered ascending by required streak length, and the filter
  // in loadBadges() preserves that order, so the last earned badge is
  // always the highest tier reached — the one worth featuring.
  get featuredBadge(): Badge | null {
    return this.earnedBadges.length ? this.earnedBadges[this.earnedBadges.length - 1] : null;
  }
  get olderBadges(): Badge[] {
    return this.earnedBadges.slice(0, -1);
  }

  constructor(private userSvc: UserService, private api: ApiService) {}

  ngOnInit() {
    const u = this.userSvc.getCurrentUser();
    this.profile = u?.profile ?? null;
    this.isTutor = this.profile?.role === 'tutor';

    // Subscribe so navbar changes (after Manage Account edit) reflect here too
    this.userSvc.currentUser$.subscribe(cu => {
      if (cu) this.profile = cu.profile;
    });

    if (this.isTutor) {
      this.loadTutorStats();
    } else {
      this.loadStats();
      this.loadBadges();
    }
  }

  // Same earned-badge rule as the full Badges page (badges.component.ts) —
  // streak-based, so only relevant outside the tutor view.
  private loadBadges() {
    this.api.getStreak().subscribe({
      next: (s) => {
        this.earnedBadges = BADGES.filter((b) => s.longest_streak >= b.required);
      },
      error: () => {},
    });
  }

  get initial(): string {
    return this.profile?.full_name?.trim()[0]?.toUpperCase() ?? '?';
  }

  initials(name: string): string {
    return name ? name.trim()[0].toUpperCase() : '?';
  }

  private loadTutorStats() {
    const myId = this.userSvc.getCurrentUser()?.user.id;

    this.api.getMyStudents().subscribe({
      next: d => {
        this.myStudents = d.students ?? [];
        this.tutorStats.studentsCount = this.myStudents.length;
        this.statsLoading = false;
      },
      error: () => { this.statsLoading = false; },
    });

    this.api.getCourses().subscribe({
      next: d => {
        const courses = d.courses ?? [];
        this.tutorStats.coursesCreated = courses.filter((c: any) => c.created_by === myId).length;
      },
    });

    this.api.getAllQuestions().subscribe({
      next: d => {
        const questions = d.questions ?? [];
        this.tutorStats.questionsAnswered = questions.filter((q: any) => q.answered_by === myId).length;
        this.tutorStats.pendingQuestions = questions.filter((q: any) => q.urgency !== 'answered').length;
      },
    });
  }

  private loadStats() {
    this.api.getMyEnrollments().subscribe({
      next: d => {
        this.enrollments = d.enrollments ?? [];
        this.stats.enrollments = this.enrollments.length;

        if (this.enrollments.length === 0) { this.statsLoading = false; return; }

        // Get progress + course details in parallel
        Promise.all([
          this.api.getMyProgress().toPromise(),
          ...this.enrollments.map(e => this.api.getCourse(e.course_id).toPromise()),
        ]).then(([progressRes, ...courseResults]: any[]) => {
          const progress: any[] = progressRes?.progress ?? [];
          this.stats.completed = progress.filter((p: any) => p.status === 'completed').length;

          courseResults.forEach((r: any, i: number) => {
            const course = r?.course;
            if (!course) return;
            const lessons: any[] = course.modules?.flatMap((m: any) => m.lessons ?? []) ?? [];
            const done = lessons.filter((l: any) =>
              progress.some((p: any) => p.lesson_id === l.id && p.status === 'completed')
            ).length;
            this.enrollments[i]._pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
          });

          const allLessons = courseResults.flatMap((r: any) =>
            r?.course?.modules?.flatMap((m: any) => m.lessons ?? []) ?? []
          );
          this.stats.overallPct = allLessons.length
            ? Math.round((this.stats.completed / allLessons.length) * 100) : 0;

          this.statsLoading = false;
        }).catch(() => { this.statsLoading = false; });
      },
      error: () => { this.statsLoading = false; },
    });
  }
}
