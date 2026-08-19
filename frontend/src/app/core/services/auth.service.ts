import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthSession } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  public session$ = this.sessionSubject.asObservable();
  private recoveryMode = false;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.initializeSession();
  }

  private async initializeSession() {
    // Detect recovery link before getSession() emits, so AppComponent routes correctly.
    if (window.location.hash.includes('type=recovery')) {
      this.recoveryMode = true;
    }

    const { data } = await this.supabase.auth.getSession();
    this.sessionSubject.next(data?.session || null);

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.recoveryMode = event === 'PASSWORD_RECOVERY';
      this.sessionSubject.next(session || null);
    });
  }

  isRecoveryMode(): boolean {
    return this.recoveryMode;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    this.recoveryMode = false;
  }

  async signUp(email: string, password: string, firstName: string, lastName: string, phone?: string, address?: string) {
    // first_name/last_name sent separately (not pre-joined) so the
    // handle_new_user() DB trigger can require each one individually,
    // not just require the combined string to be non-empty.
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, phone: phone || null, address: address || null } },
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

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
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

  get client(): SupabaseClient {
    return this.supabase;
  }
}
