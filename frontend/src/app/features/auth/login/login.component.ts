import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

const MAX_ATTEMPTS = 3;

// NOTE: this lockout is UI-only friction, not real brute-force protection —
// signIn() below calls Supabase Auth directly from the browser, so this
// component's state resets on page refresh and is trivially bypassed by
// calling the Supabase API directly. The actual enforcement point is
// Supabase's own project-level Auth rate limits (Dashboard → Authentication
// → Rate Limits), which this codebase does not configure.

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  failedAttempts = 0;
  isLocked = false;
  resetEmailSent = false;
  // Which email the current failedAttempts count belongs to — switching to a
  // different email should start that email's own 3 attempts, not inherit
  // whatever count was racked up trying a different account.
  private attemptsEmail: string | null = null;

  constructor(
    private auth: AuthService,
    private user: UserService,
    private router: Router
  ) {}

  get attemptsLeft(): number {
    return MAX_ATTEMPTS - this.failedAttempts;
  }

  async onLogin() {
    if (this.isLocked || this.loading) return;
    this.error = '';

    // Catch an empty/incomplete form before it ever reaches the real sign-in
    // call — this is a form-validation problem, not a wrong-credentials
    // attempt, and shouldn't count toward the lockout below.
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Enter your email and password';
      return;
    }

    const normalizedEmail = this.email.trim().toLowerCase();
    if (this.attemptsEmail !== normalizedEmail) {
      this.attemptsEmail = normalizedEmail;
      this.failedAttempts = 0;
    }

    this.loading = true;

    try {
      await this.auth.signIn(this.email, this.password);
      const current = await this.user.fetchCurrentUser();
      const role = current.profile.role;
      if (role === 'admin') this.router.navigate(['/admin']);
      else if (role === 'tutor') this.router.navigate(['/tutor']);
      else this.router.navigate(['/student']);
    } catch (err: any) {
      this.loading = false;

      // supabase-js wraps a dropped connection / DNS failure / CORS error as
      // AuthRetryableFetchError, distinct from a real "wrong password"
      // response from the server — that's connectivity, not a credentials
      // attempt, and shouldn't cost the user one of their 3 tries.
      if (err?.name === 'AuthRetryableFetchError') {
        this.error = 'Network error — check your connection and try again.';
        return;
      }

      this.failedAttempts++;
      if (this.failedAttempts >= MAX_ATTEMPTS) {
        this.isLocked = true;
      } else {
        this.error = err.message || 'Invalid email or password';
      }
    }
  }

  async onForgotPassword() {
    if (!this.email.trim()) {
      this.error = 'Enter your email address above first';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.auth.resetPassword(this.email);
      this.resetEmailSent = true;
    } catch (err: any) {
      this.error = err.message || 'Could not send reset email';
    } finally {
      this.loading = false;
    }
  }

  unlockAndRetry() {
    this.failedAttempts = 0;
    this.isLocked = false;
    this.resetEmailSent = false;
    this.password = '';
    this.error = '';
  }
}
