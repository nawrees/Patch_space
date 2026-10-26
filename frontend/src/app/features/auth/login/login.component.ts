import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

// Lockout state (3 attempts, 15-minute window) lives server-side in
// Postgres now — see database/migrations/032_account_lockout.sql — so it
// survives a page refresh and applies no matter which client hit Supabase
// Auth. This component just reflects check_login_locked()/
// record_failed_login()/clear_login_attempts() rather than counting
// anything itself; the threshold and duration are deliberately not
// duplicated here.

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';
  showPassword = false;

  isLocked = false;
  lockedUntil: Date | null = null;
  resetEmailSent = false;
  lastFailedCount = 0;

  constructor(
    private auth: AuthService,
    private user: UserService,
    private router: Router
  ) {}

  get lockedMinutesRemaining(): number {
    if (!this.lockedUntil) return 0;
    const ms = this.lockedUntil.getTime() - Date.now();
    return Math.max(1, Math.ceil(ms / 60000));
  }

  get attemptsLeft(): number {
    return Math.max(0, 3 - this.lastFailedCount);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() {
    if (this.loading) return;
    this.error = '';

    // Catch an empty/incomplete form before it ever reaches the real sign-in
    // call — this is a form-validation problem, not a wrong-credentials
    // attempt, and shouldn't count toward the lockout below.
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Enter your email and password';
      return;
    }

    const normalizedEmail = this.email.trim().toLowerCase();
    this.loading = true;

    // Ask Postgres first — this is the step that makes the lockout real:
    // even a freshly refreshed page, with no local state at all, still
    // reports as locked if the account actually is.
    const alreadyLocked = await this.checkLocked(normalizedEmail);
    if (alreadyLocked) {
      this.loading = false;
      return;
    }

    try {
      await this.auth.signIn(this.email, this.password);
      await this.auth.client.rpc('clear_login_attempts', { p_email: normalizedEmail });
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

      const { data, error: rpcError } = await this.auth.client.rpc('record_failed_login', {
        p_email: normalizedEmail,
      });
      if (!rpcError && data) {
        this.lastFailedCount = data.failed_count ?? this.lastFailedCount + 1;
        if (data.locked_until) {
          this.isLocked = true;
          this.lockedUntil = new Date(data.locked_until);
        } else {
          this.error = err.message || 'Invalid email or password';
        }
      } else {
        // The RPC call itself failed (network, etc.) — still show the
        // underlying auth error rather than silently swallowing it.
        this.error = err.message || 'Invalid email or password';
      }
    }
  }

  /** Returns true if the account is locked (and sets isLocked/lockedUntil accordingly). */
  private async checkLocked(normalizedEmail: string): Promise<boolean> {
    const { data: lockedUntil, error } = await this.auth.client.rpc('check_login_locked', {
      p_email: normalizedEmail,
    });
    if (!error && lockedUntil) {
      this.isLocked = true;
      this.lockedUntil = new Date(lockedUntil);
      return true;
    }
    return false;
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

  /**
   * Re-checks the real lockout status instead of just clearing local state —
   * if the 15-minute window genuinely hasn't passed yet, this keeps the
   * lockout screen up instead of handing back a free retry.
   */
  async unlockAndRetry() {
    const normalizedEmail = this.email.trim().toLowerCase();
    this.resetEmailSent = false;
    this.password = '';
    this.error = '';

    const stillLocked = normalizedEmail ? await this.checkLocked(normalizedEmail) : false;
    if (!stillLocked) {
      this.isLocked = false;
      this.lockedUntil = null;
    }
  }
}
