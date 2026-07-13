import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-recommendations',
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.css'],
})
export class RecommendationsComponent implements OnInit {
  items: any[] = [];
  loading = true;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getRecommendations().subscribe({
      next: r => { this.items = r.recommendations ?? []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  go(item: any) {
    if (item.type === 'new_course') {
      this.router.navigate(['/student/catalog']);
    } else if (item.lessonId) {
      this.router.navigate(['/student/lesson', item.lessonId], { queryParams: { courseId: item.courseId } });
    } else {
      this.router.navigate(['/student/course', item.courseId]);
    }
  }
}
