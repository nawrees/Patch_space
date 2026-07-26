import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Site settings (public content: About/Contact page copy, contact email)
  getSiteSettings(): Observable<{ settings: any }> {
    return this.http.get<{ settings: any }>(`${environment.apiUrl}/site-settings`);
  }

  updateSiteSettings(data: any): Observable<{ settings: any }> {
    return this.http.patch<{ settings: any }>(`${environment.apiUrl}/site-settings`, data);
  }

  // Courses
  getCourses(params?: { mine?: boolean }): Observable<{ courses: any[] }> {
    let httpParams = new HttpParams();
    if (params?.mine) httpParams = httpParams.set('mine', 'true');
    return this.http.get<{ courses: any[] }>(`${environment.apiUrl}/courses`, { params: httpParams });
  }

  getCourse(id: string): Observable<{ course: any }> {
    return this.http.get<{ course: any }>(`${environment.apiUrl}/courses/${id}`);
  }

  createCourse(data: any): Observable<{ course: any }> {
    return this.http.post<{ course: any }>(`${environment.apiUrl}/courses`, data);
  }

  updateCourse(id: string, data: any): Observable<{ course: any }> {
    return this.http.put<{ course: any }>(`${environment.apiUrl}/courses/${id}`, data);
  }

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/courses/${id}`);
  }

  // Course collaborators — another tutor granted edit access to a course
  getCourseCollaborators(courseId: string): Observable<{ collaborators: any[] }> {
    return this.http.get<{ collaborators: any[] }>(`${environment.apiUrl}/courses/${courseId}/collaborators`);
  }

  getEligibleCollaborators(courseId: string): Observable<{ tutors: any[] }> {
    return this.http.get<{ tutors: any[] }>(`${environment.apiUrl}/courses/${courseId}/collaborators/eligible`);
  }

  addCourseCollaborator(courseId: string, email: string): Observable<{ collaborator: any }> {
    return this.http.post<{ collaborator: any }>(`${environment.apiUrl}/courses/${courseId}/collaborators`, { email });
  }

  removeCourseCollaborator(courseId: string, tutorId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/courses/${courseId}/collaborators/${tutorId}`);
  }

  uploadCourseThumbnail(courseId: string, file: File): Observable<{ course: any; thumbnail_url: string }> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<{ course: any; thumbnail_url: string }>(
      `${environment.apiUrl}/courses/${courseId}/thumbnail`, fd
    );
  }

  // Modules
  createModule(courseId: string, data: any): Observable<{ module: any }> {
    return this.http.post<{ module: any }>(`${environment.apiUrl}/courses/${courseId}/modules`, data);
  }

  updateModule(id: string, data: any): Observable<{ module: any }> {
    return this.http.put<{ module: any }>(`${environment.apiUrl}/modules/${id}`, data);
  }

  deleteModule(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/modules/${id}`);
  }

  // Lessons
  getLesson(id: string): Observable<{ lesson: any }> {
    return this.http.get<{ lesson: any }>(`${environment.apiUrl}/lessons/${id}`);
  }

  createLesson(moduleId: string, data: any): Observable<{ lesson: any }> {
    return this.http.post<{ lesson: any }>(`${environment.apiUrl}/modules/${moduleId}/lessons`, data);
  }

  updateLesson(id: string, data: any): Observable<{ lesson: any }> {
    return this.http.put<{ lesson: any }>(`${environment.apiUrl}/lessons/${id}`, data);
  }

  deleteLesson(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/lessons/${id}`);
  }

  upsertLab(lessonId: string, data: any): Observable<{ lab: any }> {
    return this.http.post<{ lab: any }>(`${environment.apiUrl}/lessons/${lessonId}/lab`, data);
  }

  deleteLab(labId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/labs/${labId}`);
  }

  // Enrollments
  enrollInCourse(courseId: string): Observable<{ enrollment: any }> {
    return this.http.post<{ enrollment: any }>(`${environment.apiUrl}/courses/${courseId}/enroll`, {});
  }

  getMyEnrollments(): Observable<{ enrollments: any[] }> {
    return this.http.get<{ enrollments: any[] }>(`${environment.apiUrl}/enrollments/me`);
  }

  // Progress
  getMyProgress(): Observable<{ progress: any[] }> {
    return this.http.get<{ progress: any[] }>(`${environment.apiUrl}/progress/me`);
  }

  updateProgress(lessonId: string, data: any): Observable<{ progress: any }> {
    return this.http.put<{ progress: any }>(`${environment.apiUrl}/progress/lessons/${lessonId}`, data);
  }

  getStudentProgress(studentId: string): Observable<{ progress: any[] }> {
    return this.http.get<{ progress: any[] }>(`${environment.apiUrl}/progress/students/${studentId}`);
  }

  // Resources (PDFs, attachments)
  getResources(lessonId: string): Observable<{ resources: any[] }> {
    return this.http.get<{ resources: any[] }>(`${environment.apiUrl}/lessons/${lessonId}/resources`);
  }

  getResourceSignedUrl(resourceId: string): Observable<{ url: string; expiresIn: number; title: string }> {
    return this.http.get<{ url: string; expiresIn: number; title: string }>(
      `${environment.apiUrl}/resources/${resourceId}/signed-url`
    );
  }

  uploadResource(lessonId: string, file: File, title?: string): Observable<{ resource: any }> {
    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    return this.http.post<{ resource: any }>(`${environment.apiUrl}/lessons/${lessonId}/resources`, fd);
  }

  deleteResource(resourceId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/resources/${resourceId}`);
  }

  // Admin
  getUsers(): Observable<{ users: any[] }> {
    return this.http.get<{ users: any[] }>(`${environment.apiUrl}/admin/users`);
  }

  updateUserRole(userId: string, role: string): Observable<{ user: any }> {
    return this.http.put<{ user: any }>(`${environment.apiUrl}/admin/users/${userId}/role`, { role });
  }

  assignTutor(data: { tutorId: string; studentId: string; courseId?: string }): Observable<{ assignment: any }> {
    return this.http.post<{ assignment: any }>(`${environment.apiUrl}/admin/tutor-assignments`, data);
  }

  // Tutors
  getMyStudents(): Observable<{ students: any[]; avgProgressPercent: number | null }> {
    return this.http.get<{ students: any[]; avgProgressPercent: number | null }>(`${environment.apiUrl}/tutors/me/students`);
  }

  getStudentOverview(studentId: string): Observable<{ enrollments: any[]; progress: any[] }> {
    return this.http.get<{ enrollments: any[]; progress: any[] }>(
      `${environment.apiUrl}/tutors/students/${studentId}/overview`
    );
  }

  // Lab orchestration
  getLabSession(labId: string): Observable<{ session: any; submissions: any[]; userRating: number | null }> {
    return this.http.get<{ session: any; submissions: any[]; userRating: number | null }>(`${environment.apiUrl}/labs/${labId}/session`);
  }

  startLab(labId: string): Observable<{ session: any }> {
    return this.http.post<{ session: any }>(`${environment.apiUrl}/labs/${labId}/start`, {});
  }

  stopLab(labId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/labs/${labId}/session`);
  }

  submitFlag(labId: string, flag: string): Observable<{ isCorrect: boolean; attemptsUsed: number }> {
    return this.http.post<{ isCorrect: boolean; attemptsUsed: number }>(
      `${environment.apiUrl}/labs/${labId}/submit`, { flag }
    );
  }

  getLabLogs(labId: string): Observable<{ logs: string }> {
    return this.http.get<{ logs: string }>(`${environment.apiUrl}/labs/${labId}/logs`);
  }

  // Saved courses
  getSaved(): Observable<{ saved: any[] }> {
    return this.http.get<{ saved: any[] }>(`${environment.apiUrl}/saved`);
  }

  saveCourse(courseId: string): Observable<{ saved: boolean }> {
    return this.http.post<{ saved: boolean }>(`${environment.apiUrl}/saved/${courseId}`, {});
  }

  unsaveCourse(courseId: string): Observable<{ saved: boolean }> {
    return this.http.delete<{ saved: boolean }>(`${environment.apiUrl}/saved/${courseId}`);
  }

  updateProfile(data: { full_name?: string; bio?: string; avatar_url?: string }): Observable<{ profile: any }> {
    return this.http.put<{ profile: any }>(`${environment.apiUrl}/auth/profile`, data);
  }

  rateLab(labId: string, rating: number): Observable<{ avgRating: number; totalRatings: number; userRating: number }> {
    return this.http.post<{ avgRating: number; totalRatings: number; userRating: number }>(
      `${environment.apiUrl}/labs/${labId}/rate`, { rating }
    );
  }

  // Continue Learning
  getContinueLearning(): Observable<{ continueLearning: any; enrollment?: any }> {
    return this.http.get<{ continueLearning: any; enrollment?: any }>(`${environment.apiUrl}/progress/continue`);
  }

  // Study pace analytics
  getMyPaceStats(): Observable<{ paceStats: any }> {
    return this.http.get<{ paceStats: any }>(`${environment.apiUrl}/analytics/pace`);
  }

  // Recommendations
  getRecommendations(): Observable<{ recommendations: any[] }> {
    return this.http.get<{ recommendations: any[] }>(`${environment.apiUrl}/recommendations`);
  }

  // Drop-off analytics (tutor/admin)
  getDropOff(courseId: string): Observable<{ courseTitle: string; totalEnrolled: number; funnel: any[] }> {
    return this.http.get<{ courseTitle: string; totalEnrolled: number; funnel: any[] }>(
      `${environment.apiUrl}/analytics/drop-off/${courseId}`
    );
  }

  // Q&A
  askQuestion(lessonId: string, question: string): Observable<{ question: any }> {
    return this.http.post<{ question: any }>(`${environment.apiUrl}/lessons/${lessonId}/questions`, { question });
  }

  getLessonQuestions(lessonId: string): Observable<{ questions: any[] }> {
    return this.http.get<{ questions: any[] }>(`${environment.apiUrl}/lessons/${lessonId}/questions`);
  }

  getAllQuestions(params?: { courseId?: string; unansweredOnly?: boolean }): Observable<{ questions: any[] }> {
    let httpParams = new HttpParams();
    if (params?.courseId) httpParams = httpParams.set('courseId', params.courseId);
    if (params?.unansweredOnly) httpParams = httpParams.set('unansweredOnly', 'true');
    return this.http.get<{ questions: any[] }>(`${environment.apiUrl}/questions`, { params: httpParams });
  }

  answerQuestion(id: string, answer: string): Observable<{ question: any }> {
    return this.http.put<{ question: any }>(`${environment.apiUrl}/questions/${id}/answer`, { answer });
  }

  dismissQuestion(id: string): Observable<{ question: any }> {
    return this.http.put<{ question: any }>(`${environment.apiUrl}/questions/${id}/dismiss`, {});
  }

  // Streaks
  getStreak(): Observable<{ current_streak: number; longest_streak: number; last_activity_date: string | null; active_today: boolean }> {
    return this.http.get<any>(`${environment.apiUrl}/streaks`);
  }

  // Notifications
  getNotifications(): Observable<{ notifications: any[] }> {
    return this.http.get<{ notifications: any[] }>(`${environment.apiUrl}/notifications`);
  }

  markNotificationRead(id: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${environment.apiUrl}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${environment.apiUrl}/notifications/read-all`, {});
  }
}
