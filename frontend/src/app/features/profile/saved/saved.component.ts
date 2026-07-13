import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-saved',
  templateUrl: './saved.component.html',
  styleUrls: ['./saved.component.css'],
})
export class SavedComponent implements OnInit {
  saved: any[] = [];
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getSaved().subscribe({
      next: d => { this.saved = d.saved; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  unsave(item: any) {
    const courseId = item.course?.id;
    this.saved = this.saved.filter(s => s !== item);
    this.api.unsaveCourse(courseId).subscribe({
      error: () => this.saved.push(item),
    });
  }
}
