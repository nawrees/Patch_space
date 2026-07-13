import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';

type Tab = 'students' | 'analytics' | 'qa';

@Component({
  selector: 'app-tutor-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class TutorDashboardComponent implements OnInit {
  students: any[] = [];
  loading = true;
  activeTab: Tab = 'students';
  urgentQaCount = 0;
  currentUser: any = null;

  constructor(private api: ApiService, private user: UserService) {
    this.currentUser = this.user.getCurrentUser();
  }

  ngOnInit() {
    this.api.getMyStudents().subscribe({
      next: d => { this.students = d.students; this.loading = false; },
      error: () => { this.loading = false; },
    });

    // Pre-load urgent count for badge
    this.api.getAllQuestions({ unansweredOnly: true }).subscribe({
      next: r => {
        this.urgentQaCount = (r.questions ?? []).filter((q: any) => {
          const age = Date.now() - new Date(q.created_at).getTime();
          return age > 24 * 60 * 60 * 1000;
        }).length;
      },
    });
  }

  initial(name: string): string {
    return name ? name.trim()[0].toUpperCase() : '?';
  }
}
