import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

type Panel = 'module' | 'lesson' | 'collaborators' | null;

@Component({
  selector: 'app-course-content',
  templateUrl: './course-content.component.html',
  styleUrls: ['./course-content.component.css'],
})
export class CourseContentComponent implements OnInit {
  course: any = null;
  loading = true;
  error = '';
  saving = false;
  panelError = '';
  activePanel: Panel = null;

  editingModule: any = null;
  activeModuleForLesson: any = null;

  moduleForm = { title: '' };
  lessonForm = { id: '', title: '', lesson_type: 'theory', content: '', video_url: '' };
  labForm = {
    title: '', description: '', docker_image: '', flag: '',
    instructions: '', cpu_limit: '0.5', memory_limit_mb: 512, max_duration_minutes: 60, service_port: 80,
  };

  pendingFiles: File[] = [];
  existingResources: any[] = [];

  collaborators: any[] = [];
  loadingCollaborators = false;
  addCollaboratorEmail = '';
  addingCollaborator = false;
  collaboratorError = '';
  eligibleTutors: any[] = [];
  showTutorSuggestions = false;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCourse(id).subscribe({
      next: (data) => { this.course = data.course; this.loading = false; },
      error: () => { this.error = 'Course not found.'; this.loading = false; },
    });
  }

  closePanel() { this.activePanel = null; this.panelError = ''; }

  // ── Collaborators ────────────────────────────────────────

  openCollaborators() {
    this.activePanel = 'collaborators';
    this.addCollaboratorEmail = '';
    this.collaboratorError = '';
    this.showTutorSuggestions = false;
    this.loadingCollaborators = true;
    this.api.getCourseCollaborators(this.course.id).subscribe({
      next: (d) => { this.collaborators = d.collaborators; this.loadingCollaborators = false; },
      error: () => { this.loadingCollaborators = false; },
    });
    this.api.getEligibleCollaborators(this.course.id).subscribe({
      next: (d) => { this.eligibleTutors = d.tutors; },
      error: () => { this.eligibleTutors = []; },
    });
  }

  get filteredTutorSuggestions(): any[] {
    const q = this.addCollaboratorEmail.trim().toLowerCase();
    if (!q) return this.eligibleTutors;
    return this.eligibleTutors.filter((t) =>
      t.email?.toLowerCase().includes(q) || t.full_name?.toLowerCase().includes(q)
    );
  }

  pickTutorSuggestion(t: any) {
    this.addCollaboratorEmail = t.email;
    this.showTutorSuggestions = false;
  }

  addCollaborator() {
    if (!this.addCollaboratorEmail.trim() || this.addingCollaborator) return;
    this.addingCollaborator = true;
    this.collaboratorError = '';
    this.showTutorSuggestions = false;
    this.api.addCourseCollaborator(this.course.id, this.addCollaboratorEmail.trim()).subscribe({
      next: (d) => {
        this.collaborators.unshift(d.collaborator);
        this.eligibleTutors = this.eligibleTutors.filter((t) => t.id !== d.collaborator.tutor_id);
        this.addCollaboratorEmail = '';
        this.addingCollaborator = false;
      },
      error: (err) => {
        this.collaboratorError = err?.error?.message || 'Failed to grant access.';
        this.addingCollaborator = false;
      },
    });
  }

  removeCollaborator(c: any) {
    if (!confirm(`Remove ${c.tutor?.full_name || c.tutor?.email || 'this tutor'}'s access to this course?`)) return;
    this.api.removeCourseCollaborator(this.course.id, c.tutor_id).subscribe({
      next: () => {
        this.collaborators = this.collaborators.filter((x) => x.tutor_id !== c.tutor_id);
        if (c.tutor) this.eligibleTutors = [...this.eligibleTutors, c.tutor];
      },
      error: () => alert('Failed to remove access.'),
    });
  }

  // ── Modules ──────────────────────────────────────────────

  openAddModule() {
    this.editingModule = null;
    this.moduleForm = { title: '' };
    this.activePanel = 'module';
  }

  openEditModule(module: any) {
    this.editingModule = module;
    this.moduleForm = { title: module.title };
    this.activePanel = 'module';
  }

  saveModule() {
    this.saving = true;
    this.panelError = '';
    const req = this.editingModule
      ? this.api.updateModule(this.editingModule.id, { title: this.moduleForm.title })
      : this.api.createModule(this.course.id, { title: this.moduleForm.title, order_index: this.course.modules?.length ?? 0 });

    req.subscribe({
      next: (data) => {
        if (this.editingModule) {
          this.editingModule.title = data.module.title;
        } else {
          if (!this.course.modules) this.course.modules = [];
          this.course.modules.push({ ...data.module, lessons: [] });
        }
        this.saving = false;
        this.closePanel();
      },
      error: (err) => {
        this.panelError = err?.error?.message || 'Failed to save module.';
        this.saving = false;
      },
    });
  }

  deleteModule(module: any, idx: number) {
    if (!confirm(`Delete module "${module.title}" and all its lessons?`)) return;
    this.api.deleteModule(module.id).subscribe({
      next: () => { this.course.modules.splice(idx, 1); },
      error: () => alert('Failed to delete module.'),
    });
  }

  // ── Lessons ──────────────────────────────────────────────

  openAddLesson(module: any) {
    this.activeModuleForLesson = module;
    this.lessonForm = { id: '', title: '', lesson_type: 'theory', content: '', video_url: '' };
    this.labForm = { title: '', description: '', docker_image: '', flag: '', instructions: '', cpu_limit: '0.5', memory_limit_mb: 512, max_duration_minutes: 60, service_port: 80 };
    this.pendingFiles = [];
    this.existingResources = [];
    this.activePanel = 'lesson';
  }

  openEditLesson(module: any, lesson: any) {
    this.activeModuleForLesson = module;
    this.lessonForm = {
      id: lesson.id,
      title: lesson.title ?? '',
      lesson_type: lesson.lesson_type ?? 'text',
      content: lesson.content ?? '',
      video_url: lesson.video_url ?? '',
    };
    if (lesson.lab) {
      this.labForm = {
        title: lesson.lab.title ?? '',
        description: lesson.lab.description ?? '',
        docker_image: lesson.lab.docker_image ?? '',
        flag: '',
        instructions: lesson.lab.instructions ?? '',
        cpu_limit: lesson.lab.cpu_limit ?? '0.5',
        memory_limit_mb: lesson.lab.memory_limit_mb ?? 512,
        max_duration_minutes: lesson.lab.max_duration_minutes ?? 60,
        service_port: lesson.lab.service_port ?? 80,
      };
    } else {
      this.labForm = { title: '', description: '', docker_image: '', flag: '', instructions: '', cpu_limit: '0.5', memory_limit_mb: 512, max_duration_minutes: 60, service_port: 80 };
    }
    this.pendingFiles = [];
    this.existingResources = [];
    this.api.getResources(lesson.id).subscribe({
      next: d => { this.existingResources = d.resources; },
      error: () => {},
    });
    this.activePanel = 'lesson';
  }

  saveLesson() {
    this.saving = true;
    this.panelError = '';
    const payload = {
      title: this.lessonForm.title,
      lesson_type: this.lessonForm.lesson_type,
      content: this.lessonForm.content,
      video_url: this.lessonForm.video_url,
      order_index: this.activeModuleForLesson?.lessons?.length ?? 0,
    };

    const lessonReq = this.lessonForm.id
      ? this.api.updateLesson(this.lessonForm.id, payload)
      : this.api.createLesson(this.activeModuleForLesson.id, payload);

    lessonReq.subscribe({
      next: (data) => {
        const lesson = data.lesson;
        if (!this.activeModuleForLesson.lessons) this.activeModuleForLesson.lessons = [];

        if (this.lessonForm.id) {
          const idx = this.activeModuleForLesson.lessons.findIndex((l: any) => l.id === lesson.id);
          if (idx >= 0) this.activeModuleForLesson.lessons[idx] = { ...this.activeModuleForLesson.lessons[idx], ...lesson };
        } else {
          this.activeModuleForLesson.lessons.push(lesson);
        }

        const finish = () => this.uploadPendingPdfs(lesson.id, () => {
          this.saving = false;
          this.closePanel();
        });

        // Save lab if type is lab and docker image is provided
        if (this.lessonForm.lesson_type === 'lab' && this.labForm.docker_image) {
          this.api.upsertLab(lesson.id, { ...this.labForm }).subscribe({
            next: (labData) => {
              const lessonInList = this.activeModuleForLesson.lessons.find((l: any) => l.id === lesson.id);
              if (lessonInList) lessonInList.lab = labData.lab;
              finish();
            },
            error: () => finish(),
          });
        } else {
          finish();
        }
      },
      error: (err) => {
        this.panelError = err?.error?.message || 'Failed to save lesson.';
        this.saving = false;
      },
    });
  }

  deleteLesson(module: any, lesson: any, idx: number) {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    this.api.deleteLesson(lesson.id).subscribe({
      next: () => { module.lessons.splice(idx, 1); },
      error: () => alert('Failed to delete lesson.'),
    });
  }

  // ── PDF helpers ───────────────────────────────────────────

  onPdfSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.pendingFiles = [...this.pendingFiles, ...Array.from(input.files)];
      input.value = '';
    }
  }

  onPdfDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type === 'application/pdf');
    this.pendingFiles = [...this.pendingFiles, ...files];
  }

  removeResource(r: any) {
    this.api.deleteResource(r.id).subscribe({
      next: () => { this.existingResources = this.existingResources.filter(x => x.id !== r.id); },
      error: () => alert('Failed to remove attachment.'),
    });
  }

  uploadPendingPdfs(lessonId: string, done: () => void) {
    if (!this.pendingFiles.length) { done(); return; }
    let remaining = this.pendingFiles.length;
    let anyError = false;
    for (const file of this.pendingFiles) {
      this.api.uploadResource(lessonId, file).subscribe({
        next: () => { if (--remaining === 0) { if (anyError) this.panelError = 'Some PDFs failed to upload — check that the "lesson-resources" Storage bucket exists in Supabase.'; else done(); } },
        error: (err) => {
          anyError = true;
          this.panelError = err?.error?.message || 'PDF upload failed — make sure the "lesson-resources" Storage bucket exists in Supabase dashboard.';
          this.saving = false;
          if (--remaining === 0 && !anyError) done();
        },
      });
    }
  }

  // Same 1-5 scale/thresholds students see on the lab page, kept in sync so
  // "62% difficulty" and the "Medium" wording always agree with each other.
  difficultyLabel(avgRating: number | null): string {
    if (avgRating == null) return '';
    if (avgRating <= 1.5) return 'Very Easy';
    if (avgRating <= 2.5) return 'Easy';
    if (avgRating <= 3.5) return 'Medium';
    if (avgRating <= 4.5) return 'Hard';
    return 'Very Hard';
  }

  // "Tutors should see each rate" — a breakdown of how many students picked
  // each level, not which specific student picked it (ratings stay anonymous).
  ratingBreakdown(lab: any): string {
    if (!lab?.distribution) return '';
    const labels = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
    return labels.map((label, i) => `${label} ${lab.distribution[i + 1] ?? 0}`).join(' · ');
  }

  fmtBytes(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
