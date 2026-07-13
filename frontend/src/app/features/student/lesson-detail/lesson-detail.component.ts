import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-lesson-detail',
  templateUrl: './lesson-detail.component.html',
  styleUrls: ['./lesson-detail.component.css'],
})
export class LessonDetailComponent implements OnInit {
  lesson: any = null;
  resources: any[] = [];
  progress: any = null;
  loading = true;
  error = '';
  saving = false;
  saveError = '';
  courseId = '';
  loadingResourceId = '';
  loadingViewId = '';
  loadingDlId = '';
  viewingResourceId = '';
  viewingUrl: SafeResourceUrl | null = null;
  viewingTitle = '';
  safeVideoUrl: SafeResourceUrl = '';

  // Q&A
  questions: any[] = [];
  newQuestion = '';
  loadingQ = false;
  submittingQ = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.queryParamMap.get('courseId') ?? '';
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadLesson(id);
  }

  loadLesson(id: string) {
    this.api.getLesson(id).subscribe({
      next: (data) => {
        this.lesson = data.lesson;
        if (this.lesson.video_url) {
          this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.lesson.video_url);
        }
        this.loadResources(id);
        this.loadProgress(id);
        this.loadQuestions(id);
      },
      error: () => {
        this.error = 'Lesson not found or you do not have access.';
        this.loading = false;
      },
    });
  }

  loadResources(lessonId: string) {
    this.api.getResources(lessonId).subscribe({
      next: (data) => { this.resources = data.resources; },
      error: () => {},
    });
  }

  loadQuestions(lessonId: string) {
    this.loadingQ = true;
    this.api.getLessonQuestions(lessonId).subscribe({
      next: d => { this.questions = d.questions ?? []; this.loadingQ = false; },
      error: () => { this.loadingQ = false; },
    });
  }

  submitQuestion() {
    if (!this.newQuestion.trim() || !this.lesson) return;
    this.submittingQ = true;
    this.api.askQuestion(this.lesson.id, this.newQuestion.trim()).subscribe({
      next: r => {
        this.questions = [r.question, ...this.questions];
        this.newQuestion = '';
        this.submittingQ = false;
      },
      error: () => { this.submittingQ = false; },
    });
  }

  timeAgo(iso: string): string {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  loadProgress(lessonId: string) {
    this.api.getMyProgress().subscribe({
      next: (data) => {
        this.progress = data.progress.find((p: any) => p.lesson_id === lessonId) ?? null;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get isComplete(): boolean {
    return this.progress?.status === 'completed';
  }

  markComplete() {
    if (this.isComplete || this.saving) return;
    this.saving = true;
    this.saveError = '';
    this.api.updateProgress(this.lesson.id, { status: 'completed' }).subscribe({
      next: (data) => {
        this.progress = data.progress;
        this.saving = false;
      },
      error: () => {
        this.saveError = 'Failed to save progress. Please try again.';
        this.saving = false;
      },
    });
  }

  togglePdfView(res: any) {
    if (this.viewingResourceId === res.id) { this.closePdfViewer(); return; }
    this.loadingViewId = res.id;
    this.api.getResourceSignedUrl(res.id).subscribe({
      next: data => {
        this.viewingResourceId = res.id;
        this.viewingTitle = res.title;
        this.viewingUrl = this.sanitizer.bypassSecurityTrustResourceUrl(data.url);
        this.loadingViewId = '';
      },
      error: () => { this.loadingViewId = ''; },
    });
  }

  closePdfViewer() {
    this.viewingResourceId = '';
    this.viewingUrl = null;
    this.viewingTitle = '';
  }

  downloadPdf(res: any) {
    this.loadingDlId = res.id;
    this.api.getResourceSignedUrl(res.id).subscribe({
      next: data => {
        const a = document.createElement('a');
        a.href = data.url;
        a.download = res.title.endsWith('.pdf') ? res.title : res.title + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.loadingDlId = '';
      },
      error: () => { this.loadingDlId = ''; },
    });
  }

  fmtBytes(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  openResource(resourceId: string) {
    this.loadingResourceId = resourceId;
    this.api.getResourceSignedUrl(resourceId).subscribe({
      next: (data) => { window.open(data.url, '_blank'); this.loadingResourceId = ''; },
      error: () => { this.loadingResourceId = ''; },
    });
  }
}
