import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

const MAX_ATTEMPTS = 3;

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
    this.loading = true;
    this.error = '';

    try {
      await this.auth.signIn(this.email, this.password);
      const current = await this.user.fetchCurrentUser();
      const role = current.profile.role;
      if (role === 'admin') this.router.navigate(['/admin']);
      else if (role === 'tutor') this.router.navigate(['/tutor']);
      else this.router.navigate(['/student']);
    } catch (err: any) {
      this.failedAttempts++;
      this.loading = false;

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
