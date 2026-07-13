import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthSession } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  public session$ = this.sessionSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.initializeSession();
  }

  private async initializeSession() {
    const { data } = await this.supabase.auth.getSession();
    this.sessionSubject.next(data?.session || null);

    // Listen for auth changes (login/logout from other tabs, token refresh, etc.)
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.sessionSubject.next(session || null);
    });
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.sessionSubject.next(data.session);
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.sessionSubject.next(null);
  }

  getSession(): AuthSession | null {
    return this.sessionSubject.value;
  }

  getAccessToken(): string | null {
    return this.getSession()?.access_token || null;
  }

  isAuthenticated(): boolean {
    return !!this.getSession();
  }
}
