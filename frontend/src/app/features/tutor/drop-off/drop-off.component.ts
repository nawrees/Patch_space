import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-drop-off',
  templateUrl: './drop-off.component.html',
  styleUrls: ['./drop-off.component.css'],
})
export class DropOffComponent implements OnInit {
  courses: any[] = [];
  selectedCourseId = '';
  funnel: any[] = [];
  grouped: { moduleTitle: string; lessons: any[] }[] = [];
  totalEnrolled = 0;
  loading = false;
  biggestDrop: any = null;
  avgCompletion: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCourses().subscribe({
      next: r => { this.courses = r.courses ?? []; },
    });
  }

  loadFunnel(courseId: string) {
    if (!courseId) { this.funnel = []; return; }
    this.loading = true;
    this.api.getDropOff(courseId).subscribe({
      next: r => {
        this.funnel = r.funnel ?? [];
        this.totalEnrolled = r.totalEnrolled;
        this.buildGroups();
        this.biggestDrop = this.funnel.reduce((a: any, b: any) => (!a || b.dropOffRate > a.dropOffRate) ? b : a, null);
        this.avgCompletion = this.funnel.length
          ? Math.round(this.funnel.reduce((s: number, r: any) => s + r.completionRate, 0) / this.funnel.length)
          : null;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  buildGroups() {
    const map = new Map<string, any[]>();
    this.funnel.forEach(row => {
      if (!map.has(row.moduleTitle)) map.set(row.moduleTitle, []);
      map.get(row.moduleTitle)!.push(row);
    });
    this.grouped = Array.from(map.entries()).map(([moduleTitle, lessons]) => ({ moduleTitle, lessons }));
  }

  pct(n: number, total: number): number {
    return total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 0;
  }

  typeIcon(type: string): string {
    return type === 'video' ? '▶' : type === 'lab' ? '🔬' : '📄';
  }
}
