import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'student' | 'tutor' | 'admin';
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface CurrentUser {
  user: { id: string; email: string };
  profile: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  async fetchCurrentUser(): Promise<CurrentUser> {
    const response = await this.http.get<CurrentUser>(`${environment.apiUrl}/auth/me`).toPromise();
    if (response) {
      this.currentUserSubject.next(response);
    }
    return response!;
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  getUserRole(): 'student' | 'tutor' | 'admin' | null {
    return this.currentUserSubject.value?.profile.role || null;
  }

  isStudent(): boolean {
    return this.getUserRole() === 'student';
  }

  isTutor(): boolean {
    return this.getUserRole() === 'tutor';
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  patchProfile(partial: Partial<UserProfile>) {
    const current = this.currentUserSubject.value;
    if (!current) return;
    this.currentUserSubject.next({
      ...current,
      profile: { ...current.profile, ...partial },
    });
  }
}
