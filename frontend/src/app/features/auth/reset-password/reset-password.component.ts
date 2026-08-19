import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent {
  newPassword = '';
  confirmPassword = '';
  loading = false;
  error = '';
  success = false;
  passwordTouched = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  get pwChecks() {
    const p = this.newPassword;
    return {
      length:  p.length >= 8,
      upper:   /[A-Z]/.test(p),
      lower:   /[a-z]/.test(p),
      number:  /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
    };
  }

  get passwordValid(): boolean {
    return Object.values(this.pwChecks).every(Boolean);
  }

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword && this.confirmPassword.length > 0;
  }

  get strengthLevel(): number {
    return Object.values(this.pwChecks).filter(Boolean).length;
  }

  get strengthLabel(): string {
    return this.newPassword ? ['', 'Weak', 'Fair', 'Good', 'Strong'][this.strengthLevel] : '';
  }

  get strengthClass(): string {
    return this.newPassword ? ['', 'pw-weak', 'pw-fair', 'pw-good', 'pw-strong'][this.strengthLevel] : '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    this.passwordTouched = true;
    if (!this.passwordValid || !this.passwordsMatch) return;

    this.loading = true;
    this.error = '';

    try {
      await this.auth.updatePassword(this.newPassword);
      this.success = true;
      setTimeout(() => this.router.navigate(['/login']), 2500);
    } catch (err: any) {
      this.error = err.message || 'Failed to update password. The reset link may have expired.';
      this.loading = false;
    }
  }
}
